"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useRef } from "react";

/** no celular os filtros abrem numa gaveta; no desktop ficam na barra lateral */
export function FilterDrawer({ count, children }: { count: number; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="btn-outline min-h-11 px-3.5 lg:hidden">
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        Filtros
        {count > 0 && <span className="grid min-w-6 place-items-center rounded-full bg-black px-1.5 text-sm text-white tabular-nums">{count}</span>}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        aria-label="Filtros"
        className="ms-0 my-0 h-dvh max-h-none w-[min(22rem,90vw)] max-w-none bg-white p-0 backdrop:bg-black/50 motion-safe:animate-[drawer-in-left_220ms_ease-out] motion-reduce:animate-[fade-in_150ms]"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-wide text-lg">Filtros</p>
          <button type="button" onClick={() => dialog.current?.close()} className="grid size-11 place-items-center rounded-lg hover:bg-surface-2">
            <X className="size-6" aria-hidden="true" />
            <span className="sr-only">Fechar filtros</span>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </dialog>
    </>
  );
}
