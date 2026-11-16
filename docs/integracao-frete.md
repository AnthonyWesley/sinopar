# Frete: estrutura atual e integração pendente

A loja vende para o **Brasil todo**. O cálculo de frete já está montado na interface, mas a
transportadora ainda não foi definida com o cliente. Por isso os valores são **de exemplo**.

## Como está hoje

- **Página do produto**, **carrinho** e **Serviços** têm o campo "Calcular frete". O CEP informado
  fica salvo no carrinho e segue até o checkout.
- Opções mostradas: **Entrega econômica** e **Entrega expressa**, para qualquer CEP válido. Não há
  retirada na loja (pedido do cliente em 09/11/2026).
- **Valores de exemplo**: o preço e o prazo mudam por região (MT → Centro-Oeste → Sudeste/Sul →
  Norte/Nordeste). Somam R$ 5,00 a cada 5 itens além dos primeiros 5.
- **No checkout**, o servidor recalcula o frete pelo CEP. O valor que vem do navegador é ignorado.
- **Endereço pelo CEP**: no checkout, o CEP completo preenche rua, bairro, cidade e UF pelo ViaCEP
  (gratuito, sem chave; `src/lib/cep.ts`). Não apaga o que o cliente digitou. Se o ViaCEP falhar ou
  não achar o CEP, o cliente digita normalmente.
- **Peso e medidas**: cada variação tem peso (kg) e medidas da embalagem (cm) no painel, na seção
  "Frete: peso e medidas" do produto (gravados em gramas e cm inteiros). São opcionais, mas a lista de
  produtos mostra quantos ainda estão sem. Ficam em `AdminVariant.pack` / `VariantInput.pack`.

## Onde plugar a integração

Tudo passa por `src/lib/shipping.ts`:

```ts
export type ShippingProvider = (cep: string, items: { qty: number }[]) => ShippingQuote[];
const provider: ShippingProvider = mockProvider; // ← trocar aqui
```

Para integrar:

1. Criar o provider real (por exemplo `correiosProvider` ou `melhorEnvioProvider`), que chama a API
   **no servidor**. A chave da API nunca pode ir para o navegador.
2. A cotação real é assíncrona. Ela deve ser exposta por um Route Handler ou uma Server Action, e o
   componente `ShippingCalculator` passa a buscar as opções ali, em vez de calcular no navegador.
   O checkout já recalcula no servidor.
3. O provider real usa o `pack` de cada variação (peso e medidas, já no painel). Decidir o que
   fazer com variação sem peso: hoje nenhuma tem, então o cliente precisa preencher antes de ligar.

## Opções para decidir com o cliente

| Opção | Como funciona | Pontos de atenção |
|---|---|---|
| **API dos Correios** | Integração direta: preço, prazo, etiqueta e rastreio | Exige contrato com os Correios. Fica só com os Correios (PAC, SEDEX) |
| **Intermediário** (Melhor Envio, Frenet, Kangu e similares) | Uma API que cota Correios e transportadoras privadas e gera etiqueta | Não exige contrato próprio com os Correios. Cobra pelo serviço. Dá mais opções de transportadora |
| **Mercado Livre / Mercado Envios** | Logística do Mercado Livre | Em geral vale para vendas feitas *dentro* do Mercado Livre. Confirmar com o ML se a conta permite usar na loja própria. Outro caminho é anunciar o catálogo no ML, o que é outro projeto |

Perguntas para o cliente:

1. Já tem contrato com os Correios ou conta em algum intermediário de frete?
2. Vende ou pretende vender também no Mercado Livre?
3. Os produtos têm peso e medidas cadastrados (planilha ou ERP)? O painel já tem os campos; uma
   planilha pode ser importada.
4. A entrega local em Sinop é feita por frota própria? Com qual valor e área?
5. Algum frete grátis por valor mínimo ou região?
