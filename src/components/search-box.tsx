"use client";

import { Clock, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { formatPrice } from "@/lib/format";
import { score } from "@/lib/search";

export type SearchItem = { slug: string; name: string; image: string; price: number; category: string; keywords: string };
type CategoryLink = { slug: string; name: string };

// Buscas recentes ficam no navegador (localStorage), só para conveniência.
const RECENT_KEY = "sinopar-buscas-recentes";
const recentListeners = new Set<() => void>();
let recentCache: string[] | null = null;
function readRecent() {
  if (recentCache) return recentCache;
  try {
    recentCache = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    recentCache = [];
  }
  return recentCache!;
}
function saveRecent(term: string) {
  const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
  recentCache = next;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
  recentListeners.forEach((l) => l());
}
function clearRecent() {
  recentCache = [];
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {}
  recentListeners.forEach((l) => l());
}
const noRecent: string[] = [];

export function SearchBox({ items, categories, defaultValue = "" }: { items: SearchItem[]; categories: CategoryLink[]; defaultValue?: string }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const recent = useSyncExternalStore(
    (l) => (recentListeners.add(l), () => recentListeners.delete(l)),
    readRecent,
    () => noRecent,
  );

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return items
      .map((item) => ({ item, s: score(query, item) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((r) => r.item);
  }, [query, items]);

  const showSuggestions = open && query.trim().length >= 2;
  const showIdle = open && query.trim().length < 2;
  const listId = `${id}-lista`;

  function go(term: string) {
    const t = term.trim();
    if (!t) return;
    saveRecent(t);
    setOpen(false);
    router.push(`/produtos?q=${encodeURIComponent(t)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return setOpen(false);
    if (!showSuggestions || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      saveRecent(query.trim());
      setOpen(false);
      router.push(`/produto/${results[active].slug}`);
    }
  }

  return (
    <div
      role="search"
      className="relative w-full"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <form
        action="/produtos"
        onSubmit={(e) => {
          e.preventDefault();
          go(query);
        }}
        className="flex"
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          Buscar produtos
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar parafuso, broca, luva..."
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions && results.length > 0}
          aria-controls={showSuggestions && results.length > 0 ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-r${active}` : undefined}
          className="h-12 w-full min-w-0 rounded-l-lg border-0 bg-white px-4 text-base text-ink placeholder:text-muted focus:ring-2 focus:ring-ink focus:outline-none focus:ring-inset"
        />
        <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-r-lg bg-black text-white hover:bg-ink-soft">
          <Search className="size-5" aria-hidden="true" />
          <span className="sr-only">Buscar</span>
        </button>
      </form>

      {(showSuggestions || (showIdle && (recent.length > 0 || categories.length > 0))) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-white text-ink shadow-xl ring-1 ring-line motion-safe:animate-[fade-in_140ms_ease-out]">
          {showSuggestions &&
            (results.length ? (
              <>
                <ul id={listId} role="listbox" aria-label="Sugestões" className="max-h-[60vh] overflow-y-auto py-1">
                  {results.map((r, i) => (
                    <li key={r.slug} id={`${id}-r${i}`} role="option" aria-selected={i === active}>
                      <Link
                        href={`/produto/${r.slug}`}
                        onClick={() => {
                          saveRecent(query.trim());
                          setOpen(false);
                        }}
                        className={`flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-surface-2 ${i === active ? "bg-surface-2" : ""}`}
                      >
                        <Image src={r.image} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md bg-surface-2 object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-medium">{r.name}</span>
                          <span className="text-sm text-muted">{r.category}</span>
                        </span>
                        <span className="price shrink-0 text-base">{formatPrice(r.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => go(query)} className="flex min-h-12 w-full items-center gap-2 border-t border-line px-4 text-left font-semibold hover:bg-surface-2">
                  <Search className="size-4" aria-hidden="true" />
                  Ver todos os resultados para “{query.trim()}”
                </button>
              </>
            ) : (
              <div className="p-4">
                <p className="font-semibold">Nada encontrado para “{query.trim()}”.</p>
                <p className="mt-1 text-sm text-muted">Tente um termo mais curto (ex.: “parafuso”) ou navegue por departamento:</p>
                <CategoryChips categories={categories} onPick={() => setOpen(false)} />
              </div>
            ))}

          {showIdle && (
            <div className="p-4">
              {recent.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted">Buscas recentes</p>
                    <button type="button" onClick={clearRecent} className="min-h-8 text-sm underline underline-offset-4">
                      Limpar
                    </button>
                  </div>
                  <ul className="mt-1">
                    {recent.map((t) => (
                      <li key={t}>
                        <button type="button" onClick={() => (setQuery(t), go(t))} className="flex min-h-11 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-surface-2">
                          <Clock className="size-4 text-muted" aria-hidden="true" />
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm font-semibold text-muted">Departamentos</p>
              <CategoryChips categories={categories} onPick={() => setOpen(false)} />
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)} className="absolute top-2 right-2 grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 md:hidden">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar sugestões</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryChips({ categories, onPick }: { categories: CategoryLink[]; onPick: () => void }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link href={`/produtos/${c.slug}`} onClick={onPick} className="inline-flex min-h-10 items-center rounded-full bg-surface-2 px-3.5 text-sm font-medium hover:bg-surface-3">
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
