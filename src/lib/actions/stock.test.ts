import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-stock-"));
process.env.DATA_DIR = dir;

vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("../session", () => ({ authorizeAction: vi.fn() }));

import { updateTag } from "next/cache";
import { authorizeAction } from "../session";
import { getDb } from "../server/db";
import { listMovements, listStock } from "../server/stock-repo";
import { products } from "../catalog";
import { addStockAction, setStockAction } from "./stock";

const staff = { id: 2, email: "f@x.com", name: "Func", role: "staff" as const, mustChangePassword: false, hasRecoveryCode: true };
const EMPTY = {};
const sku = products[0].variants[0].sku;
const row = (s = sku) => getDb().prepare("SELECT id, stock, reserved FROM variants WHERE sku = ?").get(s) as { id: number; stock: number; reserved: number };
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.mocked(updateTag).mockClear();
  vi.mocked(authorizeAction).mockResolvedValue({ ok: true, user: staff });
  getDb()
    .prepare("INSERT OR IGNORE INTO users (id, email, name, password_hash, role, created_at) VALUES (2, 'f@x.com', 'Func', 'x', 'staff', 'x')")
    .run();
});

describe("addStockAction", () => {
  it("entrada de 10 soma e grava 'entrada' com o usuário; invalida as tags", async () => {
    const before = row().stock;
    expect(await addStockAction(EMPTY, fd({ sku, qty: "10", reason: "Compra NF 123" }))).toEqual({ message: "Entrada de 10 registrada." });
    expect(row().stock).toBe(before + 10);
    expect(listMovements(getDb(), sku)[0]).toMatchObject({ kind: "entrada", qty: 10, reason: "Compra NF 123", userName: "Func" });
    const tags = vi.mocked(updateTag).mock.calls.map((c) => c[0]);
    expect(tags).toEqual(expect.arrayContaining(["catalogo", `produto:${products[0].slug}`]));
  });

  it("motivo em branco vale 'Entrada'; quantidade inválida e sem sessão são recusadas", async () => {
    await addStockAction(EMPTY, fd({ sku, qty: "1", reason: "  " }));
    expect(listMovements(getDb(), sku)[0].reason).toBe("Entrada");
    expect((await addStockAction(EMPTY, fd({ sku, qty: "0" }))).error).toMatch(/1 ou mais/);
    vi.mocked(authorizeAction).mockResolvedValue({ ok: false, error: "Sua sessão expirou. Entre de novo." });
    expect(await addStockAction(EMPTY, fd({ sku, qty: "1" }))).toEqual({ error: "Sua sessão expirou. Entre de novo." });
  });
});

describe("setStockAction", () => {
  it("motivo vazio -> 'Informe o motivo.' e nada muda", async () => {
    const before = row().stock;
    expect(await setStockAction(EMPTY, fd({ sku, counted: "3", reason: "  " }))).toEqual({ error: "Informe o motivo." });
    expect(row().stock).toBe(before);
  });

  it("ajuste grava a diferença com sinal", async () => {
    const before = row().stock;
    expect(await setStockAction(EMPTY, fd({ sku, counted: String(before + 4), reason: "Contagem" }))).toEqual({ message: "Estoque ajustado." });
    expect(listMovements(getDb(), sku)[0]).toMatchObject({ kind: "ajuste", qty: 4, reason: "Contagem" });
  });

  it("abaixo do reservado mostra a mensagem da regra", async () => {
    getDb().prepare("UPDATE variants SET stock = 10, reserved = 4 WHERE sku = ?").run(sku);
    vi.mocked(updateTag).mockClear();
    expect(await setStockAction(EMPTY, fd({ sku, counted: "3", reason: "Contagem" }))).toEqual({
      error: "Há 4 unidades reservadas em pedidos não pagos. O estoque não pode ficar abaixo disso.",
    });
    expect(row().stock).toBe(10);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("listStock", () => {
  it("'acabando' mostra disponível 1..5 e esconde 0 e 6; 'esgotado' só 0", () => {
    const db = getDb();
    const skus = products.slice(1, 6).map((p) => p.variants[0].sku);
    // [código, estoque, reservado]: disponível 0, 1, 5, 6 e 5 (8 - 3)
    const setup: [string, number, number][] = [[skus[0], 0, 0], [skus[1], 1, 0], [skus[2], 5, 0], [skus[3], 6, 0], [skus[4], 8, 3]];
    for (const [s, stock, reserved] of setup) db.prepare("UPDATE variants SET stock = ?, reserved = ? WHERE sku = ?").run(stock, reserved, s);
    const low = listStock(db, { filter: "acabando" }).map((r) => r.sku);
    expect(low).toEqual(expect.arrayContaining([skus[1], skus[2], skus[4]]));
    expect(low).not.toContain(skus[0]);
    expect(low).not.toContain(skus[3]);
    const out = listStock(db, { filter: "esgotado" }).map((r) => r.sku);
    expect(out).toContain(skus[0]);
    expect(out).not.toContain(skus[1]);
  });

  it("busca por nome ou código", () => {
    const p = products[7];
    const bySku = listStock(getDb(), { q: p.variants[0].sku.toLowerCase() }).map((r) => r.sku);
    expect(bySku).toContain(p.variants[0].sku);
    const byName = listStock(getDb(), { q: p.name.slice(0, 8) }).map((r) => r.name);
    expect(byName).toContain(p.name);
  });
});
