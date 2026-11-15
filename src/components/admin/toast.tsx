"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Aviso de sucesso que some sozinho. Passe a mensagem da action e o próprio objeto de estado
 * como `token`: cada resposta nova (mesmo com o mesmo texto) mostra o aviso de novo.
 * A região aria-live fica sempre na página, para o leitor de tela anunciar a mudança.
 */
export function Toast({ message, token, duration = 4000 }: { message?: string; token?: unknown; duration?: number }) {
  const [hidden, setHidden] = useState<unknown>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setHidden(token), duration);
    return () => clearTimeout(t);
  }, [message, token, duration]);

  const visible = Boolean(message) && hidden !== token;
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center sm:bottom-4">
      {visible ? (
        <p className="pointer-events-auto flex items-center gap-2 rounded-xl bg-ink px-4 py-3 font-medium text-white shadow-lg">
          <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
}
