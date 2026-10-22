import Link from "next/link";

// Logotipo PROVISÓRIO (a Sinopar ainda não mandou o dela): porca sextavada amarela + nome
// em fonte larga. Trocar pelo arquivo oficial quando chegar.

export function NutMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 1.5 36 10.75v18.5L20 38.5 4 29.25v-18.5Z" fill="var(--brand)" />
      <circle cx="20" cy="20" r="8.5" fill="var(--black)" />
      <circle cx="20" cy="20" r="4.5" fill="var(--brand)" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md" aria-label="Sinopar Ferramentas, página inicial">
      <NutMark />
      <span className="leading-none">
        <span className={`font-wide block text-xl ${dark ? "text-white" : "text-ink"}`}>SINOPAR</span>
        <span className={`mt-0.5 block text-[0.6875rem] font-semibold tracking-[0.22em] ${dark ? "text-brand" : "text-muted"}`}>
          FERRAMENTAS
        </span>
      </span>
    </Link>
  );
}
