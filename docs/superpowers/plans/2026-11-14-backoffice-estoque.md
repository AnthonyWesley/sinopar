# Back office da Fixa Store — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel `/admin` para catálogo, estoque e pedidos, com reserva no checkout e baixa automática pelo webhook do Asaas, e a loja lendo do banco.

**Architecture:**
- Tudo dentro do app Next.js 16 existente (`cacheComponents`, `partialPrefetching`, `output: "standalone"`).
- SQLite (better-sqlite3) em `DATA_DIR` (padrão `./data`; `/data` no Docker).
- Regras de domínio (estoque, pedidos, auth) em módulos puros `src/lib/server/*` que recebem um `Db`. São testadas com vitest e chamadas por Server Actions, Route Handlers e Server Components.
- A loja lê o catálogo por funções `'use cache'` com `cacheTag`. As mudanças invalidam com `updateTag` (Server Actions) ou `revalidateTag(tag, "max")` (webhook e tarefas).

**Tech Stack:** Next 16.4, React 19.3, Tailwind 4, better-sqlite3, sharp (+ heic-convert), zod, vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-14-backoffice-estoque-design.md`

## Global Constraints

- **Next 16:** antes de codar cada tarefa, ler em `node_modules/next/dist/docs/` o guia da API usada (`use cache`, `cacheTag`, `updateTag`, `revalidateTag`, Server Actions, Route Handlers, `proxy.ts`, `instrumentation.ts`, `cookies()`), como manda o `AGENTS.md`.
- **Dinheiro:** sempre em **centavos inteiros**.
- **Disponível** = `estoque − reservado`. A loja e o checkout usam o disponível, e o estoque nunca fica negativo.
- **Etapas** (valores no banco):
  - `aguardando` (Aguardando pagamento)
  - `pago` (Pago)
  - `separado` (Separado)
  - `enviado` (Enviado)
  - `entregue` (Entregue)
  - `cancelado` (Cancelado)
  - `pago_sem_estoque` (Pago sem estoque)
- **Movimentações:** `entrada`, `ajuste`, `reserva`, `liberacao`, `venda`, `devolucao`. Têm quantidade com sinal, motivo, usuário (ou `null` para o sistema) e data. Nunca são apagadas.
- **Constantes:**
  - `LOW_STOCK = 5`
  - reserva expira após **4 dias** sem pagamento
  - pedido sem cobrança é liberado após **15 minutos**
  - varredura a cada **1 h**, backup a cada **6 h** (mantém 7)
- **Asaas:**
  - o webhook confere o cabeçalho `asaas-access-token` com `ASAAS_WEBHOOK_TOKEN`;
  - eventos de confirmação: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`;
  - eventos de expiração: `PAYMENT_OVERDUE`, `PAYMENT_DELETED`;
  - eventos de estorno: `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`;
  - o id do evento (`id` do corpo) é guardado em `payment_events` e reenvios são ignorados.
- **Baixa:** só na transição `aguardando → pago`. Um pagamento que chega com o pedido `cancelado` segue a opção A da spec (ver Task 3).
- **Auth** portada do Kadoshi (`C:\Users\Anthony\Desktop\Coletto\kadoshi-sushi-page`, branch `feat/backoffice`):
  - `server/auth.ts`, `server/routes/auth.ts`, `server/backups.ts`, `server/db.ts`;
  - cookie `fx_session`;
  - limite de 5 por e-mail+IP e 20 por IP em 15 min;
  - código de recuperação que exige a senha atual para gerar;
  - IP = último item de `X-Forwarded-For`.
- **Papéis:** `owner` (Responsável) e `staff` (Funcionário), adaptados da Revival (`server/routes/users.ts`, `src/admin/pages/Users.tsx`). Funcionário pode tudo, menos Usuários e baixar a cópia do banco.
- **Fotos:**
  - uma por produto;
  - JPG, PNG, WebP ou HEIC, até 10 MB, convertidas para WebP com `sharp`;
  - salvas em `DATA_DIR/uploads` e servidas por `/uploads/<nome>`;
  - as fotos atuais em `public/images/produtos` continuam válidas.
- **Visual:**
  - o painel em português segue o visual minimalista dos painéis anteriores, com o amarelo da marca como destaque;
  - a loja não muda de aparência;
  - toda tela do painel funciona a 390 px sem rolagem lateral.
