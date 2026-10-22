"use client";

import { MapPin, Store, Truck } from "lucide-react";
import { useId, useState } from "react";
import { cart, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { formatCep, isValidCep, quoteShipping, type ShippingQuote } from "@/lib/shipping";

/**
 * Cálculo de frete por CEP. O CEP fica salvo no carrinho, então quem calculou na página do
 * produto já chega ao carrinho e ao checkout com o frete calculado.
 * selectable = escolhe a opção (carrinho); senão só informa (produto, serviços).
 */
export function ShippingCalculator({ items, selectable = false, name = "frete" }: { items: { qty: number }[]; selectable?: boolean; name?: string }) {
  const id = useId();
  const { cep, shipping } = useCart();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const value = draft ?? formatCep(cep ?? "");
  const quotes = quoteShipping(cep, items);

  function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCep(value)) {
      setError("Informe um CEP com 8 números.");
      return;
    }
    setError("");
    setDraft(null);
    cart.setCep(value.replace(/\D/g, ""));
  }

  return (
    <div>
      <form onSubmit={calculate} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-cep`} className="label">
            Calcular frete
          </label>
          <input
            id={`${id}-cep`}
            value={value}
            onChange={(e) => setDraft(formatCep(e.target.value))}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-erro` : undefined}
            className="field"
          />
        </div>
        <button type="submit" className="btn-dark min-h-12">
          Calcular
        </button>
      </form>
      {error && (
        <p id={`${id}-erro`} className="mt-1.5 text-sm font-medium text-error">
          {error}
        </p>
      )}
      <a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center text-sm text-muted underline underline-offset-4">
        Não sei meu CEP
      </a>

      <QuoteList quotes={quotes} selectable={selectable} selected={shipping} name={name} />
      {cep && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
          <MapPin className="size-4" aria-hidden="true" />
          Frete para o CEP {formatCep(cep)}
        </p>
      )}
    </div>
  );
}

export function QuoteList({ quotes, selectable, selected, name }: { quotes: ShippingQuote[]; selectable: boolean; selected: string; name: string }) {
  const current = quotes.some((q) => q.id === selected) ? selected : quotes[0].id;
  return (
    <ul className="mt-3 space-y-2" aria-label="Opções de entrega">
      {quotes.map((q) => {
        const Icon = q.needsAddress ? Truck : Store;
        const body = (
          <>
            <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              <span className="flex justify-between gap-3 font-semibold">
                {q.label}
                <span className="tabular-nums">{q.price ? formatPrice(q.price) : "Grátis"}</span>
              </span>
              <span className="block text-sm text-muted">{q.estimate}</span>
            </span>
          </>
        );
        return (
          <li key={q.id} className="motion-safe:animate-[fade-in_160ms]">
            {selectable ? (
              <label className={`flex cursor-pointer gap-3 rounded-lg bg-white p-3 ring-inset ${q.id === current ? "ring-2 ring-black" : "ring-1 ring-line"}`}>
                <input type="radio" name={name} value={q.id} checked={q.id === current} onChange={() => cart.setShipping(q.id)} className="mt-1 size-5 accent-black" />
                {body}
              </label>
            ) : (
              <div className="flex gap-3 rounded-lg p-3 ring-1 ring-line">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
