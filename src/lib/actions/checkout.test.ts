import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// banco num arquivo temporário: getDb() lê DATA_DIR na primeira chamada
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-checkout-"));
process.env.DATA_DIR = dir;

const hooks = vi.hoisted(() => ({ beforeReserve: null as null | (() => void) }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("../asaas", () => ({ createCharge: vi.fn() }));
// permite simular outra compra que leva o estoque entre a conferência e a transação
vi.mock("../server/stock", async (importOriginal) => {
  const real = await importOriginal<typeof import("../server/stock")>();
  return {
    ...real,
    createOrderWithReservation: (...args: Parameters<typeof real.createOrderWithReservation>) => {
      hooks.beforeReserve?.();
      return real.createOrderWithReservation(...args);
    },
  };
});

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { createCharge } from "../asaas";
import { getDb } from "../server/db";
import { getOrderByToken as repoGetOrderByToken } from "../server/orders-repo";
import { getOrderByToken } from "../orders";
import { TAG_CATALOG, productTag } from "../cache-tags";
import { products } from "../catalog";
import { placeOrder, type CheckoutState } from "./checkout";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderDetails } from "../../app/(checkout)/pedido-confirmado/order-details";

const product = products[0];
const variant = product.variants[0];
const sku = variant.sku;

const empty: CheckoutState = { errors: {}, values: {} };

function form(items: { sku: string; qty: number; price?: number; name?: string }[]) {
  const f = new FormData();
  const fields: Record<string, string> = {
    nome: "Maria da Silva",
    email: "maria@exemplo.com.br",
    celular: "(66) 99999-0000",
    documento: "529.982.247-25",
    entrega: "economica",
    cep: "78550-000",
    rua: "Rua das Flores",
    numero: "100",
    complemento: "",
    bairro: "Centro",
    cidade: "Sinop",
    uf: "MT",
    pagamento: "PIX",
  };
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  f.set("itens", JSON.stringify(items));
  return f;
}

const variantRow = () =>
  getDb().prepare("SELECT stock, reserved FROM variants WHERE sku = ?").get(sku) as { stock: number; reserved: number };

async function expectRedirect(p: Promise<unknown>): Promise<string> {
  const e = (await p.then(
    () => { throw new Error("esperava redirect"); },
    (err) => err,
  )) as { url?: string };
  if (!e.url) throw e;
  return e.url;
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.beforeReserve = null;
  const db = getDb();
  db.exec("DELETE FROM stock_movements; DELETE FROM order_events; DELETE FROM order_lines; DELETE FROM orders;");
  db.prepare("UPDATE variants SET stock = 10, reserved = 0 WHERE sku = ?").run(sku);
  vi.mocked(createCharge).mockResolvedValue({ asaasPaymentId: "pay_123", invoiceUrl: "https://asaas.test/i/1", demo: false });
});

