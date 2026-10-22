"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { cart, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { QtyStepper } from "./cart-lines";
import { Price } from "./price";
import { StockStatus } from "./stock";

// Preço → variação → estoque → quantidade → comprar, nessa ordem e acima da dobra.
// Começa na primeira variação com estoque, então o botão já nasce válido.
export function PurchasePanel({ product }: { product: Product }) {
  const initial = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [sku, setSku] = useState(initial.sku);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.sku === sku) ?? initial;
  // o que já está no carrinho conta: não dá para somar além do estoque
  const inCart = useCart().lines.find((l) => l.sku === variant.sku)?.qty ?? 0;
  const remaining = Math.max(0, variant.stock - inCart);
  const available = remaining > 0;
  const buyLabel = variant.stock <= 0 ? "Esgotado" : available ? null : "Máximo no carrinho";
  const hasChoice = product.variantName !== null && product.variants.length > 1;

  function add() {
    if (!available) return;
    cart.add(
      {
        sku: variant.sku,
        slug: product.slug,
        name: product.name,
        variant: hasChoice ? `${product.variantName}: ${variant.label}` : null,
        image: product.image,
        unitPrice: variant.price,
        compareAt: variant.compareAt,
        maxQty: variant.stock,
      },
      Math.min(qty, remaining),
    );
    setQty(1);
  }

  return (
    <div>
      <div aria-live="polite">
        <Price price={variant.price} compareAt={variant.compareAt} size="lg" />
        <p className="mt-0.5 text-sm text-muted">
          {product.unit} · Pix, boleto ou cartão
        </p>
      </div>

      {hasChoice && (
        <fieldset className="mt-5">
          <legend className="mb-2 font-semibold">
            {product.variantName}: <span className="font-normal">{variant.label}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const out = v.stock <= 0;
              const checked = v.sku === sku;
              return (
                <label
                  key={v.sku}
                  className={`relative flex min-h-12 cursor-pointer items-center rounded-lg px-4 font-semibold ring-inset transition-[box-shadow,background-color] duration-100 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                    checked ? "bg-black text-white ring-2 ring-black" : "bg-white ring-1 ring-line-strong hover:ring-ink"
                  } ${out ? "cursor-not-allowed text-muted line-through decoration-1" : ""}`}
                >
                  <input
                    type="radio"
                    name="variacao"
                    value={v.sku}
                    checked={checked}
                    disabled={out}
                    onChange={() => {
                      setSku(v.sku);
                      setQty(1);
                    }}
                    className="sr-only"
                  />
                  {v.label}
                  {out && <span className="sr-only"> (esgotado)</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-4">
        <StockStatus stock={variant.stock} />
        {inCart > 0 && (
          <p className="mt-1 text-sm text-muted">
            Você já tem {inCart} no carrinho{available ? "" : ", todo o estoque desta opção"}.
          </p>
        )}
        <p className="mt-1 text-sm text-muted">Código: {variant.sku}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {available && <QtyStepper value={Math.min(qty, remaining)} max={remaining} onChange={setQty} label="Quantidade" />}
        <button type="button" onClick={add} disabled={!available} className="btn-buy min-h-12 flex-1 text-lg whitespace-nowrap">
          <ShoppingCart className="size-6" aria-hidden="true" />
          {buyLabel ?? "Adicionar ao carrinho"}
        </button>
      </div>

      {/* barra fixa no celular: o botão de compra nunca sai do alcance do polegar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted">{hasChoice ? variant.label : product.unit}</p>
            <p className={`price text-xl ${variant.compareAt ? "text-discount" : ""}`}>{formatPrice(variant.price)}</p>
          </div>
          <button type="button" onClick={add} disabled={!available} className="btn-buy min-h-12 px-5">
            <ShoppingCart className="size-5" aria-hidden="true" />
            {buyLabel ?? "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
