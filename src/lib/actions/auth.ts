"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  BAD_LOGIN,
  BAD_RECOVERY,
  attemptLogin,
  changeOwnPassword,
  clientIp,
  createRecoveryCode,
  destroySession,
  recoverAccess,
} from "../server/auth";
import { getDb } from "../server/db";
import {
  CHANGE_PASSWORD_PATH,
  HOME_PATH,
  LOGIN_PATH,
  authorizeAction,
  clearSessionCookie,
  getCurrentUser,
  getSessionToken,
  setSessionCookie,
} from "../session";

// Server Actions do login. Finas: leem o formulário, o IP e o cookie e chamam as funções de
// src/lib/server/auth.ts. O Next já recusa action com Origin de outro host (CSRF).
// Formato para useActionState: (estado anterior, FormData) => estado.

export type AuthFormState = {
  error?: string;
  /** mensagem de sucesso quando a action não redireciona */
  message?: string;
  /** código de recuperação recém-gerado: aparece só nesta resposta */
  code?: string;
};

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

async function ip(): Promise<string> {
  return clientIp(await headers());
}

/** Campos: email, password. Sucesso: /admin, ou /admin/senha se a troca de senha estiver pendente. */
export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const password = field(form, "password");
  if (!email || !password) return { error: BAD_LOGIN };
  const r = await attemptLogin(getDb(), { email, password, ip: await ip(), now: new Date() });
  if (!r.ok) return { error: r.error };
  await setSessionCookie(r.token);
  redirect(r.user.mustChangePassword ? CHANGE_PASSWORD_PATH : HOME_PATH);
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  if (token) destroySession(getDb(), token);
  await clearSessionCookie();
  redirect(LOGIN_PATH);
}

/**
 * Campos: current, next, confirm (opcional; se vier, precisa bater com next).
 * Derruba as outras sessões. Se era a troca obrigatória, segue para /admin.
 */
export async function changePassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) redirect(LOGIN_PATH);
  const next = field(form, "next");
  if (form.has("confirm") && field(form, "confirm") !== next) return { error: "A confirmação não bate com a nova senha." };
  const r = await changeOwnPassword(getDb(), { userId: user.id, sessionToken: token, current: field(form, "current"), next });
  if (!r.ok) return { error: r.error };
  if (user.mustChangePassword) redirect(HOME_PATH);
  return { message: "Senha alterada." };
}

/** Campo: current (senha atual). Devolve o código novo; o anterior deixa de valer. */
export async function generateRecoveryCode(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const r = await createRecoveryCode(getDb(), { userId: auth.user.id, current: field(form, "current") });
  if (!r.ok) return { error: r.error };
  return { code: r.code };
}

/** Campos: email, code, next, confirm (opcional). Sucesso: entra e vai para /admin. */
export async function recover(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const code = field(form, "code");
  const next = field(form, "next");
  if (!email || !code) return { error: BAD_RECOVERY };
  if (form.has("confirm") && field(form, "confirm") !== next) return { error: "A confirmação não bate com a nova senha." };
  const r = await recoverAccess(getDb(), { email, code, next, ip: await ip(), now: new Date() });
  if (!r.ok) return { error: r.error };
  await setSessionCookie(r.token);
  redirect(HOME_PATH);
}
