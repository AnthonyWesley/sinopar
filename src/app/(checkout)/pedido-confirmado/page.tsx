import { CircleCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Pedido recebido", robots: { index: false } };

const paymentLabels = { PIX: "Pix", BOLETO: "Boleto", CREDIT_CARD: "Cartão de crédito" };

export default function OrderPlacedPage(props: PageProps<"/pedido-confirmado">) {
  return (
    <div className="container-site max-w-3xl">
      <Suspense fallback={<div className="mt-6 h-96 rounded-2xl bg-surface-2" />}>
        <OrderDetails searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ searchParams }: { searchParams: PageProps<"/pedido-confirmado">["searchParams"] }) {
  const id = (await searchParams).pedido;
  const order = typeof id === "string" ? getOrder(id) : null;

  if (!order)
    return (
      <div className="mt-6 rounded-2xl bg-surface-2 p-8">
        <h1 className="font-wide text-2xl">Pedido não encontrado</h1>
        <p className="mt-2 text-muted">Se você acabou de comprar e não vê o pedido aqui, fale com a loja informando seu nome e CPF/CNPJ.</p>
        <Link href="/contato" className="btn-dark mt-5">
          Falar com a loja
        </Link>
      </div>
    );

  return (
    <>
      <ClearCart order={order.id} />
      <div className="mt-6 rounded-2xl bg-stock-ok-soft p-6 sm:p-8">
        <CircleCheck className="size-10 text-stock-ok" aria-hidden="true" />
        <h1 className="font-wide mt-3 text-[length:var(--text-title)] leading-tight">Pedido {order.id} recebido</h1>
        <p className="mt-2 text-lg">
          Anote o número do pedido. A loja entra em contato pelo celular ou pelo e-mail <strong>{order.customer.email}</strong> se precisar.
        </p>
      </div>

      <section className="mt-6 rounded-2xl p-6 ring-1 ring-line" aria-labelledby="pagamento">
        <h2 id="pagamento" className="text-lg font-bold">
          Pagamento: {paymentLabels[order.payment.method]} · <span className="price">{formatPrice(order.total)}</span>
        </h2>
        {order.payment.invoiceUrl ? (
          <>
            <p className="mt-2 text-muted">O pedido é separado assim que o pagamento for confirmado.</p>
            <a href={order.payment.invoiceUrl} className="btn-buy mt-4 min-h-12 text-lg" target="_blank" rel="noopener noreferrer">
              Pagar agora
              <ExternalLink className="size-5" aria-hidden="true" />
            </a>
          </>
        ) : (
          <p className="mt-2 rounded-lg bg-brand-soft p-3">
            <strong>Modo demonstração:</strong> nenhuma cobrança foi gerada. Com a conta Asaas configurada, aqui aparece o botão para pagar (Pix, boleto ou cartão).
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl p-6 ring-1 ring-line" aria-labelledby="resumo">
        <h2 id="resumo" className="text-lg font-bold">
          Resumo
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {order.lines.map((l) => (
            <li key={l.sku} className="flex justify-between gap-4 py-2.5">
              <span>
                {l.qty} × {l.name}
                {l.variant && <span className="block text-sm text-muted">{l.variant}</span>}
              </span>
              <span className="tabular-nums">{formatPrice(l.qty * l.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-line pt-3">
          <div className="flex justify-between">
            <dt>{order.shipping.label}</dt>
            <dd className="tabular-nums">{order.shipping.price ? formatPrice(order.shipping.price) : "Grátis"}</dd>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <dt>Total</dt>
            <dd className="price">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-muted">
          {order.shipping.address ? `Entrega em: ${order.shipping.address}. ` : "Retirada na loja. "}
          {order.shipping.estimate}.
        </p>
      </section>

      <Link href="/produtos" className="btn-outline mt-6">
        Continuar comprando
      </Link>
    </>
  );
}
