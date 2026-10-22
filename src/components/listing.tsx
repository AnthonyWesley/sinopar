import { ArrowDownUp, SearchX, X } from "lucide-react";
import Link from "next/link";
import { categories, segments } from "@/lib/catalog";
import { applyFilters, listingHref, parseFilters, sortOptions, type ListingFilters } from "@/lib/listing";
import { FilterDrawer } from "./filter-drawer";
import { ProductCard } from "./product-card";

type RawParams = Record<string, string | string[] | undefined>;

// Listagem renderizada no servidor. Filtros são um formulário GET: funcionam sem JavaScript,
// a URL é compartilhável e o botão voltar do navegador desfaz o filtro.
export async function Listing({ searchParams, base, category = null }: { searchParams: Promise<RawParams>; base: string; category?: string | null }) {
  const filters = parseFilters(await searchParams, category);
  const results = applyFilters(filters);
  const chips = activeChips(filters, base, category);

  return (
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Filtros">
        <div className="sticky top-28">
          <FilterForm filters={filters} base={base} fixedCategory={category} idPrefix="d" />
        </div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="font-semibold">
            {results.length} {results.length === 1 ? "produto" : "produtos"}
            {filters.q && <span className="font-normal text-muted"> para “{filters.q}”</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDrawer count={chips.length}>
              <FilterForm filters={filters} base={base} fixedCategory={category} idPrefix="m" />
            </FilterDrawer>
            <SortForm filters={filters} base={base} />
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Filtros ativos">
            {chips.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black px-3.5 text-sm font-semibold text-white hover:bg-ink-soft">
                  {c.label}
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">(remover filtro)</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={base} className="inline-flex min-h-10 items-center px-2 text-sm font-semibold underline underline-offset-4">
                Limpar tudo
              </Link>
            </li>
          </ul>
        )}

        {results.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 lg:gap-4">
            {results.map((p, i) => (
              <li key={p.slug} className="flex [&>article]:w-full">
                <ProductCard product={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyResults filters={filters} base={base} />
        )}
      </div>
    </div>
  );
}

function activeChips(f: ListingFilters, base: string, fixedCategory: string | null) {
  const chips: { label: string; href: string }[] = [];
  if (f.q) chips.push({ label: `Busca: ${f.q}`, href: listingHref(base, f, { q: "" }) });
  if (f.category && !fixedCategory) {
    const name = categories.find((c) => c.slug === f.category)?.name ?? f.category;
    chips.push({ label: name, href: listingHref(base, f, { category: null }) });
  }
  for (const s of f.segments) {
    const name = segments.find((x) => x.slug === s)?.name ?? s;
    chips.push({ label: name, href: listingHref(base, f, { segments: f.segments.filter((x) => x !== s) }) });
  }
  if (f.inStock) chips.push({ label: "Só com estoque", href: listingHref(base, f, { inStock: false }) });
  return chips;
}

function FilterForm({ filters, base, fixedCategory, idPrefix }: { filters: ListingFilters; base: string; fixedCategory: string | null; idPrefix: string }) {
  return (
    <form action={base} className="space-y-6">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort !== "relevancia" && <input type="hidden" name="ordem" value={filters.sort} />}

      {!fixedCategory && (
        <fieldset>
          <legend className="mb-2 font-semibold">Departamento</legend>
          <div className="space-y-0.5">
            <Radio name="categoria" value="" label="Todos" checked={!filters.category} id={`${idPrefix}-cat-todos`} />
            {categories.map((c) => (
              <Radio key={c.slug} name="categoria" value={c.slug} label={c.name} checked={filters.category === c.slug} id={`${idPrefix}-cat-${c.slug}`} />
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 font-semibold">Uso</legend>
        <div className="space-y-0.5">
          {segments.map((s) => (
            <Check key={s.slug} name="segmento" value={s.slug} label={s.name} checked={filters.segments.includes(s.slug)} id={`${idPrefix}-seg-${s.slug}`} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Disponibilidade</legend>
        <Check name="disponivel" value="1" label="Só com estoque" checked={filters.inStock} id={`${idPrefix}-disp`} />
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className="btn-dark flex-1">
          Aplicar filtros
        </button>
        <Link href={base} className="btn-outline">
          Limpar
        </Link>
      </div>
    </form>
  );
}

function SortForm({ filters, base }: { filters: ListingFilters; base: string }) {
  return (
    <form action={base} className="flex items-center gap-2">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.category && base === "/produtos" && <input type="hidden" name="categoria" value={filters.category} />}
      {filters.segments.map((s) => (
        <input key={s} type="hidden" name="segmento" value={s} />
      ))}
      {filters.inStock && <input type="hidden" name="disponivel" value="1" />}
      <label htmlFor="ordem" className="sr-only">
        Ordenar por
      </label>
      <select id="ordem" name="ordem" defaultValue={filters.sort} className="field min-h-11 w-auto max-w-40 pr-8 text-[0.9375rem] sm:max-w-none">
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-outline min-h-11 px-3">
        <ArrowDownUp className="size-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Ordenar</span>
      </button>
    </form>
  );
}

function Radio({ id, name, value, label, checked }: { id: string; name: string; value: string; label: string; checked: boolean }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
      <input id={id} type="radio" name={name} value={value} defaultChecked={checked} className="size-5 accent-black" />
      {label}
    </label>
  );
}

function Check({ id, name, value, label, checked }: { id: string; name: string; value: string; label: string; checked: boolean }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-surface-2">
      <input id={id} type="checkbox" name={name} value={value} defaultChecked={checked} className="size-5 rounded accent-black" />
      {label}
    </label>
  );
}

function EmptyResults({ filters, base }: { filters: ListingFilters; base: string }) {
  return (
    <div className="mt-6 rounded-xl bg-surface-2 p-6 sm:p-8">
      <SearchX className="size-8 text-muted" aria-hidden="true" />
      <h2 className="mt-3 text-xl font-bold">Nenhum produto encontrado</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
        {filters.q && <li>Confira a grafia ou use um termo mais geral, como “parafuso” ou “broca”.</li>}
        <li>Tire alguns filtros para ampliar a busca.</li>
        <li>Não achou a medida? Fale com a gente: muitas vezes o item existe mas ainda não está no site.</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={base} className="btn-dark">
          Limpar filtros
        </Link>
        <Link href="/contato" className="btn-outline">
          Falar com a loja
        </Link>
      </div>
      <p className="mt-6 font-semibold">Departamentos</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/produtos/${c.slug}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-3.5 text-sm font-medium ring-1 ring-line hover:bg-surface-3">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_1fr]" aria-hidden="true">
      <div className="hidden h-96 rounded-xl bg-surface-2 lg:block" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-96 rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
