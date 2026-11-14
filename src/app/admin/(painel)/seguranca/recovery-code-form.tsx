"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { generateRecoveryCode, type AuthFormState } from "@/lib/actions/auth";

export const MISSING_CURRENT = "Informe sua senha atual.";

// Gera o código de recuperação depois de confirmar a senha atual. O código aparece só nesta
// resposta; ao chegar, atualiza o painel para o aviso amarelo sumir.

async function submit(prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  if (!form.get("current")) return { error: MISSING_CURRENT };
  return generateRecoveryCode(prev, form);
}

export function RecoveryCodeForm({ hasRecoveryCode }: { hasRecoveryCode: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(submit, {});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (state.code) router.refresh();
  }, [state.code, router]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      /* sem permissão de área de transferência: o código continua na tela para anotar */
    }
  }

  const has = hasRecoveryCode || Boolean(state.code);
  return (
    <form action={action} noValidate className="space-y-5">
      {state.code ? (
        <div role="status" className="space-y-3 rounded-xl border-2 border-dashed border-brand bg-brand-soft p-4">
          <p className="break-all text-center font-mono text-2xl font-bold tracking-widest">{state.code}</p>
          <p className="text-center font-medium">Guarde este código em lugar seguro (anote ou imprima). Ele não aparece de novo.</p>
          <div className="flex justify-center">
            <button type="button" className={BTN_SECONDARY} onClick={() => copy(state.code!)}>
              {copied === state.code ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
              {copied === state.code ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      ) : (
        <p>
          {hasRecoveryCode
            ? "Você já tem um código guardado. Gerar um novo invalida o anterior."
            : "Você ainda não tem um código de recuperação. Gere agora e guarde em lugar seguro."}
        </p>
      )}
      <FormError message={state.error} />
      <Field
        label="Sua senha atual"
        name="current"
        type="password"
        autoComplete="current-password"
        required
        help="Para gerar um código é preciso confirmar que é você."
      />
      <SubmitButton className={`${BTN_PRIMARY} w-full sm:w-auto`}>{has ? "Gerar novo código" : "Gerar código"}</SubmitButton>
    </form>
  );
}
