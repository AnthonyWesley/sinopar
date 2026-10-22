"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart-store";

/** pedido criado: esvazia o carrinho do navegador uma vez só (reabrir o link depois não apaga um carrinho novo) */
export function ClearCart({ order }: { order: string }) {
  useEffect(() => {
    const key = `sinopar-pedido-limpo-${order}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // sem armazenamento: limpa mesmo assim
    }
    cart.clear();
  }, [order]);
  return null;
}
