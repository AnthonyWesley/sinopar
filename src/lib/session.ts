import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, findSessionUser, type AuthUser } from "./server/auth";
import { getDb } from "./server/db";

// Sessão do painel. Lê o cookie `fx_session` e confere o hash do token no banco.
// As páginas usam requireUser/requireOwner (que redirecionam); as Server Actions usam
// authorizeAction (que devolve um erro em vez de redirecionar, para o formulário mostrar).

export type { AuthUser } from "./server/auth";

export const LOGIN_PATH = "/admin/entrar";
export const CHANGE_PASSWORD_PATH = "/admin/senha";
export const HOME_PATH = "/admin";

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  return token ? findSessionUser(getDb(), token, new Date()) : null;
}

/**
 * Usuário logado, ou redireciona para o login. Com a troca de senha pendente, redireciona para
 * /admin/senha, exceto quando `allowPendingPassword` (a própria página de troca de senha).
 */
export async function requireUser(opts: { allowPendingPassword?: boolean } = {}): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);
  if (user.mustChangePassword && !opts.allowPendingPassword) redirect(CHANGE_PASSWORD_PATH);
  return user;
}

/** Só o Responsável. Funcionário vai para o Início do painel. */
export async function requireOwner(): Promise<AuthUser> {
  const user = await requireUser();
  if (user.role !== "owner") redirect(HOME_PATH);
  return user;
}

export type ActionAuth = { ok: true; user: AuthUser } | { ok: false; error: string };

/**
 * Autorização dentro de uma Server Action (a página ter checado não basta: a action pode ser
 * chamada direto). Sem sessão, com troca de senha pendente ou sem o papel pedido: erro.
 */
export async function authorizeAction(opts: { owner?: boolean } = {}): Promise<ActionAuth> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre de novo." };
  if (user.mustChangePassword) return { ok: false, error: "Troque sua senha antes de continuar." };
  if (opts.owner && user.role !== "owner") return { ok: false, error: "Apenas o Responsável pode fazer isso." };
  return { ok: true, user };
}

// ---------- cookie (só em Server Actions e Route Handlers) ----------

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}
