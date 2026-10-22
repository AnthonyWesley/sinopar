"use client";

import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "./category-icon";

type Dept = { slug: string; name: string; count: number };

// "Todos os departamentos" (desktop): lista vertical que abre por clique/Enter, fecha com Esc
// ou clique fora. Na home a mesma lista já aparece aberta ao lado do banner (DepartmentsList).
export function DepartmentsMenu({ departments }: { departments: Dept[] }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname; // fecha sozinho ao trocar de página
  const ref = useRef<HTMLDivElement>(null);

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
