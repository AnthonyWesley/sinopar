import { describe, it, expect, vi, afterEach } from "vitest";

const { revalidateTag, getDb } = vi.hoisted(() => ({ revalidateTag: vi.fn(), getDb: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/server/db", () => ({ getDb }));

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
});
