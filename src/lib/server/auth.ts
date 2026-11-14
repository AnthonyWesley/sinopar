import crypto from "node:crypto";
import type { Db } from "./db";

// Login, sessões, limite de tentativas e código de recuperação. Portado de kadoshi-sushi-page
// (server/auth.ts e server/routes/auth.ts), sem Hono: funções sobre `Db` que recebem o IP e o
// horário prontos. As Server Actions (src/lib/actions/auth.ts) só leem o formulário e o cookie.

export type Role = "owner" | "staff";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  hasRecoveryCode: boolean;
};

/** Falha de uma operação. `status` segue o HTTP (400 dados, 401 credencial, 403, 404, 409, 429). */
export type Fail = { ok: false; status: number; error: string };

export const SESSION_COOKIE = "fx_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_PER_EMAIL_IP = 5;
const RATE_MAX_PER_IP = 20;
const KEY_LEN = 64;

export const BAD_LOGIN = "E-mail ou senha incorretos.";
export const BAD_RECOVERY = "E-mail ou código incorretos.";
export const TOO_MANY = "Muitas tentativas. Tente de novo em 15 minutos.";

const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

// ---------- senhas ----------

function scrypt(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, salt, KEY_LEN, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length !== KEY_LEN) return false;
  const actual = await scrypt(pw, salt);
  return crypto.timingSafeEqual(actual, expected);
}

// Hash descartável para gastar o mesmo tempo quando o e-mail não existe (criado na primeira vez).
let dummyHash: Promise<string> | null = null;

export async function verifyAgainstDummy(pw: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(pw, await dummyHash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Mensagem de erro para uma senha nova fora do tamanho, ou null se ela serve. */
export function passwordLengthError(pw: string, label = "A nova senha"): string | null {
  if (pw.length < MIN_PASSWORD) return `${label} precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (pw.length > MAX_PASSWORD) return `${label} pode ter no máximo ${MAX_PASSWORD} caracteres.`;
  return null;
}

/** Cria o Responsável na primeira subida (ADMIN_EMAIL/ADMIN_PASSWORD). Não faz nada se já existe um. */
export function ensureOwner(db: Db, email?: string, password?: string, now: Date = new Date()): void {
  const existing = db.prepare("SELECT 1 FROM users WHERE role = 'owner'").get();
  if (existing || !email || !password) return;
  // hash síncrono: roda uma vez na subida, antes de aceitar requisições
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  const hash = `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
  db.prepare(
    "INSERT INTO users (email, name, password_hash, role, must_change_password, created_at) VALUES (?, 'Responsável', ?, 'owner', 1, ?)",
  ).run(normalizeEmail(email), hash, now.toISOString());
}

// ---------- código de recuperação ----------

// Sem caracteres que se confundem (I, O, 0, 1).
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(12);
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

// Aceita o código digitado de qualquer jeito: minúsculas, espaços, com ou sem hífen.
export function normalizeRecoveryCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

// ---------- sessões ----------

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export function createSession(db: Db, userId: number, now: Date): string {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    sha256(token),
    userId,
    now.getTime() + SESSION_TTL_MS,
  );
  return token;
}

export function destroySession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

export function destroyOtherSessions(db: Db, userId: number, keepToken: string): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(userId, sha256(keepToken));
}

export function destroyAllSessions(db: Db, userId: number): void {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

type UserRow = { id: number; email: string; name: string; role: Role; m: number; r: number };

const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  mustChangePassword: row.m === 1,
  hasRecoveryCode: row.r === 1,
});

export function findSessionUser(db: Db, token: string, now: Date): AuthUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.must_change_password AS m, u.recovery_hash IS NOT NULL AS r, s.expires_at AS exp
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as (UserRow & { exp: number }) | undefined;
  if (!row) return null;
  if (row.exp <= now.getTime()) {
    destroySession(db, token);
    return null;
  }
  return toAuthUser(row);
}

// ---------- limite de tentativas ----------

/** Algo com `get(nome)`, como o `Headers` do fetch ou o de `headers()` do Next. */
export type HeaderSource = { get(name: string): string | null };

// IP do cliente. Atrás do proxy da hospedagem (Traefik/Caddy no Coolify), o último item do
// X-Forwarded-For é o que o proxy acrescentou; os anteriores podem ser forjados pelo cliente.
// Sem o cabeçalho (rodando sem proxy), todos caem em "unknown" e dividem a contagem por IP.
export function clientIp(headers: HeaderSource): string {
  const last = headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last || "unknown";
}

// Duas contagens: e-mail + IP (5 falhas) e só IP (20 falhas), ambas em 15 min.
// Assim, quem erra a senha do dono de outro lugar não tranca o dono.
export type AttemptKeys = { pair: string; ip: string };

export function attemptKeys(email: string, ip: string): AttemptKeys {
  return { pair: `${email}|${ip}`, ip: `ip:${ip}` };
}

function countFailures(db: Db, key: string, since: number): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?").get(key, since) as { n: number }).n;
}

export function isRateLimited(db: Db, keys: AttemptKeys, now: Date): boolean {
  const since = now.getTime() - RATE_WINDOW_MS;
  db.prepare("DELETE FROM login_attempts WHERE at <= ?").run(since);
  return countFailures(db, keys.pair, since) >= RATE_MAX_PER_EMAIL_IP || countFailures(db, keys.ip, since) >= RATE_MAX_PER_IP;
}

export function recordFailure(db: Db, keys: AttemptKeys, now: Date): void {
  const ins = db.prepare("INSERT INTO login_attempts (key, at) VALUES (?, ?)");
  ins.run(keys.pair, now.getTime());
  ins.run(keys.ip, now.getTime());
}