- **Cabeçalhos em todas as respostas:**
  - `X-Frame-Options: DENY`;
  - `Content-Security-Policy: frame-ancestors 'none'`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Segredos** só em variáveis de ambiente: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`. Nada de senha em commit.
- **Branch:** `feat/backoffice`. Sem merge e sem push sem pedido explícito.

## Review Focus

1. **Duas compras simultâneas da última unidade:** só uma reserva passa; a outra recebe "só restam 0" e o carrinho é corrigido. → Task 3 (`reserve` concorrente) e Task 5.
2. **Cartão manda `PAYMENT_CONFIRMED` e depois `PAYMENT_RECEIVED`:** baixa uma vez só. → Task 3 e Task 6.
3. **Pix pago depois que a varredura cancelou:**
   - com estoque, volta a `pago` e baixa;
   - sem estoque, `pago_sem_estoque`, sem mexer no estoque. → Task 3.
4. **Ajuste que deixaria o estoque abaixo do reservado:** é recusado com mensagem. → Task 3 e Task 10.
5. **Produto pausado ou excluído:** some da loja, a URL dá 404, mas o pedido antigo continua mostrando o nome dele. → Task 2 e Task 9.

---

### Task 1: Banco, migrações, seed e ferramentas de teste

**Files:**
- Create:
  - `vitest.config.ts` (com alias `@` e alias `server-only` para um módulo vazio);
  - `src/test-setup.ts`;
  - `src/lib/server/db.ts`;
  - `src/lib/server/seed.ts`.
- Move: os dados de `src/lib/catalog.ts` (arrays `categories`, `segments`, `products` e os tipos) ficam lá. O arquivo deixa de ser lido pela loja e passa a ser só a fonte do seed e dos tipos.
- Modify: `package.json`
  - deps: `better-sqlite3`, `sharp`, `heic-convert`, `zod`;
  - dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/better-sqlite3`;
  - script `"test": "vitest run"`.
- Modify: `next.config.ts` (`serverExternalPackages: ["better-sqlite3", "sharp"]`).
- Test: `src/lib/server/db.test.ts`

**Interfaces:**
- `openDb(file: string): Db` — WAL, `foreign_keys = ON` e migrações por `user_version`.
- `getDb(): Db` — singleton em `globalThis`, arquivo `${DATA_DIR}/site.db`, roda `seedIfEmpty` na primeira abertura.
- `seedIfEmpty(db: Db): void` — só quando `products` está vazia.
- **Tabelas da migração v1:**
  - `products` (id, slug unique, name, category, image, variant_name, unit, segments JSON, description, specs JSON, featured, status `ativo|pausado`, created_at, updated_at)
  - `variants` (id, product_id, sku unique, label, price, compare_at, stock, reserved, box_qty, position)
  - `stock_movements` (id, variant_id, kind, qty, reason, order_id, user_id, at)
  - `orders` (id text pk `SP-…`, token unique, status, created_at, customer JSON, shipping JSON, payment_method, invoice_url, asaas_payment_id, demo, subtotal, total, tracking_code, refund_flag)
  - `order_lines` (order_id, sku, variant_id, name, variant_label, qty, unit_price)
  - `order_events` (id, order_id, from_status, to_status, note, user_id, at)
  - `payment_events` (event_id pk, order_id, type, at)
  - `users` (com `recovery_hash` e role `owner|staff`), `sessions`, `login_attempts`, como no Kadoshi.
  - `CHECK(stock >= 0)`, `CHECK(reserved >= 0)` e `CHECK(stock >= reserved)` em `variants`.

- [ ] **Step 1: testes.**
  - `seedIfEmpty` grava 61 produtos e 103 variações, iguais a `catalog.ts`;
  - rodar duas vezes não duplica;
  - não roda se já houver produto;
  - `user_version` = 1;
  - inserir variação com `reserved > stock` lança erro (CHECK).
- [ ] **Step 2:** `npx vitest run src/lib/server/db.test.ts` → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS; `npx tsc --noEmit` limpo.
- [ ] **Step 5:** commit `feat(db): banco SQLite, migrações e seed do catálogo`.

### Task 2: Catálogo vindo do banco, com cache

**Files:**
- Create:
  - `src/lib/server/catalog-repo.ts` (leitura e escrita puras sobre `Db`);
  - `src/lib/catalog-data.ts` (funções `'use cache'` para a loja).
