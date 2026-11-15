"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

// Banners da página inicial (cadastrados no painel > Banners). Um por vez; com mais de um, troca
// sozinho a cada 6 s, com anterior/próximo, bolinhas e botão de pausar (exigido quando algo se
// move sozinho por mais de 5 s). Para quando o mouse ou o foco está no banner, e não troca
// sozinho para quem pediu menos movimento no sistema. No celular usa a imagem de celular.

export type StoreBanner = { id: number; title: string; desktop: string; mobile: string; link: string };

const INTERVAL_MS = 6000;
const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const readReduced = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(REDUCE).matches : false);

function Slide({ banner, first }: { banner: StoreBanner; first: boolean }) {
  const picture = (
    <picture className="block size-full">
      <source media="(max-width: 639px)" srcSet={banner.mobile || banner.desktop} />
      <img
        src={banner.desktop}
        alt={banner.title}
        className="size-full object-cover"
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : undefined}
        decoding="async"
      />
    </picture>
  );
  if (!banner.link) return picture;
  if (banner.link.startsWith("/"))
    return (
      <Link href={banner.link} className="block size-full">
        {picture}
      </Link>
    );
  return (
    <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block size-full">
      {picture}
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function RoundButton({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-md hover:bg-white ${className}`}
    >
      {children}
    </button>
  );
}

export function BannerCarousel({ banners }: { banners: StoreBanner[] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  const n = banners.length;
  const auto = n > 1 && playing && !hold && !reduced;

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % n), INTERVAL_MS);
    return () => clearInterval(t);
  }, [auto, n]);

  const go = (i: number) => setCurrent((i + n) % n);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 sm:aspect-[2/1] lg:mt-3 lg:aspect-auto lg:min-h-[22rem] lg:flex-1"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
      }}
    >
      <div aria-live={auto ? "off" : "polite"} className="size-full">
        {banners.map((b, i) => (
          <div key={b.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${n}`} hidden={i !== current} className="size-full lg:absolute lg:inset-0">
            <Slide banner={b} first={i === 0} />
          </div>
        ))}
      </div>

      {n > 1 ? (
        <>
          <RoundButton label="Banner anterior" onClick={() => go(current - 1)} className="absolute top-1/2 left-3 -translate-y-1/2">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </RoundButton>
          <RoundButton label="Próximo banner" onClick={() => go(current + 1)} className="absolute top-1/2 right-3 -translate-y-1/2">
            <ChevronRight className="size-5" aria-hidden="true" />
          </RoundButton>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {!reduced ? (
              <RoundButton label={playing ? "Pausar troca automática" : "Continuar troca automática"} onClick={() => setPlaying(!playing)} className="size-9">
                {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              </RoundButton>
            ) : null}
            <div className="flex items-center rounded-full bg-white/90 px-1 shadow-md">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`Mostrar banner ${i + 1} de ${n}`}
                  aria-current={i === current ? "true" : undefined}
                  onClick={() => go(i)}
                  className="flex size-9 items-center justify-center"
                >
                  <span className={`block rounded-full transition-all ${i === current ? "h-2.5 w-5 bg-ink" : "size-2.5 bg-ink/35"}`} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
