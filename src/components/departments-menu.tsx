"use client";

import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "./category-icon";

type Dept = { slug: string; name: string; count: number };

/** id do menu lateral da home; enquanto ele está à vista, o botão do cabeçalho vira só um título */
export const SIDEBAR_ID = "departamentos-lateral";

// "Departamentos" (desktop): lista vertical que abre por clique/Enter, fecha com Esc ou clique
// fora. Na home a mesma lista já aparece aberta ao lado do banner: ali, enquanto ela está à
// vista, o botão não abriria nada de novo, então vira título sem seta. Ao rolar a página e o
// menu lateral sumir, a seta aparece e o botão passa a abrir a lista.
export function DepartmentsMenu({ departments }: { departments: Dept[] }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  // palpite inicial pela rota (evita a seta piscar na home); o observer confirma
  const [sidebarOn, setSidebarOn] = useState<{ path: string; visible: boolean } | null>(null);
  const sidebarVisible = sidebarOn?.path === pathname ? sidebarOn.visible : pathname === "/";
  const open = openOn === pathname && !sidebarVisible; // fecha sozinho ao trocar de página
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sidebar = document.getElementById(SIDEBAR_ID);
    // fora da home não há menu lateral: o palpite pela rota (false) já vale
    if (!sidebar) return;
    // "à vista" = quase inteiro abaixo da faixa amarela fixa
    const bar = ref.current?.closest(".sticky")?.getBoundingClientRect().height ?? 64;
    const io = new IntersectionObserver(([entry]) => setSidebarOn({ path: pathname, visible: entry.intersectionRatio >= 0.85 }), {
      rootMargin: `-${Math.round(bar)}px 0px 0px 0px`,
      threshold: [0, 0.85, 1],
    });
    io.observe(sidebar);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (sidebarVisible)
    return (
      <div ref={ref} className="w-68 shrink-0">
        <p className="flex min-h-12 w-full items-center gap-3 rounded-t-lg bg-white px-4 text-sm font-bold tracking-wide text-ink uppercase">
          <Menu className="size-5" aria-hidden="true" />
          Departamentos
        </p>
      </div>
    );

  return (
    <div ref={ref} className="relative w-68 shrink-0">
      <button
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="menu-departamentos"
        className="flex min-h-12 w-full items-center gap-3 rounded-t-lg bg-white px-4 text-sm font-bold tracking-wide text-ink uppercase hover:bg-surface-2"
      >
        <Menu className="size-5" aria-hidden="true" />
        Departamentos
        <ChevronDown className={`ml-auto size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id="menu-departamentos" className="absolute inset-x-0 top-full z-40 rounded-b-lg bg-white shadow-xl ring-1 ring-line motion-safe:animate-[fade-in_160ms_ease-out]">
          <DepartmentsList departments={departments} />
        </div>
      )}
    </div>
  );
}

export function DepartmentsList({ departments }: { departments: Dept[] }) {
  const pathname = usePathname();
  return (
    <ul className="p-2">
      {departments.map((d) => {
        const href = `/produtos/${d.slug}`;
        const current = pathname === href;
        return (
          <li key={d.slug}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] hover:bg-surface-2 ${current ? "bg-surface-2 font-semibold" : ""}`}
            >
              <CategoryIcon slug={d.slug} className="size-5 text-ink-soft" />
              <span className="flex-1">{d.name}</span>
              <span className="text-sm text-muted tabular-nums">{d.count}</span>
            </Link>
          </li>
        );
      })}
      <li className="mt-1 border-t border-line pt-1">
        <Link href="/produtos" className="flex min-h-11 items-center gap-1 rounded-md px-3 text-[0.9375rem] font-semibold hover:bg-surface-2">
          Ver todos os produtos
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </li>
    </ul>
  );
}
