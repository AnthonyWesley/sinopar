"use client";

import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { createStaff, deleteStaff, resetStaffPassword, type UsersFormState } from "@/lib/actions/users";

// Formulários da tela de Usuários. As actions conferem o papel e chamam refresh(): a lista do
// servidor se atualiza sozinha depois de cada sucesso.

const EMPTY: UsersFormState = {};

export function NewStaffForm() {
  const [state, action] = useActionState(createStaff, EMPTY);
  // nome e e-mail sobrevivem a um erro (o React limpa o resto); depois do sucesso, recomeçam vazios
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shown, setShown] = useState(state);
  if (state !== shown) {
    setShown(state);
    if (state.message) {
      setName("");
      setEmail("");
    }
  }
  return (
    <form action={action} noValidate className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Novo funcionário</h2>
      <FormError message={state.error} />
      <Field label="Nome" name="name" required autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="off"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Senha provisória"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        help="Pelo menos 8 caracteres. A pessoa vai trocar essa senha no primeiro acesso."
      />
      <SubmitButton className={`${BTN_PRIMARY} w-full sm:w-auto`}>
        <UserPlus className="size-5" aria-hidden="true" /> Adicionar funcionário
      </SubmitButton>
      <Toast message={state.message} token={state} />
    </form>
  );
}

/** Redefinir a senha e remover um funcionário, abertos um de cada vez abaixo do nome. */
export function StaffActions({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState<"reset" | "delete" | null>(null);
  // o formulário fecha no sucesso; o aviso fica aqui para não sumir junto
  const [done, setDone] = useState<{ message: string } | null>(null);
  return (
    <div className="mt-3 space-y-3">
      <Toast message={done?.message} token={done} />
      <div className="grid grid-cols-1 gap-2 sm:flex">
        <button
          type="button"
          className={BTN_SECONDARY}
          aria-expanded={open === "reset"}
          onClick={() => setOpen(open === "reset" ? null : "reset")}
        >
          <KeyRound className="size-5" aria-hidden="true" /> Redefinir senha
        </button>
        <button
          type="button"
          className={BTN_DANGER}
          aria-expanded={open === "delete"}
          onClick={() => setOpen(open === "delete" ? null : "delete")}
        >
          <Trash2 className="size-5" aria-hidden="true" /> Remover
        </button>
      </div>
      {open === "reset" ? (
        <ResetPasswordForm
          id={id}
          name={name}
          onDone={(message) => {
            setOpen(null);
            setDone({ message });
          }}
        />
      ) : null}
      {open === "delete" ? <DeleteStaffForm id={id} name={name} onCancel={() => setOpen(null)} /> : null}
    </div>
  );
}

function ResetPasswordForm({ id, name, onDone }: { id: number; name: string; onDone: (message: string) => void }) {
  const [state, action] = useActionState(async (prev: UsersFormState, form: FormData) => {
    const r = await resetStaffPassword(prev, form);
    if (r.message) onDone(r.message);
    return r;
  }, EMPTY);
  return (
    <form action={action} noValidate className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <p className="font-medium">Nova senha provisória para {name}</p>
      <input type="hidden" name="id" value={id} />
      <FormError message={state.error} />
      <Field
        label="Senha provisória"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        help="Pelo menos 8 caracteres. Ele vai trocar no próximo login."
      />
      <SubmitButton className={`${BTN_PRIMARY} w-full sm:w-auto`}>Salvar senha provisória</SubmitButton>
    </form>
  );
}

function DeleteStaffForm({ id, name, onCancel }: { id: number; name: string; onCancel: () => void }) {
  const [state, action] = useActionState(deleteStaff, EMPTY);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-error/40 bg-error-soft p-4">
      <p className="font-medium text-ink">Remover {name}? Ele deixa de entrar no painel na hora.</p>
      <input type="hidden" name="id" value={id} />
      <FormError message={state.error} />
      <div className="grid grid-cols-1 gap-2 sm:flex">
        <SubmitButton className={BTN_DANGER}>Remover {name}</SubmitButton>
        <button type="button" className={BTN_SECONDARY} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
