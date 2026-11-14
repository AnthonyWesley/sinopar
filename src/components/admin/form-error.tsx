/** Erro do formulário (vindo da Server Action ou da conferência local). Lido pelo leitor de tela. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-error/40 bg-error-soft p-3 text-sm font-medium text-error">
      {message}
    </div>
  );
}
