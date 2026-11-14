"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { BTN_PRIMARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { changePassword, type AuthFormState } from "@/lib/actions/auth";

// Troca da própria senha. Na troca obrigatória (senha provisória) a action leva ao Início;
// na troca comum devolve "Senha alterada." e o formulário volta vazio.

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action] = useActionState(changePassword, {} as AuthFormState);
  return (
    <form action={action} noValidate className="mx-auto mt-2 max-w-sm space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:mt-8 sm:p-8">
      {forced ? null : (
        <Link href="/admin" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-medium text-ink-soft hover:text-ink">
          <ChevronLeft className="size-5" aria-hidden="true" /> Início
        </Link>
      )}
      <h1 className="text-2xl font-bold">Trocar senha</h1>
      {forced ? (
        <p className="rounded-xl border border-brand bg-brand-soft p-3 text-ink">
          Antes de continuar, troque a senha provisória por uma senha só sua.
        </p>
      ) : null}
      <FormError message={state.error} />
      <Field label="Senha atual" name="current" type="password" autoComplete="current-password" required />
      <Field label="Nova senha" name="next" type="password" autoComplete="new-password" required help="Pelo menos 8 caracteres." />
      <Field label="Repita a nova senha" name="confirm" type="password" autoComplete="new-password" required />
      <SubmitButton className={`${BTN_PRIMARY} w-full`}>Trocar senha</SubmitButton>
      <Toast message={state.message} token={state} />
    </form>
  );
}
