"use client";

import { ChevronLeft } from "lucide-react";
import { useActionState, useState } from "react";
import { BTN_PRIMARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { login, recover, type AuthFormState } from "@/lib/actions/auth";

// Entrar no painel e, no mesmo lugar, "Esqueci minha senha" (código de recuperação + senha nova).
// O sucesso das duas actions redireciona; aqui só aparece o erro.

const CARD = "mx-auto mt-6 max-w-sm space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:mt-12 sm:p-8";
const EMPTY: AuthFormState = {};

export function LoginForm() {
  const [recovering, setRecovering] = useState(false);
  // o e-mail passa de uma tela para a outra e sobrevive ao erro (o React limpa o resto do formulário)
  const [email, setEmail] = useState("");
  return recovering ? (
    <RecoverForm email={email} onEmail={setEmail} onBack={() => setRecovering(false)} />
  ) : (
    <SignIn email={email} onEmail={setEmail} onForgot={() => setRecovering(true)} />
  );
}

type EmailProps = { email: string; onEmail: (v: string) => void };

function SignIn({ email, onEmail, onForgot }: EmailProps & { onForgot: () => void }) {
  const [state, action] = useActionState(login, EMPTY);
  return (
    <form action={action} noValidate className={CARD}>
      <div>
        <h1 className="text-2xl font-bold">Entrar no painel</h1>
        <p className="mt-1 text-muted">Fixa Store · área administrativa</p>
      </div>
      <FormError message={state.error} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => onEmail(e.target.value)}
      />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className={`${BTN_PRIMARY} w-full`}>
        Entrar
      </SubmitButton>
      <button
        type="button"
        onClick={onForgot}
        className="block min-h-11 w-full text-center font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function RecoverForm({ email, onEmail, onBack }: EmailProps & { onBack: () => void }) {
  const [state, action] = useActionState(recover, EMPTY);
  return (
    <form action={action} noValidate className={CARD}>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 font-medium text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="size-5" aria-hidden="true" /> Voltar
      </button>
      <div>
        <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
        <p className="mt-1 text-muted">
          Use o código de recuperação que você gerou no painel, em Segurança. Cada código serve uma vez só.
        </p>
      </div>
      <FormError message={state.error} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => onEmail(e.target.value)}
      />
      <Field label="Código de recuperação" name="code" required placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code" />
      <Field label="Senha nova" name="next" type="password" autoComplete="new-password" required help="Pelo menos 8 caracteres." />
      <Field label="Repita a senha nova" name="confirm" type="password" autoComplete="new-password" required />
      <SubmitButton className={`${BTN_PRIMARY} w-full`}>
        Redefinir senha e entrar
      </SubmitButton>
    </form>
  );
}
