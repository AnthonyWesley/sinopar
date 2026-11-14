import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-orders-"));
process.env.DATA_DIR = dir;

const asaas = vi.hoisted(() => ({ enabled: true }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), refresh: vi.fn() }));
vi.mock("../session", () => ({ authorizeAction: vi.fn() }));
vi.mock("../asaas", () => ({
  get asaasEnabled() {
    return asaas.enabled;
  },
}));

import { updateTag } from "next/cache";
import { authorizeAction } from "../session";
import { getDb } from "../server/db";
import { getOrderById, getOrderEvents } from "../server/orders-repo";
import { attachCharge, createOrderWithReservation } from "../server/stock";
import { products } from "../catalog";
import {
  advanceStage,
  backStage,
  cancelOrderAction,
  fulfillOutOfStockAction,
  markPaidDemo,
  saveTracking,
  type OrderActionState,
} from "./orders";

const staff = { id: 2, email: "f@x.com", name: "Func", role: "staff" as const, mustChangePassword: false, hasRecoveryCode: true };
const EMPTY: OrderActionState = {};
const product = products[0];
const sku = product.variants[0].sku;
const row = () => getDb().prepare("SELECT stock, reserved FROM variants WHERE sku = ?").get(sku) as { stock: number; reserved: number };
const tags = () => vi.mocked(updateTag).mock.calls.map((c) => c[0]);
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

let seq = 0;
/** pedido aguardando com 2 unidades reservadas; `demo` marca a cobrança como demonstração */
function place(demo = false): string {
  const id = `SP-ACT${++seq}`;
  const r = createOrderWithReservation(getDb(), {
    id,
    token: `tok-act-${seq}`,
    createdAt: new Date().toISOString(),
    customer: { name: "Ana", email: "ana@example.com", phone: "11999999999", document: "00000000000" },
    shipping: { method: "retirada", label: "Retirada", price: 0, estimate: "hoje", address: null },
    paymentMethod: "PIX",
    lines: [{ sku, qty: 2 }],
    subtotal: 2000,
    total: 2000,
  });
  expect(r.ok).toBe(true);
  attachCharge(getDb(), id, demo ? { asaasPaymentId: null, invoiceUrl: null, demo: true } : { asaasPaymentId: `pay_${id}`, invoiceUrl: "https://x", demo: false });
  return id;
}
const status = (id: string) => getOrderById(getDb(), id)!.status;
const setStatus = (id: string, s: string) => getDb().prepare("UPDATE orders SET status = ? WHERE id = ?").run(s, id);

beforeEach(() => {
  asaas.enabled = true;
  vi.mocked(updateTag).mockClear();
  vi.mocked(authorizeAction).mockResolvedValue({ ok: true, user: staff });
  getDb()
    .prepare("INSERT OR IGNORE INTO users (id, email, name, password_hash, role, created_at) VALUES (2, 'f@x.com', 'Func', 'x', 'staff', 'x')")
    .run();
  getDb().prepare("UPDATE variants SET stock = 50, reserved = 0 WHERE sku = ?").run(sku);
});

describe("markPaidDemo", () => {
  it("com o Asaas ligado e pedido de verdade: recusado, nada muda", async () => {
    const id = place(false);
    const r = await markPaidDemo(EMPTY, fd({ orderId: id }));
    expect(r.error).toBe("Com o Asaas ligado, o pagamento só é confirmado pelo aviso do Asaas.");
    expect(status(id)).toBe("aguardando");
    expect(row()).toEqual({ stock: 50, reserved: 2 });
  });

  it("pedido de demonstração: vira pago, baixa e grava quem marcou", async () => {
    const id = place(true);
    expect(await markPaidDemo(EMPTY, fd({ orderId: id }))).toEqual({ message: "Pedido marcado como pago." });
    expect(status(id)).toBe("pago");
    expect(row()).toEqual({ stock: 48, reserved: 0 });
    expect(getOrderEvents(getDb(), id).at(-1)).toMatchObject({ toStatus: "pago", userName: "Func" });
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", `produto:${product.slug}`]));
  });

  it("com o Asaas desligado vale para qualquer pedido", async () => {
    asaas.enabled = false;
    const id = place(false);
    expect((await markPaidDemo(EMPTY, fd({ orderId: id }))).message).toBe("Pedido marcado como pago.");
  });

  it("sem sessão: erro da sessão", async () => {
    vi.mocked(authorizeAction).mockResolvedValue({ ok: false, error: "Sua sessão expirou. Entre de novo." });
    expect(await markPaidDemo(EMPTY, fd({ orderId: place(true) }))).toEqual({ error: "Sua sessão expirou. Entre de novo." });
  });
});