afterAll(() => {
  const g = globalThis as unknown as { __sinoparDb?: { close(): void } };
  g.__sinoparDb?.close();
  delete g.__sinoparDb;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("placeOrder", () => {
  it("pedido válido grava aguardando com reserva, guarda a cobrança e redireciona pelo token", async () => {
    const url = await expectRedirect(placeOrder(empty, form([{ sku, qty: 3, price: variant.price }])));
    const token = new URL(url, "http://x").searchParams.get("pedido")!;
    expect(url).toBe(`/pedido-confirmado?pedido=${token}`);
    expect(redirect).toHaveBeenCalledOnce();

    const order = repoGetOrderByToken(getDb(), token)!;
    expect(order.status).toBe("aguardando");
    expect(order.id).toMatch(/^SP-/);
    expect(order.lines).toEqual([expect.objectContaining({ sku, qty: 3, unitPrice: variant.price })]);
    expect(order.payment).toEqual({ method: "PIX", invoiceUrl: "https://asaas.test/i/1", asaasPaymentId: "pay_123", demo: false });
    expect(order.subtotal).toBe(variant.price * 3);
    expect(order.total).toBe(order.subtotal + order.shipping.price);
    expect(variantRow()).toEqual({ stock: 10, reserved: 3 });

    expect(createCharge).toHaveBeenCalledWith(expect.objectContaining({ id: order.id, total: order.total }), "PIX");
    expect(updateTag).toHaveBeenCalledWith(productTag(product.slug));
    expect(updateTag).toHaveBeenCalledWith(TAG_CATALOG);
  });

  it("modo demonstração (sem asaasPaymentId) grava demo", async () => {
    vi.mocked(createCharge).mockResolvedValue({ asaasPaymentId: null, invoiceUrl: null, demo: true });
    const url = await expectRedirect(placeOrder(empty, form([{ sku, qty: 1 }])));
    const order = repoGetOrderByToken(getDb(), new URL(url, "http://x").searchParams.get("pedido")!)!;
    expect(order.payment).toEqual({ method: "PIX", invoiceUrl: null, asaasPaymentId: null, demo: true });
  });

  it("carrinho pede mais do que o disponível (estoque − reservado) → só restam N e cartFix", async () => {
    getDb().prepare("UPDATE variants SET stock = 10, reserved = 8 WHERE sku = ?").run(sku);
    const r = await placeOrder(empty, form([{ sku, qty: 3, price: variant.price }]));
    expect(r.message).toContain(`${product.name}: só restam 2`);
    expect(r.cartFix).toEqual({ remove: [], update: [{ sku, unitPrice: variant.price, compareAt: variant.compareAt, maxQty: 2 }] });
    expect(redirect).not.toHaveBeenCalled();
    expect(createCharge).not.toHaveBeenCalled();
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM orders").get()).toEqual({ n: 0 });
  });

  it("disponível zerado → esgotado e saiu do carrinho", async () => {
    getDb().prepare("UPDATE variants SET stock = 4, reserved = 4 WHERE sku = ?").run(sku);
    const r = await placeOrder(empty, form([{ sku, qty: 1 }]));
    expect(r.message).toContain(`${product.name}: esgotado e saiu do carrinho`);
    expect(r.cartFix).toEqual({ remove: [sku], update: [] });
  });

  it("falta descoberta só na transação (corrida) → mesmo cartFix e nada gravado", async () => {
    hooks.beforeReserve = () => getDb().prepare("UPDATE variants SET reserved = 9 WHERE sku = ?").run(sku);
    const r = await placeOrder(empty, form([{ sku, qty: 3, price: variant.price }]));
    expect(r.message).toContain(`${product.name}: só restam 1`);
    expect(r.message).toMatch(/^Atualizamos seu carrinho: .*Confira o total e confirme de novo\.$/);
    expect(r.cartFix).toEqual({ remove: [], update: [{ sku, unitPrice: variant.price, compareAt: variant.compareAt, maxQty: 1 }] });
    expect(createCharge).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM orders").get()).toEqual({ n: 0 });

    hooks.beforeReserve = () => getDb().prepare("UPDATE variants SET reserved = 10 WHERE sku = ?").run(sku);
    const r2 = await placeOrder(empty, form([{ sku, qty: 1 }]));
    expect(r2.message).toContain(`${product.name}: esgotado e saiu do carrinho`);
    expect(r2.cartFix).toEqual({ remove: [sku], update: [] });
  });

  it("o Asaas lança erro → pedido cancelado, reserva liberada e mensagem de sempre", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createCharge).mockRejectedValue(new Error("Asaas fora do ar"));
    const r = await placeOrder(empty, form([{ sku, qty: 2 }]));
    expect(r.message).toBe("Não conseguimos gerar a cobrança agora. Nada foi cobrado. Tente de novo em instantes.");
    expect(redirect).not.toHaveBeenCalled();

    const row = getDb().prepare("SELECT id, status FROM orders").get() as { id: string; status: string };
    expect(row.status).toBe("cancelado");
    expect(variantRow()).toEqual({ stock: 10, reserved: 0 });
    const kinds = getDb().prepare("SELECT kind, qty, reason FROM stock_movements WHERE order_id = ? ORDER BY id").all(row.id);
    expect(kinds).toEqual([
      { kind: "reserva", qty: 2, reason: "checkout" },
      { kind: "liberacao", qty: 2, reason: "falha ao gerar cobrança" },
    ]);
    expect(updateTag).toHaveBeenCalledWith(productTag(product.slug));
    expect(updateTag).toHaveBeenCalledWith(TAG_CATALOG);
  });

  it("validações de sempre continuam antes de gravar", async () => {
    const f = form([{ sku, qty: 1 }]);
    f.set("documento", "111.111.111-11");
    const r = await placeOrder(empty, f);
    expect(r.errors.documento).toBe("CPF ou CNPJ inválido. Confira os números.");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM orders").get()).toEqual({ n: 0 });
    expect(await placeOrder(empty, form([]))).toMatchObject({ message: "Seu carrinho está vazio." });
    const gone = await placeOrder(empty, form([{ sku: "nao-existe", qty: 1, name: "Coisa" }]));
    expect(gone.cartFix).toEqual({ remove: ["nao-existe"], update: [] });
    expect(gone.message).toContain("Coisa: não está mais à venda e saiu do carrinho");
  });

  it("a confirmação acha o pedido pelo token depois de reiniciar (nova conexão ao mesmo arquivo)", async () => {
    const url = await expectRedirect(placeOrder(empty, form([{ sku, qty: 1 }])));
    const token = new URL(url, "http://x").searchParams.get("pedido")!;
    const g = globalThis as unknown as { __sinoparDb?: { close(): void } };
    g.__sinoparDb!.close();
    delete g.__sinoparDb;

    const order = getOrderByToken(token);
    expect(order?.token).toBe(token);
    expect(order?.status).toBe("aguardando");
    expect(getOrderByToken("token-que-nao-existe")).toBeNull();
  });

  describe("texto da variação na linha do pedido (o mesmo de antes)", () => {
    const multi = products.find((p) => p.slug === "broca-escalonada")!;
    const single = products.find((p) => p.slug === "jogo-brocas-escalonadas-3-pecas")!;

    async function placeAndRender(skuToBuy: string) {
      const url = await expectRedirect(placeOrder(empty, form([{ sku: skuToBuy, qty: 1 }])));
      const token = new URL(url, "http://x").searchParams.get("pedido")!;
      const order = repoGetOrderByToken(getDb(), token)!;
      const html = renderToStaticMarkup(await OrderDetails({ searchParams: Promise.resolve({ pedido: token }) }));
      return { order, html };
    }

    it("produto com variantName e várias variações → \"Faixa de furo: 4 a 12 mm\" e a página mostra a linha", async () => {
      expect(multi.variantName).toBe("Faixa de furo");
      expect(multi.variants.length).toBeGreaterThan(1);
      const { order, html } = await placeAndRender(multi.variants[0].sku);
      expect(order.lines[0].variant).toBe(`Faixa de furo: ${multi.variants[0].label}`);
      expect(html).toContain(`<span class="block text-sm text-muted">Faixa de furo: ${multi.variants[0].label}</span>`);
    });

    it("produto de uma variação só → NULL e a página não mostra linha de variação", async () => {
      expect(single.variantName).toBeNull();
      expect(single.variants).toHaveLength(1);
      const { order, html } = await placeAndRender(single.variants[0].sku);
      expect(order.lines[0].variant).toBeNull();
      expect(html).toContain(single.name);
      expect(html).not.toContain(`<span class="block text-sm text-muted">`);
      expect(html).not.toContain(single.variants[0].label);
    });
  });
});
