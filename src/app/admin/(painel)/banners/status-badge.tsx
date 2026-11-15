import { BANNER_STATUS_LABEL, type BannerStatus } from "@/lib/banners";

const STYLE: Record<BannerStatus, string> = {
  "no-ar": "border-stock-ok/40 bg-stock-ok-soft text-stock-ok",
  agendado: "border-line-strong bg-white text-ink",
  encerrado: "border-line-strong bg-surface-2 text-muted",
  pausado: "border-line-strong bg-surface-2 text-muted",
};

/** Situação do banner em texto (não só cor). */
export function BannerStatusBadge({ status }: { status: BannerStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${STYLE[status]}`}>
      {BANNER_STATUS_LABEL[status]}
    </span>
  );
}

const br = (d: string) => d.split("-").reverse().join("/");

/** "De 20/11/2026 a 30/11/2026", "A partir de …", "Até …" ou "Sem data". */
export function bannerPeriod(startsOn: string, endsOn: string): string {
  if (startsOn && endsOn) return `De ${br(startsOn)} a ${br(endsOn)}`;
  if (startsOn) return `A partir de ${br(startsOn)}`;
  if (endsOn) return `Até ${br(endsOn)}`;
  return "Sem data de início nem de fim";
}
