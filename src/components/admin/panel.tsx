import type { ReactNode } from "react";

/** Cartão branco do painel (formulários, listas). */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-5 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}
