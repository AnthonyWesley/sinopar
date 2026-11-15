"use client";

import { Ellipsis, ExternalLink, LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { logout } from "@/lib/actions/auth";
import type { Role } from "@/lib/server/auth";
import { isActive, menuFor, mobileMenuFor, PASSWORD_ITEM } from "./menu";

// Moldura do painel, no visual do painel do Kadoshi: barra lateral que recolhe (só ícones) ou
// expande (ícone + nome), lembrada neste navegador. No celular, barra fixa embaixo com até
// 5 posições: os primeiros atalhos e "Mais", que abre a lista com o resto das telas.
// Recebe só nome e papel do usuário (nada de e-mail ou flags) para não mandar mais que o preciso.

export type ShellUser = { name: string; role: Role };

const RAIL_KEY = "admin-rail-expanded";
const RAIL_EVENT = "admin-rail-change";

function readExpanded(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeRail(cb: () => void) {
  window.addEventListener(RAIL_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(RAIL_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function setExpanded(value: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, value ? "1" : "0");
  } catch {
    /* sem localStorage: só não lembra a escolha */
  }
  window.dispatchEvent(new Event(RAIL_EVENT));
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function AdminShell({ user, nav = false, children }: { user: ShellUser; nav?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  // no servidor (e na hidratação) começa recolhido; depois lê a preferência
  const expanded = useSyncExternalStore(subscribeRail, readExpanded, () => false);
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null);
  // a lista "Mais" fecha sozinha ao mudar de página
  const moreOpen = moreOpenAt === pathname;
  const items = menuFor(user.role);
  const mobile = mobileMenuFor(user.role);
  const moreActive = mobile.more.some((m) => isActive(m.href, pathname));

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpenAt(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const railLink = (href: string, label: string, Icon: LucideIcon) => {
    const active = isActive(href, pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        aria-label={expanded ? undefined : label}
        title={expanded ? undefined : label}
        className={`flex h-11 items-center rounded-xl transition-colors ${expanded ? "w-full gap-3 px-3" : "w-11 justify-center"} ${
          active ? "bg-brand text-ink" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <Icon className="size-[22px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {expanded ? <span className="truncate text-sm font-medium">{label}</span> : null}
      </Link>
    );
  };

  const barLink = (href: string, label: string, Icon: LucideIcon) => {
    const active = isActive(href, pathname);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${active ? "text-ink" : "text-ink-soft"}`}
        >
          <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-brand" : ""}`}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          {label}
        </Link>
      </li>
    );
  };

  return (
    <div className="admin-root flex-1">
      {nav ? (
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-white pb-5 transition-[width] duration-200 motion-reduce:transition-none sm:flex ${
            expanded ? "w-60" : "w-[76px] items-center"
          }`}
        >
          {/* Mesma altura do cabeçalho (h-16 + borda) para a linha continuar a do topo. */}
          <Link
            href="/admin"
            aria-label="Início do painel"
            className={`mb-5 flex h-[65px] w-full shrink-0 items-center gap-3 border-b border-line ${expanded ? "px-5" : "justify-center"}`}
          >
            <Image src="/images/logo-fixastore.svg" alt="" width={779} height={446} className={expanded ? "h-10 w-auto" : "h-7 w-auto"} />
            {expanded ? <span className="text-sm font-semibold">Painel</span> : null}
          </Link>
          <nav aria-label="Menu do painel" className={`flex w-full flex-col gap-1.5 ${expanded ? "px-3" : "items-center"}`}>
            {items.map(({ href, label, Icon }) => railLink(href, label, Icon))}
          </nav>
          <div className={`mt-auto flex w-full flex-col gap-1.5 ${expanded ? "px-3" : "items-center"}`}>
            {railLink(PASSWORD_ITEM.href, PASSWORD_ITEM.label, PASSWORD_ITEM.Icon)}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Recolher menu" : "Expandir menu"}
              title={expanded ? "Recolher menu" : "Expandir menu"}
              className={`flex h-11 items-center rounded-xl text-ink-soft hover:bg-surface-2 hover:text-ink ${
                expanded ? "w-full gap-3 px-3" : "w-11 justify-center"
              }`}
            >
              {expanded ? (
                <PanelLeftClose className="size-[22px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="size-[22px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
              )}
              {expanded ? <span className="text-sm font-medium">Recolher</span> : null}
            </button>
          </div>
        </aside>
      ) : null}

      <div className={`transition-[padding] duration-200 motion-reduce:transition-none ${nav ? (expanded ? "sm:pl-60" : "sm:pl-[76px]") : ""}`}>
        <header className="sticky top-0 z-30 border-b border-line bg-surface-2/90 backdrop-blur">
          <div className={`mx-auto flex h-16 items-center gap-2 px-4 sm:px-8 ${nav ? "w-full" : "max-w-md"}`}>
            <Link href="/admin" className={`mr-auto flex min-h-11 min-w-0 items-center gap-2 font-semibold ${nav ? "sm:invisible" : ""}`}>
              <Image src="/images/logo-fixastore.svg" alt="" width={779} height={446} className="h-8 w-auto" />
              <span>Painel</span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm font-medium shadow-sm hover:bg-surface-2 sm:px-4"
            >
              <ExternalLink className="size-4" aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Ver site</span>
            </a>
            <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1 shadow-sm">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-ink">
                {initialsOf(user.name) || "?"}
              </span>
              <span className="hidden max-w-40 px-1.5 leading-tight md:block">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block text-xs text-muted">{user.role === "owner" ? "Responsável" : "Funcionário"}</span>
              </span>
              <form action={logout}>
                <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-surface-2">
                  <LogOut className="size-4" aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Sair</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main id="conteudo" className={`mx-auto min-w-0 px-4 pt-4 sm:px-8 ${nav ? "pb-28 sm:pb-12" : "pb-12"} ${nav ? "w-full" : "max-w-md"}`}>
          {children}
        </main>
      </div>

      {nav && moreOpen ? (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button type="button" tabIndex={-1} aria-label="Fechar" className="absolute inset-0 bg-ink/40" onClick={() => setMoreOpenAt(null)} />
          <div
            id="admin-mais"
            role="dialog"
            aria-labelledby="admin-mais-titulo"
            className="absolute inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-line bg-white p-3 shadow-lg"
          >
            <h2 id="admin-mais-titulo" className="px-3 pb-2 pt-1 text-sm font-semibold text-muted">
              Mais opções
            </h2>
            <ul className="space-y-1">
              {mobile.more.map(({ href, label, Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${active ? "bg-brand text-ink" : "text-ink hover:bg-surface-2"}`}
                    >
                      <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" /> {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {nav ? (
        <nav aria-label="Menu do celular" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${mobile.bar.length + (mobile.more.length ? 1 : 0)}, minmax(0, 1fr))` }}>
            {mobile.bar.map(({ href, label, Icon }) => barLink(href, label, Icon))}
            {mobile.more.length ? (
              <li>
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-controls="admin-mais"
                  onClick={() => setMoreOpenAt(moreOpen ? null : pathname)}
                  className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium ${moreOpen || moreActive ? "text-ink" : "text-ink-soft"}`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreOpen || moreActive ? "bg-brand" : ""}`}>
                    <Ellipsis className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  Mais
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
