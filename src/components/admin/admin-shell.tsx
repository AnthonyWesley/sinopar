"use client";

import { ExternalLink, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { logout } from "@/lib/actions/auth";
import type { Role } from "@/lib/server/auth";
import { isActive, menuFor } from "./menu";

// Moldura do painel, no visual do painel do Kadoshi: barra lateral que recolhe (só ícones) ou
// expande (ícone + nome), lembrada neste navegador; no celular, menu aberto por botão.
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  // o menu do celular fecha sozinho ao mudar de página
  const mobileOpen = menuOpen === pathname;
  const items = menuFor(user.role);

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

  const mobileLink = (href: string, label: string, Icon: LucideIcon) => {
    const active = isActive(href, pathname);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium ${active ? "bg-brand text-ink" : "text-ink hover:bg-surface-2"}`}
        >
          <Icon className="size-5 shrink-0" aria-hidden="true" /> {label}
        </Link>
      </li>
    );
  };

  return (
    <div className="admin-root flex-1">
      {nav ? (
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-white py-5 transition-[width] duration-200 motion-reduce:transition-none sm:flex ${
            expanded ? "w-60" : "w-[76px] items-center"
          }`}
        >
          <Link href="/admin" aria-label="Início do painel" className={`mb-5 flex min-h-11 items-center gap-3 ${expanded ? "px-5" : "justify-center"}`}>
            <Image src="/images/logo-fixastore.svg" alt="" width={779} height={446} className={expanded ? "h-10 w-auto" : "h-7 w-auto"} />
            {expanded ? <span className="text-sm font-semibold">Painel</span> : null}
          </Link>
          <div className={`mb-5 h-px bg-line ${expanded ? "mx-5" : "w-8"}`} />
          <nav aria-label="Menu do painel" className={`flex w-full flex-col gap-1.5 ${expanded ? "px-3" : "items-center"}`}>
            {items.map(({ href, label, Icon }) => railLink(href, label, Icon))}
          </nav>
          <div className={`mt-auto flex w-full flex-col gap-1.5 ${expanded ? "px-3" : "items-center"}`}>
            {railLink("/admin/senha", "Trocar minha senha", KeyRound)}
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
          <div className={`mx-auto flex items-center gap-2 px-4 py-2.5 sm:px-8 ${nav ? "max-w-5xl" : "max-w-md"}`}>
            {nav ? (
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-white sm:hidden"
                aria-expanded={mobileOpen}
                aria-controls="admin-mobile-menu"
                aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
                onClick={() => setMenuOpen(mobileOpen ? null : pathname)}
              >
                {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </button>
            ) : null}
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
          {nav && mobileOpen ? (
            <div id="admin-mobile-menu" className="mx-4 mb-3 rounded-2xl border border-line bg-white p-2 shadow-sm sm:hidden">
              <nav aria-label="Menu do painel">
                <ul className="space-y-1">
                  {items.map(({ href, label, Icon }) => mobileLink(href, label, Icon))}
                  {mobileLink("/admin/senha", "Trocar minha senha", KeyRound)}
                </ul>
              </nav>
            </div>
          ) : null}
        </header>
        <main id="conteudo" className={`mx-auto min-w-0 px-4 pb-12 pt-4 sm:px-8 ${nav ? "max-w-5xl" : "max-w-md"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
