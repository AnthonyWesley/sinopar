const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** centavos → "R$ 1.234,56" */
export function formatPrice(cents: number) {
  return brl.format(cents / 100);
}

export function discountPercent(price: number, compareAt: number) {
  return Math.round((1 - price / compareAt) * 100);
}
