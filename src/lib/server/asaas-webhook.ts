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

/** Tira quebras de linha e limita o tamanho, para o que vem de fora não forjar linhas de log. */
const clean = (v: unknown, max = 60) => String(v).replace(/[\r\n]+/g, " ").slice(0, max);

// Inclui os códigos estendidos (SQLITE_BUSY_SNAPSHOT, SQLITE_BUSY_RECOVERY, SQLITE_LOCKED_SHAREDCACHE...).
const isTransient = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" && (code.startsWith("SQLITE_BUSY") || code.startsWith("SQLITE_LOCKED"));
};

/**
 * handleAsaasEvent sem deixar uma falha determinística travar a fila do Asaas: erro transitório do
 * SQLite sobe (a rota responde 500 e o Asaas tenta de novo); qualquer outro vira 200 com um aviso
 * na linha do tempo do pedido, para a equipe ver.
 */
export function processAsaasEvent(db: Db, body: unknown, now: Date): { status: number; slugs: string[] } {
  try {
    return handleAsaasEvent(db, body, now);
  } catch (e) {
    if (isTransient(e)) throw e;
    const b = body as { event?: unknown; payment?: { externalReference?: unknown } } | null;
    const event = clean(b?.event);
    const orderId = clean(b?.payment?.externalReference, 200);
    const message = clean(e instanceof Error ? e.message : e, 200);
    console.log(`[asaas] ${event} ${clean(orderId)}: erro ${message}`);
    try {
      db.transaction(() => {
        const o = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: string } | undefined;
        if (!o) return;
        db.prepare("INSERT INTO order_events (order_id, from_status, to_status, note, user_id, at) VALUES (?,?,?,?,NULL,?)")
          .run(orderId, o.status, o.status, `Aviso do Asaas não processado (${event}): ${message}`, now.toISOString());
      }).immediate();
    } catch (e2) {
      if (isTransient(e2)) throw e2;
    }
    return { status: 200, slugs: [] };
  }
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
    console.log(`[asaas] ${clean(event)} ${clean(orderId)}: ignorado (evento desconhecido)`);
    return { status: 200, slugs: [] };
  }
  if (!db.prepare("SELECT 1 FROM orders WHERE id = ?").get(orderId)) {
    console.log(`[asaas] ${clean(event)} ${clean(orderId)}: ignorado (pedido inexistente)`);
    return { status: 200, slugs: [] };
  }
  if (CONFIRM.has(event)) {
    const r = confirmPayment(db, orderId, id, now, event);
    console.log(`[asaas] ${clean(event)} ${clean(orderId)}: ${r.duplicate ? "duplicado" : r.status}`);
    return { status: 200, slugs: r.slugs };
  }
  if (event in EXPIRE) {
    const r = expireOrder(db, orderId, EXPIRE[event], now);
    console.log(`[asaas] ${clean(event)} ${clean(orderId)}: ${r.slugs.length ? "cancelado" : "sem efeito"}`);
    return { status: 200, slugs: r.slugs };
  }
  flagRefund(db, orderId, id, now, event);
  console.log(`[asaas] ${clean(event)} ${clean(orderId)}: estorno sinalizado`);
  return { status: 200, slugs: [] };
}
