"use client";

import { CircleCheck, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cart, cartTotals, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { CartLines } from "./cart-lines";

// Gaveta do carrinho: abre ao adicionar (confirmação) e pelo botão do cabeçalho.
// <dialog> nativo cuida do foco, do Esc e do fundo inerte.
export function CartDrawer() {
  const { lines, drawerOpen, lastAdded } = useCart();
  const dialog = useRef<HTMLDialogElement>(null);
  const { items, subtotal } = cartTotals(lines);
  const added = lines.find((l) => l.sku === lastAdded);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);

  return (
    <dialog
      ref={dialog}
      onClose={() => cart.close()}
      onClick={(e) => e.target === e.currentTarget && cart.close()}
      aria-labelledby="carrinho-titulo"
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md bg-white p-0 backdrop:bg-black/50 motion-safe:animate-[drawer-in_240ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-[fade-in_150ms]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="carrinho-titulo" className="font-wide text-xl">
            Carrinho <span className="font-sans text-base font-medium text-muted tabular-nums">({items})</span>
          </h2>
          <button type="button" onClick={() => cart.close()} className="grid size-11 place-items-center rounded-lg hover:bg-surface-2">
            <X className="size-6" aria-hidden="true" />
            <span className="sr-only">Fechar carrinho</span>
          </button>
        </div>

        {added && (
          <p role="status" className="flex items-center gap-2 bg-stock-ok-soft px-5 py-3 font-semibold text-stock-ok motion-safe:animate-[fade-in_160ms]">
            <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
            Adicionado: {added.name}
            {added.variant ? ` (${added.variant})` : ""}
          </p>
        )}

        {lines.length ? (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines lines={lines} compact onNavigate={() => cart.close()} />
            </div>
            <div className="border-t border-line px-5 py-4">
              <dl className="space-y-1.5">
                <div className="flex justify-between text-lg">
                  <dt className="font-semibold">Subtotal</dt>
                  <dd className="price">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4 text-sm text-muted">
                  <dt>Entrega</dt>
                  <dd className="text-right">Retirada grátis em Sinop ou entrega para todo o Brasil, calculada pelo CEP no carrinho</dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-2">
                <Link href="/checkout" onClick={() => cart.close()} className="btn-buy min-h-12 w-full text-lg">
                  Finalizar compra
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/carrinho" onClick={() => cart.close()} className="btn-outline">
                    Ver carrinho
                  </Link>
                  <button type="button" onClick={() => cart.close()} className="btn-outline">
                    Continuar comprando
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingCart className="size-10 text-muted" aria-hidden="true" />
            <p className="font-semibold">Seu carrinho está vazio.</p>
            <Link href="/produtos" onClick={() => cart.close()} className="btn-dark">
              Ver produtos
            </Link>
          </div>
        )}
      </div>
    </dialog>
  );
}
