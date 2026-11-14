import { describe, it, expect } from "vitest";
import { openDb } from "./db";
import {
  attemptLogin,
  changeOwnPassword,
  clientIp,
  createRecoveryCode,
  createSession,
  destroySession,
  ensureOwner,
  findSessionUser,
  generateRecoveryCode,
  hashPassword,
  normalizeRecoveryCode,
  recoverAccess,
  verifyPassword,
} from "./auth";
import { resetOwner } from "./users";

// Portado de kadoshi-sushi-page (server/auth.test.ts, recovery.test.ts, ratelimit.test.ts),
// sem Hono: as rotas viraram funções puras que recebem db, ip e now.

const EMAIL = "dono@fixa.test";
const FIRST = "senha-inicial-1";
const IP = "10.0.0.1";
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function setup() {
  const db = openDb(":memory:");
  ensureOwner(db, EMAIL, FIRST);
  const login = (password: string, opts: { email?: string; ip?: string; now?: Date } = {}) =>
    attemptLogin(db, { email: opts.email ?? EMAIL, password, ip: opts.ip ?? IP, now: opts.now ?? new Date() });
  return { db, login };
}

async function loggedIn(password = FIRST) {
  const s = setup();
  const r = await s.login(password);
  if (!r.ok) throw new Error(r.error);
  return { ...s, token: r.token, user: r.user };
}

describe("senhas", () => {
  it("usa scrypt$salt$hash com salt aleatório e verifica", async () => {
    const a = await hashPassword("abc12345");
    const b = await hashPassword("abc12345");
    expect(a).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("abc12345", a)).toBe(true);
    expect(await verifyPassword("outra", a)).toBe(false);
    expect(await verifyPassword("x", "lixo")).toBe(false);
  });
});

describe("ensureOwner", () => {
  it("cria o owner com must_change_password = 1 e não cria um segundo", () => {
    const { db } = setup();
    ensureOwner(db, "outro@fixa.test", "outra-senha-1");
    const rows = db.prepare("SELECT email, role, must_change_password AS m FROM users").all();
    expect(rows).toEqual([{ email: EMAIL, role: "owner", m: 1 }]);
  });

  it("ignora quando faltam variáveis", () => {
    const db = openDb(":memory:");
    ensureOwner(db, undefined, undefined);
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 0 });
  });
});

