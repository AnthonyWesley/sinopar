"use client";

import { ShoppingCart } from "lucide-react";
import { cart, cartTotals, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

export function CartButton() {
  const { lines } = useCart();
  const { items, subtotal } = cartTotals(lines);
  return (
    <button
      type="button"
      onClick={() => cart.open()}
      className="relative flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-black px-3 font-bold text-white hover:bg-ink-soft sm:px-4"
      aria-label={`Carrinho: ${items} ${items === 1 ? "item" : "itens"}`}
    >
      <ShoppingCart className="size-6" aria-hidden="true" />
      <span className="hidden tabular-nums sm:inline">{items ? formatPrice(subtotal) : "Carrinho"}</span>
      {items > 0 && (
        <span key={items} className="absolute -top-2 -right-2 grid min-w-6 place-items-center rounded-full bg-brand px-1.5 text-sm font-bold text-black ring-2 ring-black tabular-nums motion-safe:animate-[pop_180ms_ease-out]">
          {items}
        </span>
      )}
    </button>
  );
}
