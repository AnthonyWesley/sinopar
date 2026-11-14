import crypto from "node:crypto";
import type { Db } from "./db";
import { confirmPayment, expireOrder, flagRefund } from "./stock";

// Eventos do webhook de pagamento do Asaas (v3). O pedido é `payment.externalReference` (SP-…).
// Evento desconhecido ou pedido inexistente respondem 200 e são ignorados: o Asaas reenvia em
// erro e não queremos loop.

const CONFIRM = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const EXPIRE: Record<string, string> = {
  PAYMENT_OVERDUE: "Pagamento vencido no Asaas",
  PAYMENT_DELETED: "Cobrança removida no Asaas",
};
const REFUND = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE"]);

/** Compara o cabeçalho `asaas-access-token` com ASAAS_WEBHOOK_TOKEN. Sem env configurada, sempre falso. */
export function tokenMatches(given: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || given == null) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function handleAsaasEvent(db: Db, body: unknown, now: Date): { status: number; slugs: string[] } {
  const b = body as { id?: unknown; event?: unknown; payment?: { externalReference?: unknown } | null } | null;
  const id = b && typeof b === "object" ? b.id : undefined;
  const event = b && typeof b === "object" ? b.event : undefined;
  const orderId = b && typeof b === "object" && b.payment && typeof b.payment === "object"
    ? b.payment.externalReference : undefined;
  if (typeof id !== "string" || !id || typeof event !== "string" || !event || typeof orderId !== "string" || !orderId) {
    return { status: 400, slugs: [] };
  }
  const known = CONFIRM.has(event) || event in EXPIRE || REFUND.has(event);
  if (!known) {
    console.log(`[asaas] ${event} ${orderId}: ignorado (evento desconhecido)`);
    return { status: 200, slugs: [] };
  }
  if (!db.prepare("SELECT 1 FROM orders WHERE id = ?").get(orderId)) {
    console.log(`[asaas] ${event} ${orderId}: ignorado (pedido inexistente)`);
    return { status: 200, slugs: [] };
  }
  if (CONFIRM.has(event)) {
    const r = confirmPayment(db, orderId, id, now, event);
    console.log(`[asaas] ${event} ${orderId}: ${r.duplicate ? "duplicado" : r.status}`);
    return { status: 200, slugs: r.slugs };
  }
  if (event in EXPIRE) {
    const r = expireOrder(db, orderId, EXPIRE[event], now);
    console.log(`[asaas] ${event} ${orderId}: ${r.slugs.length ? "cancelado" : "sem efeito"}`);
    return { status: 200, slugs: r.slugs };
  }
  flagRefund(db, orderId, id, now, event);
  console.log(`[asaas] ${event} ${orderId}: estorno sinalizado`);
  return { status: 200, slugs: [] };
}
