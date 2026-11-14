import type { ReactNode } from "react";

/** Título da página do painel, com texto de apoio e uma ação opcional à direita. */
export function PageHeader({ title, intro, action }: { title: ReactNode; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {intro ? <p className="mt-1 text-muted">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}