- Modify (passam a usar `catalog-data`, async):
  - `src/app/(loja)/page.tsx`
  - `src/app/(loja)/produto/[slug]/page.tsx`
  - `src/app/(loja)/produtos/[categoria]/page.tsx`
  - `src/app/(loja)/produtos/page.tsx`
  - `src/components/listing.tsx`
  - `src/app/sitemap.ts`
  - `src/lib/search.ts`, `src/lib/listing.ts`, se lerem `products`
  - `src/proxy.ts`
- Test: `src/lib/server/catalog-repo.test.ts`

**Interfaces:**
- `catalog-repo`:
  - `listProducts(db, opts?: { includePaused?: boolean }): Product[]` — o tipo `Product` de `catalog.ts`, com `variant.stock` = **disponível**;
  - `getProductBySlug(db, slug, opts?): Product | null`;
  - `findVariant(db, sku): { product: Product; variant: Variant; variantId: number } | null` — só ativo.
- `catalog-data`:
  - `getCatalog(): Promise<Product[]>` — `'use cache'`, `cacheTag("catalogo")`;
  - `getProduct(slug): Promise<Product | null>` — `cacheTag("catalogo", \`produto:${slug}\`)`;
  - `fromPrice`, `totalStock`, `hasDiscount`, `relatedProducts` continuam em `catalog.ts` como funções puras sobre `Product`.
- **Tags:**
  - `TAG_CATALOG = "catalogo"`;
  - `productTag(slug) = "produto:" + slug`;
  - exportadas de `src/lib/cache-tags.ts`.
- **`generateStaticParams`:** não pode ler o banco no build. Devolve `[]` (as páginas são geradas na primeira visita e ficam no cache) ou os slugs de `catalog.ts`. Ler o guia "ISR with Cache Components".
- **`proxy.ts`:**
  - continua barrando categoria desconhecida pela lista fixa;
  - para produto, deixa passar;
  - a página de produto, quando `getProduct` devolve `null` (inexistente ou pausado), responde **404 de verdade**. Se o Next 16 não permitir status 404 dentro de Suspense, o proxy consulta o banco (rodando em Node) por `productSlugExists(slug)`. Registrar a escolha no ledger.

- [ ] **Step 1: testes de `catalog-repo`.**
  - `listProducts` esconde pausados e calcula o disponível (`stock 10, reserved 3 → 7`);
  - `includePaused` mostra os pausados;
  - `findVariant` de produto pausado → `null`;
  - `getProductBySlug` de slug inexistente → `null`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar o repo e trocar as páginas.
- [ ] **Step 4:**
  - `npx vitest run` PASS;
  - `npm run build` ok **sem** `site.db` presente (`DATA_DIR` vazio no build);
  - `npm start` com `DATA_DIR` de teste: `/produto/<slug ativo>` 200 e `/produto/nao-existe` 404 (curl).
- [ ] **Step 5:** commit `feat(loja): catálogo lido do banco com cache por tag`.

### Task 3: Regras de estoque e pedidos (núcleo)

**Files:**
- Create: `src/lib/server/stock.ts`, `src/lib/server/orders-repo.ts`
- Test: `src/lib/server/stock.test.ts`

**Interfaces** (todas síncronas, cada uma numa `db.transaction`, e todas devolvem os slugs afetados para invalidar o cache):

```ts
type NewOrder = { id: string; token: string; createdAt: string; customer: Customer; shipping: Shipping;
  paymentMethod: PaymentMethod; lines: { sku: string; qty: number }[]; subtotal: number; total: number };
type Shortage = { sku: string; available: number };
type Result = { ok: true; slugs: string[] } | { ok: false; shortages: Shortage[] };

createOrderWithReservation(db, order: NewOrder): Result
attachCharge(db, orderId: string, charge: { asaasPaymentId: string | null; invoiceUrl: string | null; demo: boolean }): void
confirmPayment(db, orderId: string, eventId: string | null, now: Date): { status: OrderStatus; slugs: string[]; duplicate: boolean }
expireOrder(db, orderId: string, reason: string, now: Date): { slugs: string[] }   // só se aguardando
cancelOrder(db, orderId: string, opts: { restock: boolean; userId: number; reason: string }, now: Date): { slugs: string[] }
fulfillOutOfStock(db, orderId: string, userId: number, now: Date): Result         // pago_sem_estoque -> pago
moveStage(db, orderId: string, to: OrderStatus, userId: number, now: Date, tracking?: string): void
addStock(db, sku: string, qty: number, reason: string, userId: number, now: Date): { slugs: string[] }
setStock(db, sku: string, counted: number, reason: string, userId: number, now: Date): { ok: true; slugs: string[] } | { ok: false; error: string }
sweep(db, now: Date): { expired: string[]; slugs: string[] }
flagRefund(db, orderId: string, eventId: string): void
```

