import type { Db } from "./db";

// Leitura de pedidos sobre o banco, sem Next. As mudanças ficam em stock.ts.

export type OrderStatus =
  | "aguardando"
  | "pago"
  | "pago_sem_estoque"
  | "separado"
  | "enviado"
  | "entregue"
  | "cancelado";

export type PaymentMethod = "PIX" | "CREDIT_CARD";
export type Customer = { name: string; email: string; phone: string; document: string };
export type Shipping = { method: string; label: string; price: number; estimate: string; address: string | null };

/** `variant`: o texto da escolha como a pessoa viu na compra ("Faixa de furo: 14 mm"); null quando o produto não tinha escolha */
export type OrderLine = { sku: string; name: string; variant: string | null; qty: number; unitPrice: number };

export type OrderRecord = {
  id: string;
  token: string;
  status: OrderStatus;
  createdAt: string;
  customer: Customer;
  shipping: Shipping;
  payment: { method: PaymentMethod; invoiceUrl: string | null; asaasPaymentId: string | null; demo: boolean };
  lines: OrderLine[];
  subtotal: number;
  total: number;
  trackingCode: string | null;
  refundFlag: boolean;
};

export type OrderEvent = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  userId: number | null;
  userName: string | null;
  at: string;
};

type OrderRow = {
  id: string;
  token: string;
  status: OrderStatus;
  created_at: string;
  customer: string;
  shipping: string;
  payment_method: PaymentMethod;
  invoice_url: string | null;
  asaas_payment_id: string | null;
  demo: number;
  subtotal: number;
  total: number;
  tracking_code: string | null;
  refund_flag: number;
};

export function getOrderLines(db: Db, orderId: string): OrderLine[] {
  return db
    .prepare(
      `SELECT sku, name, variant_label AS variant, qty, unit_price AS unitPrice
       FROM order_lines WHERE order_id = ? ORDER BY rowid`,
    )
    .all(orderId) as OrderLine[];
}

function toOrder(db: Db, r: OrderRow): OrderRecord {
  return {
    id: r.id,
    token: r.token,
    status: r.status,
    createdAt: r.created_at,
    customer: JSON.parse(r.customer) as Customer,
    shipping: JSON.parse(r.shipping) as Shipping,
    payment: {
      method: r.payment_method,
      invoiceUrl: r.invoice_url,
      asaasPaymentId: r.asaas_payment_id,
      demo: r.demo === 1,
    },
    lines: getOrderLines(db, r.id),
    subtotal: r.subtotal,
    total: r.total,
    trackingCode: r.tracking_code,
    refundFlag: r.refund_flag === 1,
  };
}

export function getOrderById(db: Db, id: string): OrderRecord | null {
  const r = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  return r ? toOrder(db, r) : null;
}

export function getOrderByToken(db: Db, token: string): OrderRecord | null {
  const r = db.prepare("SELECT * FROM orders WHERE token = ?").get(token) as OrderRow | undefined;
  return r ? toOrder(db, r) : null;
}

/** Mais recentes primeiro. Sem `status`, lista todos. */
export function listOrders(db: Db, opts: { status?: OrderStatus | OrderStatus[] } = {}): OrderRecord[] {
  const statuses = opts.status == null ? [] : Array.isArray(opts.status) ? opts.status : [opts.status];
  const where = statuses.length ? `WHERE status IN (${statuses.map(() => "?").join(",")})` : "";
  const rows = db
    .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC, id DESC`)
    .all(...statuses) as OrderRow[];
  return rows.map((r) => toOrder(db, r));
}

export function getOrderEvents(db: Db, orderId: string): OrderEvent[] {
  return db
    .prepare(
      `SELECT e.from_status AS fromStatus, e.to_status AS toStatus, e.note, e.user_id AS userId,
              u.name || CASE WHEN u.disabled_at IS NOT NULL THEN ' (removido)' ELSE '' END AS userName, e.at
       FROM order_events e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.order_id = ? ORDER BY e.id`,
    )
    .all(orderId) as OrderEvent[];
}

/** Quantos pedidos há em cada etapa (etapa sem pedido vem com 0). */
export function countOrdersByStatus(db: Db): Record<OrderStatus, number> {
  const counts: Record<OrderStatus, number> = {
    aguardando: 0, pago: 0, pago_sem_estoque: 0, separado: 0, enviado: 0, entregue: 0, cancelado: 0,
  };
  const rows = db.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all() as { status: OrderStatus; n: number }[];
  for (const r of rows) if (r.status in counts) counts[r.status] = r.n;
  return counts;
}
