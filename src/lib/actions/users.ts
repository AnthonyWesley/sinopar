"use server";

import { refresh } from "next/cache";
import { getDb } from "../server/db";
import { createStaff as create, deleteStaff as remove, resetStaffPassword as reset } from "../server/users";
import { authorizeAction } from "../session";

// Server Actions da tela de Usuários, só para o Responsável. A conferência do papel acontece
// aqui (authorizeAction) e de novo em src/lib/server/users.ts.
// Formato para useActionState: (estado anterior, FormData) => estado.

export type UsersFormState = { error?: string; message?: string };

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

const idOf = (form: FormData) => {
  const n = Number(field(form, "id"));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** Campos: name, email, password (senha temporária, trocada no primeiro login). */
export async function createStaff(_prev: UsersFormState, form: FormData): Promise<UsersFormState> {
  const auth = await authorizeAction({ owner: true });
  if (!auth.ok) return { error: auth.error };
  const r = await create(
    getDb(),
    auth.user,
    { name: field(form, "name"), email: field(form, "email"), password: field(form, "password") },
    new Date(),
  );
  if (!r.ok) return { error: r.error };
  refresh();
  return { message: `${r.user.name} foi adicionado. Passe a senha temporária para ele.` };
}

/** Campos: id, password (nova senha temporária). */
export async function resetStaffPassword(_prev: UsersFormState, form: FormData): Promise<UsersFormState> {
  const auth = await authorizeAction({ owner: true });
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  if (id == null) return { error: "Usuário não encontrado." };
  const r = await reset(getDb(), auth.user, id, field(form, "password"));
  if (!r.ok) return { error: r.error };
  refresh();
  return { message: "Senha redefinida. Ele vai precisar trocar no próximo login." };
}

/** Campo: id. */
export async function deleteStaff(_prev: UsersFormState, form: FormData): Promise<UsersFormState> {
  const auth = await authorizeAction({ owner: true });
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  if (id == null) return { error: "Usuário não encontrado." };
  const r = remove(getDb(), auth.user, id);
  if (!r.ok) return { error: r.error };
  refresh();
  return { message: "Usuário removido." };
}
