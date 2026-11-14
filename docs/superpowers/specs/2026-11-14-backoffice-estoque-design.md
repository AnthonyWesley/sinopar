# Back office da Fixa Store (Sinopar): catálogo, estoque e pedidos

## Por quê

A loja online da Fixa Store (razão social Sinopar, Sinop‑MT) está pronta só como front: o catálogo é um arquivo no código (`src/lib/catalog.ts`), os pedidos ficam na memória do servidor e nada baixa estoque. A Sinopar **não controla estoque em lugar nenhum** hoje. O combinado era fazer o front e, se autorizado, o back. Agora está autorizado.

O painel passa a ser **a fonte da verdade** do que está à venda e de quanto existe. Sucesso significa: a loja só vende o que tem, o número do estoque bate com a realidade sem ninguém mexer depois de cada venda, e a equipe cadastra, ajusta e acompanha pedidos sem depender da agência.

## Objetivos

1. **Produtos:**
   - cadastrar, editar, **pausar** (sai da loja sem apagar) e excluir;
   - cada produto tem nome, departamento, descrição, especificações, foto e variações: código (SKU do fornecedor), nome da variação, preço, preço "de", estoque e quantidade por caixa.
2. **Estoque:**
   - lista por código com filtros "acabando" (≤ 5) e "esgotado";
   - **entrada** de mercadoria e **ajuste**, sempre com motivo;
   - **histórico de movimentações** por código: entrada, venda, ajuste, reserva, liberação e devolução, com quem fez e quando.
3. **Pedidos:**
   - guardados no banco;
   - etapas no painel: **Aguardando pagamento → Pago → Separado → Enviado** (com código de rastreio) **→ Entregue**, ou **Cancelado**;
   - quem atende muda a etapa.
4. **Baixa automática:**
   - ao fechar o pedido, o site **reserva** as unidades;
   - quando o Asaas confirma o pagamento (webhook), a reserva vira **baixa**;
   - se o pagamento não chegar no prazo, ou o pedido for cancelado antes de pago, as unidades **voltam**.
5. **Usuários:**
   - um **Responsável** e **funcionários**;
   - login seguro, código de recuperação, limite de tentativas, backup diário e download da cópia, iguais aos do Kadoshi e da Revival.
6. **Loja lendo do banco:** salvar no painel atualiza a loja na hora (preço, estoque, produto novo, produto pausado).
7. **Ponto de partida:** na primeira subida, o banco recebe o catálogo atual (61 produtos, 103 códigos da planilha), com os preços e estoques de exemplo, para a equipe corrigir pelo painel.

## Não‑objetivos (fica de fora agora)

- Frete real: a transportadora ainda não foi escolhida e o `mockProvider` continua.
- Nota fiscal.
- Importar ou exportar planilha.
- Aviso ao cliente por e‑mail ou WhatsApp. O site já diz que "a loja avisa pelo celular".
- Edição de departamentos e de segmentos (os 9 departamentos continuam no código).
- Boleto e parcelamento. Hoje o site aceita só Pix e cartão.
- Relatórios de vendas.

## Anti‑objetivos (falha mesmo se "funcionar")

- **Vender o que não existe:** dois clientes comprando a última unidade ao mesmo tempo, ou uma reserva que nunca volta e esconde estoque para sempre.
- **Estoque que muda sem explicação:** toda alteração precisa ter registro no histórico.
- **Painel que só a agência consegue usar:** o público é a equipe da loja, no celular e no computador.
- **Hospedagem complicada:** o cliente paga só o hosting. Um serviço e um volume, como os outros dois.

## Restrições

