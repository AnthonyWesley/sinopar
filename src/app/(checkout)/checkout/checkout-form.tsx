"use client";

import { CircleAlert, Landmark, Loader2, QrCode, CreditCard, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { OrderSummary } from "@/components/order-summary";
import { QuoteList } from "@/components/shipping-calculator";
import { placeOrder, type CheckoutState } from "@/lib/actions/checkout";
import { cart, cartTotals, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { formatCep, isValidCep, pickQuote, quoteShipping, UFS } from "@/lib/shipping";

const initial: CheckoutState = { errors: {}, values: {} };

const payments = [
  { id: "PIX", label: "Pix", text: "Aprovação na hora. O QR Code aparece na próxima tela.", icon: QrCode },
  { id: "BOLETO", label: "Boleto", text: "Compensação em até 3 dias úteis.", icon: Landmark },
  { id: "CREDIT_CARD", label: "Cartão de crédito", text: "Você digita o cartão na página segura do Asaas.", icon: CreditCard },
];

const labels: Record<string, string> = {
  nome: "Nome completo",
  email: "E-mail",
  celular: "Celular (WhatsApp)",
  documento: "CPF ou CNPJ",
  cep: "CEP",
  rua: "Rua",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "Estado (UF)",
  entrega: "Entrega",
  pagamento: "Forma de pagamento",
};

export function CheckoutForm() {
  const { lines, shipping, cep } = useCart();
  const [cepDraft, setCepDraft] = useState<string | null>(null);
  const [state, action, pending] = useActionState(placeOrder, initial);
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorList = Object.entries(state.errors);
  const { subtotal } = cartTotals(lines);
  // as opções seguem o CEP que está no campo (é ele que vai para o servidor): enquanto o CEP
  // estiver incompleto, só a retirada aparece, e não as opções do CEP anterior
  const quotes = quoteShipping(cepDraft === null ? cep : null, lines);
  const selected = pickQuote(quotes, shipping);
  const total = subtotal + selected.price;

  // depois de um envio com erro, o foco vai para o resumo de erros (leitor de tela anuncia)
  useEffect(() => {
    if (state.cartFix) cart.reconcile(state.cartFix);
    if (errorList.length || state.message) summaryRef.current?.focus();
  }, [state, errorList.length]);

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

  const v = (name: string) => state.values[name] ?? "";
  const field = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string } = {}) => {
    const { label, hint, ...rest } = props;
    const error = state.errors[name];
    const describedBy = [error && `${name}-erro`, hint && `${name}-dica`].filter(Boolean).join(" ") || undefined;
    return (
      <div>
        <label htmlFor={name} className="label">
          {label ?? labels[name]}
          {rest.required === false && <span className="font-normal text-muted"> (opcional)</span>}
        </label>
        <input id={name} name={name} defaultValue={v(name)} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className="field" required {...rest} />
        {hint && !error && (
          <p id={`${name}-dica`} className="mt-1 text-sm text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${name}-erro`} className="mt-1.5 flex gap-1.5 text-sm font-medium text-error">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  };

  const cepValue = cepDraft ?? formatCep(cep ?? "");
  const cepError = state.errors.cep;

  return (
    <form action={action} noValidate className="mt-5 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      <input type="hidden" name="itens" value={JSON.stringify(lines.map((l) => ({ sku: l.sku, qty: l.qty, name: l.name, price: l.unitPrice })))} />

      <div className="space-y-8">
        <ol className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-muted" aria-label="Etapas">
          {["Seus dados", "Entrega", "Pagamento"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-black text-white tabular-nums">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        {(errorList.length > 0 || state.message) && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl bg-error-soft p-4 text-error ring-1 ring-error/30 focus:outline-none">
            <p className="flex items-center gap-2 font-bold">
              <CircleAlert className="size-5" aria-hidden="true" />
              {state.message ?? "Confira os campos abaixo:"}
            </p>
            {errorList.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {errorList.map(([name, msg]) => (
                  <li key={name}>
                    <a href={`#${name}`} className="underline underline-offset-4">
                      {labels[name] ?? name}
                    </a>
                    : {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <section aria-labelledby="etapa-dados">
          <h2 id="etapa-dados" className="font-wide text-xl">
            1. Seus dados
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("nome", { autoComplete: "name" })}</div>
            {field("email", { type: "email", autoComplete: "email", inputMode: "email" })}
            {field("celular", { type: "tel", autoComplete: "tel-national", inputMode: "tel", placeholder: "(66) 99999-0000" })}
            {field("documento", { inputMode: "numeric", hint: "Obrigatório para emitir a cobrança e a nota fiscal." })}
          </div>
        </section>

        <section aria-labelledby="etapa-entrega">
          <h2 id="etapa-entrega" className="font-wide text-xl">
            2. Entrega
          </h2>
          <div className="mt-4 max-w-xs">
            <label htmlFor="cep" className="label">
              CEP de entrega
            </label>
            <input
              id="cep"
              name="cep"
              value={cepValue}
              onChange={(e) => {
                const next = formatCep(e.target.value);
                // com 8 números o frete é recalculado na hora
                if (isValidCep(next)) {
                  cart.setCep(next.replace(/\D/g, ""));
                  setCepDraft(null);
                } else setCepDraft(next);
              }}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              aria-invalid={cepError ? true : undefined}
              aria-describedby={cepError ? "cep-erro" : "cep-dica"}
              className="field"
            />
            {cepError ? (
              <p id="cep-erro" className="mt-1.5 flex gap-1.5 text-sm font-medium text-error">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {cepError}
              </p>
            ) : (
              <p id="cep-dica" className="mt-1 text-sm text-muted">
                {cep && cepDraft === null ? "Escolha como quer receber:" : "Informe o CEP para ver as entregas. Sem CEP, só a retirada na loja."}
              </p>
            )}
          </div>
          <fieldset id="entrega" className="mt-2">
            <legend className="sr-only">Como quer receber</legend>
            <QuoteList quotes={quotes} selectable selected={shipping} name="entrega" />
          </fieldset>
          {selected.needsAddress ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-6 motion-safe:animate-[fade-in_180ms]">
              <div className="sm:col-span-4">{field("rua", { autoComplete: "address-line1" })}</div>
              <div className="sm:col-span-2">{field("numero", { autoComplete: "off" })}</div>
              <div className="sm:col-span-3">{field("complemento", { label: "Complemento", required: false, autoComplete: "address-line2" })}</div>
              <div className="sm:col-span-3">{field("bairro", { autoComplete: "address-level3" })}</div>
              <div className="sm:col-span-4">{field("cidade", { autoComplete: "address-level2" })}</div>
              <div className="sm:col-span-2">
                <label htmlFor="uf" className="label">
                  {labels.uf}
                </label>
                <select id="uf" name="uf" defaultValue={v("uf")} autoComplete="address-level1" aria-invalid={state.errors.uf ? true : undefined} aria-describedby={state.errors.uf ? "uf-erro" : undefined} className="field">
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf}>{uf}</option>
                  ))}
                </select>
                {state.errors.uf && (
                  <p id="uf-erro" className="mt-1.5 text-sm font-medium text-error">
                    {state.errors.uf}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-muted">A loja avisa pelo celular informado quando o pedido estiver separado.</p>
          )}
        </section>

        <section aria-labelledby="etapa-pagamento">
          <h2 id="etapa-pagamento" className="font-wide text-xl">
            3. Pagamento
          </h2>
          <fieldset className="mt-4" aria-describedby={state.errors.pagamento ? "pagamento-erro" : undefined}>
            <legend className="sr-only">Forma de pagamento</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {payments.map((p) => (
                <label key={p.id} className="flex cursor-pointer gap-3 rounded-xl p-4 ring-1 ring-line-strong ring-inset has-[:checked]:ring-2 has-[:checked]:ring-black">
                  <input type="radio" name="pagamento" value={p.id} id={p.id === "PIX" ? "pagamento" : undefined} defaultChecked={(v("pagamento") || "PIX") === p.id} className="mt-1 size-5 accent-black" />
                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      <p.icon className="size-5" aria-hidden="true" />
                      {p.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{p.text}</span>
                  </span>
                </label>
              ))}
            </div>
            {state.errors.pagamento && (
              <p id="pagamento-erro" className="mt-1.5 text-sm font-medium text-error">
                {state.errors.pagamento}
              </p>
            )}
          </fieldset>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6" aria-label="Resumo do pedido">
        <OrderSummary lines={lines} shipping={shipping} cep={cep} editable={false}>
          <ul className="mt-4 space-y-3 border-t border-line-strong pt-4">
            {lines.map((l) => (
              <li key={l.sku} className="flex gap-3 text-sm">
                <Image src={l.image} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md bg-white object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-medium">{l.name}</span>
                  <span className="text-muted">
                    {l.variant ? `${l.variant} · ` : ""}
                    {l.qty} × {formatPrice(l.unitPrice)}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(l.qty * l.unitPrice)}</span>
              </li>
            ))}
          </ul>
          <button type="submit" disabled={pending} className="btn-buy mt-5 min-h-12 w-full text-lg">
            {pending ? (
              <>
                <Loader2 className="size-5 motion-safe:animate-spin" aria-hidden="true" />
                Confirmando...
              </>
            ) : (
              <>Confirmar pedido · {formatPrice(total)}</>
            )}
          </button>
          <p className="mt-3 text-center text-sm text-muted">Ao confirmar, você vai para o pagamento. Nada é cobrado antes disso.</p>
        </OrderSummary>
      </aside>
    </form>
  );
}
