// Unidade de venda do produto ("Unidade", "Jogo com 5", "Kit com 43"…). No banco continua um texto;
// no painel vira tipo + quantidade, para não surgir "Jogo c/ 5" ao lado de "Jogo com 5".

export const SALE_UNIT_KINDS = ["Unidade", "Jogo", "Kit", "Caixa", "Par", "Outro"] as const;
export type SaleUnitKind = (typeof SALE_UNIT_KINDS)[number];
export type SaleUnit = { kind: SaleUnitKind; count: string; other: string };

const PATTERN = /^(jogo|kit|caixa|par)(?: com (\d+))?$/i;

/** Lê o texto salvo. O que não segue o padrão vira "Outro" com o texto original. */
export function parseSaleUnit(text: string): SaleUnit {
  const t = text.trim();
  if (!t || /^unidade$/i.test(t)) return { kind: "Unidade", count: "", other: "" };
  const m = PATTERN.exec(t);
  if (!m) return { kind: "Outro", count: "", other: t };
  const kind = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as SaleUnitKind;
  return { kind, count: m[2] ?? "", other: "" };
}

/** Texto mostrado na loja. "Unidade" ignora a quantidade; quantidade vazia vira só o tipo. */
export function formatSaleUnit(u: SaleUnit): string {
  if (u.kind === "Outro") return u.other.trim();
  if (u.kind === "Unidade") return "Unidade";
  const n = u.count.trim();
  return n ? `${u.kind} com ${n}` : u.kind;
}
