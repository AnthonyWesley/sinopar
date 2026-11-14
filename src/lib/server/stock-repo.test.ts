import { describe, it, expect } from "vitest";
import { openDb } from "./db";
import { addStock, attachCharge, confirmPayment, createOrderWithReservation, expireOrder, setStock, type NewOrder } from "./stock";
import { listMovements, movementEffect } from "./stock-repo";

describe("movementEffect", () => {
  it("efeito de cada tipo no Estoque e no Reservado", () => {
    expect(movementEffect("entrada", 10)).toEqual({ stock: 10, reserved: 0 });
    expect(movementEffect("devolucao", 2)).toEqual({ stock: 2, reserved: 0 });
    expect(movementEffect("ajuste", -3)).toEqual({ stock: -3, reserved: 0 });
    expect(movementEffect("ajuste", 4)).toEqual({ stock: 4, reserved: 0 });
    expect(movementEffect("reserva", 2)).toEqual({ stock: 0, reserved: 2 });
    expect(movementEffect("liberacao", 2)).toEqual({ stock: 0, reserved: -2 });
    expect(movementEffect("venda", 2)).toEqual({ stock: -2, reserved: -2 });
  });
});

describe("histórico x variação", () => {
  it("a soma dos efeitos reproduz estoque e reservado", () => {
    const db = openDb(":memory:");
    const now = new Date("2026-11-14T12:00:00.000Z");
    const p = db
      .prepare("INSERT INTO products (slug,name,category,image,variant_name,unit,created_at,updated_at) VALUES ('p','P','c','/a.webp','M','un',?,?)")
      .run(now.toISOString(), now.toISOString());
    db.prepare("INSERT INTO variants (product_id,sku,label,price,stock,reserved) VALUES (?,?,?,?,0,0)").run(p.lastInsertRowid, "S1", "x", 1000);
    let seq = 0;
    const place = (qty: number) => {
      seq++;
      const o: NewOrder = {
        id: `SP-R${seq}`, token: `t${seq}`, createdAt: now.toISOString(),
        customer: { name: "Ana", email: "a@x.com", phone: "1", document: "0" },
        shipping: { method: "sedex", label: "Sedex", price: 500, estimate: "3 dias", address: "Rua 1" },
        paymentMethod: "PIX", lines: [{ sku: "S1", qty }], subtotal: 0, total: 0,
      };
      expect(createOrderWithReservation(db, o).ok).toBe(true);
      attachCharge(db, o.id, { asaasPaymentId: `pay${seq}`, invoiceUrl: "https://x", demo: false });
      return o.id;
    };
    addStock(db, "S1", 10, "compra", null, now);
    const paid = place(2);
    confirmPayment(db, paid, "ev1", now);
    expireOrder(db, place(1), "Prazo de pagamento vencido", now);
    expect(setStock(db, "S1", 5, "contagem", null, now)).toMatchObject({ ok: true });

    const total = listMovements(db, "S1").reduce(
      (acc, m) => {
        const e = movementEffect(m.kind, m.qty);
        return { stock: acc.stock + e.stock, reserved: acc.reserved + e.reserved };
      },
      { stock: 0, reserved: 0 },
    );
    const row = db.prepare("SELECT stock, reserved FROM variants WHERE sku = 'S1'").get();
    expect(row).toEqual({ stock: 5, reserved: 0 });
    expect(total).toEqual(row);
  });
});
