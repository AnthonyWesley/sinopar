import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, type Db } from "./db";
import {
  addStock,
  attachCharge,
  cancelOrder,
  confirmPayment,
  createOrderWithReservation,
  expireOrder,
  flagRefund,
  fulfillOutOfStock,
  moveStage,
  setStock,
  sweep,
  type NewOrder,
} from "./stock";
import { getOrderById, getOrderByToken, getOrderEvents, listOrders } from "./orders-repo";

const SKU = "SKU-A";
const SKU_B = "SKU-B";
const SLUG = "produto-a";
const SLUG_B = "produto-b";
const NOW = new Date("2026-11-14T12:00:00.000Z");
const USER = null; // Sistema

let db: Db;
let seq = 0;

function fixture(d: Db) {
  const ins = d.prepare(
    `INSERT INTO products (slug,name,category,image,variant_name,unit,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  );
  const insV = d.prepare(`INSERT INTO variants (product_id,sku,label,price,stock,reserved) VALUES (?,?,?,?,0,0)`);
  const a = ins.run(SLUG, "Produto A", "Fixação", "/a.webp", "Medida", "un", NOW.toISOString(), NOW.toISOString());
  insV.run(a.lastInsertRowid, SKU, "6 mm", 1000);
  const b = ins.run(SLUG_B, "Produto B", "Fixação", "/b.webp", "Medida", "un", NOW.toISOString(), NOW.toISOString());
  insV.run(b.lastInsertRowid, SKU_B, "8 mm", 2000);
}

function order(lines: { sku: string; qty: number }[], createdAt = NOW): NewOrder {
  seq++;
  return {
    id: `SP-T${seq}`,
    token: `tok-${seq}`,
    createdAt: createdAt.toISOString(),
    customer: { name: "Ana", email: "ana@example.com", phone: "11999999999", document: "00000000000" },
    shipping: { method: "sedex", label: "Sedex", price: 500, estimate: "3 dias", address: "Rua 1" },
    paymentMethod: "PIX",
    lines,
    subtotal: 0,
    total: 0,
  };
}

function place(lines: { sku: string; qty: number }[], createdAt = NOW, charge = true) {
  const o = order(lines, createdAt);
  const r = createOrderWithReservation(db, o);
  expect(r.ok).toBe(true);
  if (charge) attachCharge(db, o.id, { asaasPaymentId: `pay_${o.id}`, invoiceUrl: "https://x", demo: false });
  return o.id;
}

const variant = (sku = SKU) =>
  db.prepare("SELECT stock, reserved FROM variants WHERE sku = ?").get(sku) as { stock: number; reserved: number };
const available = (sku = SKU) => {
  const v = variant(sku);
  return v.stock - v.reserved;
};
const status = (id: string) => getOrderById(db, id)!.status;
const movements = (kind: string) =>
  db.prepare("SELECT * FROM stock_movements WHERE kind = ?").all(kind) as { qty: number; order_id: string }[];

/** A soma das movimentações de cada variação tem de bater com stock e reserved. */
function checkLedger(d: Db = db) {
  const vs = d.prepare("SELECT id, sku, stock, reserved FROM variants").all() as {
    id: number; sku: string; stock: number; reserved: number;
  }[];
  for (const v of vs) {
    const ms = d.prepare("SELECT kind, qty FROM stock_movements WHERE variant_id = ?").all(v.id) as {
      kind: string; qty: number;
    }[];
    let stock = 0;
    let reserved = 0;
    for (const m of ms) {
      if (m.kind === "entrada" || m.kind === "devolucao" || m.kind === "ajuste") stock += m.qty;
      else if (m.kind === "venda") { stock -= m.qty; reserved -= m.qty; }
      else if (m.kind === "reserva") reserved += m.qty;
      else if (m.kind === "liberacao") reserved -= m.qty;
      else throw new Error(`movimentação desconhecida: ${m.kind}`);
    }
    expect({ sku: v.sku, stock, reserved }).toEqual({ sku: v.sku, stock: v.stock, reserved: v.reserved });
  }
}

beforeEach(() => {
  db = openDb(":memory:");
  fixture(db);
  addStock(db, SKU, 3, "compra inicial", USER, NOW);
});

afterEach(() => checkLedger());

describe("reserva no checkout", () => {
  it("reservar 2 de um estoque 3 deixa o disponível em 1", () => {
    const o = order([{ sku: SKU, qty: 2 }]);
    const r = createOrderWithReservation(db, o);
    expect(r).toEqual({ ok: true, slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 3, reserved: 2 });
    expect(available()).toBe(1);
    const saved = getOrderByToken(db, o.token)!;
    expect(saved.status).toBe("aguardando");
    expect(saved.lines).toEqual([
      // Produto A tem variant_name mas uma variação só: não há escolha para mostrar
      { sku: SKU, name: "Produto A", variant: null, qty: 2, unitPrice: 1000 },
    ]);
    expect(getOrderEvents(db, o.id).map((e) => e.toStatus)).toEqual(["aguardando"]);
    expect(movements("reserva")).toHaveLength(1);
  });

  it("produto com nome de variação e mais de uma variação guarda o texto composto da linha", () => {
    const a = db.prepare("SELECT id FROM products WHERE slug = ?").get(SLUG) as { id: number };
    db.prepare("INSERT INTO variants (product_id,sku,label,price,stock,reserved) VALUES (?,?,?,?,0,0)").run(a.id, "SKU-A2", "10 mm", 1200);
    addStock(db, "SKU-A2", 5, "compra inicial", USER, NOW);
    const o = order([{ sku: "SKU-A2", qty: 1 }]);
    expect(createOrderWithReservation(db, o).ok).toBe(true);
    expect(getOrderByToken(db, o.token)!.lines[0].variant).toBe("Medida: 10 mm");
    // o texto é uma foto do momento da compra: renomear depois não muda o pedido
    db.prepare("UPDATE products SET variant_name = ? WHERE id = ?").run("Bitola", a.id);
    expect(getOrderByToken(db, o.token)!.lines[0].variant).toBe("Medida: 10 mm");
  });

  it("um segundo pedido de 2 retorna shortages e não grava nada", () => {
    place([{ sku: SKU, qty: 2 }]);
    const o = order([{ sku: SKU, qty: 2 }]);
    const r = createOrderWithReservation(db, o);
    expect(r).toEqual({ ok: false, shortages: [{ sku: SKU, available: 1 }] });
    expect(getOrderById(db, o.id)).toBeNull();
    expect(variant()).toEqual({ stock: 3, reserved: 2 });
    expect(movements("reserva")).toHaveLength(1);
  });

  it("SKU inexistente vira shortage com disponível 0", () => {
    const r = createOrderWithReservation(db, order([{ sku: "NAO-EXISTE", qty: 1 }]));
    expect(r).toEqual({ ok: false, shortages: [{ sku: "NAO-EXISTE", available: 0 }] });
  });

  it("duas conexões disputando a última unidade: só uma consegue", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-stock-"));
    const file = path.join(dir, "site.db");
    const a = openDb(file);
    fixture(a);
    addStock(a, SKU, 1, "última", USER, NOW);
    const b = openDb(file);
    try {
      const r1 = createOrderWithReservation(a, order([{ sku: SKU, qty: 1 }]));
      const r2 = createOrderWithReservation(b, order([{ sku: SKU, qty: 1 }]));
      expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
      expect(r2).toEqual({ ok: false, shortages: [{ sku: SKU, available: 0 }] });
      expect(a.prepare("SELECT stock, reserved FROM variants WHERE sku = ?").get(SKU)).toEqual({ stock: 1, reserved: 1 });
      checkLedger(a);
    } finally {
      a.close();
      b.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("confirmPayment", () => {
  it("confirmar baixa o estoque para 1 e o reservado para 0, com uma movimentação venda", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    const r = confirmPayment(db, id, "evt_1", NOW);
    expect(r).toEqual({ status: "pago", slugs: [SLUG], duplicate: false });
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
    expect(movements("venda")).toEqual([expect.objectContaining({ qty: 2, order_id: id })]);
    expect(status(id)).toBe("pago");
  });

  it("PAYMENT_CONFIRMED + PAYMENT_RECEIVED com ids diferentes baixam uma vez só", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_confirmed", NOW);
    const r = confirmPayment(db, id, "evt_received", NOW);
    expect(r).toEqual({ status: "pago", slugs: [], duplicate: true });
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
    expect(movements("venda")).toHaveLength(1);
  });

  it("o mesmo eventId duas vezes → duplicate", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expect(confirmPayment(db, id, "evt_1", NOW).duplicate).toBe(false);
    expect(confirmPayment(db, id, "evt_1", NOW)).toEqual({ status: "pago", slugs: [], duplicate: true });
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
  });

  it("eventos em separado/enviado/entregue/pago_sem_estoque não mudam nada", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    confirmPayment(db, id, "e1", NOW);
    moveStage(db, id, "separado", USER, NOW);
    expect(confirmPayment(db, id, "e2", NOW)).toEqual({ status: "separado", slugs: [], duplicate: true });
    expect(variant()).toEqual({ stock: 2, reserved: 0 });
  });

  it("pedido expirado com estoque sobrando, confirmado depois → pago e baixa", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expireOrder(db, id, "vencido", NOW);
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    const r = confirmPayment(db, id, "evt_late", NOW);
    expect(r).toEqual({ status: "pago", slugs: [SLUG], duplicate: false });
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
    expect(movements("venda")).toHaveLength(1);
  });

  it("pedido expirado sem estoque (outro pedido levou) → pago_sem_estoque, estoque intacto", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expireOrder(db, id, "vencido", NOW);
    place([{ sku: SKU, qty: 2 }]);
    const r = confirmPayment(db, id, "evt_late", NOW);
    expect(r).toEqual({ status: "pago_sem_estoque", slugs: [], duplicate: false });
    expect(variant()).toEqual({ stock: 3, reserved: 2 });
    expect(movements("venda")).toHaveLength(0);
  });
});

describe("pagamento depois de cancelado um pedido já pago", () => {
  it("pago → cancelado sem restock → novo eventId: nenhuma venda nova, continua cancelado", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_confirmed", NOW);
    cancelOrder(db, id, { restock: false, userId: USER, reason: "x" }, NOW);
    const r = confirmPayment(db, id, "evt_received", NOW);
    expect(r).toEqual({ status: "cancelado", slugs: [], duplicate: true });
    expect(status(id)).toBe("cancelado");
    expect(movements("venda")).toHaveLength(1);
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
  });

  it("pago → cancelado com restock → novo eventId: nenhuma venda nova, continua cancelado", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_confirmed", NOW);
    cancelOrder(db, id, { restock: true, userId: USER, reason: "x" }, NOW);
    const r = confirmPayment(db, id, "evt_received", NOW);
    expect(r).toEqual({ status: "cancelado", slugs: [], duplicate: true });
    expect(movements("venda")).toHaveLength(1);
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
  });

  it("pago_sem_estoque → cancelado → novo eventId: continua cancelado, estoque intacto", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expireOrder(db, id, "vencido", NOW);
    place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_late", NOW);
    cancelOrder(db, id, { restock: false, userId: USER, reason: "estornar" }, NOW);
    addStock(db, SKU, 5, "chegou", USER, NOW); // agora haveria estoque: mesmo assim não revive
    const r = confirmPayment(db, id, "evt_received", NOW);
    expect(r).toEqual({ status: "cancelado", slugs: [], duplicate: true });
    expect(status(id)).toBe("cancelado");
    expect(movements("venda")).toHaveLength(0);
    expect(variant()).toEqual({ stock: 8, reserved: 2 });
  });
});

describe("fulfillOutOfStock", () => {
  it("sem estoque → ok:false; depois de addStock → pago", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expireOrder(db, id, "vencido", NOW);
    place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_late", NOW);
    expect(fulfillOutOfStock(db, id, USER, NOW)).toEqual({ ok: false, shortages: [{ sku: SKU, available: 1 }] });
    expect(status(id)).toBe("pago_sem_estoque");
    expect(variant()).toEqual({ stock: 3, reserved: 2 });

    addStock(db, SKU, 1, "chegou", USER, NOW);
    expect(fulfillOutOfStock(db, id, USER, NOW)).toEqual({ ok: true, slugs: [SLUG] });
    expect(status(id)).toBe("pago");
    expect(variant()).toEqual({ stock: 2, reserved: 2 });
  });
});

describe("cancelOrder", () => {
  it("em aguardando libera a reserva", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expect(cancelOrder(db, id, { restock: false, userId: USER, reason: "cliente desistiu" }, NOW)).toEqual({ slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    expect(movements("liberacao")).toHaveLength(1);
    expect(status(id)).toBe("cancelado");
  });

  it("em separado com restock devolve (movimentação devolucao)", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "e1", NOW);
    moveStage(db, id, "separado", USER, NOW);
    expect(cancelOrder(db, id, { restock: true, userId: USER, reason: "x" }, NOW)).toEqual({ slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 3, reserved: 0 });
    expect(movements("devolucao")).toEqual([expect.objectContaining({ qty: 2, order_id: id })]);
  });

  it("em separado sem restock não devolve", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "e1", NOW);
    moveStage(db, id, "separado", USER, NOW);
    expect(cancelOrder(db, id, { restock: false, userId: USER, reason: "x" }, NOW)).toEqual({ slugs: [] });
    expect(variant()).toEqual({ stock: 1, reserved: 0 });
    expect(movements("devolucao")).toHaveLength(0);
    expect(status(id)).toBe("cancelado");
  });

  it("em entregue lança erro", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    confirmPayment(db, id, "e1", NOW);
    moveStage(db, id, "separado", USER, NOW);
    moveStage(db, id, "enviado", USER, NOW, "BR123");
    moveStage(db, id, "entregue", USER, NOW);
    expect(() => cancelOrder(db, id, { restock: true, userId: USER, reason: "x" }, NOW)).toThrow();
    expect(status(id)).toBe("entregue");
  });

  it("em pago_sem_estoque só muda o status", () => {
    const id = place([{ sku: SKU, qty: 2 }]);
    expireOrder(db, id, "vencido", NOW);
    place([{ sku: SKU, qty: 2 }]);
    confirmPayment(db, id, "evt_late", NOW);
    expect(cancelOrder(db, id, { restock: true, userId: USER, reason: "estornar" }, NOW)).toEqual({ slugs: [] });
    expect(status(id)).toBe("cancelado");
    expect(variant()).toEqual({ stock: 3, reserved: 2 });
  });
});

describe("moveStage", () => {
  it("pago→enviado lança erro; separado→pago (voltar) passa; enviado grava rastreio", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    confirmPayment(db, id, "e1", NOW);
    expect(() => moveStage(db, id, "enviado", USER, NOW)).toThrow();
    moveStage(db, id, "separado", USER, NOW);
    moveStage(db, id, "pago", USER, NOW);
    expect(status(id)).toBe("pago");
    moveStage(db, id, "separado", USER, NOW);
    moveStage(db, id, "enviado", USER, NOW, "BR123");
    expect(getOrderById(db, id)!.trackingCode).toBe("BR123");
    expect(getOrderEvents(db, id).map((e) => [e.fromStatus, e.toStatus])).toEqual([
      [null, "aguardando"],
      ["aguardando", "pago"],
      ["pago", "separado"],
      ["separado", "pago"],
      ["pago", "separado"],
      ["separado", "enviado"],
    ]);
  });

  it("aguardando→pago pelo moveStage lança erro (só o pagamento confirma)", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    expect(() => moveStage(db, id, "pago", USER, NOW)).toThrow();
  });
});

describe("estoque manual", () => {
  it("setStock abaixo do reservado → erro com a mensagem exata", () => {
    place([{ sku: SKU, qty: 2 }]);
    expect(setStock(db, SKU, 1, "contagem", USER, NOW)).toEqual({
      ok: false,
      error: "Há 2 unidades reservadas em pedidos não pagos. O estoque não pode ficar abaixo disso.",
    });
    expect(variant()).toEqual({ stock: 3, reserved: 2 });
  });

  it("setStock define o número contado (movimentação ajuste)", () => {
    expect(setStock(db, SKU, 7, "contagem", USER, NOW)).toEqual({ ok: true, slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 7, reserved: 0 });
    expect(setStock(db, SKU, 2, "quebra", USER, NOW)).toEqual({ ok: true, slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 2, reserved: 0 });
    expect(movements("ajuste").map((m) => m.qty)).toEqual([4, -5]);
  });

  it("setStock exige motivo", () => {
    expect(setStock(db, SKU, 5, "  ", USER, NOW).ok).toBe(false);
  });

  it("addStock recusa qty <= 0", () => {
    expect(() => addStock(db, SKU, 0, "x", USER, NOW)).toThrow();
    expect(() => addStock(db, SKU, -1, "x", USER, NOW)).toThrow();
    expect(addStock(db, SKU, 2, "compra", USER, NOW)).toEqual({ slugs: [SLUG] });
    expect(variant()).toEqual({ stock: 5, reserved: 0 });
  });

  it("addStock com motivo em branco grava 'Entrada'", () => {
    addStock(db, SKU, 1, "  ", USER, NOW);
    const last = db.prepare("SELECT reason FROM stock_movements ORDER BY id DESC LIMIT 1").get() as { reason: string | null };
    expect(last.reason).toBe("Entrada");
  });
});

describe("sweep", () => {
  const minutes = (n: number) => new Date(NOW.getTime() - n * 60_000);
  const days = (d: number, h = 0, m = 0) => minutes(d * 1440 + h * 60 + m);

  it("pedido de 4 dias e 1 minuto expira, de 3 dias e 23 horas não", () => {
    const old = place([{ sku: SKU, qty: 1 }], days(4, 0, 1));
    const recent = place([{ sku: SKU, qty: 1 }], days(3, 23));
    const r = sweep(db, NOW);
    expect(r).toEqual({ expired: [old], slugs: [SLUG] });
    expect(status(old)).toBe("cancelado");
    expect(status(recent)).toBe("aguardando");
    expect(variant()).toEqual({ stock: 3, reserved: 1 });
  });

  it("sem cobrança há 16 minutos expira, há 14 não; demo sem cobrança não expira", () => {
    const stale = place([{ sku: SKU, qty: 1 }], minutes(16), false);
    const fresh = place([{ sku: SKU, qty: 1 }], minutes(14), false);
    const demo = place([{ sku: SKU, qty: 1 }], minutes(30), false);
    attachCharge(db, demo, { asaasPaymentId: null, invoiceUrl: null, demo: true });
    const r = sweep(db, NOW);
    expect(r).toEqual({ expired: [stale], slugs: [SLUG] });
    expect(status(fresh)).toBe("aguardando");
    expect(status(demo)).toBe("aguardando");
    expect(listOrders(db, { status: "cancelado" }).map((o) => o.id)).toEqual([stale]);
  });

  it("expireOrder fora de aguardando não faz nada", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    confirmPayment(db, id, "e1", NOW);
    expect(expireOrder(db, id, "vencido", NOW)).toEqual({ slugs: [] });
    expect(status(id)).toBe("pago");
  });
});

describe("flagRefund", () => {
  it("marca o aviso de estorno sem mexer no estoque, e ignora evento repetido", () => {
    const id = place([{ sku: SKU, qty: 1 }]);
    confirmPayment(db, id, "e1", NOW);
    flagRefund(db, id, "refund_1");
    flagRefund(db, id, "refund_1");
    expect(getOrderById(db, id)!.refundFlag).toBe(true);
    expect(status(id)).toBe("pago");
    expect(variant()).toEqual({ stock: 2, reserved: 0 });
  });
});
