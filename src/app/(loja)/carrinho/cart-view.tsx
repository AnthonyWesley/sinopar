"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartLines } from "@/components/cart-lines";
import { OrderSummary } from "@/components/order-summary";
import { paymentMethods } from "@/lib/site";
import { useCart } from "@/lib/cart-store";

export function CartView() {
  const { lines, shipping, cep } = useCart();

  if (!lines.length)
    return (
      <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-surface-2 p-8">
        <ShoppingCart className="size-8 text-muted" aria-hidden="true" />
        <p className="text-lg font-semibold">Seu carrinho está vazio.</p>
        <Link href="/produtos" className="btn-dark">
          Ver produtos
        </Link>
      </div>
    );

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      <section aria-label="Itens do carrinho">
        <CartLines lines={lines} />
        <Link href="/produtos" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Continuar comprando
        </Link>
      </section>
      <aside className="lg:sticky lg:top-28" aria-label="Resumo do pedido">
        <OrderSummary lines={lines} shipping={shipping} cep={cep}>
          <Link href="/checkout" className="btn-buy mt-5 min-h-12 w-full text-lg">
            Finalizar compra
          </Link>
          <p className="mt-3 text-center text-sm text-muted">Sem cadastro. {paymentMethods.join(", ")}.</p>
        </OrderSummary>
      </aside>
    </div>
  );
}