describe("cancelOrderAction", () => {
  it("cancelar pago com restock devolve as unidades", async () => {
    const id = place(true);
    await markPaidDemo(EMPTY, fd({ orderId: id }));
    vi.mocked(updateTag).mockClear();
    const r = await cancelOrderAction(EMPTY, fd({ orderId: id, from: "pago", restock: "sim" }));
    expect(r.message).toBe("Pedido cancelado. O estorno do dinheiro é feito no painel do Asaas.");
    expect(status(id)).toBe("cancelado");
    expect(row()).toEqual({ stock: 50, reserved: 0 });
    expect(tags()).toEqual(expect.arrayContaining(["catalogo", `produto:${product.slug}`]));
    expect(getOrderEvents(getDb(), id).at(-1)).toMatchObject({ toStatus: "cancelado", userName: "Func" });
  });

  it("cancelar pago sem restock não devolve; sem resposta, pergunta", async () => {
    const id = place(true);
    await markPaidDemo(EMPTY, fd({ orderId: id }));
    expect((await cancelOrderAction(EMPTY, fd({ orderId: id, from: "pago" }))).error).toBe(
      "Responda se as unidades voltam para o estoque.",
    );
    expect(status(id)).toBe("pago");
    await cancelOrderAction(EMPTY, fd({ orderId: id, from: "pago", restock: "nao" }));
    expect(status(id)).toBe("cancelado");
    expect(row()).toEqual({ stock: 48, reserved: 0 });
  });

  it("cancelar aguardando libera a reserva", async () => {
    const id = place();
    expect((await cancelOrderAction(EMPTY, fd({ orderId: id, from: "aguardando" }))).message).toBe("Pedido cancelado.");
    expect(row()).toEqual({ stock: 50, reserved: 0 });
  });

  it("entregue: mensagem em português, sem exceção", async () => {
    const id = place();
    setStatus(id, "entregue");
    expect((await cancelOrderAction(EMPTY, fd({ orderId: id, from: "entregue" }))).error).toBe(
      "Pedido entregue não pode ser cancelado.",
    );
  });
});

describe("advanceStage / backStage", () => {
  it("voltar etapa grava o evento com quem fez", async () => {
    const id = place(true);
    await markPaidDemo(EMPTY, fd({ orderId: id }));
    expect((await advanceStage(EMPTY, fd({ orderId: id, from: "pago" }))).message).toBe("Pedido marcado como separado.");
    expect((await backStage(EMPTY, fd({ orderId: id, from: "separado" }))).message).toBe("Pedido voltou para pago.");
    expect(status(id)).toBe("pago");
    expect(getOrderEvents(getDb(), id).at(-1)).toMatchObject({ fromStatus: "separado", toStatus: "pago", userId: 2, userName: "Func" });
  });

  it("enviar com código de rastreio guarda o código", async () => {
    const id = place();
    setStatus(id, "separado");
    await advanceStage(EMPTY, fd({ orderId: id, from: "separado", tracking: " BR123 " }));
    expect(getOrderById(getDb(), id)).toMatchObject({ status: "enviado", trackingCode: "BR123" });
  });

  it("etapa desatualizada (dois cliques) não avança duas vezes", async () => {
    const id = place();
    setStatus(id, "pago");
    await advanceStage(EMPTY, fd({ orderId: id, from: "pago" }));
    expect((await advanceStage(EMPTY, fd({ orderId: id, from: "pago" }))).error).toBe(
      "O pedido mudou de etapa. Atualize a página.",
    );
    expect(status(id)).toBe("separado");
  });

  it("pedido inexistente: mensagem", async () => {
    expect((await advanceStage(EMPTY, fd({ orderId: "SP-NAO", from: "pago" }))).error).toBe("Pedido não encontrado.");
  });
});

describe("saveTracking", () => {
  it("guarda o código num pedido enviado e grava o evento", async () => {
    const id = place();
    setStatus(id, "enviado");
    expect((await saveTracking(EMPTY, fd({ orderId: id, tracking: "BR999" }))).message).toBe("Código de rastreio salvo.");
    expect(getOrderById(getDb(), id)!.trackingCode).toBe("BR999");
    expect(getOrderEvents(getDb(), id).at(-1)).toMatchObject({ note: "Rastreio: BR999", userName: "Func" });
  });
});

describe("fulfillOutOfStockAction", () => {
  it("sem estoque mostra o que falta; com estoque vira pago", async () => {
    const id = place();
    await cancelOrderAction(EMPTY, fd({ orderId: id, from: "aguardando" }));
    setStatus(id, "pago_sem_estoque");
    getDb().prepare("UPDATE variants SET stock = 1 WHERE sku = ?").run(sku);
    const r = await fulfillOutOfStockAction(EMPTY, fd({ orderId: id, from: "pago_sem_estoque" }));
    expect(r.error).toBe(`Ainda falta estoque: ${sku} (disponível 1).`);
    expect(status(id)).toBe("pago_sem_estoque");
    getDb().prepare("UPDATE variants SET stock = 10 WHERE sku = ?").run(sku);
    expect((await fulfillOutOfStockAction(EMPTY, fd({ orderId: id, from: "pago_sem_estoque" }))).message).toBe(
      "Pedido atendido e passado para pago.",
    );
    expect(row()).toEqual({ stock: 8, reserved: 0 });
  });
});
