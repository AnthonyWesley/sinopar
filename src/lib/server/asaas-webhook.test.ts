import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { openDb, type Db } from "./db";
import { addStock, attachCharge, createOrderWithReservation, type NewOrder } from "./stock";
import { getOrderById } from "./orders-repo";
import { handleAsaasEvent, processAsaasEvent, tokenMatches } from "./asaas-webhook";

const NOW = new Date("2026-11-14T12:00:00.000Z");
let db: Db;
let n = 0;

function place(qty = 2): string {
  n++;
  const o: NewOrder = {
    id: `SP-W${n}`, token: `tok-${n}`, createdAt: NOW.toISOString(),
    customer: { name: "Ana", email: "ana@example.com", phone: "11999999999", document: "00000000000" },
    shipping: { method: "sedex", label: "Sedex", price: 500, estimate: "3 dias", address: "Rua 1" },
    paymentMethod: "PIX", lines: [{ sku: "SKU-A", qty }], subtotal: 0, total: 0,
  };
  expect(createOrderWithReservation(db, o).ok).toBe(true);
  attachCharge(db, o.id, { asaasPaymentId: `pay_${o.id}`, invoiceUrl: "https://x", demo: false });
  return o.id;
}
const ev = (id: string, event: string, order: string | undefined) => ({
  id, event, payment: { id: "pay_1", externalReference: order, status: "X" },
});
const variant = () => db.prepare("SELECT stock, reserved FROM variants WHERE sku='SKU-A'").get() as { stock: number; reserved: number };
const counts = () => [
  db.prepare("SELECT COUNT(*) c FROM payment_events").get(),
  db.prepare("SELECT COUNT(*) c FROM order_events").get(),
  db.prepare("SELECT COUNT(*) c FROM stock_movements").get(),
];

beforeEach(() => {
  db = openDb(":memory:");
  const p = db.prepare(
    `INSERT INTO products (slug,name,category,image,variant_name,unit,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`,
  ).run("produto-a", "Produto A", "Fixação", "/a.webp", "Medida", "un", NOW.toISOString(), NOW.toISOString());
  db.prepare("INSERT INTO variants (product_id,sku,label,price,stock,reserved) VALUES (?,?,?,?,0,0)").run(p.lastInsertRowid, "SKU-A", "6 mm", 1000);
  addStock(db, "SKU-A", 5, "compra", null, NOW);
});
afterEach(() => vi.unstubAllEnvs());

describe("tokenMatches", () => {
  it("rejeita token errado, ausente e env não configurada", () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    expect(tokenMatches("segredo")).toBe(true);
    expect(tokenMatches("segredo2")).toBe(false);
    expect(tokenMatches("errado!")).toBe(false);
    expect(tokenMatches(null)).toBe(false);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "");
    expect(tokenMatches("")).toBe(false);
    expect(tokenMatches("x")).toBe(false);
  });
});

