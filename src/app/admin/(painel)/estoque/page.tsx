import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BTN_SECONDARY } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { LOW_STOCK } from "@/lib/catalog";
import { getDb } from "@/lib/server/db";
import { listStock, type StockFilter } from "@/lib/server/stock-repo";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Estoque" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const FILTERS: { value: "" | StockFilter; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "acabando", label: `Acabando (até ${LOW_STOCK})` },
  { value: "esgotado", label: "Esgotado" },
];

const skuHref = (sku: string) => `/admin/estoque/${encodeURIComponent(sku)}`;
const tab = (q: string, filter: string) => {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (filter) p.set("filtro", filter);
  const s = p.toString();
  return s ? `/admin/estoque?${s}` : "/admin/estoque";
};

function Available({ n }: { n: number }) {
  const tone = n <= 0 ? "bg-error-soft text-error" : n <= LOW_STOCK ? "bg-brand text-ink" : "bg-surface-2 text-ink";
  return (
    <span className={`inline-flex min-w-9 justify-center rounded-full px-2.5 py-0.5 font-semibold tabular-nums ${tone}`}>
      {n}
      {n <= 0 ? <span className="sr-only"> (esgotado)</span> : n <= LOW_STOCK ? <span className="sr-only"> (acabando)</span> : null}
    </span>
  );
}

export default async function StockPage(props: PageProps<"/admin/estoque">) {
  await requireUser();
  const sp = await props.searchParams;
  const q = one(sp.q).trim();
  const filter = one(sp.filtro) === "acabando" || one(sp.filtro) === "esgotado" ? (one(sp.filtro) as StockFilter) : undefined;
  const rows = listStock(getDb(), { q, filter });

  return (
    <div className="space-y-5">
      <PageHeader title="Estoque" intro="Quantidades por código. Toque num item para dar entrada, ajustar e ver o histórico." />

      <form role="search" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        {filter ? <input type="hidden" name="filtro" value={filter} /> : null}
        <label className="block min-w-0 flex-1 space-y-1.5">
          <span className="block font-medium">Buscar</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Nome ou código"
            className="block min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 text-base"
          />
        </label>
        <button type="submit" className={BTN_SECONDARY}>
          <Search className="size-5" aria-hidden="true" /> Buscar
        </button>
      </form>

      <nav aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = (filter ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={tab(q, f.value)}
              aria-current={on ? "true" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 font-medium ${
                on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:bg-surface-2"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <p className="text-sm text-muted" aria-live="polite">
        {rows.length === 1 ? "1 código" : `${rows.length} códigos`}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-muted">Nenhum item encontrado.</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white shadow-sm md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-sm text-muted">
                  <th className="px-4 py-2.5 font-medium">Produto</th>
                  <th className="px-4 py-2.5 font-medium">Código</th>
                  <th className="px-4 py-2.5 text-right font-medium">Estoque</th>
                  <th className="px-4 py-2.5 text-right font-medium">Reservado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Disponível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.sku} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={skuHref(r.sku)} className="font-medium underline-offset-4 hover:underline">
                        {r.name}
                      </Link>
                      {r.label !== "Padrão" ? <span className="text-muted"> · {r.label}</span> : null}
                      {r.status !== "ativo" ? <span className="text-muted"> (pausado)</span> : null}
                    </td>
                    <td className="px-4 py-3 break-all">{r.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.reserved}</td>
                    <td className="px-4 py-3 text-right">
                      <Available n={r.available} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.sku}>
                <Link href={skuHref(r.sku)} className="block rounded-2xl border border-line bg-white p-4 shadow-sm">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block break-words font-medium">
                        {r.name}
                        {r.label !== "Padrão" ? <span className="text-muted"> · {r.label}</span> : null}
                      </span>
                      <span className="block break-all text-sm text-muted">
                        Código {r.sku}
                        {r.status !== "ativo" ? " · pausado" : ""}
                      </span>
                    </span>
                    <Available n={r.available} />
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Estoque {r.stock} · Reservado {r.reserved} · Disponível {r.available}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