// No sucesso some só a contagem do e-mail + IP; a do IP continua valendo.
export function clearFailures(db: Db, keys: AttemptKeys): void {
  db.prepare("DELETE FROM login_attempts WHERE key = ?").run(keys.pair);
}

// ---------- fluxos ----------

export type SessionResult = { ok: true; user: AuthUser; token: string } | Fail;

export async function attemptLogin(
  db: Db,
  input: { email: string; password: string; ip: string; now: Date },
): Promise<SessionResult> {
  if (input.password.length > MAX_PASSWORD) return fail(401, BAD_LOGIN);
  const email = normalizeEmail(input.email);
  const keys = attemptKeys(email, input.ip);
  if (isRateLimited(db, keys, input.now)) return fail(429, TOO_MANY);
  // registra a tentativa antes de qualquer await: check + insert são síncronos, então
  // pedidos paralelos não escapam do limite. A contagem do e-mail + IP some no sucesso.
  recordFailure(db, keys, input.now);
  const row = db
    .prepare(
      "SELECT id, email, name, role, password_hash AS hash, must_change_password AS m, recovery_hash IS NOT NULL AS r FROM users WHERE email = ?",
    )
    .get(email) as (UserRow & { hash: string }) | undefined;
  let ok = false;
  if (row) ok = await verifyPassword(input.password, row.hash);
  else await verifyAgainstDummy(input.password);
  if (!row || !ok) return fail(401, BAD_LOGIN);
  clearFailures(db, keys);
  const token = createSession(db, row.id, input.now);
  return { ok: true, user: toAuthUser(row), token };
}

/** Troca a própria senha. Derruba as outras sessões e mantém a atual. */
export async function changeOwnPassword(
  db: Db,
  input: { userId: number; sessionToken: string; current: string; next: string },
): Promise<{ ok: true } | Fail> {
  if (!input.current) return fail(400, "Informe a senha atual e a nova senha.");
  const lengthError = passwordLengthError(input.next);
  if (lengthError) return fail(400, lengthError);
  if (input.next === input.current) return fail(400, "A nova senha precisa ser diferente da atual.");
  if (input.current.length > MAX_PASSWORD) return fail(400, "A senha atual está incorreta.");
  const row = db.prepare("SELECT password_hash AS hash FROM users WHERE id = ?").get(input.userId) as { hash: string } | undefined;
  if (!row || !(await verifyPassword(input.current, row.hash))) return fail(400, "A senha atual está incorreta.");
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(
    await hashPassword(input.next),
    input.userId,
  );
  destroyOtherSessions(db, input.userId, input.sessionToken);
  return { ok: true };
}

// Gera um código de recuperação novo (o anterior deixa de valer). Ele só aparece nesta resposta.
// Exige a senha atual: uma sessão esquecida aberta não basta para criar um jeito de trocar a senha.
export async function createRecoveryCode(
  db: Db,
  input: { userId: number; current: string },
): Promise<{ ok: true; code: string } | Fail> {
  if (!input.current || input.current.length > MAX_PASSWORD) return fail(400, "Informe sua senha atual.");
  const row = db.prepare("SELECT password_hash AS hash FROM users WHERE id = ?").get(input.userId) as { hash: string } | undefined;
  if (!row || !(await verifyPassword(input.current, row.hash))) return fail(400, "A senha atual está incorreta.");
  const code = generateRecoveryCode();
  db.prepare("UPDATE users SET recovery_hash = ? WHERE id = ?").run(await hashPassword(normalizeRecoveryCode(code)), input.userId);
  return { ok: true, code };
}

// Esqueci minha senha: e-mail + código de recuperação + senha nova. O código é de uso único.
export async function recoverAccess(
  db: Db,
  input: { email: string; code: string; next: string; ip: string; now: Date },
): Promise<SessionResult> {
  const lengthError = passwordLengthError(input.next);
  if (lengthError) return fail(400, lengthError);
  const code = normalizeRecoveryCode(input.code);
  if (code.length > 64) return fail(401, BAD_RECOVERY);
  const email = normalizeEmail(input.email);
  // contagem própria por e-mail + IP (errar a senha no login não bloqueia a recuperação); o teto por IP é o mesmo
  const keys = attemptKeys(`rec:${email}`, input.ip);
  if (isRateLimited(db, keys, input.now)) return fail(429, TOO_MANY);
  recordFailure(db, keys, input.now);
  const row = db
    .prepare("SELECT id, email, name, role, recovery_hash AS rh FROM users WHERE email = ?")
    .get(email) as { id: number; email: string; name: string; role: Role; rh: string | null } | undefined;
  let ok = false;
  if (row?.rh) ok = await verifyPassword(code, row.rh);
  else await verifyAgainstDummy(code);
  if (!row || !row.rh || !ok) return fail(401, BAD_RECOVERY);
  const hash = await hashPassword(input.next);
  // confere de novo depois do await: dois pedidos paralelos com o mesmo código não passam os dois
  const consumed = db
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 0, recovery_hash = NULL WHERE id = ? AND recovery_hash = ?")
    .run(hash, row.id, row.rh);
  if (consumed.changes === 0) return fail(401, BAD_RECOVERY);
  clearFailures(db, keys);
  destroyAllSessions(db, row.id);
  const token = createSession(db, row.id, input.now);
  return {
    ok: true,
    token,
    user: { id: row.id, email: row.email, name: row.name, role: row.role, mustChangePassword: false, hasRecoveryCode: false },
  };
}
