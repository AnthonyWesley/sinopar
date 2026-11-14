import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { asaasEnabled } from "@/lib/asaas";
import { onlyDigits } from "@/lib/documents";
import { formatPrice } from "@/lib/format";
import { orderButtons, STATUS_LABEL } from "@/lib/order-status";
import { getDb } from "@/lib/server/db";
import { getOrderById, getOrderEvents, type OrderEvent } from "@/lib/server/orders-repo";
import { requireUser } from "@/lib/session";
import { OrderActions } from "./order-actions";

export const metadata: Metadata = { title: "Pedido" };

// Dados do cliente só aparecem aqui, dentro do painel com sessão. Não registrar em log.

const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function decode(param: string): string | null {
  try {
    return decodeURIComponent(param);
  } catch {
    return null;
  }
}

function formatDocument(doc: string) {
  const d = onlyDigits(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

const PAYMENT_LABEL = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito" } as const;

function eventTitle(e: OrderEvent) {
  if (e.fromStatus == null) return `Pedido criado: ${STATUS_LABEL[e.toStatus]}`;
  if (e.fromStatus === e.toStatus) return "Anotação";
  return `${STATUS_LABEL[e.fromStatus]} → ${STATUS_LABEL[e.toStatus]}`;
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export default async function OrderPage(props: PageProps<"/admin/pedidos/[id]">) {
  await requireUser();
  const id = decode((await props.params).id);
  const order = id == null ? null : getOrderById(getDb(), id);
  if (!order) notFound();
  const events = getOrderEvents(getDb(), order.id);
  const buttons = orderButtons({ status: order.status, demo: order.payment.demo }, asaasEnabled);
  const { customer, shipping } = order;

  return (
    <div className="space-y-5">
      <Link
        href={`/admin/pedidos?etapa=${order.status}`}
        className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-5" aria-hidden="true" /> Pedidos
      </Link>
      <PageHeader
        title={<span className="break-all">Pedido {order.id}</span>}
        intro={
          <>
            {when(order.createdAt)} ·{" "}
            <span className={`font-semibold ${order.status === "pago_sem_estoque" ? "text-error" : "text-ink"}`}>
              {STATUS_LABEL[order.status]}
            </span>
            {order.payment.demo ? " · demonstração" : ""}
          </>
        }
      />

      {order.refundFlag ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-error bg-error-soft p-4 font-medium text-error">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>O Asaas informou estorno ou contestação deste pagamento.</p>
        </div>
      ) : null}

      {/* sempre montado (mesma posição na árvore), para o aviso de sucesso sobreviver ao refresh */}
      <Panel>
        <h2 className="text-lg font-semibold">Etapa</h2>
        <OrderActions orderId={order.id} status={order.status} buttons={buttons} trackingCode={order.trackingCode} />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-semibold">Cliente</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Nome">{customer.name}</Info>
            <Info label="CPF ou CNPJ">{formatDocument(customer.document)}</Info>
            <Info label="E-mail">
              <a href={`mailto:${customer.email}`} className="break-all underline underline-offset-4">
                {customer.email}
              </a>
            </Info>
            <Info label="Telefone">
              <a href={`tel:${onlyDigits(customer.phone)}`} className="underline underline-offset-4">
                {customer.phone}
              </a>
            </Info>
          </dl>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold">Entrega</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Forma">{shipping.label}</Info>
            <Info label="Prazo">{shipping.estimate || "—"}</Info>
            <div className="sm:col-span-2">
              <Info label="Endereço">{shipping.address ?? "Sem endereço (retirada)"}</Info>
            </div>
            <Info label="Código de rastreio">{order.trackingCode ? <span className="break-all">{order.trackingCode}</span> : "—"}</Info>
          </dl>
        </Panel>
      </div>

      <Panel>
        <h2 className="text-lg font-semibold">Itens</h2>
        <ul className="divide-y divide-line">
          {order.lines.map((l) => (
            <li key={l.sku} className="flex items-start justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block break-words font-medium">{l.name}</span>
                {l.variant ? <span className="block break-words text-sm">{l.variant}</span> : null}
                <span className="block break-all text-sm text-muted">
                  Código {l.sku} · {l.qty} × {formatPrice(l.unitPrice)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatPrice(l.qty * l.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-line pt-3">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Frete ({shipping.label})</dt>
            <dd className="tabular-nums">{shipping.price === 0 ? "Grátis" : formatPrice(shipping.price)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-lg font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted">
          Pagamento: {PAYMENT_LABEL[order.payment.method] ?? order.payment.method}
          {order.payment.asaasPaymentId ? ` · Asaas ${order.payment.asaasPaymentId}` : ""}
        </p>
        {order.payment.invoiceUrl ? (
          <a
            href={order.payment.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4"
          >
            Ver fatura no Asaas <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold">Histórico</h2>
        {events.length === 0 ? (
          <p className="text-muted">Nada registrado.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-line pl-4">
            {events.map((e, i) => (
              <li key={i} className="space-y-0.5">
                <p className="font-medium">{eventTitle(e)}</p>
                {e.note ? <p className="break-words text-sm">{e.note}</p> : null}
                <p className="text-sm text-muted">
                  {when(e.at)} · {e.userName ?? (e.userId != null ? "Usuário removido" : "Sistema")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
