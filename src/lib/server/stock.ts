import type { Db } from "./db";
import type { Customer, OrderStatus, PaymentMethod, Shipping } from "./orders-repo";

// Regras de estoque e pedidos. Funções síncronas sobre `Db`, sem Next: cada uma roda numa
// transação e devolve os slugs dos produtos afetados, para quem chamou invalidar o cache.
//
// Movimentações (stock_movements.kind) e o efeito de cada uma:
//   entrada   stock += qty           devolucao  stock += qty
//   ajuste    stock += qty (qty com sinal: contado − anterior)
//   reserva   reserved += qty        liberacao  reserved −= qty
//   venda     stock −= qty e reserved −= qty
// Assim a soma das movimentações de uma variação sempre reproduz stock e reserved.
// `userId: null` = Sistema (checkout, webhook, varredura).

export type { OrderStatus } from "./orders-repo";

export type NewOrder = {
  id: string;
  token: string;
  createdAt: string;
  customer: Customer;
  shipping: Shipping;
  paymentMethod: PaymentMethod;
  lines: { sku: string; qty: number }[];
  subtotal: number;
  total: number;
};
export type Shortage = { sku: string; available: number };
export type Result = { ok: true; slugs: string[] } | { ok: false; shortages: Shortage[] };

export const SWEEP_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;
export const SWEEP_NO_CHARGE_MS = 15 * 60 * 1000;
const STAGES: OrderStatus[] = ["pago", "separado", "enviado", "entregue"];

type LineRef = { sku: string; variantId: number | null; qty: number; slug: string | null };

class ShortageError extends Error {
  constructor(readonly shortages: Shortage[]) {
    super("Estoque insuficiente");
  }
}

const iso = (d: Date) => d.toISOString();
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => x != null))];

function movement(
  db: Db, variantId: number, kind: string, qty: number, reason: string | null,
  orderId: string | null, userId: number | null, now: Date,
) {
  db.prepare(
    "INSERT INTO stock_movements (variant_id, kind, qty, reason, order_id, user_id, at) VALUES (?,?,?,?,?,?,?)",
  ).run(variantId, kind, qty, reason, orderId, userId, iso(now));
}

function setStatus(
  db: Db, orderId: string, from: OrderStatus | null, to: OrderStatus,
  note: string | null, userId: number | null, now: Date,
) {
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(to, orderId);
  db.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, user_id, at) VALUES (?,?,?,?,?,?)")
    .run(orderId, from, to, note, userId, iso(now));
}

function orderStatus(db: Db, orderId: string): OrderStatus {
  const r = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: OrderStatus } | undefined;
  if (!r) throw new Error(`Pedido ${orderId} não encontrado.`);
  return r.status;
}

function orderLines(db: Db, orderId: string): LineRef[] {
  return db
    .prepare(
      `SELECT l.sku, l.variant_id AS variantId, l.qty, p.slug
       FROM order_lines l
       LEFT JOIN variants v ON v.id = l.variant_id
       LEFT JOIN products p ON p.id = v.product_id
       WHERE l.order_id = ? ORDER BY l.rowid`,
    )
    .all(orderId) as LineRef[];
}

function availableOf(db: Db, variantId: number | null): number {
  if (variantId == null) return 0;
  const r = db.prepare("SELECT stock - reserved AS a FROM variants WHERE id = ?").get(variantId) as { a: number } | undefined;
  return r ? r.a : 0;
}

/**
 * Reserva as linhas com UPDATE condicionado (`stock - reserved >= qty`), num savepoint:
 * ou reserva todas, ou nenhuma e lança ShortageError.
 */
function reserve(db: Db, lines: LineRef[], orderId: string, reason: string, userId: number | null, now: Date) {
  const shortages = lines
    .map((l) => ({ sku: l.sku, available: availableOf(db, l.variantId), qty: l.qty }))
    .filter((l) => l.available < l.qty)
    .map(({ sku, available }) => ({ sku, available }));
  if (shortages.length) throw new ShortageError(shortages);
  db.transaction(() => {
    const upd = db.prepare("UPDATE variants SET reserved = reserved + ? WHERE id = ? AND stock - reserved >= ?");
    for (const l of lines) {
      if (l.variantId == null || upd.run(l.qty, l.variantId, l.qty).changes !== 1) {
        throw new ShortageError([{ sku: l.sku, available: availableOf(db, l.variantId) }]);
      }
      movement(db, l.variantId, "reserva", l.qty, reason, orderId, userId, now);
    }
  })();
}

