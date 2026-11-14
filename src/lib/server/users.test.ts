import { describe, it, expect } from "vitest";
import { openDb } from "./db";
import { attemptLogin, createRecoveryCode, createSession, ensureOwner, findSessionUser, recoverAccess, BAD_LOGIN, BAD_RECOVERY, type AuthUser } from "./auth";
import { createStaff, deleteStaff, listUsers, resetOwner, resetStaffPassword } from "./users";
import { moveStage, setStock } from "./stock";
import { listMovements } from "./stock-repo";
import { getOrderEvents } from "./orders-repo";

// Portado de revival-church-website (server/users.test.ts), sem Hono: o Responsável (owner)
// gerencia os funcionários (staff). As funções recebem quem está agindo.

const OWNER_EMAIL = "dono@fixa.test";
const NOW = new Date("2026-11-14T12:00:00Z");

async function login(db: ReturnType<typeof openDb>, email: string, password: string) {
  const r = await attemptLogin(db, { email, password, ip: "10.0.0.1", now: new Date() });
  if (!r.ok) throw new Error(r.error);
  return r;
}

async function setup() {
  const db = openDb(":memory:");
  ensureOwner(db, OWNER_EMAIL, "senha-inicial-1");
  db.prepare("UPDATE users SET must_change_password = 0").run();
  const owner = (await login(db, OWNER_EMAIL, "senha-inicial-1")).user;
  const created = await createStaff(db, owner, { name: "Edu", email: "Edu@Fixa.test", password: "senha-func-1" }, NOW);
  if (!created.ok) throw new Error(created.error);
  const staffLogin = await login(db, "edu@fixa.test", "senha-func-1");
  return { db, owner, staff: staffLogin.user, staffToken: staffLogin.token, created };
}

