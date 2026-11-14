# Sinopar Ferramentas — loja online e painel da loja

Loja de parafusos e ferramentas de Sinop (MT) que vende para o Brasil todo: construtoras,
produtores rurais, empresas e varejo. O objetivo único do site é **vender online**. O brief original está em
[`docs/brief-sinopar-ferramentas.md`](docs/brief-sinopar-ferramentas.md).

> **Tudo o que é preço, estoque, desconto, prazo e frete é EXEMPLO.** O site mostra isso numa
> faixa no topo. Antes de publicar de verdade, troque pelo catálogo e pelas regras reais.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Variáveis em `.env.example`. Sem `ASAAS_API_KEY`, o checkout fica em **modo demonstração**:
o pedido é gravado no banco e reserva o estoque, mas nada é cobrado (no painel aparece
"Marcar como pago"). Sem `DATA_DIR`, o banco fica em `./data`. O painel da loja está em
`/admin` (ver [Painel](#painel)).

## Stack

Next.js 16 (App Router, Cache Components) + Tailwind 4, sem outras dependências de interface.
Catálogo, categorias e páginas de produto são **pré-renderizados** (HTML estático). A listagem
com filtros é renderizada no servidor a partir da URL. JavaScript no navegador só para busca
preditiva, carrinho, menus e checkout.

## Páginas

| Rota | Conteúdo |
|---|---|
| `/` | Home: banner com menu lateral de departamentos, garantias, ofertas, vitrines por departamento, banners, orçamento para empresas, destaques, loja e serviços |
| `/produtos` | Todos os produtos, com busca (`?q=`), filtros e ordenação |
| `/produtos/[categoria]` | Departamento (9) |
| `/produto/[slug]` | Produto: nome, foto, preço, variação, estoque, compra, entrega, trocas |
| `/carrinho` | Carrinho com escolha de entrega e total |
| `/checkout` | Compra sem cadastro (dados, entrega, pagamento) |
| `/pedido-confirmado` | Confirmação e link de pagamento do Asaas |
| `/servicos` | Orçamento para empresas, entrega e retirada, pagamento, trocas e devoluções |
| `/contato` | Contato e localização (mapa do Google) |

**Páginas do brief que foram adaptadas** (decisão combinada com o cliente):

- **Contato** e **Localização** viraram uma página só (`/contato`).
- **Serviços** reúne o que a loja oferece além do produto e as regras de compra.
- **Preços** não virou página: o preço está em cada produto, no carrinho e no checkout.
- **Reservas** e **Portfólio** foram removidas: não há conteúdo real para uma loja de ferramentas.
  O "sistema de reserva" do brief virou o pedido de orçamento (`/servicos#orcamento`).

## Onde trocar os dados

| O quê | Arquivo |
|---|---|
| Produtos, variações, preços, fotos, estoque | Painel `/admin` (banco SQLite). `src/lib/catalog.ts` só carrega o catálogo inicial quando o banco está vazio |
| Departamentos | `src/lib/catalog.ts` (`categories`) |
| Endereço, telefone, e-mail, horário, Instagram | `src/lib/site.ts` (hoje `null` = "a confirmar") |
| WhatsApp | variável `WHATSAPP_NUMBER` (sem ela os botões de WhatsApp somem) |
| Frete (provider, opções, valores e prazos) | `src/lib/shipping.ts`, ver [`docs/integracao-frete.md`](docs/integracao-frete.md) |
| Cobrança | `src/lib/asaas.ts` + `ASAAS_API_KEY` |
| Logo | `public/images/logo-sinopar.webp` (oficial), `src/components/logo.tsx` e `src/app/icon.png` (favicon tirado do selo do logo) |
| Fotos | `public/images/produtos/*.webp` |

## Decisões de design

- **Layout** inspirado no modelo de loja de autopeças enviado pelo time (`../sinopar-ideia.png`):
  - cabeçalho branco e faixa amarela fixa com departamentos, busca e carrinho;
  - menu lateral de departamentos ao lado do banner;
  - vitrines com título em aba;
  - banners cinza por departamento;
  - "Destaques da loja" com um produto grande no meio;
  - bloco da loja com cartões de serviço;
  - rodapé claro.

  Do modelo ficaram de fora a contagem regressiva, a barra "% vendido", as estrelas, os depoimentos,
  o blog, as marcas e a newsletter: o brief proíbe urgência falsa e avaliações inventadas, e não há
  conteúdo real para as outras seções.
- **Cores** só do amarelo, preto e branco da marca. Nos botões o amarelo fica reservado para comprar
  ("Adicionar ao carrinho", "Finalizar compra"); fora deles ele aparece na faixa do cabeçalho, nas abas
  de título e nos ícones dos serviços. O vermelho aparece só em desconto. O estoque
  usa verde, âmbar escuro e cinza, sempre com texto ("Em estoque", "Restam 3 unidades", "Esgotado").
  O contraste foi conferido no padrão WCAG 2.2 AA (comentário em `globals.css`).
- **Tipografia:** Archivo esticada (larga e pesada) nos títulos e Inter no texto, com números tabulares em preços e quantidades.
- **Cartões com altura fixa:** foto quadrada, nome em 2 linhas e linhas reservadas para "a partir de" e preço "de".
- **Página de produto** na ordem do brief: nome, foto, preço, variação, estoque, compra, entrega, trocas.
  No celular, uma barra fixa mantém preço e botão de compra sempre à mão.
- **Checkout** sem menu nem vitrine e sem cadastro obrigatório. O custo da entrega aparece já no
  carrinho. Erros ficam num resumo com links para cada campo, e o foco vai para esse resumo.
- **Cartão de crédito:** o comprador digita os dados na página do Asaas; o site nunca recebe dados de cartão.
- **Movimento:** gaveta, menu e confirmação entre 140 e 240 ms. Com `prefers-reduced-motion`, o deslize vira um fade curto.
- **SEO:** dados estruturados `HardwareStore`, `Product`/`AggregateOffer` e `BreadcrumbList`.
  Também há canonical por produto (variações não geram URL própria), `sitemap.xml` e `robots.txt`.

## Premissas (confirmar com a Sinopar)

1. **Catálogo**: os itens vêm da planilha "LISTA DE ITENS SITE SINOPAR FERRAMENTAS.xlsx" (103 códigos agrupados em
   61 produtos com variação, ex.: os 9 grãos do disco velcro). O SKU é o código do fornecedor e a quantidade por caixa
   está guardada em `boxQty`, sem aparecer na loja. **Ainda são exemplo**: preços, estoques, descontos, descrições,
   a divisão em 9 departamentos e o agrupamento das variações. Venda por unidade (não por caixa) também é suposição.
2. **Frete**: cálculo por CEP com valores de exemplo. A transportadora (Correios, intermediário ou Mercado Livre)
   será decidida com o cliente, ver [`docs/integracao-frete.md`](docs/integracao-frete.md). Retirada grátis em Sinop e
   entrega local por R$ 15,00 (CEPs 7855x-xxx) também são suposições.
3. **Pagamento**: Pix, boleto e cartão de crédito via Asaas, com vencimento do boleto em 3 dias. Parcelamento não está no site.
4. **Trocas**: o site mostra só o que a lei garante (7 dias de arrependimento e 90 dias de garantia, pelo CDC).
   Regras próprias da loja ainda não existem.
5. **Endereço, telefone, e-mail, horário, CNPJ e Instagram**: desconhecidos, mostrados como "a confirmar".
6. **Segmentos** (construção, rural, indústria, casa) atribuídos a cada produto por suposição.
7. **Fotos**: o logo é o oficial, mas só alguns produtos têm foto provisória do Wikimedia Commons (créditos em
   [`docs/creditos-imagens.md`](docs/creditos-imagens.md)). O resto mostra "Foto em breve" até a Sinopar mandar as fotos.
8. **Avisos ao cliente**: o site diz que "a loja avisa pelo celular" quando o pedido estiver separado.
   Não existe envio automático de e-mail nem de WhatsApp.

## O que ficou de fora, e por quê

- **Avaliações de clientes**: o brief proíbe inventar e a loja ainda não tem pedidos. Entram quando houver avaliações verificadas.
- **Feed do Instagram**: não sabemos a conta, e seria preciso um token da API da Meta. Fica só o link no rodapé quando `site.instagram` for preenchido.
- **Comparação de produtos e lista de desejos**: estão no brief, mas com cerca de 60 produtos não compensam o JavaScript extra.
  Os filtros e a ordenação cobrem a decisão por enquanto.
- **Integração de frete real**: depende da escolha da transportadora e do peso e das medidas dos produtos.
- **Nota fiscal**: o painel não emite nota. Pedidos, estoque, webhook do Asaas e painel já existem (ver [Painel](#painel)).
- **Avisos automáticos ao cliente** (e-mail/WhatsApp quando o pedido muda de etapa): a loja avisa por conta própria.
- **Integração com o sistema de reserva**: não há sistema identificado. Se houver, o contrato precisa ser passado antes de integrar.
- **Asaas**: implementado pela API pública v3 (`/customers` e `/payments`) e pelo webhook de pagamentos
  (ver [Painel](#painel)). Se a Sinopar já tiver integração ou webhook, siga o contrato dela.

## Verificação feita

Teste ponta a ponta em Chrome headless (44 verificações):

- **Larguras:** 375, 768 e 1440 px, sem rolagem horizontal em 8 páginas.
- **Frete:** o CEP de Sinop mostra a entrega local e o de São Paulo troca as opções. O pedido fecha com entrega expressa para SP.
- **Busca:** a busca preditiva tolera erro de digitação ("parafuzo"), a busca vazia orienta o usuário e os filtros mostram chips ativos.
- **Produto:** trocar a variação troca o preço e produto esgotado não deixa comprar.
- **Carrinho:** a gaveta confirma o item adicionado e cabe inteira na tela, o frete entra no total e o carrinho esvazia depois do pedido.
- **Checkout:** a validação acessível passa o foco para o resumo de erros, o pedido é confirmado em modo demonstração.
- **Acessibilidade:** o primeiro Tab leva a "Pular para o conteúdo" e, com movimento reduzido, a gaveta usa fade.

Painel (Task 11): teste de ponta a ponta em Chrome headless sobre o build standalone, com banco
temporário: primeiro acesso e troca de senha, produto com foto, entrada de 2, compra de 2 no site,
"Esgotado" na loja, "Marcar como pago", separar e enviar com rastreio, histórico (Entrada +2,
Reserva, Venda −2), webhook (token errado 401; token certo baixa uma vez; reenvio, com o mesmo id
ou com outro, não baixa de novo), ajuste abaixo do reservado recusado e todas as telas do painel a
390 px sem rolagem lateral.

## Painel

O painel fica em `/admin` e é usado pela equipe da loja no celular ou no computador. Guia para a
equipe, com as telas: [`docs/guia-do-painel.pdf`](docs/guia-do-painel.pdf).

- **Produtos:** cadastrar e editar (com foto: JPG, PNG, WebP ou HEIC do celular, convertida para WebP),
  variações e preços, pausar (tirar da loja) e excluir (só produto que nunca teve pedido).
- **Estoque:** entrada de mercadoria, ajuste por contagem (nunca abaixo do reservado) e histórico de
  cada código, com o efeito no Estoque e no Reservado.
- **Pedidos:** o checkout grava o pedido e **reserva** as unidades; o pagamento confirmado pelo Asaas
  vira **venda** (baixa o estoque). Etapas pago → separado → enviado (com rastreio) → entregue;
  cancelar devolve ou não ao estoque; pagamento que chega com o pedido já cancelado e sem estoque
  vira "Pago sem estoque". Pedidos não pagos vencem sozinhos (varredura de hora em hora).
- **Usuários** (só o Responsável): funcionários com senha provisória, redefinir senha, remover.
- **Segurança:** trocar senha, código de recuperação e, para o Responsável, baixar uma cópia do banco.

### Variáveis de ambiente (runtime)

| Variável | Para quê |
|---|---|
| `DATA_DIR` | Pasta do banco (`site.db`), das fotos enviadas (`uploads/`) e das cópias (`backups/`). No Docker já vale `/data`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Criam o **Responsável** na primeira subida, se ainda não houver um. A senha é temporária: o painel exige trocar no primeiro acesso. Depois disso não são mais lidas. |
| `ASAAS_API_KEY`, `ASAAS_API_URL` | Cobrança no Asaas. Sem a chave, checkout em modo demonstração. |
| `ASAAS_WEBHOOK_TOKEN` | Token que o Asaas manda no cabeçalho `asaas-access-token`. Sem ele o webhook recusa tudo (401). |
| `PORT`, `HOSTNAME` | Já definidas no Dockerfile (`3000` e `0.0.0.0`). Não mude: a varredura de hora em hora chama `http://127.0.0.1:${PORT}/api/interno/varredura` no próprio processo. Se essa chamada falhar, o log mostra um aviso (uma vez) e a varredura roda direto no banco. |

### Volume `/data` (obrigatório)

Banco, fotos dos produtos e cópias ficam em `/data` dentro do container. **Sem um volume persistente
montado em `/data`, tudo isso se perde a cada deploy.** No Coolify: *Persistent Storage* → volume com
destino `/data`. O Dockerfile já cria a pasta com dono `nextjs` (o usuário que roda o servidor).

### Proxy e HTTPS

O site precisa ficar atrás de um proxy (Coolify/Traefik, Caddy, Nginx) que:

- sirva por **HTTPS**: em produção o cookie de sessão do painel é `Secure`, e sem HTTPS o login não
  se mantém;
- acrescente o IP do cliente ao `X-Forwarded-For`. O limite de tentativas de login usa o **último**
  IP desse cabeçalho (o que o proxy pôs); sem proxy, todos os acessos contam como um IP só.

### Webhook do Asaas

No painel do Asaas: *Integrações → Webhooks → Adicionar*:

- **URL:** `https://<domínio>/api/asaas/webhook`
- **Token de autenticação:** o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- **Eventos de cobrança a marcar:** `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`,
  `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`
- Fila **sequencial** (padrão) e envio ativado.

O que cada evento faz: confirmado/recebido baixa o estoque uma vez só (o id do evento é guardado;
reenvio não baixa de novo); vencido/removido cancela o pedido não pago e libera a reserva;
estorno/chargeback marca o pedido com aviso de estorno (o estoque não muda sozinho). Evento desconhecido ou de
pedido inexistente responde 200 e é ignorado. Token errado responde 401.

### Cópias do banco

- **Automática:** uma por dia em `/data/backups/site-AAAA-MM-DD.db` (data de Cuiabá), feita na subida
  e conferida a cada 6 h; ficam as **7** mais recentes.
- **Manual:** o Responsável baixa uma cópia na hora em *Segurança → Baixar cópia dos dados*.
- Para restaurar: pare o container, troque `/data/site.db` pela cópia (apague `site.db-wal` e
  `site.db-shm`) e suba de novo.

### Código de recuperação

Em *Segurança*, o Responsável gera um código (formato `XXXX-XXXX-XXXX`) que aparece uma vez só. Com
ele, em *Entrar → Esqueci minha senha*, define uma senha nova sem ajuda técnica. Funcionário que
esquece a senha recebe uma provisória do Responsável em *Usuários*.

### Comandos de emergência (dentro do container)

O build gera `cli.js` ao lado do `server.js` (empacotado por `scripts/build-cli.mjs`, roda com `node`
puro). Usa o mesmo banco (`${DATA_DIR}/site.db`). No Coolify, abra o *Terminal* do container, ou:

```bash
# Responsável perdeu senha e código: define e-mail e senha temporária (troca obrigatória no
# próximo login; o código de recuperação é apagado e as sessões abertas caem)
docker exec -it <container> node cli.js reset-owner --email dono@exemplo.com.br --password 'senha-temporaria'

# Cópia consistente do banco (mesmo com o site no ar); o arquivo não pode existir
docker exec -it <container> node cli.js backup /data/manual-2026-11-14.db
docker cp <container>:/data/manual-2026-11-14.db .
```

Fora do Docker (desenvolvimento): `npm run build` e `node .next/standalone/cli.js ...`, com
`DATA_DIR` apontando para a pasta do banco.

## Deploy (Coolify)

Dockerfile pronto (Node 22 Alpine, `output: "standalone"`, porta 3000, `HEALTHCHECK` em `/`).
`SITE_URL` e `WHATSAPP_NUMBER` precisam estar marcadas também como **Build Variable**, porque as
páginas são geradas no build. As demais (`ASAAS_*`, `ADMIN_*`) são lidas em runtime. Antes do
primeiro deploy: volume em `/data`, HTTPS no domínio, `ADMIN_EMAIL`/`ADMIN_PASSWORD` e o webhook
do Asaas configurado como acima.

`better-sqlite3` e `sharp` são nativos e já trazem o binário para Alpine (musl): o `npm ci` roda com
`--ignore-scripts` para o npm não tentar compilar o SQLite, e o rastreio do standalone copia o
binário certo para a imagem final.
