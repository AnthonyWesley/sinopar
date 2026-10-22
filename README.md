# Sinopar Ferramentas — loja online (v1, front com dados de exemplo)

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
o pedido é registrado em memória e nada é cobrado.

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
| `/produtos/[categoria]` | Departamento (7) |
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
| Produtos, variações, preços, estoque, departamentos | `src/lib/catalog.ts` |
| Endereço, telefone, e-mail, horário, Instagram | `src/lib/site.ts` (hoje `null` = "a confirmar") |
| WhatsApp | variável `WHATSAPP_NUMBER` (sem ela os botões de WhatsApp somem) |
| Frete (provider, opções, valores e prazos) | `src/lib/shipping.ts`, ver [`docs/integracao-frete.md`](docs/integracao-frete.md) |
| Cobrança | `src/lib/asaas.ts` + `ASAAS_API_KEY` |
| Logo | `src/components/logo.tsx` e `src/app/icon.svg` |
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

1. **Catálogo inteiro**: os 27 produtos, variações, códigos (SKU), preços, estoques e descontos são fictícios.
2. **Frete**: cálculo por CEP com valores de exemplo. A transportadora (Correios, intermediário ou Mercado Livre)
   será decidida com o cliente, ver [`docs/integracao-frete.md`](docs/integracao-frete.md). Retirada grátis em Sinop e
   entrega local por R$ 15,00 (CEPs 7855x-xxx) também são suposições.
3. **Pagamento**: Pix, boleto e cartão de crédito via Asaas, com vencimento do boleto em 3 dias. Parcelamento não está no site.
4. **Trocas**: o site mostra só o que a lei garante (7 dias de arrependimento e 90 dias de garantia, pelo CDC).
   Regras próprias da loja ainda não existem.
5. **Endereço, telefone, e-mail, horário, CNPJ e Instagram**: desconhecidos, mostrados como "a confirmar".
6. **Segmentos** (construção, rural, indústria, casa) atribuídos a cada produto por suposição.
7. **Logo provisório** (porca sextavada amarela) e **fotos provisórias** do Wikimedia Commons, com créditos em
   [`docs/creditos-imagens.md`](docs/creditos-imagens.md).
8. **Avisos ao cliente**: o site diz que "a loja avisa pelo celular" quando o pedido estiver separado.
   Não existe envio automático de e-mail nem de WhatsApp.

## O que ficou de fora, e por quê

- **Avaliações de clientes**: o brief proíbe inventar e a loja ainda não tem pedidos. Entram quando houver avaliações verificadas.
- **Feed do Instagram**: não sabemos a conta, e seria preciso um token da API da Meta. Fica só o link no rodapé quando `site.instagram` for preenchido.
- **Comparação de produtos e lista de desejos**: estão no brief, mas com 27 itens de exemplo não compensam o JavaScript extra.
  Os filtros e a ordenação cobrem a decisão por enquanto.
- **Integração de frete real**: depende da escolha da transportadora e do peso e das medidas dos produtos.
- **Backend**: os pedidos ficam em memória e somem quando o servidor reinicia.
  Também faltam banco de dados, baixa de estoque, nota fiscal, webhook do Asaas para confirmar pagamento e painel administrativo.
- **Integração com o sistema de reserva**: não há sistema identificado. Se houver, o contrato precisa ser passado antes de integrar.
- **Asaas**: implementado pela API pública v3 (`/customers` e `/payments`). Se a Sinopar já tiver integração ou webhook, siga o contrato dela.

## Verificação feita

Teste ponta a ponta em Chrome headless (44 verificações):

- **Larguras:** 375, 768 e 1440 px, sem rolagem horizontal em 8 páginas.
- **Frete:** o CEP de Sinop mostra a entrega local e o de São Paulo troca as opções. O pedido fecha com entrega expressa para SP.
- **Busca:** a busca preditiva tolera erro de digitação ("parafuzo"), a busca vazia orienta o usuário e os filtros mostram chips ativos.
- **Produto:** trocar a variação troca o preço e produto esgotado não deixa comprar.
- **Carrinho:** a gaveta confirma o item adicionado e cabe inteira na tela, o frete entra no total e o carrinho esvazia depois do pedido.
- **Checkout:** a validação acessível passa o foco para o resumo de erros, o pedido é confirmado em modo demonstração.
- **Acessibilidade:** o primeiro Tab leva a "Pular para o conteúdo" e, com movimento reduzido, a gaveta usa fade.

## Deploy (Coolify)

Dockerfile pronto, porta 3000, `output: "standalone"`. `SITE_URL` e `WHATSAPP_NUMBER` precisam
estar marcadas também como **Build Variable**, porque as páginas são geradas no build.
`ASAAS_API_KEY` é lida em runtime.