describe("usuários", () => {
  it("owner cria um funcionário que precisa trocar a senha temporária", async () => {
    const { created, db } = await setup();
    if (!created.ok) throw new Error();
    expect(created.user).toMatchObject({ email: "edu@fixa.test", name: "Edu", role: "staff", mustChangePassword: true });
    expect(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").get()).toEqual({ n: 1 });
  });

  it("lista sem expor hash", async () => {
    const { db, owner } = await setup();
    const r = listUsers(db, owner);
    if (!r.ok) throw new Error(r.error);
    expect(r.users.map((u) => u.email)).toEqual([OWNER_EMAIL, "edu@fixa.test"]);
    expect(JSON.stringify(r.users)).not.toContain("scrypt");
  });

  it("valida criação: e-mail duplicado 409, senha curta 400, e-mail inválido 400, nome vazio 400", async () => {
    const { db, owner } = await setup();
    expect(await createStaff(db, owner, { name: "X", email: "EDU@fixa.test", password: "senha-func-1" }, NOW)).toEqual({
      ok: false,
      status: 409,
      error: "Já existe um usuário com esse e-mail.",
    });
    expect(await createStaff(db, owner, { name: "X", email: "x@fixa.test", password: "curta" }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await createStaff(db, owner, { name: "X", email: "x@fixa.test", password: "x".repeat(201) }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await createStaff(db, owner, { name: "X", email: "nao-e-email", password: "senha-func-1" }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await createStaff(db, owner, { name: "  ", email: "x@fixa.test", password: "senha-func-1" }, NOW)).toMatchObject({ ok: false, status: 400 });
  });

  it("funcionário não cria, não lista, não redefine e não exclui usuários (403)", async () => {
    const { db, staff } = await setup();
    const forbidden = { ok: false, status: 403, error: "Apenas o Responsável pode fazer isso." };
    expect(listUsers(db, staff)).toEqual(forbidden);
    expect(await createStaff(db, staff, { name: "Y", email: "y@fixa.test", password: "senha-func-1" }, NOW)).toEqual(forbidden);
    expect(await resetStaffPassword(db, staff, staff.id, "nova-senha-9")).toEqual(forbidden);
    expect(deleteStaff(db, staff, staff.id)).toEqual(forbidden);
    expect(db.prepare("SELECT COUNT(*) AS n FROM users").get()).toEqual({ n: 2 });
  });

  it("owner com troca de senha pendente também não gerencia usuários", async () => {
    const { db, owner } = await setup();
    const pending: AuthUser = { ...owner, mustChangePassword: true };
    expect(listUsers(db, pending)).toMatchObject({ ok: false, status: 403 });
  });

  it("owner redefine a senha do funcionário: senha temporária, sessões derrubadas", async () => {
    const { db, owner, staff, staffToken } = await setup();
    expect(await resetStaffPassword(db, owner, staff.id, "nova-senha-9")).toEqual({ ok: true });
    expect(db.prepare("SELECT must_change_password AS m FROM users WHERE id = ?").get(staff.id)).toEqual({ m: 1 });
    expect(findSessionUser(db, staffToken, new Date())).toBeNull();
    await login(db, "edu@fixa.test", "nova-senha-9");
  });

  it("resetar a senha de um funcionário zera o recovery_hash dele", async () => {
    const { db, owner, staff } = await setup();
    db.prepare("UPDATE users SET recovery_hash = ? WHERE id = ?").run("scrypt$aa$bb", staff.id);
    await resetStaffPassword(db, owner, staff.id, "nova-senha-9");
    expect(db.prepare("SELECT recovery_hash AS r FROM users WHERE id = ?").get(staff.id)).toEqual({ r: null });
  });

  it("redefinir a senha do owner por aqui é recusado", async () => {
    const { db, owner } = await setup();
    expect(await resetStaffPassword(db, owner, owner.id, "nova-senha-9")).toMatchObject({ ok: false, status: 400 });
  });

  it("owner remove o funcionário: some da lista, as sessões caem e o cadastro fica desativado", async () => {
    const { db, owner, staff, staffToken } = await setup();
    expect(deleteStaff(db, owner, staff.id)).toEqual({ ok: true });
    expect(findSessionUser(db, staffToken, new Date())).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(staff.id)).toEqual({ n: 0 });
    const r = listUsers(db, owner);
    if (!r.ok) throw new Error(r.error);
    expect(r.users.map((u) => u.email)).toEqual([OWNER_EMAIL]);
    expect(db.prepare("SELECT disabled_at IS NOT NULL AS d FROM users WHERE id = ?").get(staff.id)).toEqual({ d: 1 });
  });

  it("funcionário removido não entra, não recupera o acesso e a sessão antiga não vale (mesmas mensagens genéricas)", async () => {
    const { db, owner, staff } = await setup();
    const code = await createRecoveryCode(db, { userId: staff.id, current: "senha-func-1" });
    if (!code.ok) throw new Error(code.error);
    const old = await login(db, "edu@fixa.test", "senha-func-1");
    expect(deleteStaff(db, owner, staff.id)).toEqual({ ok: true });
    expect(findSessionUser(db, old.token, new Date())).toBeNull();
    expect(db.prepare("SELECT recovery_hash AS r FROM users WHERE id = ?").get(staff.id)).toEqual({ r: null });
    expect(await attemptLogin(db, { email: "edu@fixa.test", password: "senha-func-1", ip: "10.0.0.9", now: new Date() })).toEqual({
      ok: false, status: 401, error: BAD_LOGIN,
    });
    expect(
      await recoverAccess(db, { email: "edu@fixa.test", code: code.code, next: "outra-senha-9", ip: "10.0.0.9", now: new Date() }),
    ).toEqual({ ok: false, status: 401, error: BAD_RECOVERY });
    // mesmo que alguém recriasse uma sessão na mão, usuário desativado não passa
    const leftover = createSession(db, staff.id, new Date());
    expect(findSessionUser(db, leftover, new Date())).toBeNull();
  });

  it("remover de novo, ou redefinir a senha de um removido: 404", async () => {
    const { db, owner, staff } = await setup();
    deleteStaff(db, owner, staff.id);
    expect(deleteStaff(db, owner, staff.id)).toMatchObject({ ok: false, status: 404 });
    expect(await resetStaffPassword(db, owner, staff.id, "nova-senha-9")).toMatchObject({ ok: false, status: 404 });
  });

  it("o e-mail de um funcionário removido pode ser usado num cadastro novo", async () => {
    const { db, owner, staff } = await setup();
    deleteStaff(db, owner, staff.id);
    const again = await createStaff(db, owner, { name: "Edu 2", email: "edu@fixa.test", password: "senha-func-2" }, NOW);
    expect(again).toMatchObject({ ok: true, user: { email: "edu@fixa.test", name: "Edu 2" } });
    await login(db, "edu@fixa.test", "senha-func-2");
  });

  it("o owner não pode ser excluído", async () => {
    const { db, owner } = await setup();
    expect(deleteStaff(db, owner, owner.id)).toEqual({ ok: false, status: 400, error: "O Responsável não pode ser removido." });
    expect(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").get()).toEqual({ n: 1 });
  });

  it("id inexistente: 404", async () => {
    const { db, owner } = await setup();
    expect(deleteStaff(db, owner, 999)).toMatchObject({ ok: false, status: 404 });
    expect(await resetStaffPassword(db, owner, 999, "nova-senha-9")).toMatchObject({ ok: false, status: 404 });
  });

  it("remover funcionário que ajustou estoque e mudou etapa: histórico e linha do tempo mantêm o nome", async () => {
    const { db, owner, staff } = await setup();
    const t = NOW.toISOString();
    const p = db.prepare("INSERT INTO products (slug,name,category,image,variant_name,unit,created_at,updated_at) VALUES ('a','A','F','/a.webp','M','un',?,?)").run(t, t);
    db.prepare("INSERT INTO variants (product_id,sku,label,price) VALUES (?,'SKU-A','6 mm',100)").run(p.lastInsertRowid);
    db.prepare("INSERT INTO orders (id, token, status, created_at, customer, shipping, payment_method, subtotal, total) VALUES ('P1','t','pago',?,'{}','{}','PIX',1,1)").run(t);
    expect(setStock(db, "SKU-A", 7, "contagem", staff.id, NOW)).toMatchObject({ ok: true });
    moveStage(db, "P1", "separado", staff.id, NOW);
    expect(deleteStaff(db, owner, staff.id)).toEqual({ ok: true });
    expect(listMovements(db, "SKU-A").map((m) => m.userName)).toEqual(["Edu (removido)"]);
    expect(getOrderEvents(db, "P1").map((e) => [e.userId, e.userName])).toEqual([[staff.id, "Edu (removido)"]]);
  });

  it("apagar de verdade um usuário com histórico é barrado pelo banco (RESTRICT)", async () => {
    const { db, staff } = await setup();
    db.prepare("INSERT INTO orders (id, token, status, created_at, customer, shipping, payment_method, subtotal, total) VALUES ('P1','t','pago','x','{}','{}','PIX',1,1)").run();
    db.prepare("INSERT INTO order_events (order_id, to_status, user_id, at) VALUES ('P1','pago',?, 'x')").run(staff.id);
    expect(() => db.prepare("DELETE FROM users WHERE id = ?").run(staff.id)).toThrow(/FOREIGN KEY/);
  });
});

describe("resetOwner (servidor)", () => {
  it("cria o Responsável quando a tabela de usuários está vazia", async () => {
    const db = openDb(":memory:");
    await resetOwner(db, "Novo@Fixa.test", "senha-de-suporte-1");
    expect(db.prepare("SELECT email, role, must_change_password AS m FROM users").all()).toEqual([
      { email: "novo@fixa.test", role: "owner", m: 1 },
    ]);
    await login(db, "novo@fixa.test", "senha-de-suporte-1");
  });

  it("e-mail de um funcionário: erro claro em português", async () => {
    const { db } = await setup();
    await expect(resetOwner(db, "edu@fixa.test", "senha-de-suporte-1")).rejects.toThrow(/já está em uso/);
  });

  it("troca e-mail e senha, exige nova troca, zera o código e derruba as sessões", async () => {
    const { db } = await setup();
    const before = await login(db, OWNER_EMAIL, "senha-inicial-1");
    db.prepare("UPDATE users SET recovery_hash = 'scrypt$aa$bb' WHERE role = 'owner'").run();
    await resetOwner(db, "Novo@Fixa.test", "senha-de-suporte-1");
    expect(db.prepare("SELECT email, must_change_password AS m, recovery_hash AS r FROM users WHERE role = 'owner'").get()).toEqual({
      email: "novo@fixa.test",
      m: 1,
      r: null,
    });
    expect(findSessionUser(db, before.token, new Date())).toBeNull();
    await login(db, "novo@fixa.test", "senha-de-suporte-1");
    expect((await attemptLogin(db, { email: OWNER_EMAIL, password: "senha-inicial-1", ip: "10.0.0.2", now: new Date() })).ok).toBe(false);
  });
});