**Regras:**
- **`confirmPayment`:**
  - `aguardando` → baixa: `stock -= qty`, `reserved -= qty`, movimentação `venda`, status `pago`;
  - `pago`, `separado`, `enviado`, `entregue` e `pago_sem_estoque` → nada muda, `duplicate: true`;
  - `cancelado` → se o disponível cobre todas as linhas, baixa direto e vai a `pago`; senão vai a `pago_sem_estoque` sem mexer no estoque;
  - um `eventId` já visto → `duplicate: true`, nada muda.
- **`moveStage`:** só avança uma etapa (`pago→separado→enviado→entregue`) ou volta uma; qualquer outra transição lança erro. `enviado` aceita `tracking`.
- **`cancelOrder`:**
  - em `aguardando`, libera a reserva;
  - em `pago`, `separado` e `enviado`, devolve ao estoque só se `restock`;
  - em `entregue`, lança erro;
  - em `pago_sem_estoque`, só muda o status.
- **`sweep`:** expira `aguardando` com `created_at` há mais de 4 dias, ou sem `asaas_payment_id` e sem `demo` há mais de 15 minutos.
- **`setStock`:** recusa `counted < reserved` com "Há N unidades reservadas em pedidos não pagos. O estoque não pode ficar abaixo disso.".
- **`addStock`:** recusa `qty <= 0`.
- Toda mudança de status grava `order_events`.

