"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { BTN_PRIMARY } from "./field";

/** Botão de enviar que fica desabilitado, com um indicador, enquanto a Server Action roda. */
export function SubmitButton({ children, className = BTN_PRIMARY }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
