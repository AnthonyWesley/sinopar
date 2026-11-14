import { describe, it, expect, vi, afterEach } from "vitest";

const { revalidateTag, getDb } = vi.hoisted(() => ({ revalidateTag: vi.fn(), getDb: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/server/db", async (orig) => ({ ...(await orig<typeof import("@/lib/server/db")>()), getDb }));

import { openDb } from "@/lib/server/db";
import { TAG_CATALOG, productTag } from "@/lib/cache-tags";
import { POST } from "./route";

const req = (token: string | null, body = "{}") =>
  new Request("http://x/api/asaas/webhook", {
    method: "POST", body, headers: token == null ? {} : { "asaas-access-token": token },
  });

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("POST /api/asaas/webhook", () => {
  it("401 sem env configurada, sem tocar no banco", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "");
    expect((await POST(req("qualquer"))).status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });
  it("401 com token errado", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    expect((await POST(req("outro"))).status).toBe(401);
    expect((await POST(req(null))).status).toBe(401);
    expect(getDb).not.toHaveBeenCalled();
  });
  it("400 com JSON inválido ou corpo incompleto", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    getDb.mockReturnValue({});
    expect((await POST(req("segredo", "não é json"))).status).toBe(400);
    expect((await POST(req("segredo", "{}"))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("500 em erro transitório do SQLite (SQLITE_BUSY)", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    getDb.mockReturnValue({ prepare: () => { throw Object.assign(new Error("locked"), { code: "SQLITE_BUSY" }); } });
    const body = JSON.stringify({ id: "e1", event: "PAYMENT_CONFIRMED", payment: { externalReference: "SP-1" } });
    expect((await POST(req("segredo", body))).status).toBe(500);
  });
  it("500 em código estendido do SQLite (SQLITE_BUSY_SNAPSHOT)", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    getDb.mockReturnValue({ prepare: () => { throw Object.assign(new Error("locked"), { code: "SQLITE_BUSY_SNAPSHOT" }); } });
    const body = JSON.stringify({ id: "e1", event: "PAYMENT_CONFIRMED", payment: { externalReference: "SP-1" } });
    expect((await POST(req("segredo", body))).status).toBe(500);
  });
  it("500 se o banco não abre", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    getDb.mockImplementation(() => { throw new Error("sem banco"); });
    expect((await POST(req("segredo", "{}"))).status).toBe(500);
  });
  it("caminho feliz autenticado revalida catálogo e produto", async () => {
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "segredo");
    const db = openDb(":memory:");
    const now = new Date().toISOString();
    const p = db.prepare("INSERT INTO products (slug,name,category,image,variant_name,unit,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("produto-a", "Produto A", "Fixação", "/a.webp", "Medida", "un", now, now);
    db.prepare("INSERT INTO variants (product_id,sku,label,price,stock,reserved) VALUES (?,?,?,?,5,0)").run(p.lastInsertRowid, "SKU-A", "6 mm", 1000);
    const { createOrderWithReservation } = await import("@/lib/server/stock");
    expect(createOrderWithReservation(db, {
      id: "SP-R1", token: "t", createdAt: now,
      customer: { name: "Ana", email: "a@e.com", phone: "1", document: "0" },
      shipping: { method: "sedex", label: "Sedex", price: 0, estimate: "3", address: "R" },
      paymentMethod: "PIX", lines: [{ sku: "SKU-A", qty: 2 }], subtotal: 0, total: 0,
    }).ok).toBe(true);
    getDb.mockReturnValue(db);
    const body = JSON.stringify({ id: "e2", event: "PAYMENT_CONFIRMED", payment: { externalReference: "SP-R1" } });
    expect((await POST(req("segredo", body))).status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith(TAG_CATALOG, "max");
    expect(revalidateTag).toHaveBeenCalledWith(productTag("produto-a"), "max");
  });
});