- [ ] **Step 1: testes (`stock.test.ts`).** Cada caso com valores exatos:
  - reservar 2 de um estoque 3 deixa o disponível em 1;
  - um segundo pedido de 2 retorna `shortages: [{ sku, available: 1 }]` e não grava nada;
  - confirmar baixa o estoque para 1 e o reservado para 0, com uma movimentação `venda`;
  - `PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED` com ids diferentes baixam uma vez só;
  - o mesmo `eventId` duas vezes → `duplicate`;
  - pedido expirado com estoque sobrando, confirmado depois → `pago` e baixa;
  - pedido expirado sem estoque (outro pedido levou) → `pago_sem_estoque`, estoque intacto;
  - `fulfillOutOfStock` sem estoque → `ok:false`; depois de `addStock` → `pago`;
  - `cancelOrder` em `aguardando` libera; em `separado` com `restock` devolve (movimentação `devolucao`); sem `restock` não devolve; em `entregue` lança erro;
  - `moveStage` `pago→enviado` lança erro; `separado→pago` (voltar) passa;
  - `setStock` abaixo do reservado → erro com a mensagem exata;
  - `sweep`: pedido de 4 dias e 1 minuto expira, pedido de 3 dias e 23 horas não; sem cobrança há 16 minutos expira, há 14 não;
  - todo caso confere que a soma das movimentações bate com `stock` e `reserved`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(estoque): reserva, baixa, devolução, varredura e histórico`.

### Task 4: Login, usuários, código de recuperação e backup

**Files:**
- Create, portados do Kadoshi e da Revival, sem Hono:
  - `src/lib/server/auth.ts` (hash, sessões, limites, código de recuperação, `clientIp(headers)`);
  - `src/lib/server/users.ts`;
  - `src/lib/server/backups.ts`.
- Create:
  - `src/lib/session.ts`:
    - `getCurrentUser(): Promise<AuthUser | null>` (lê o cookie `fx_session`);
    - `requireUser(): Promise<AuthUser>` (redireciona para `/admin/entrar` se não houver sessão; para `/admin/senha` se `mustChangePassword`);
    - `requireOwner()`.
  - `src/lib/actions/auth.ts`: Server Actions `login`, `logout`, `changePassword`, `generateRecoveryCode`, `recover`.
  - `src/lib/actions/users.ts`: `createStaff`, `resetStaffPassword`, `deleteStaff`, só para o owner.
  - `src/instrumentation.ts`:
    - `register()` roda, só em `NEXT_RUNTIME === "nodejs"`, `ensureOwner(ADMIN_EMAIL, ADMIN_PASSWORD)`, backup na subida e a cada 6 h;
    - também agenda o `sweep` a cada 1 h, que chama `revalidateTag` nos slugs devolvidos.
  - `src/app/admin/backup/route.ts`: GET, só o owner, mesmo formato do Kadoshi, arquivo `fixastore-dados-YYYY-MM-DD.db`.
- Test:
  - `src/lib/server/auth.test.ts` (portar `recovery.test.ts`, `ratelimit.test.ts` e os casos de senha do Kadoshi para as funções puras);
  - `src/lib/server/users.test.ts`;
  - `src/lib/server/backups.test.ts`.

- [ ] **Step 1:** portar os testes do Kadoshi para funções puras, mais:
  - funcionário não cria usuário;
  - resetar a senha de um funcionário zera o `recovery_hash` dele;
  - o owner não pode ser excluído.
- [ ] **Step 2:** FAIL → **Step 3:** portar → **Step 4:** PASS.
- [ ] **Step 5:** commit `feat(auth): login, usuários, recuperação de acesso e backup`.

### Task 5: Checkout com reserva e pedidos no banco

**Files:**
- Modify:
  - `src/lib/actions/checkout.ts`: usa `findVariant` do repo, o disponível, `createOrderWithReservation` e `attachCharge`;
  - `src/lib/orders.ts`: `getOrderByToken(token)` lê do banco; mantém `newOrderId`;
  - `src/app/(checkout)/pedido-confirmado/page.tsx`;
  - `src/lib/asaas.ts`: `createCharge` devolve também `asaasPaymentId`.
- Test: `src/lib/actions/checkout.test.ts`, com o Asaas mockado e `DATA_DIR` temporário.

**Regras:**
- A ordem do fluxo:
  1. validações atuais;
  2. `createOrderWithReservation`;
  3. `createCharge`;
  4. `attachCharge`.
- Se a cobrança falhar, `cancelOrder(... restock:false)` com reason "falha ao gerar cobrança", que libera a reserva por estar em `aguardando`.
- Em `shortages`, volta o mesmo `cartFix` de hoje ("só restam N" / "esgotado").
- Invalida `productTag` dos slugs com `updateTag`.

- [ ] **Step 1: testes.**
  - pedido válido grava `aguardando` com reserva e redireciona para `/pedido-confirmado?pedido=<token>`;
  - o carrinho pede mais do que o disponível → `message` com "só restam" e `cartFix`;
  - o Asaas lança erro → pedido `cancelado` e reserva liberada;
  - a página de confirmação acha o pedido pelo token depois de "reiniciar" (nova conexão ao mesmo arquivo).
- [ ] **Step 2–4:** FAIL → implementar → PASS.
- [ ] **Step 5:** commit `feat(checkout): pedido no banco com reserva de estoque`.

### Task 6: Webhook do Asaas

**Files:**
- Create:
  - `src/app/api/asaas/webhook/route.ts`: POST;
  - `src/lib/server/asaas-webhook.ts`: `handleAsaasEvent(db, body: unknown, now: Date): { status: number; slugs: string[] }`.
- Test: `src/lib/server/asaas-webhook.test.ts`

**Regras:**
- Sem `ASAAS_WEBHOOK_TOKEN` configurado, ou com token diferente → 401, sem tocar no banco.
- Confirmação → `confirmPayment`.
- Expiração → `expireOrder`.
- Estorno → `flagRefund`.
- Evento desconhecido ou pedido inexistente → 200 e ignora (o Asaas reenvia em erro, e não queremos loop).
- Responde 200 rápido. Chama `revalidateTag(TAG_CATALOG, "max")` e `revalidateTag(productTag(s), "max")`.

- [ ] **Step 1: testes.**
  - token errado → 401;
  - `PAYMENT_CONFIRMED` baixa;
  - `PAYMENT_RECEIVED` seguinte → `duplicate`;
  - `PAYMENT_OVERDUE` em `aguardando` → cancelado e liberado;
  - `PAYMENT_REFUNDED` em `pago` → `refund_flag = 1`, estoque intacto;
  - corpo inválido → 400.
- [ ] **Step 2–4.**
- [ ] **Step 5:** commit `feat(asaas): webhook de pagamento com baixa idempotente`.

### Task 7: Painel — base, entrar, senha, segurança e usuários

**Files:**
- Create em `src/app/admin/`:
  - `layout.tsx` (shell com menu lateral recolhível, `noindex`, tema do painel);
  - `entrar/page.tsx` (login e "Esqueci minha senha");
  - `senha/page.tsx`;
  - `seguranca/page.tsx`;
  - `usuarios/page.tsx`.
- Create: `src/components/admin/*` (Field, FormError, PageHeader, Panel, Toast), portados do visual do Kadoshi para Server Components com `useActionState` onde há formulário.
- Modify: `next.config.ts` (`headers()` com os 4 cabeçalhos de segurança em `/:path*`).
- Test: `src/app/admin/*.test.tsx` (formulários com as actions mockadas).

**Regras:**
- O menu tem Início, Produtos, Estoque, Pedidos, Usuários (só owner), Segurança, Trocar senha e Recolher.
- Aviso amarelo "Gere seu código de recuperação…" quando `!hasRecoveryCode`.

- [ ] **Step 1: testes.**
  - login errado mostra "E-mail ou senha incorretos.";
  - "Esqueci minha senha" envia `{ email, code, next }`;
  - Segurança sem senha mostra "Informe sua senha atual.";
  - Usuários: o funcionário não vê o item no menu, e o acesso direto redireciona.
- [ ] **Step 2–4:** testes passam; `npm run build` ok.
- [ ] **Step 5:** commit `feat(admin): base do painel, login, segurança e usuários`.

### Task 8: Painel — Produtos

**Files:**
- Create:
  - `src/app/admin/produtos/page.tsx` (lista com busca, departamento e situação ativo/pausado/esgotado);
  - `src/app/admin/produtos/novo/page.tsx`;
  - `src/app/admin/produtos/[id]/page.tsx`;
  - `src/lib/actions/products.ts`: `saveProduct`, `setProductStatus`, `deleteProduct`, `uploadProductPhoto`;
  - `src/lib/server/images.ts` (portado da Revival: `sharp` + `heic-convert`, limite de 10 MB);
  - `src/app/uploads/[name]/route.ts` (serve só o nome do arquivo, sem `..`).
- Test: `src/lib/actions/products.test.ts`, `src/lib/server/images.test.ts`

**Regras:**
- `saveProduct` valida com zod:
  - nome obrigatório;
  - `slug` gerado do nome (sem acento, único; se repetir, `-2`, `-3`…);
  - departamento existente;
  - ao menos 1 variação;
  - SKU único no banco;
  - preço > 0;
  - `compare_at` vazio ou maior que o preço.
- O estoque **não** é editado aqui: variação nova nasce com 0 e entra pela tela Estoque, para tudo passar pelo histórico.
- `deleteProduct`: se alguma variação aparece em `order_lines`, só pausa e avisa "Este produto já teve pedidos; ele foi pausado em vez de excluído.".
- Toda ação invalida `catalogo` e `produto:<slug>` (o antigo e o novo, se o slug mudou) com `updateTag`.

- [ ] **Step 1: testes.**
  - criar → aparece no `listProducts`;
  - SKU duplicado → erro "Este código já está em outro produto.";
  - `compare_at` menor que o preço → erro;
  - pausar some da loja;
  - excluir produto com pedido → pausado e com o aviso;
  - imagem PNG vira WebP; arquivo de 11 MB recusado; `.svg` recusado;
  - rota de uploads recusa `../x`.
- [ ] **Step 2–4.**
- [ ] **Step 5:** commit `feat(admin): cadastro de produtos com foto`.

### Task 9: Painel — Estoque

**Files:**
- Create:
  - `src/app/admin/estoque/page.tsx` (lista por código com estoque, reservado e disponível; filtros "acabando" ≤ 5 e "esgotado"; busca);
  - `src/app/admin/estoque/[sku]/page.tsx` (entrada, ajuste e histórico);
  - `src/lib/actions/stock.ts`: `addStockAction`, `setStockAction`.
- Test: `src/lib/actions/stock.test.ts`

**Regras:**
- O histórico mostra data, tipo em português (Entrada, Ajuste, Reserva, Liberação, Venda, Devolução), quantidade com sinal, motivo, pedido (link) e quem fez ("Sistema" quando `null`).

- [ ] **Step 1: testes.**
  - entrada de 10 soma e grava `entrada`;
  - motivo vazio → "Informe o motivo.";
  - ajuste abaixo do reservado mostra a mensagem da Task 3;
  - o filtro "acabando" mostra disponível 1..5 e esconde 0 e 6.
- [ ] **Step 2–4.**
- [ ] **Step 5:** commit `feat(admin): estoque com entrada, ajuste e histórico`.

### Task 10: Painel — Pedidos e Início

**Files:**
- Create:
  - `src/app/admin/pedidos/page.tsx` (abas por etapa, com contagem);
  - `src/app/admin/pedidos/[id]/page.tsx` (cliente, entrega, itens, valores, linha do tempo de `order_events`, link da fatura);
  - `src/lib/actions/orders.ts`: `advanceStage`, `backStage`, `cancelOrderAction`, `fulfillOutOfStockAction`, `markPaidDemo`;
  - `src/app/admin/page.tsx` (Início).
- Test: `src/lib/actions/orders.test.ts`, `src/app/admin/pedidos/*.test.tsx`

**Regras:**
- **Botões por etapa:**
  - `aguardando`: Cancelar, e "Marcar como pago" **só se** `demo = 1` ou o Asaas estiver desligado;
  - `pago`: Marcar como separado / Cancelar;
  - `separado`: Marcar como enviado (com campo de código de rastreio, opcional) / Voltar para pago / Cancelar;
  - `enviado`: Marcar como entregue / Voltar para separado / Cancelar;
  - `entregue`: Voltar para enviado;
  - `pago_sem_estoque`: Atender / Cancelar e estornar.
- **Cancelar depois de pago** abre a pergunta "As unidades voltam para o estoque?" (Sim/Não) e o lembrete "O estorno do dinheiro é feito no painel do Asaas.".
- **Aviso de estorno:** `refund_flag` mostra uma faixa "O Asaas informou estorno ou contestação deste pagamento.".
- **Início:**
  - cartões "Pagos para separar", "Separados para enviar" e "Pago sem estoque" (este em destaque vermelho se > 0);
  - lista dos códigos acabando.

- [ ] **Step 1: testes.**
  - `markPaidDemo` recusado com o Asaas ligado;
  - cancelar `pago` com `restock` devolve;
  - `pago_sem_estoque` aparece no Início com destaque;
  - voltar etapa grava o evento.
- [ ] **Step 2–4.**
- [ ] **Step 5:** commit `feat(admin): pedidos com etapas e tela inicial`.

### Task 11: Implantação, documentação e teste de ponta a ponta

**Files:**
- Modify:
  - `Dockerfile`:
    - `better-sqlite3` e `sharp` funcionando no runtime (alpine com libs ou troca para `node:22-slim`);
    - `DATA_DIR=/data` e `VOLUME /data`, com dono `nextjs`;
    - HEALTHCHECK.
  - `.env.example`: `DATA_DIR`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ASAAS_WEBHOOK_TOKEN`, sem valores.
  - `README.md`: seção "Painel", com o webhook do Asaas (URL `/api/asaas/webhook`, eventos a marcar e token), volume, proxy, backup e recuperação.
- Create: `docs/guia-do-painel.pdf` (mesmo processo dos guias anteriores, com prints de uma instância de teste).
- Script de teste de ponta a ponta no scratchpad (não vai para o repositório), via puppeteer, sobre um build local com `DATA_DIR` temporário.

**O roteiro de ponta a ponta:**
1. primeiro acesso e troca de senha;
2. criar produto com foto;
3. entrada de estoque de 2;
4. compra de 2 no site (modo demonstração);
5. a loja mostra "Esgotado";
6. "Marcar como pago";
7. separar e enviar com rastreio;
8. histórico com Entrada +2, Reserva, Venda −2;
9. o webhook simulado com token certo baixa um pedido, e o reenvio não baixa de novo;
10. um ajuste abaixo do reservado é recusado;
11. o painel a 390 px sem rolagem lateral.

- [ ] **Step 1:** `npm run build` e `docker build .` ok (se o Docker estiver disponível; senão, registrar).
- [ ] **Step 2:** rodar o roteiro → tudo OK.
- [ ] **Step 3:** commit `chore(deploy): Docker com volume, README e guia do painel`.
