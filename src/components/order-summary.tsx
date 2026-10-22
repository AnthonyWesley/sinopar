"use client";

import { cartTotals, type CartLine } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { pickQuote, quoteShipping } from "@/lib/shipping";
import { ShippingCalculator } from "./shipping-calculator";

/** frete + totais; o custo da entrega aparece já no carrinho, nunca só no fim */
export function OrderSummary({
  lines,
  shipping,
  cep,
  editable = true,
  children,
}: {
  lines: CartLine[];
  shipping: string;
  cep: string | null;
  editable?: boolean;
  children?: React.ReactNode;
}) {
  const { items, subtotal } = cartTotals(lines);
  const option = pickQuote(quoteShipping(cep, lines), shipping);
  const savings = lines.reduce((sum, l) => sum + (l.compareAt && l.compareAt > l.unitPrice ? (l.compareAt - l.unitPrice) * l.qty : 0), 0);

  return (
    <div className="rounded-2xl bg-surface-2 p-5">
      {editable && <ShippingCalculator items={lines} selectable name="entrega-resumo" />}
      <dl className={`space-y-2 ${editable ? "mt-5 border-t border-line-strong pt-4" : ""}`}>
        <div className="flex justify-between">
          <dt>
            Subtotal ({items} {items === 1 ? "item" : "itens"})
          </dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{option.label}</dt>
          <dd className="shrink-0 tabular-nums">{option.price ? formatPrice(option.price) : "Grátis"}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line-strong pt-3">
          <dt className="text-lg font-bold">Total</dt>
          <dd className="price text-2xl">{formatPrice(subtotal + option.price)}</dd>
        </div>
      </dl>
      {savings > 0 && <p className="mt-2 text-right text-sm font-semibold text-discount">Você economiza {formatPrice(savings)} com as ofertas</p>}
      {children}
    </div>
  );
}