/** Tira do estoque e do reservado (a reserva já existe). */
function sell(db: Db, lines: LineRef[], orderId: string, reason: string, userId: number | null, now: Date) {
  const upd = db.prepare("UPDATE variants SET stock = stock - ?, reserved = reserved - ? WHERE id = ? AND reserved >= ?");
  for (const l of lines) {
    if (l.variantId == null) continue; // variação apagada: não há o que baixar
    if (upd.run(l.qty, l.qty, l.variantId, l.qty).changes !== 1) {
      throw new Error(`Reserva de ${l.sku} não encontrada para baixar o pedido ${orderId}.`);
    }
    movement(db, l.variantId, "venda", l.qty, reason, orderId, userId, now);
  }
}

function release(db: Db, lines: LineRef[], orderId: string, reason: string, userId: number | null, now: Date) {
  const upd = db.prepare("UPDATE variants SET reserved = reserved - ? WHERE id = ? AND reserved >= ?");
  for (const l of lines) {
    if (l.variantId == null) continue;
    if (upd.run(l.qty, l.variantId, l.qty).changes !== 1) {
      throw new Error(`Reserva de ${l.sku} não encontrada para liberar o pedido ${orderId}.`);
    }
    movement(db, l.variantId, "liberacao", l.qty, reason, orderId, userId, now);
  }
}

function restockLines(db: Db, lines: LineRef[], orderId: string, reason: string, userId: number | null, now: Date) {
  const upd = db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ?");
  for (const l of lines) {
    if (l.variantId == null) continue;
    upd.run(l.qty, l.variantId);
    movement(db, l.variantId, "devolucao", l.qty, reason, orderId, userId, now);
  }
}

const slugsOf = (lines: LineRef[]) => uniq(lines.filter((l) => l.variantId != null).map((l) => l.slug));

/** Reserva e baixa de uma vez (pedido que não tem reserva: pago depois de cancelado, ou "pago sem estoque"). */
function reserveAndSell(db: Db, orderId: string, userId: number | null, now: Date, reason: string): Shortage[] {
  const lines = orderLines(db, orderId);
  try {
    db.transaction(() => {
      reserve(db, lines, orderId, reason, userId, now);
      sell(db, lines, orderId, reason, userId, now);
    })();
    return [];
  } catch (e) {
    if (e instanceof ShortageError) return e.shortages;
    throw e;
  }
}

function recordPaymentEvent(db: Db, eventId: string | null, orderId: string, type: string, now: Date): boolean {
  if (eventId == null) return true;
  const r = db
    .prepare("INSERT INTO payment_events (event_id, order_id, type, at) VALUES (?,?,?,?) ON CONFLICT(event_id) DO NOTHING")
    .run(eventId, orderId, type, iso(now));
  return r.changes === 1;
}

// ---------------------------------------------------------------------------------------------

