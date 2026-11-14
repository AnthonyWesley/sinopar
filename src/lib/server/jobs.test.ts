import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Varredura de hora em hora: chama a rota interna em 127.0.0.1:${PORT}. Se a chamada falhar,
// varre direto no banco e avisa no log uma vez só.

const sweep = vi.fn(() => ({ expired: [] as string[] }));
vi.mock("./stock", () => ({ sweep }));
vi.mock("./db", () => ({ getDb: () => ({}), dataDir: () => "./data" }));
vi.mock("./backups", () => ({ runDailyBackup: vi.fn() }));
vi.mock("./auth", () => ({ ensureOwner: vi.fn() }));

const { sweepViaRoute } = await import("./jobs");

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  (globalThis as { __fxSweepRouteWarned?: boolean }).__fxSweepRouteWarned = undefined;
  sweep.mockClear();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sweepViaRoute", () => {
  it("chama 127.0.0.1 na porta de PORT; com a rota respondendo, não varre direto nem avisa", async () => {
    vi.stubEnv("PORT", "4123");
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ expired: 0 }));
    vi.stubGlobal("fetch", fetch);
    await sweepViaRoute();
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:4123/api/interno/varredura");
    expect(sweep).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("falha: varre direto toda vez, mas o aviso sai só na primeira", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED"); }));
    await sweepViaRoute();
    await sweepViaRoute();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    await sweepViaRoute();
    expect(sweep).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/ECONNREFUSED.*HOSTNAME=0\.0\.0\.0.*PORT/);
  });
});