describe("handleAsaasEvent", () => {
  it("PAYMENT_CONFIRMED baixa o estoque; PAYMENT_RECEIVED seguinte é duplicado", () => {
    const id = place();
    const r = handleAsaasEvent(db, ev("evt_1", "PAYMENT_CONFIRMED", id), NOW);
    expect(r).toEqual({ status: 200, slugs: ["produto-a"] });
    expect(getOrderById(db, id)!.status).toBe("pago");
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    const r2 = handleAsaasEvent(db, ev("evt_2", "PAYMENT_RECEIVED", id), NOW);
    expect(r2).toEqual({ status: 200, slugs: [] });
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    // mesmo id reenviado
    expect(handleAsaasEvent(db, ev("evt_1", "PAYMENT_CONFIRMED", id), NOW).slugs).toEqual([]);
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
  });

  it("PAYMENT_OVERDUE em aguardando cancela e libera", () => {
    const id = place();
    const r = handleAsaasEvent(db, ev("evt_3", "PAYMENT_OVERDUE", id), NOW);
    expect(r).toEqual({ status: 200, slugs: ["produto-a"] });
    expect(getOrderById(db, id)!.status).toBe("cancelado");
    expect(variant()).toEqual({ stock: 5, reserved: 0 });
  });

  it("PAYMENT_DELETED em aguardando cancela e libera", () => {
    const id = place();
    handleAsaasEvent(db, ev("evt_4", "PAYMENT_DELETED", id), NOW);
    expect(getOrderById(db, id)!.status).toBe("cancelado");
    expect(variant()).toEqual({ stock: 5, reserved: 0 });
  });

  it("PAYMENT_REFUNDED em pago marca refund_flag sem mexer no estoque", () => {
    const id = place();
    handleAsaasEvent(db, ev("evt_5", "PAYMENT_CONFIRMED", id), NOW);
    const r = handleAsaasEvent(db, ev("evt_6", "PAYMENT_REFUNDED", id), NOW);
    expect(r).toEqual({ status: 200, slugs: [] });
    expect((db.prepare("SELECT refund_flag f FROM orders WHERE id=?").get(id) as { f: number }).f).toBe(1);
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    expect(getOrderById(db, id)!.status).toBe("pago");
  });

  it("chargeback também marca o aviso", () => {
    const id = place();
    handleAsaasEvent(db, ev("evt_7", "PAYMENT_CHARGEBACK_REQUESTED", id), NOW);
    expect((db.prepare("SELECT refund_flag f FROM orders WHERE id=?").get(id) as { f: number }).f).toBe(1);
  });

  it("pedido inexistente: 200 e nada muda", () => {
    const before = counts();
    expect(handleAsaasEvent(db, ev("evt_8", "PAYMENT_CONFIRMED", "SP-NAOEXISTE"), NOW)).toEqual({ status: 200, slugs: [] });
    expect(handleAsaasEvent(db, ev("evt_9", "PAYMENT_REFUNDED", "SP-NAOEXISTE"), NOW)).toEqual({ status: 200, slugs: [] });
    expect(counts()).toEqual(before);
  });

  it("evento desconhecido: 200 e ignora", () => {
    const id = place();
    const before = counts();
    expect(handleAsaasEvent(db, ev("evt_10", "PAYMENT_CREATED", id), NOW)).toEqual({ status: 200, slugs: [] });
    expect(counts()).toEqual(before);
    expect(getOrderById(db, id)!.status).toBe("aguardando");
  });

  it("corpo inválido: 400", () => {
    for (const body of [null, "x", 42, [], {}, { id: "e", event: "PAYMENT_CONFIRMED" },
      { id: "e", event: "PAYMENT_CONFIRMED", payment: {} }, ev("", "PAYMENT_CONFIRMED", "SP-1"),
      ev("e", "", "SP-1"), { id: 1, event: "PAYMENT_CONFIRMED", payment: { externalReference: "SP-1" } }]) {
      expect(handleAsaasEvent(db, body, NOW)).toEqual({ status: 400, slugs: [] });
    }
  });
});

describe("processAsaasEvent (falhas)", () => {
  it("falha determinística: 200, sem mudar estoque, deixa aviso na linha do tempo", () => {
    const id = place();
    db.prepare("UPDATE variants SET reserved = 0 WHERE sku='SKU-A'").run(); // deriva: reserva sumiu
    const r = processAsaasEvent(db, ev("evt_f1", "PAYMENT_CONFIRMED", id), NOW);
    expect(r).toEqual({ status: 200, slugs: [] });
    expect(variant()).toEqual({ stock: 5, reserved: 0 });
    expect(getOrderById(db, id)!.status).toBe("aguardando");
    const notes = db.prepare("SELECT note, from_status f, to_status t, user_id u FROM order_events WHERE order_id=? AND note LIKE '%não processado%'")
      .all(id) as { note: string; f: string; t: string; u: number | null }[];
    expect(notes).toHaveLength(1);
    expect(notes[0].note).toContain("PAYMENT_CONFIRMED");
    expect(notes[0]).toMatchObject({ f: "aguardando", t: "aguardando", u: null });
  });

  it("erro SQLITE_BUSY é repassado para o Asaas tentar de novo", () => {
    const busy = Object.assign(new Error("database is locked"), { code: "SQLITE_BUSY" });
    const fake = { prepare: () => { throw busy; } } as unknown as Db;
    expect(() => processAsaasEvent(fake, ev("e", "PAYMENT_CONFIRMED", "SP-1"), NOW)).toThrow(busy);
  });
});
