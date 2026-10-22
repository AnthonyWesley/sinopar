// FRETE — ESTRUTURA PRONTA, VALORES DE EXEMPLO.
// A loja vende para o Brasil todo. A transportadora ainda não foi escolhida (API dos Correios,
// Mercado Envios, Melhor Envio...; ver docs/integracao-frete.md), então `mockProvider` calcula
// valores fictícios por região do CEP. Para integrar, crie outro ShippingProvider com a mesma
// assinatura e troque `provider` abaixo. A cotação real roda no servidor (as chaves da API não
// podem ir para o navegador): o checkout já recalcula o frete no servidor ao fechar o pedido.

export type ShippingQuote = {
  id: string;
  label: string;
  /** centavos */
  price: number;
  estimate: string;
  /** precisa de endereço de entrega (tudo menos a retirada) */
  needsAddress: boolean;
};

export type ShippingProvider = (cep: string, items: { qty: number }[]) => ShippingQuote[];

export const pickup: ShippingQuote = {
  id: "retirada",
  label: "Retirar na loja em Sinop",
  price: 0,
  estimate: "Pronto em até 1 dia útil após o pagamento",
  needsAddress: false,
};

export const onlyCepDigits = (cep: string) => cep.replace(/\D/g, "").slice(0, 8);
export const isValidCep = (cep: string) => /^\d{8}$/.test(onlyCepDigits(cep)) && !/^0{8}$/.test(onlyCepDigits(cep));
export const formatCep = (cep: string) => {
  const d = onlyCepDigits(cep);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

// faixas de distância a partir de Sinop pelos 2 primeiros dígitos do CEP (aproximação para o exemplo)
function tier(cep: string) {
  const p = Number(onlyCepDigits(cep).slice(0, 2));
  if (p === 78) return 0; // MT
  if (p >= 70 && p <= 79) return 1; // DF, GO, TO, RO, MS
  if (p <= 39 || p >= 80) return 2; // Sudeste e Sul
  return 3; // Nordeste e Norte
}

/** EXEMPLO: nada aqui foi passado pela Sinopar ou por transportadora */
const mockProvider: ShippingProvider = (cep, items) => {
  const count = items.reduce((n, i) => n + i.qty, 0);
  const t = tier(cep);
  const extra = Math.max(0, Math.ceil(count / 5) - 1) * 500; // volumes a mais
  const quotes: ShippingQuote[] = [];
  if (/^7855\d{4}$/.test(onlyCepDigits(cep)))
    quotes.push({ id: "local-sinop", label: "Entrega local em Sinop", price: 1500, estimate: "Até 2 dias úteis", needsAddress: true });
  quotes.push(
    { id: "economica", label: "Entrega econômica", price: [1890, 2690, 3490, 4290][t] + extra, estimate: `Até ${[4, 6, 8, 12][t]} dias úteis`, needsAddress: true },
    { id: "expressa", label: "Entrega expressa", price: [3290, 4590, 5890, 7490][t] + extra, estimate: `Até ${[2, 3, 4, 6][t]} dias úteis`, needsAddress: true },
  );
  return quotes;
};

const provider: ShippingProvider = mockProvider;

/** retirada sempre aparece; as entregas dependem de um CEP válido */
export function quoteShipping(cep: string | null | undefined, items: { qty: number }[]) {
  return [pickup, ...(cep && isValidCep(cep) ? provider(onlyCepDigits(cep), items) : [])];
}

export function pickQuote(quotes: ShippingQuote[], id: string | null | undefined) {
  return quotes.find((q) => q.id === id) ?? pickup;
}
