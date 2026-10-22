"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cart, type CartLine } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

/** linhas do carrinho: produto, variação, quantidade, preço unitário e total */
export function CartLines({ lines, compact = false, onNavigate }: { lines: CartLine[]; compact?: boolean; onNavigate?: () => void }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={l.sku} className="flex gap-3 py-4">
          <Link href={`/produto/${l.slug}`} onClick={onNavigate} className="shrink-0 rounded-lg" tabIndex={-1} aria-hidden="true">
            <Image src={l.image} alt="" width={compact ? 72 : 96} height={compact ? 72 : 96} className={`${compact ? "size-18" : "size-24"} rounded-lg bg-surface-2 object-cover`} />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/produto/${l.slug}`} onClick={onNavigate} className="line-clamp-2 font-semibold underline-offset-4 hover:underline">
                  {l.name}
                </Link>
                {l.variant && <p className="text-sm text-muted">{l.variant}</p>}
                <p className="text-sm text-muted tabular-nums">{formatPrice(l.unitPrice)} cada</p>
              </div>
              <p className="price shrink-0 text-lg">{formatPrice(l.unitPrice * l.qty)}</p>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <QtyStepper
                value={l.qty}
                max={l.maxQty}
                onChange={(q) => cart.setQty(l.sku, q)}
                label={`Quantidade de ${l.name}${l.variant ? ` ${l.variant}` : ""}`}
              />
              <button type="button" onClick={() => cart.remove(l.sku)} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">
                <Trash2 className="size-4" aria-hidden="true" />
                Remover<span className="sr-only"> {l.name}</span>
              </button>
            </div>
            {l.qty >= l.maxQty && <p className="text-sm text-stock-low">Quantidade máxima em estoque.</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function QtyStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (q: number) => void; label: string }) {
  return (
    <div className="flex h-11 items-center rounded-lg ring-1 ring-line-strong ring-inset" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="grid h-11 w-11 place-items-center rounded-l-lg hover:bg-surface-2 disabled:opacity-40">
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Diminuir</span>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.max(1, Math.min(n, max)));
        }}
        aria-label="Quantidade"
        className="h-11 w-12 [appearance:textfield] bg-transparent text-center font-semibold tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="grid h-11 w-11 place-items-center rounded-r-lg hover:bg-surface-2 disabled:opacity-40">
        <Plus className="size-4" aria-hidden="true" />
        <span className="sr-only">Aumentar</span>
      </button>
    </div>
  );
}
