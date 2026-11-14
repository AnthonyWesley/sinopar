// Preço digitado no painel ("R$ 12,90", "1.234,56", "12") ↔ centavos. Sem dependências: roda no
// servidor (validação da action) e no navegador (campo do formulário).

/** texto → centavos; null se não for um valor válido (negativo, 3 casas, letras...) */
export function parsePrice(text: string): number | null {
  let s = text.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    // formato brasileiro: ponto é milhar, vírgula é decimal
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(s)) return null;
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" = mil duzentos e trinta e quatro
    s = s.replace(/\./g, "");
  } else if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return null;
  }
  const [int, dec = ""] = s.split(".");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** centavos → "1.234,56" (para preencher o campo); null → "" */
export function centsToInput(cents: number | null | undefined): string {
  return cents == null ? "" : fmt.format(cents / 100);
}
