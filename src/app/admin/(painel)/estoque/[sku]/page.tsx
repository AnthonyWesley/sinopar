import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { getDb } from "@/lib/server/db";
import { getStockRow, KIND_LABEL, listMovements, movementEffect, type MovementKind } from "@/lib/server/stock-repo";
import { requireUser } from "@/lib/session";
import { StockForms } from "./stock-forms";

export const metadata: Metadata = { title: "Estoque do produto" };

const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const signed = (n: number) => (n === 0 ? "—" : n > 0 ? `+${n}` : String(n));

function decode(param: string): string | null {
  try {
    return decodeURIComponent(param);
  } catch {
    return null;
  }
}

export default async function StockSkuPage(props: PageProps<"/admin/estoque/[sku]">) {
  await requireUser();
  const sku = decode((await props.params).sku);
  const row = sku == null ? null : getStockRow(getDb(), sku);
  if (!row) notFound();
  const movements = listMovements(getDb(), row.sku);

  return (
    <div className="space-y-5">
      <Link href="/admin/estoque" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline-offset-4 hover:underline">
        <ArrowLeft className="size-5" aria-hidden="true" /> Estoque
      </Link>
      <PageHeader
        title={<span className="break-words">{row.name}</span>}
        intro={
          <span className="break-words">
            Código {row.sku}
            {row.label !== "Padrão" ? ` · ${row.label}` : ""}
          </span>
        }
      />

      <dl className="grid grid-cols-3 gap-3">
        {[
          ["Estoque", row.stock],
          ["Reservado", row.reserved],
          ["Disponível", row.available],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-3 text-center shadow-sm sm:p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <StockForms sku={row.sku} stock={row.stock} reserved={row.reserved} />

      <Panel>
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        {movements.length === 0 ? (
          <p className="text-muted">Nenhuma movimentação ainda.</p>
        ) : (
          <>
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 text-right font-medium">Estoque</th>
                  <th className="py-2 pr-3 text-right font-medium">Reservado</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 font-medium">Quem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{when(m.at)}</td>
                    <td className="py-2 pr-3">{KIND_LABEL[m.kind as MovementKind] ?? m.kind}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{signed(movementEffect(m.kind, m.qty).stock)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{signed(movementEffect(m.kind, m.qty).reserved)}</td>
                    <td className="py-2 pr-3 break-words">{m.reason ?? "—"}</td>
                    <td className="py-2 pr-3">{m.orderId ? <OrderLink id={m.orderId} /> : "—"}</td>
                    <td className="py-2">{m.userName ?? "Sistema"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {movements.map((m) => (
                <li key={m.id} className="space-y-0.5 py-3">
                  <p className="font-medium">{KIND_LABEL[m.kind as MovementKind] ?? m.kind}</p>
                  <p className="text-sm tabular-nums">
                    Estoque <b>{signed(movementEffect(m.kind, m.qty).stock)}</b> · Reservado <b>{signed(movementEffect(m.kind, m.qty).reserved)}</b>
                  </p>
                  <p className="text-sm text-muted">
                    {when(m.at)} · {m.userName ?? "Sistema"}
                  </p>
                  {m.reason ? <p className="break-words text-sm">{m.reason}</p> : null}
                  {m.orderId ? (
                    <p className="text-sm">
                      Pedido <OrderLink id={m.orderId} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}

function OrderLink({ id }: { id: string }) {
  return (
    <Link href={`/admin/pedidos/${encodeURIComponent(id)}`} className="font-medium underline underline-offset-4">
      {id}
    </Link>
  );
}
