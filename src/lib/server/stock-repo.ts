import { LOW_STOCK } from "../catalog";
import type { Db } from "./db";

// Leituras da tela Estoque do painel. As regras de escrita ficam em stock.ts.

export type StockFilter = "acabando" | "esgotado";
export type StockRow = {
  sku: string;
  label: string;
  name: string;
  slug: string;
  status: string;
  stock: number;
  reserved: number;
  available: number;
};
export type MovementKind = "entrada" | "ajuste" | "reserva" | "liberacao" | "venda" | "devolucao";
export type StockMovement = {
  id: number;
  at: string;
  kind: string;
  qty: number;
  reason: string | null;
  orderId: string | null;
  userName: string | null;
};

const likeEscape = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const COLUMNS = `v.sku, v.label, p.name, p.slug, p.status, v.stock, v.reserved, v.stock - v.reserved AS available`;

/** Variações com estoque, reservado e disponível. `acabando` = disponível de 1 a LOW_STOCK; `esgotado` = 0. */
export function listStock(db: Db, opts: { q?: string; filter?: StockFilter } = {}): StockRow[] {
  const where: string[] = [];
  const args: string[] = [];
  const q = opts.q?.trim();
  if (q) {
    const like = `%${likeEscape(q)}%`;
    where.push("(p.name LIKE ? ESCAPE '\\' OR v.sku LIKE ? ESCAPE '\\')");
    args.push(like, like);
  }
  if (opts.filter === "acabando") where.push(`v.stock - v.reserved BETWEEN 1 AND ${LOW_STOCK}`);
  if (opts.filter === "esgotado") where.push("v.stock - v.reserved <= 0");
  return db
    .prepare(
      `SELECT ${COLUMNS}
       FROM variants v JOIN products p ON p.id = v.product_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY p.name COLLATE NOCASE, v.id`,
    )
    .all(...args) as StockRow[];
}

export function getStockRow(db: Db, sku: string): StockRow | null {
  return (
    (db
      .prepare(`SELECT ${COLUMNS} FROM variants v JOIN products p ON p.id = v.product_id WHERE v.sku = ?`)
      .get(sku) as StockRow | undefined) ?? null
  );
}

/** Histórico de uma variação, do mais novo para o mais antigo. `userName` null = Sistema. */
export function listMovements(db: Db, sku: string): StockMovement[] {
  return db
    .prepare(
      `SELECT m.id, m.at, m.kind, m.qty, m.reason, m.order_id AS orderId, u.name AS userName
       FROM stock_movements m
       JOIN variants v ON v.id = m.variant_id
       LEFT JOIN users u ON u.id = m.user_id
       WHERE v.sku = ? ORDER BY m.at DESC, m.id DESC`,
    )
    .all(sku) as StockMovement[];
}

export const KIND_LABEL: Record<MovementKind, string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  reserva: "Reserva",
  liberacao: "Liberação",
  venda: "Venda",
  devolucao: "Devolução",
};

/**
 * Quantidade com sinal, do ponto de vista do estoque disponível: ajuste já vem com sinal;
 * entrada e devolução somam; reserva e venda tiram; liberação devolve ao disponível.
 */
export function signedQty(kind: string, qty: number): number {
  if (kind === "reserva" || kind === "venda") return -Math.abs(qty);
  if (kind === "ajuste") return qty;
  return Math.abs(qty);
}
