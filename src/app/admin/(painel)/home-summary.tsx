import Link from "next/link";
import { LOW_STOCK } from "@/lib/catalog";

// Conteúdo do Início do painel: o que espera ação nos pedidos e o que está acabando no estoque.
// Só apresentação (os números vêm da página), para testar sem banco.

export type HomeCounts = { pago: number; separado: number; pago_sem_estoque: number };
export type LowStockItem = { sku: string; name: string; label: string; available: number };

const CARDS: { key: keyof HomeCounts; title: string; help: string }[] = [
  { key: "pago", title: "Pagos para separar", help: "Separe os itens e marque como separado." },
  { key: "separado", title: "Separados para enviar", help: "Envie e informe o código de rastreio." },
  { key: "pago_sem_estoque", title: "Pago sem estoque", help: "Pagamento chegou sem estoque. Atenda ou cancele e estorne." },
];

export function HomeSummary({ counts, lowStock }: { counts: HomeCounts; lowStock: LowStockItem[] }) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="home-pedidos" className="space-y-3">
        <h2 id="home-pedidos" className="text-lg font-semibold">
          Pedidos esperando ação
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CARDS.map((c) => {
            const n = counts[c.key];
            const alert = c.key === "pago_sem_estoque" && n > 0;
            return (
              <Link
                key={c.key}
                href={`/admin/pedidos?etapa=${c.key}`}
                className={`block rounded-2xl border p-4 shadow-sm hover:shadow-md sm:p-5 ${
                  alert ? "border-error bg-error-soft text-error" : "border-line bg-white text-ink"
                }`}
              >
                <span className="block font-medium">{c.title}</span>
                <span className="mt-1 block text-3xl font-bold tabular-nums">{n}</span>
                <span className={`mt-1 block text-sm ${alert ? "" : "text-muted"}`}>{c.help}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="home-estoque" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="home-estoque" className="text-lg font-semibold">
            Estoque acabando <span className="font-normal text-muted">(até {LOW_STOCK} disponíveis)</span>
          </h2>
          <Link href="/admin/estoque?filtro=acabando" className="shrink-0 font-medium underline underline-offset-4">
            Ver no estoque
          </Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-5 text-muted">Nenhum código acabando.</p>
        ) : (
          <ul aria-label="Códigos acabando" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {lowStock.map((r) => (
              <li key={r.sku}>
                <Link
                  href={`/admin/estoque/${encodeURIComponent(r.sku)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-medium">
                      {r.name}
                      {r.label !== "Padrão" ? <span className="text-muted"> · {r.label}</span> : null}
                    </span>
                    <span className="block break-all text-sm text-muted">Código {r.sku}</span>
                  </span>
                  <span className="inline-flex min-w-9 shrink-0 justify-center rounded-full bg-brand px-2.5 py-0.5 font-semibold tabular-nums text-ink">
                    {r.available}
                    <span className="sr-only"> disponíveis</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
