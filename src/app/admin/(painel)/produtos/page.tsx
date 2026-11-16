import { PackageX, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { FlashToast } from "@/components/admin/flash-toast";
import { categories } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { groupByCategory } from "@/lib/group-by-category";
import { listAdminProducts, type Situation } from "@/lib/server/catalog-repo";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/session";
import { SITUATION_LABEL, SituationBadge } from "./situation-badge";

export const metadata: Metadata = { title: "Produtos" };

const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
const SITUATIONS = Object.keys(SITUATION_LABEL) as Situation[];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Lista do painel: todos os produtos (pausados também), com busca por nome ou código,
// departamento e situação. O filtro é um formulário GET: o endereço guarda a busca.
export default async function ProductsPage(props: PageProps<"/admin/produtos">) {
  await requireUser();
  const sp = await props.searchParams;
  const q = one(sp.q).trim();
  const category = categoryName.has(one(sp.departamento)) ? one(sp.departamento) : "";
  const situation = (SITUATIONS as string[]).includes(one(sp.situacao)) ? (one(sp.situacao) as Situation) : undefined;
  const list = listAdminProducts(getDb(), { q, category, situation });
  const filtered = Boolean(q || category || situation);
  // agrupada por departamento, na ordem da loja, para não virar uma coluna só de 60+ produtos
  const groups = groupByCategory(list, categories);
  // sem peso e medidas o frete da variação não pode ser calculado
  const noPack = (p: (typeof list)[number]) => p.variants.some((v) => !v.pack);
  const missingPack = list.filter(noPack).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produtos"
        intro="Cadastro, preços e fotos. O estoque entra pela tela Estoque."
        action={
          <Link href="/admin/produtos/novo" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
            <Plus className="size-5" aria-hidden="true" /> Novo produto
          </Link>
        }
      />

      <form role="search" className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="block min-w-0 space-y-1.5">
          <span className="block font-medium">Buscar</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Nome ou código"
            className="block min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 text-base"
          />
        </label>
        <label className="block min-w-0 space-y-1.5">
          <span className="block font-medium">Departamento</span>
          <select
            name="departamento"
            defaultValue={category}
            className="block min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 text-base"
          >
            <option value="">Todos</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 space-y-1.5">
          <span className="block font-medium">Situação</span>
          <select
            name="situacao"
            defaultValue={situation ?? ""}
            className="block min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 text-base"
          >
            <option value="">Todas</option>
            {SITUATIONS.map((s) => (
              <option key={s} value={s}>
                {SITUATION_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={BTN_SECONDARY}>
          <Search className="size-5" aria-hidden="true" /> Filtrar
        </button>
      </form>

      <p className="text-sm text-muted" aria-live="polite">
        {list.length === 1 ? "1 produto" : `${list.length} produtos`}
        {missingPack ? ` · ${missingPack === 1 ? "1 sem" : `${missingPack} sem`} peso e medidas para o frete` : null}
        {filtered ? (
          <>
            {" "}
            ·{" "}
            <Link href="/admin/produtos" className="font-medium text-ink underline underline-offset-4">
              Limpar filtros
            </Link>
          </>
        ) : null}
      </p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-muted">Nenhum produto encontrado.</p>
      ) : (
        <>
          {groups.length > 1 ? (
            <nav aria-label="Ir para o departamento" className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <a
                  key={g.slug}
                  href={`#dep-${g.slug}`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm font-medium hover:bg-surface-2"
                >
                  {g.name} <span className="tabular-nums text-muted">{g.items.length}</span>
                </a>
              ))}
            </nav>
          ) : null}
          {groups.map((g) => (
            <section key={g.slug} id={`dep-${g.slug}`} aria-labelledby={`dep-${g.slug}-titulo`} className="scroll-mt-20 space-y-2">
              <h2 id={`dep-${g.slug}-titulo`} className="flex items-baseline gap-2 font-semibold">
                {g.name} <span className="text-sm font-normal text-muted">{g.items.length === 1 ? "1 produto" : `${g.items.length} produtos`}</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                {g.items.map((p) => {
                  const prices = p.variants.map((v) => v.price);
                  const min = prices.length ? Math.min(...prices) : 0;
                  const available = p.variants.reduce((n, v) => n + v.available, 0);
                  return (
                    <li key={p.id}>
                      <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 sm:px-5">
                        <Image src={p.image} alt="" width={56} height={56} className="size-14 shrink-0 rounded-lg bg-surface-2 object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words font-medium">{p.name}</span>
                          <span className="block text-sm text-muted">
                            {p.variants.length === 1 ? `cód. ${p.variants[0].sku}` : `${p.variants.length} variações`}
                          </span>
                          <span className="block text-sm">
                            {prices.length > 1 ? "a partir de " : ""}
                            {formatPrice(min)} · {available} disponível{available === 1 ? "" : "is"}
                          </span>
                          {noPack(p) ? (
                            <span className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
                              <PackageX className="size-4 shrink-0" aria-hidden="true" /> Falta peso e medidas
                            </span>
                          ) : null}
                        </span>
                        <SituationBadge situation={p.situation} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
      <FlashToast param="excluido" message={one(sp.excluido) ? "Produto excluído." : undefined} />
    </div>
  );
}