export function createOrderWithReservation(db: Db, order: NewOrder): Result {
  const run = db.transaction((): Result => {
    // soma linhas repetidas do mesmo código
    const qtyBySku = new Map<string, number>();
    for (const l of order.lines) {
      if (!Number.isInteger(l.qty) || l.qty <= 0) throw new Error(`Quantidade inválida para ${l.sku}.`);
      qtyBySku.set(l.sku, (qtyBySku.get(l.sku) ?? 0) + l.qty);
    }
    if (qtyBySku.size === 0) throw new Error("Pedido sem itens.");
    const find = db.prepare(
      `SELECT v.id, v.label, v.price, p.name, p.slug
       FROM variants v JOIN products p ON p.id = v.product_id
       WHERE v.sku = ? AND p.status = 'ativo'`,
    );
    const found = [...qtyBySku].map(([sku, qty]) => {
      const v = find.get(sku) as { id: number; label: string; price: number; name: string; slug: string } | undefined;
      return { sku, qty, v };
    });
    const lines: LineRef[] = found.map(({ sku, qty, v }) => ({ sku, qty, variantId: v?.id ?? null, slug: v?.slug ?? null }));

    db.prepare(
      `INSERT INTO orders (id, token, status, created_at, customer, shipping, payment_method, subtotal, total)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(order.id, order.token, "aguardando", order.createdAt, JSON.stringify(order.customer),
      JSON.stringify(order.shipping), order.paymentMethod, order.subtotal, order.total);
    const insLine = db.prepare(
      "INSERT INTO order_lines (order_id, sku, variant_id, name, variant_label, qty, unit_price) VALUES (?,?,?,?,?,?,?)",
    );
    for (const { sku, qty, v } of found) {
      if (v) insLine.run(order.id, sku, v.id, v.name, v.label, qty, v.price);
    }
    const now = new Date(order.createdAt);
    reserve(db, lines, order.id, "checkout", null, now); // lança ShortageError e desfaz tudo
    db.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, user_id, at) VALUES (?,?,?,?,?,?)")
      .run(order.id, null, "aguardando", null, null, order.createdAt);
    return { ok: true, slugs: slugsOf(lines) };
  });
  try {
    return run.immediate();
  } catch (e) {
    if (e instanceof ShortageError) return { ok: false, shortages: e.shortages };
    throw e;
  }
}

export function attachCharge(
  db: Db, orderId: string, charge: { asaasPaymentId: string | null; invoiceUrl: string | null; demo: boolean },
): void {
  const r = db
    .prepare("UPDATE orders SET asaas_payment_id = ?, invoice_url = ?, demo = ? WHERE id = ?")
    .run(charge.asaasPaymentId, charge.invoiceUrl, charge.demo ? 1 : 0, orderId);
  if (r.changes !== 1) throw new Error(`Pedido ${orderId} não encontrado.`);
}

export function confirmPayment(
  db: Db, orderId: string, eventId: string | null, now: Date, eventType = "PAYMENT_CONFIRMED",
): { status: OrderStatus; slugs: string[]; duplicate: boolean } {
  return db.transaction(() => {
    const status = orderStatus(db, orderId);
    if (!recordPaymentEvent(db, eventId, orderId, eventType, now)) return { status, slugs: [], duplicate: true };
    if (status === "aguardando") {
      const lines = orderLines(db, orderId);
      sell(db, lines, orderId, "pagamento confirmado", null, now);
      setStatus(db, orderId, status, "pago", "Pagamento confirmado", null, now);
      return { status: "pago" as OrderStatus, slugs: slugsOf(lines), duplicate: false };
    }
    if (status === "cancelado") {
      const shortages = reserveAndSell(db, orderId, null, now, "pagamento após cancelamento");
      if (shortages.length === 0) {
        setStatus(db, orderId, status, "pago", "Pagamento recebido com o pedido cancelado; havia estoque", null, now);
        return { status: "pago" as OrderStatus, slugs: slugsOf(orderLines(db, orderId)), duplicate: false };
      }
      setStatus(db, orderId, status, "pago_sem_estoque", "Pagamento recebido com o pedido cancelado; sem estoque", null, now);
      return { status: "pago_sem_estoque" as OrderStatus, slugs: [], duplicate: false };
    }
    return { status, slugs: [], duplicate: true };
  }).immediate();
}

/** Cancela um pedido aguardando e libera a reserva. Em qualquer outra etapa não faz nada. */
export function expireOrder(db: Db, orderId: string, reason: string, now: Date): { slugs: string[] } {
  return db.transaction(() => {
    const status = orderStatus(db, orderId);
    if (status !== "aguardando") return { slugs: [] };
    const lines = orderLines(db, orderId);
    release(db, lines, orderId, reason, null, now);
    setStatus(db, orderId, status, "cancelado", reason, null, now);
    return { slugs: slugsOf(lines) };
  }).immediate();
}

export function cancelOrder(
  db: Db, orderId: string, opts: { restock: boolean; userId: number | null; reason: string }, now: Date,
): { slugs: string[] } {
  return db.transaction(() => {
    const status = orderStatus(db, orderId);
    const lines = orderLines(db, orderId);
    let slugs: string[] = [];
    switch (status) {
      case "aguardando":
        release(db, lines, orderId, opts.reason, opts.userId, now);
        slugs = slugsOf(lines);
        break;
      case "pago":
      case "separado":
      case "enviado":
        if (opts.restock) {
          restockLines(db, lines, orderId, opts.reason, opts.userId, now);
          slugs = slugsOf(lines);
        }
        break;
      case "pago_sem_estoque":
        break;
      case "entregue":
        throw new Error("Pedido entregue não pode ser cancelado.");
      case "cancelado":
        throw new Error("Pedido já está cancelado.");
    }
    const note = status === "pago" || status === "separado" || status === "enviado"
      ? `${opts.reason} (${opts.restock ? "unidades devolvidas ao estoque" : "sem devolver ao estoque"})`
      : opts.reason;
    setStatus(db, orderId, status, "cancelado", note, opts.userId, now);
    return { slugs };
  }).immediate();
}

/** "Atender" um pedido pago sem estoque: baixa se houver e segue para pago. */
export function fulfillOutOfStock(db: Db, orderId: string, userId: number | null, now: Date): Result {
  return db.transaction((): Result => {
    const status = orderStatus(db, orderId);
    if (status !== "pago_sem_estoque") throw new Error("Só pedidos pagos sem estoque podem ser atendidos assim.");
    const shortages = reserveAndSell(db, orderId, userId, now, "pedido pago sem estoque atendido");
    if (shortages.length) return { ok: false, shortages };
    setStatus(db, orderId, status, "pago", "Atendido com estoque", userId, now);
    return { ok: true, slugs: slugsOf(orderLines(db, orderId)) };
  }).immediate();
}

/** Avança ou volta uma etapa entre pago → separado → enviado → entregue. */
export function moveStage(
  db: Db, orderId: string, to: OrderStatus, userId: number | null, now: Date, tracking?: string,
): void {
  db.transaction(() => {
    const from = orderStatus(db, orderId);
    const i = STAGES.indexOf(from);
    const j = STAGES.indexOf(to);
    if (i < 0 || j < 0 || Math.abs(i - j) !== 1) {
      throw new Error(`Não dá para passar o pedido de ${from} para ${to}.`);
    }
    const code = to === "enviado" ? tracking?.trim() || null : null;
    if (code) db.prepare("UPDATE orders SET tracking_code = ? WHERE id = ?").run(code, orderId);
    setStatus(db, orderId, from, to, code ? `Rastreio: ${code}` : null, userId, now);
  }).immediate();
}

function variantBySku(db: Db, sku: string) {
  return db
    .prepare(
      `SELECT v.id, v.stock, v.reserved, p.slug FROM variants v JOIN products p ON p.id = v.product_id WHERE v.sku = ?`,
    )
    .get(sku) as { id: number; stock: number; reserved: number; slug: string } | undefined;
}

export function addStock(
  db: Db, sku: string, qty: number, reason: string, userId: number | null, now: Date,
): { slugs: string[] } {
  if (!Number.isInteger(qty) || qty <= 0) throw new Error("A entrada precisa ser de pelo menos 1 unidade.");
  return db.transaction(() => {
    const v = variantBySku(db, sku);
    if (!v) throw new Error(`Código ${sku} não encontrado.`);
    db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ?").run(qty, v.id);
    movement(db, v.id, "entrada", qty, reason.trim() || null, null, userId, now);
    return { slugs: [v.slug] };
  }).immediate();
}

export function setStock(
  db: Db, sku: string, counted: number, reason: string, userId: number | null, now: Date,
): { ok: true; slugs: string[] } | { ok: false; error: string } {
  if (!Number.isInteger(counted) || counted < 0) return { ok: false, error: "Informe um número inteiro, zero ou mais." };
  if (!reason.trim()) return { ok: false, error: "Informe o motivo do ajuste." };
  return db.transaction((): { ok: true; slugs: string[] } | { ok: false; error: string } => {
    const v = variantBySku(db, sku);
    if (!v) return { ok: false, error: `Código ${sku} não encontrado.` };
    if (counted < v.reserved) {
      return {
        ok: false,
        error: `Há ${v.reserved} unidades reservadas em pedidos não pagos. O estoque não pode ficar abaixo disso.`,
      };
    }
    db.prepare("UPDATE variants SET stock = ? WHERE id = ?").run(counted, v.id);
    movement(db, v.id, "ajuste", counted - v.stock, reason.trim(), null, userId, now);
    return { ok: true, slugs: [v.slug] };
  }).immediate();
}

/** Expira aguardando há mais de 4 dias, ou sem cobrança (e não demo) há mais de 15 minutos. */
export function sweep(db: Db, now: Date): { expired: string[]; slugs: string[] } {
  return db.transaction(() => {
    const rows = db
      .prepare("SELECT id, created_at, asaas_payment_id, demo FROM orders WHERE status = 'aguardando' ORDER BY created_at")
      .all() as { id: string; created_at: string; asaas_payment_id: string | null; demo: number }[];
    const expired: string[] = [];
    const slugs = new Set<string>();
    for (const r of rows) {
      const age = now.getTime() - Date.parse(r.created_at);
      let reason: string | null = null;
      if (age > SWEEP_MAX_AGE_MS) reason = "Prazo de pagamento vencido";
      else if (r.asaas_payment_id == null && r.demo === 0 && age > SWEEP_NO_CHARGE_MS) {
        reason = "Cobrança não foi criada";
      }
      if (!reason) continue;
      for (const s of expireOrder(db, r.id, reason, now).slugs) slugs.add(s);
      expired.push(r.id);
    }
    return { expired, slugs: [...slugs] };
  }).immediate();
}

/** Estorno/chargeback no Asaas: só marca o aviso; a equipe decide se cancela e devolve. */
export function flagRefund(
  db: Db, orderId: string, eventId: string, now: Date = new Date(), eventType = "PAYMENT_REFUNDED",
): void {
  db.transaction(() => {
    orderStatus(db, orderId);
    if (!recordPaymentEvent(db, eventId, orderId, eventType, now)) return;
    db.prepare("UPDATE orders SET refund_flag = 1 WHERE id = ?").run(orderId);
  }).immediate();
}
