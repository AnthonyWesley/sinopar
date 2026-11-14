import type { Db } from "./db";
import {
  destroyAllSessions,
  hashPassword,
  normalizeEmail,
  passwordLengthError,
  type AuthUser,
  type Fail,
  type Role,
} from "./auth";

// Usuários do painel: o Responsável (owner) cria, redefine a senha e remove funcionários (staff).
// Portado de revival-church-website (server/routes/users.ts) e do reset-owner de
// kadoshi-sushi-page (server/cli.ts). Cada função recebe quem está agindo e confere o papel.

export type UserListItem = {
  id: number;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  createdAt: string;
};

const FORBIDDEN: Fail = { ok: false, status: 403, error: "Apenas o Responsável pode fazer isso." };
const NOT_FOUND: Fail = { ok: false, status: 404, error: "Usuário não encontrado." };
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

// Responsável com a troca de senha pendente ainda não gerencia ninguém.
const isOwner = (actor: AuthUser) => actor.role === "owner" && !actor.mustChangePassword;

const SELECT_USER = "SELECT id, email, name, role, must_change_password AS m, created_at AS createdAt FROM users";
type Row = Omit<UserListItem, "mustChangePassword"> & { m: number };
const toItem = ({ m, ...u }: Row): UserListItem => ({ ...u, mustChangePassword: m === 1 });

export function listUsers(db: Db, actor: AuthUser): { ok: true; users: UserListItem[] } | Fail {
  if (!isOwner(actor)) return FORBIDDEN;
  const rows = db.prepare(`${SELECT_USER} WHERE disabled_at IS NULL ORDER BY id`).all() as Row[];
  return { ok: true, users: rows.map(toItem) };
}

/** Cria um funcionário com senha temporária: ele troca no primeiro login. O papel nunca vem de fora. */
export async function createStaff(
  db: Db,
  actor: AuthUser,
  input: { name: string; email: string; password: string },
  now: Date,
): Promise<{ ok: true; user: UserListItem } | Fail> {
  if (!isOwner(actor)) return FORBIDDEN;
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) return fail(400, "Informe o nome.");
  if (name.length > 100) return fail(400, "O nome pode ter no máximo 100 caracteres.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Informe um e-mail válido.");
  const lengthError = passwordLengthError(input.password, "A senha");
  if (lengthError) return fail(400, lengthError);
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return fail(409, "Já existe um usuário com esse e-mail.");
  const hash = await hashPassword(input.password);
  // confere de novo depois do await (UNIQUE no e-mail é a última barreira)
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return fail(409, "Já existe um usuário com esse e-mail.");
  const info = db
    .prepare(
      "INSERT INTO users (email, name, password_hash, role, must_change_password, created_at) VALUES (?, ?, ?, 'staff', 1, ?)",
    )
    .run(email, name, hash, now.toISOString());
  const row = db.prepare(`${SELECT_USER} WHERE id = ?`).get(info.lastInsertRowid) as Row;
  return { ok: true, user: toItem(row) };
}

/** Senha temporária nova para um funcionário. Zera o código de recuperação e derruba as sessões dele. */
export async function resetStaffPassword(
  db: Db,
  actor: AuthUser,
  id: number,
  password: string,
): Promise<{ ok: true } | Fail> {
  if (!isOwner(actor)) return FORBIDDEN;
  const target = db.prepare("SELECT role FROM users WHERE id = ? AND disabled_at IS NULL").get(id) as { role: Role } | undefined;
  if (!target) return NOT_FOUND;
  if (target.role === "owner") return fail(400, "Use a troca de senha da sua própria conta.");
  const lengthError = passwordLengthError(password, "A senha");
  if (lengthError) return fail(400, lengthError);
  const hash = await hashPassword(password);
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, recovery_hash = NULL WHERE id = ? AND role = 'staff' AND disabled_at IS NULL").run(
      hash,
      id,
    );
    destroyAllSessions(db, id);
  })();
  return { ok: true };
}

/** E-mail guardado num funcionário removido: tem espaço, então nunca bate com um e-mail digitado. */
export const removedEmail = (id: number, email: string) => `removido-${id} ${email}`;

/**
 * Remove um funcionário sem apagar o cadastro: o histórico (estoque e pedidos) continua com o nome
 * dele. Ele some da lista, as sessões caem, o código de recuperação deixa de valer e o login passa a
 * falhar com a mensagem genérica. O e-mail é reescrito (removedEmail) para ficar livre a um cadastro novo.
 */
export function deleteStaff(db: Db, actor: AuthUser, id: number): { ok: true } | Fail {
  if (!isOwner(actor)) return FORBIDDEN;
  const target = db.prepare("SELECT role, email FROM users WHERE id = ? AND disabled_at IS NULL").get(id) as
    | { role: Role; email: string }
    | undefined;
  if (!target) return NOT_FOUND;
  if (target.role === "owner") return fail(400, "O Responsável não pode ser removido.");
  db.transaction(() => {
    db.prepare(
      "UPDATE users SET disabled_at = ?, email = ?, recovery_hash = NULL WHERE id = ? AND role = 'staff' AND disabled_at IS NULL",
    ).run(new Date().toISOString(), removedEmail(id, target.email), id);
    destroyAllSessions(db, id);
  })();
  return { ok: true };
}

/**
 * Suporte pelo servidor (sem painel): define e-mail e senha do Responsável, exigindo nova troca
 * no próximo login. Zera o código de recuperação e derruba as sessões. Cria o Responsável se não houver.
 */
export async function resetOwner(db: Db, email: string, password: string, now: Date = new Date()): Promise<void> {
  const lengthError = passwordLengthError(password, "A senha");
  if (lengthError) throw new Error(lengthError);
  const owner = db.prepare("SELECT id FROM users WHERE role = 'owner'").get() as { id: number } | undefined;
  const mail = normalizeEmail(email);
  const taken = db.prepare("SELECT id FROM users WHERE email = ?").get(mail) as { id: number } | undefined;
  if (taken && taken.id !== owner?.id) throw new Error(`O e-mail ${mail} já está em uso. Escolha outro e-mail.`);
  const hash = await hashPassword(password);
  db.transaction(() => {
    if (!owner) {
      db.prepare(
        "INSERT INTO users (email, name, password_hash, role, must_change_password, created_at) VALUES (?, 'Responsável', ?, 'owner', 1, ?)",
      ).run(mail, hash, now.toISOString());
      return;
    }
    db.prepare("UPDATE users SET email = ?, password_hash = ?, must_change_password = 1, recovery_hash = NULL WHERE id = ?").run(
      mail,
      hash,
      owner.id,
    );
    destroyAllSessions(db, owner.id);
  })();
}
