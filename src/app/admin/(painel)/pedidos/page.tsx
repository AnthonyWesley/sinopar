import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { formatPrice } from "@/lib/format";
import { isOrderStatus, STATUS_LABEL, STATUS_TABS } from "@/lib/order-status";
import { getDb } from "@/lib/server/db";
import { countOrdersByStatus, listOrders, type OrderStatus } from "@/lib/server/orders-repo";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Pedidos" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const orderHref = (id: string) => `/admin/pedidos/${encodeURIComponent(id)}`;
const units = (n: number) => (n === 1 ? "1 item" : `${n} itens`);

export default async function OrdersPage(props: PageProps<"/admin/pedidos">) {
  await requireUser();
  const sp = await props.searchParams;
  const etapa = one(sp.etapa);
  // sem aba escolhida abre em Pago: é onde a equipe tem trabalho a fazer
  const current: OrderStatus = isOrderStatus(etapa) ? etapa : "pago";
  const db = getDb();
  const counts = countOrdersByStatus(db);
  const orders = listOrders(db, { status: current });

  return (
    <div className="space-y-5">
      <PageHeader title="Pedidos" intro="Pedidos da loja por etapa. Toque num pedido para ver os detalhes e mudar a etapa." />

      <nav aria-label="Etapas" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-1 sm:flex-wrap">
          {STATUS_TABS.map((s) => {
            const on = s === current;
            const alert = s === "pago_sem_estoque" && counts[s] > 0;
            return (
              <li key={s} className="shrink-0">
                <Link
                  href={`/admin/pedidos?etapa=${s}`}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 font-medium ${
                    on
                      ? "border-ink bg-ink text-white"
                      : alert
                        ? "border-error bg-error-soft text-error"
                        : "border-line-strong bg-white text-ink hover:bg-surface-2"
                  }`}
                >
                  {STATUS_LABEL[s]}
                  <span
                    className={`rounded-full px-2 text-sm tabular-nums ${on ? "bg-white/20" : alert ? "bg-white" : "bg-surface-2"}`}
                  >
                    {counts[s]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-muted">Nenhum pedido em {STATUS_LABEL[current].toLowerCase()}.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-sm text-muted">
                  <th className="px-4 py-2.5 font-medium">Pedido</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Entrega</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={orderHref(o.id)} className="font-medium underline-offset-4 hover:underline">
                        {o.id}
                      </Link>
                      {o.refundFlag ? <span className="ml-2 text-sm font-medium text-error">Estorno no Asaas</span> : null}
                      {o.payment.demo ? <span className="ml-2 text-sm text-muted">demonstração</span> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{when(o.createdAt)}</td>
                    <td className="px-4 py-3 break-words">{o.customer.name}</td>
                    <td className="px-4 py-3">{o.shipping.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(o.total)}
                      <span className="block text-sm text-muted">{units(o.lines.reduce((s, l) => s + l.qty, 0))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={orderHref(o.id)} className="block rounded-2xl border border-line bg-white p-4 shadow-sm">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{o.id}</span>
                      <span className="block break-words text-sm">{o.customer.name}</span>
                    </span>
                    <span className="shrink-0 text-right font-semibold tabular-nums">{formatPrice(o.total)}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {when(o.createdAt)} · {o.shipping.label} · {units(o.lines.reduce((s, l) => s + l.qty, 0))}
                  </span>
                  {o.refundFlag ? <span className="mt-1 block text-sm font-medium text-error">Estorno no Asaas</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