- **Next.js 16** com `cacheComponents` e `partialPrefetching` ligados, `output: "standalone"`. O `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de codar.
  - Atualizar a loja depois de salvar: `cacheTag` nas leituras do catálogo, `updateTag` nas Server Actions do painel e `revalidateTag` no webhook (que é um Route Handler).
- **O banco não existe no build da imagem Docker**, só em tempo de execução, no volume `/data`.
  - `generateStaticParams` e o `proxy.ts` (que hoje barra slugs desconhecidos com 404 a partir das listas fixas) não podem depender do banco no build.
  - Os slugs passam a ser checados em tempo de execução.
- **Dinheiro:** valores sempre em **centavos inteiros**, como já é no código.
- **Banco:** SQLite (better‑sqlite3) em `DATA_DIR` (padrão `/data`), com migrações por `PRAGMA user_version`.
- **Fotos:** enviadas pelo painel e guardadas em `DATA_DIR/uploads`. Convertidas para WebP com `sharp`, como na Revival.
- **Asaas:**
  - o webhook é autenticado pelo token configurado no Asaas (cabeçalho `asaas-access-token`) e comparado com `ASAAS_WEBHOOK_TOKEN`;
  - o webhook é idempotente: o mesmo evento duas vezes não baixa duas vezes;
  - sem `ASAAS_API_KEY`, o modo demonstração continua, e o painel ganha um botão "Marcar como pago" que só existe nesse modo.
- **Segredos** só em variáveis de ambiente.
- **Cores e tipografia** da loja não mudam. O painel usa o visual minimalista dos outros painéis, com o amarelo da marca como destaque.

## Abordagens consideradas

1. **Tudo dentro do Next atual, com SQLite e o login dos outros projetos (escolhida).**
   - Um único serviço.
   - Reaproveita login, código de recuperação, backup e limite de tentativas já revisados.
   - O SQLite grava um por vez, o que basta para a loja e ajuda a reserva a não errar.
2. **Next com Postgres.** Mais robusto para muito volume, mas é mais um serviço para manter e pagar. Dá para migrar depois.
3. **Payload CMS embutido.** O painel vem pronto, mas a dependência é pesada e incerta com o Next 16, o painel fica genérico, e a lógica de estoque seria escrita à mão do mesmo jeito.

Escolhida pelo usuário: **1**.

## Como deve funcionar

### Estoque disponível

- Cada variação tem `estoque` (o que existe na prateleira) e `reservado` (o que está em pedidos ainda não pagos).
- A loja mostra e vende **disponível = estoque − reservado**.

### Fechar o pedido (checkout)

1. A Server Action de checkout, numa **única transação**, confere se cada linha cabe no disponível.
2. Se cabe, grava o pedido como **Aguardando pagamento**, soma ao `reservado` e registra uma movimentação **reserva** por linha.
3. Se não cabe, nada é gravado e o cliente vê qual item não tem quantidade suficiente.
4. Depois da transação, cria a cobrança no Asaas.
5. Se a cobrança falhar, a reserva é liberada e o pedido é cancelado.

### Pagamento confirmado

- Os eventos `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` com `externalReference` igual ao número do pedido disparam uma transação que:
  - tira de `estoque` e de `reservado`;
  - registra movimentações **venda**;
  - passa o pedido para **Pago**;
  - guarda o id do evento, para ignorar uma repetição.

### Prazo vencido

- Pagamento vencido ou estornado antes da confirmação (`PAYMENT_OVERDUE`, `PAYMENT_DELETED`), ou pedido aguardando há mais de **3 dias** (o vencimento usado hoje):
  - o pedido vira **Cancelado**;
  - a reserva é liberada (movimentação **liberação**).
- Uma varredura no servidor roda na subida e a cada hora, como o backup.

### Cancelar no painel

- **Antes de pago:** libera a reserva.
- **Depois de pago:** pergunta se as unidades voltam ao estoque (movimentação **devolução**) e lembra que o estorno do dinheiro é feito no Asaas.

### Estoque manual

- **Entrada:** soma ao estoque.
- **Ajuste:** define o número contado, com motivo obrigatório.
- O estoque nunca fica abaixo do reservado. Se o ajuste deixaria, o painel avisa e não salva.

### Painel `/admin`

- **Início:** pedidos aguardando ação (pagos a separar, separados a enviar) e alertas de estoque acabando.
- **Produtos:** lista com busca e filtro por departamento e situação (ativo, pausado, esgotado). Formulário com foto, variações e especificações.
- **Estoque:** lista por código, com entrada, ajuste e histórico.
- **Pedidos:**
  - lista por etapa;
  - detalhe com cliente, entrega, itens e valores;
  - botões para avançar a etapa, código de rastreio e cancelar.
- **Usuários** (só o Responsável) e **Segurança**.

### Loja

- Catálogo, departamentos, produto e busca leem do banco, com `cacheTag("catalogo")` e `cacheTag(\`produto:${slug}\`)`.
- Produto pausado não aparece e a URL dele dá 404.
- A página de confirmação do pedido passa a ler do banco (hoje lê da memória).

### Respostas à revisão do construtor

- **De onde vem o login e o backup:** do Kadoshi, em `C:\Users\Anthony\Desktop\Coletto\kadoshi-sushi-page`, branch `feat/backoffice`. São Hono + better‑sqlite3, e no Next viram funções chamadas pelas Server Actions e pelos Route Handlers. Os arquivos:
  - `server/auth.ts`: senhas scrypt, sessões com hash sha256, limite por e‑mail + IP, código de recuperação;
  - `server/routes/auth.ts`;
  - `server/backups.ts`;
  - `server/db.ts`: migrações.

  Os papéis owner/editor e a tela de Usuários vêm da Revival (`revival-church-website`, `server/routes/users.ts` e `src/admin/pages/Users.tsx`). A lógica é copiada e adaptada; o transporte (Hono) é trocado pelo do Next.
- **Pagamento confirmado mais de uma vez:**
  - no cartão, o Asaas manda `PAYMENT_CONFIRMED` e, semanas depois, `PAYMENT_RECEIVED`;
  - a baixa só acontece na transição **Aguardando pagamento → Pago**: qualquer evento com o pedido já em Pago ou depois só fica registrado;
  - além disso, o id do evento é guardado, para ignorar reenvios.
- **Eventos depois de Pago:**
  - `PAYMENT_OVERDUE`/`PAYMENT_DELETED` são ignorados;
  - estorno e chargeback (`PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_*`) **não mexem no estoque sozinhos**: o pedido ganha um aviso "estorno no Asaas" no painel, e a equipe decide se cancela e se devolve as unidades.
- **Pagamento que chega com o pedido já Cancelado** (decisão do usuário, opção A):
  - se o disponível ainda cobre todas as linhas, o pedido volta para **Pago** e baixa normalmente (movimentações **venda**);
  - se não cobre, o pedido vai para a etapa **Pago sem estoque**, sem mexer no estoque, e aparece em destaque no Início do painel;
  - a partir de "Pago sem estoque", a equipe pode **Atender** (baixa quando houver estoque e segue para Pago) ou **Cancelar e estornar** (cancela; o dinheiro é devolvido no Asaas);
  - o estoque nunca fica negativo.
- **Prazo da varredura:** cancela pedidos aguardando há mais de **4 dias**, ou seja, o vencimento de 3 dias mais 1 de folga, para não disputar com um Pix pago no último dia.
- **Pedido sem cobrança:** se o servidor cair entre a reserva e a criação da cobrança no Asaas, a varredura também cancela e libera pedidos sem cobrança registrada há mais de **15 minutos**. A cobrança é um campo opcional no pedido.
- **Etapas e cancelamento:**
  - dá para cancelar em qualquer etapa, menos **Entregue**;
  - depois de Pago, o painel pergunta se as unidades voltam ao estoque;
  - as etapas avançam uma de cada vez, e dá para **voltar uma etapa** para corrigir engano;
  - toda mudança fica registrada no pedido, com quem fez e quando.
- **Cache da loja:** as leituras do catálogo usam `cacheTag`. Toda mudança de estoque, seja no painel, no checkout, no webhook ou na varredura, invalida `produto:<slug>` e `catalogo` (`updateTag` nas Server Actions, `revalidateTag` nos demais). A checagem que vale é a transação do checkout: um número antigo na tela nunca deixa vender além do disponível.
- **Seed:**
  - vem de `src/lib/catalog.ts` (já contém os dados da planilha) e roda só quando a tabela de produtos está vazia;
  - nunca recarrega por cima;
  - o número do pedido continua no formato de `newOrderId` (`SP-…`), que já vai para o Asaas como `externalReference`.
- **Fotos:**
  - **uma por produto**, como a loja mostra hoje;
  - JPG, PNG, WebP ou HEIC, até 10 MB, convertidas para WebP;
  - as fotos que já estão em `public/images/produtos` continuam como arquivos estáticos e só são substituídas quando alguém envia outra pelo painel.
- **Permissões:** funcionários podem tudo, inclusive pausar, excluir e cancelar, menos Usuários e baixar a cópia do banco.

## Decisões minhas (podem ser corrigidas)

- "Acabando" é **≤ 5**, o valor de `LOW_STOCK` hoje.
- A reserva expira em **3 dias**, o mesmo vencimento de hoje.
- Ao excluir um produto que já teve pedidos, ele é pausado em vez de apagado, porque o pedido antigo precisa continuar mostrando o nome.
- Os funcionários podem tudo, menos Usuários e baixar a cópia do banco.
- O histórico de movimentações nunca é apagado.

## Fica para o construtor

- Esquema exato das tabelas e nomes.
- Como dividir as telas em componentes.
- Como fazer o `proxy.ts` validar slugs em tempo de execução, ou trocá‑lo por `notFound()` com um status 404 correto no Next 16.
- Detalhes do formulário de variações.