describe("login", () => {
  it("senha certa: devolve o usuário e um token guardado só como hash", async () => {
    const { db, login } = setup();
    const r = await login(FIRST, { email: "Dono@Fixa.test" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user).toMatchObject({ email: EMAIL, role: "owner", mustChangePassword: true, hasRecoveryCode: false });
    expect(JSON.stringify(r.user)).not.toContain("scrypt");
    const stored = db.prepare("SELECT token_hash FROM sessions").all() as { token_hash: string }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toBe(r.token);
    expect(findSessionUser(db, r.token, new Date())?.email).toBe(EMAIL);
  });

  it("senha errada: 401 com mensagem", async () => {
    const { login } = setup();
    expect(await login("errada")).toEqual({ ok: false, status: 401, error: "E-mail ou senha incorretos." });
  });

  it("e-mail inexistente: mesma resposta 401", async () => {
    const { login } = setup();
    expect(await login("qualquer123", { email: "x@y.z" })).toEqual({ ok: false, status: 401, error: "E-mail ou senha incorretos." });
  });

  it("senha com mais de 200 caracteres: 401", async () => {
    const { login } = setup();
    expect((await login("x".repeat(201))).ok).toBe(false);
  });

  it("6ª tentativa errada em 15 min dá 429, mesmo com a senha certa", async () => {
    const { login } = setup();
    for (let i = 0; i < 5; i++) expect(await login("errada")).toMatchObject({ status: 401 });
    expect(await login(FIRST, { email: "DONO@FIXA.TEST" })).toEqual({
      ok: false,
      status: 429,
      error: "Muitas tentativas. Tente de novo em 15 minutos.",
    });
  });

  it("a janela de 15 min libera o login de novo", async () => {
    const { login } = setup();
    const t = Date.parse("2026-01-01T12:00:00Z");
    for (let i = 0; i < 5; i++) await login("errada", { now: new Date(t) });
    expect((await login(FIRST, { now: new Date(t + 16 * 60 * 1000) })).ok).toBe(true);
  });

  it("10 logins errados em paralelo: no máximo 5 passam e o próximo leva 429", async () => {
    const { login } = setup();
    const results = await Promise.all(Array.from({ length: 10 }, () => login("errada")));
    const statuses = results.map((r) => (r.ok ? 200 : r.status));
    const n401 = statuses.filter((s) => s === 401).length;
    expect(n401).toBeLessThanOrEqual(5);
    expect(statuses.filter((s) => s === 429).length).toBe(10 - n401);
    expect(await login(FIRST)).toMatchObject({ status: 429 });
  });
});

describe("limite por e-mail + IP", () => {
  it("errar 5 vezes de um IP não tranca o dono em outro IP", async () => {
    const { login } = setup();
    for (let i = 0; i < 5; i++) expect(await login("errada", { ip: "9.9.9.9" })).toMatchObject({ status: 401 });
    expect(await login(FIRST, { ip: "9.9.9.9" })).toMatchObject({ status: 429 });
    expect((await login(FIRST, { ip: "8.8.8.8" })).ok).toBe(true);
  });

  it("um IP com 20 falhas, mesmo variando o e-mail, é bloqueado", async () => {
    const { login } = setup();
    for (let i = 0; i < 20; i++) {
      expect(await login("errada", { email: `x${i}@y.test`, ip: "7.7.7.7" })).toMatchObject({ status: 401 });
    }
    expect(await login(FIRST, { ip: "7.7.7.7" })).toMatchObject({ status: 429 });
    expect((await login(FIRST, { ip: "6.6.6.6" })).ok).toBe(true);
  }, 30_000);

  it("clientIp usa o último item do X-Forwarded-For (o que o proxy acrescentou)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers({ "x-forwarded-for": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("sessão", () => {
  it("sessão expirada não vale e é apagada", async () => {
    const { db, token } = await loggedIn();
    db.prepare("UPDATE sessions SET expires_at = ?").run(Date.now() - 1000);
    expect(findSessionUser(db, token, new Date())).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions").get()).toEqual({ n: 0 });
  });

  it("dura 30 dias", () => {
    const { db } = setup();
    const now = new Date("2026-01-01T00:00:00Z");
    const token = createSession(db, 1, now);
    expect(findSessionUser(db, token, new Date(now.getTime() + 29 * 86_400_000))).not.toBeNull();
    expect(findSessionUser(db, token, new Date(now.getTime() + 30 * 86_400_000))).toBeNull();
  });

  it("logout: a sessão deixa de valer", async () => {
    const { db, token } = await loggedIn();
    destroySession(db, token);
    expect(findSessionUser(db, token, new Date())).toBeNull();
  });
});

describe("troca de senha", () => {
  it("valida atual, mínimo de 8, máximo de 200 e igual à atual; limpa must_change_password", async () => {
    const { db, user, token, login } = await loggedIn();
    const change = (current: string, next: string) => changeOwnPassword(db, { userId: user.id, sessionToken: token, current, next });
    expect(await change("errada", "nova-senha-9")).toEqual({ ok: false, status: 400, error: "A senha atual está incorreta." });
    expect(await change(FIRST, "curta")).toMatchObject({ ok: false, status: 400 });
    expect(await change(FIRST, "x".repeat(201))).toMatchObject({ ok: false, status: 400 });
    expect(await change(FIRST, FIRST)).toEqual({ ok: false, status: 400, error: "A nova senha precisa ser diferente da atual." });
    expect(await change(FIRST, "nova-senha-9")).toEqual({ ok: true });
    expect(db.prepare("SELECT must_change_password AS m FROM users").get()).toEqual({ m: 0 });
    expect((await login("nova-senha-9")).ok).toBe(true);
  });

  it("trocar a senha derruba as outras sessões e mantém a atual", async () => {
    const { db, login } = setup();
    const a = await login(FIRST);
    const b = await login(FIRST);
    if (!a.ok || !b.ok) throw new Error("login");
    expect(await changeOwnPassword(db, { userId: a.user.id, sessionToken: a.token, current: FIRST, next: "nova-senha-9" })).toEqual({ ok: true });
    expect(findSessionUser(db, a.token, new Date())).not.toBeNull();
    expect(findSessionUser(db, b.token, new Date())).toBeNull();
  });
});

describe("código de recuperação", () => {
  const GOOD = "senha-boa-22";

  async function rsetup() {
    const s = await loggedIn();
    await changeOwnPassword(s.db, { userId: s.user.id, sessionToken: s.token, current: FIRST, next: GOOD });
    const generate = async () => {
      const r = await createRecoveryCode(s.db, { userId: s.user.id, current: GOOD });
      if (!r.ok) throw new Error(r.error);
      return r.code;
    };
    const recover = (body: { email?: string; code: string; next: string; ip?: string; now?: Date }) =>
      recoverAccess(s.db, { email: body.email ?? EMAIL, code: body.code, next: body.next, ip: body.ip ?? IP, now: body.now ?? new Date() });
    const hasCode = () => findSessionUser(s.db, s.token, new Date())?.hasRecoveryCode;
    return { ...s, generate, recover, hasCode };
  }

  it("formato XXXX-XXXX-XXXX sem I, O, 0, 1; normaliza o digitado", () => {
    for (let i = 0; i < 50; i++) expect(generateRecoveryCode()).toMatch(CODE_RE);
    expect(normalizeRecoveryCode(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
  });

  it("gera um código e o usuário passa a ter código", async () => {
    const s = await rsetup();
    expect(s.hasCode()).toBe(false);
    expect(await s.generate()).toMatch(CODE_RE);
    expect(s.hasCode()).toBe(true);
  });

  it("gerar o código exige a senha atual (sessão esquecida aberta não basta)", async () => {
    const s = await rsetup();
    expect(await createRecoveryCode(s.db, { userId: s.user.id, current: "" })).toEqual({ ok: false, status: 400, error: "Informe sua senha atual." });
    expect(await createRecoveryCode(s.db, { userId: s.user.id, current: "errada-123" })).toEqual({
      ok: false,
      status: 400,
      error: "A senha atual está incorreta.",
    });
    expect(s.hasCode()).toBe(false);
  });

  it("recupera com o código em minúsculas e sem hífen; a senha antiga deixa de valer", async () => {
    const s = await rsetup();
    const code = await s.generate();
    const r = await s.recover({ code: ` ${code.replaceAll("-", "").toLowerCase()} `, next: "senha-nova-33" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user).toMatchObject({ email: EMAIL, hasRecoveryCode: false, mustChangePassword: false });
    expect(findSessionUser(s.db, r.token, new Date())?.email).toBe(EMAIL);
    expect((await s.login(GOOD)).ok).toBe(false);
    expect((await s.login("senha-nova-33")).ok).toBe(true);
  });

  it("o mesmo código não serve duas vezes", async () => {
    const s = await rsetup();
    const code = await s.generate();
    expect((await s.recover({ code, next: "senha-nova-33" })).ok).toBe(true);
    expect(await s.recover({ code, next: "senha-nova-44" })).toEqual({ ok: false, status: 401, error: "E-mail ou código incorretos." });
  });

  it("gerar outro código invalida o anterior", async () => {
    const s = await rsetup();
    const first = await s.generate();
    const second = await s.generate();
    expect(first).not.toBe(second);
    expect((await s.recover({ code: first, next: "senha-nova-33" })).ok).toBe(false);
    expect((await s.recover({ code: second, next: "senha-nova-33" })).ok).toBe(true);
  });

  it("recuperar derruba todas as sessões antigas", async () => {
    const s = await rsetup();
    const code = await s.generate();
    await s.recover({ code, next: "senha-nova-33" });
    expect(findSessionUser(s.db, s.token, new Date())).toBeNull();
  });

  it("senha nova curta: 400 e o código continua valendo", async () => {
    const s = await rsetup();
    const code = await s.generate();
    expect(await s.recover({ code, next: "curta" })).toMatchObject({ ok: false, status: 400 });
    expect((await s.recover({ code, next: "senha-nova-33" })).ok).toBe(true);
  });

  it("e-mail sem usuário ou sem código: 401 com a mesma mensagem", async () => {
    const s = await rsetup();
    const bad = { ok: false, status: 401, error: "E-mail ou código incorretos." };
    expect(await s.recover({ email: "ninguem@x.test", code: "AAAA-BBBB-CCCC", next: "senha-nova-33" })).toEqual(bad);
    expect(await s.recover({ code: "AAAA-BBBB-CCCC", next: "senha-nova-33" })).toEqual(bad);
  });

  it("errar a senha no login não bloqueia a recuperação", async () => {
    const s = await rsetup();
    const code = await s.generate();
    for (let i = 0; i < 5; i++) await s.login("errada");
    expect(await s.login(GOOD)).toMatchObject({ status: 429 });
    expect((await s.recover({ code, next: "senha-nova-33" })).ok).toBe(true);
  });

  it("recuperação tem o próprio limite: 5 erros por e-mail + IP", async () => {
    const s = await rsetup();
    for (let i = 0; i < 5; i++) expect(await s.recover({ code: "AAAA-BBBB-CCCC", next: "senha-nova-33", ip: "5.5.5.5" })).toMatchObject({ status: 401 });
    expect(await s.recover({ code: "AAAA-BBBB-CCCC", next: "senha-nova-33", ip: "5.5.5.5" })).toMatchObject({ status: 429 });
    expect(await s.recover({ code: "AAAA-BBBB-CCCC", next: "senha-nova-33", ip: "5.5.5.6" })).toMatchObject({ status: 401 });
  });

  it("dois pedidos ao mesmo tempo com o mesmo código: só um passa", async () => {
    const s = await rsetup();
    const code = await s.generate();
    const [a, b] = await Promise.all([s.recover({ code, next: "senha-nova-33" }), s.recover({ code, next: "senha-nova-44" })]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
  });

  it("reset-owner pelo servidor invalida o código", async () => {
    const s = await rsetup();
    const code = await s.generate();
    await resetOwner(s.db, EMAIL, "senha-do-servidor-1");
    expect((await s.recover({ code, next: "senha-nova-33" })).ok).toBe(false);
  });
});
