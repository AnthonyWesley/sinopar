import { useId, type InputHTMLAttributes, type ReactNode } from "react";

// Campo do painel: rótulo visível, ajuda e erro ligados por aria-describedby, 44 px de altura.
// Sem estado próprio: o valor vai no FormData da Server Action (name). Para manter o valor
// depois de um erro (o React limpa o formulário ao fim da action), passe value + onChange.

/** Altura mínima de toque (44 px) para botões e campos do painel. */
export const TAP = "min-h-11";
/** Botão principal: fundo escuro, texto branco (contraste 18:1). */
export const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-base font-semibold text-white hover:bg-ink-soft disabled:opacity-60";
/** Botão secundário: branco com borda. */
export const BTN_SECONDARY =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-base font-medium text-ink hover:bg-surface-2 disabled:opacity-60";
/** Ação que apaga: texto vermelho escuro sobre branco (6,6:1). */
export const BTN_DANGER =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-base font-medium text-error hover:bg-error-soft disabled:opacity-60";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
  name: string;
  help?: ReactNode;
  error?: string;
  /** mostra "(opcional)" ao lado do rótulo */
  optional?: boolean;
};

export function Field({ label, help, error, optional, ...input }: FieldProps) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(opcional)</span> : null}
      </label>
      <input
        id={id}
        type="text"
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base text-ink ${
          error ? "border-error" : "border-line-strong"
        }`}
      />
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
