"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; label: string };

export function MobileMenu({ departments, nav }: { departments: Item[]; nav: Item[] }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpenOn(pathname)} className="grid size-12 shrink-0 place-items-center rounded-lg text-ink hover:bg-surface-2 lg:hidden">
        <Menu className="size-6" aria-hidden="true" />
        <span className="sr-only">Abrir menu</span>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpenOn(null)}
        onClick={(e) => e.target === e.currentTarget && setOpenOn(null)}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none bg-white p-0 backdrop:bg-black/50 motion-safe:animate-[drawer-in-left_220ms_ease-out] motion-reduce:animate-[fade-in_150ms]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-wide text-lg">Menu</p>
          <button type="button" onClick={() => setOpenOn(null)} className="grid size-11 place-items-center rounded-lg hover:bg-surface-2">
            <X className="size-6" aria-hidden="true" />
            <span className="sr-only">Fechar menu</span>
          </button>
        </div>
        <nav aria-label="Departamentos" className="px-2 py-3">
          <p className="px-3 pb-1 text-sm font-semibold text-muted">Departamentos</p>
          <ul>
            {departments.map((d) => (
              <li key={d.href}>
                <Link href={d.href} onClick={() => setOpenOn(null)} className="flex min-h-12 items-center rounded-lg px-3 font-medium hover:bg-surface-2" aria-current={pathname === d.href ? "page" : undefined}>
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Loja" className="border-t border-line px-2 py-3">
          <ul>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpenOn(null)} className="flex min-h-12 items-center rounded-lg px-3 font-medium hover:bg-surface-2">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
