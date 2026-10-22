"use client";

import { ShoppingCart } from "lucide-react";
import { cart, useCart, type CartLine } from "@/lib/cart-store";

export function QuickAdd({ line, label }: { line: Omit<CartLine, "qty">; label: string }) {
  // o que já está no carrinho conta: não dá para somar além do estoque
  const inCart = useCart().lines.find((l) => l.sku === line.sku)?.qty ?? 0;
  if (line.maxQty <= 0 || inCart >= line.maxQty)
    return (
      <button type="button" className="btn-outline w-full" disabled>
        {line.maxQty <= 0 ? "Esgotado" : "Máximo no carrinho"}
      </button>
    );
  return (
    <button type="button" className="btn-buy w-full" onClick={() => cart.add(line, 1)} aria-label={`Adicionar ${label} ao carrinho`}>
      <ShoppingCart className="size-5" aria-hidden="true" />
      Adicionar
    </button>
  );
}
