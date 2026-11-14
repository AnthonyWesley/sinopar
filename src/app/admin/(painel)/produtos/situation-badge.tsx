import type { Situation } from "@/lib/server/catalog-repo";

export const SITUATION_LABEL: Record<Situation, string> = { ativo: "Ativo", pausado: "Pausado", esgotado: "Esgotado" };

const STYLE: Record<Situation, string> = {
  ativo: "border-line-strong bg-white text-ink",
  pausado: "border-line-strong bg-surface-2 text-muted",
  esgotado: "border-error/40 bg-error-soft text-error",
};

/** Situação do produto em texto (não só cor): ativo, pausado (fora da loja) ou esgotado. */
export function SituationBadge({ situation }: { situation: Situation }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${STYLE[situation]}`}>
      {SITUATION_LABEL[situation]}
    </span>
  );
}
