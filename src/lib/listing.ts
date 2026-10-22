import { categories, fromPrice, products, segments, totalStock, type Product, type Segment } from "./catalog";
import { score } from "./search";

export const sortOptions = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "nome", label: "Nome (A–Z)" },
] as const;

export type ListingFilters = {
  q: string;
  category: string | null;
  segments: Segment[];
  inStock: boolean;
  sort: (typeof sortOptions)[number]["value"];
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export function parseFilters(params: RawParams, fixedCategory: string | null = null): ListingFilters {
  const category = fixedCategory ?? first(params.categoria);
  const sort = first(params.ordem);
  return {
    q: first(params.q).slice(0, 80),
    category: categories.some((c) => c.slug === category) ? category : null,
    segments: [...new Set(all(params.segmento))].filter((s): s is Segment => segments.some((x) => x.slug === s)),
    inStock: first(params.disponivel) === "1",
    sort: sortOptions.some((o) => o.value === sort) ? (sort as ListingFilters["sort"]) : "relevancia",
  };
}

export function searchKeywords(p: Product) {
  const category = categories.find((c) => c.slug === p.category)?.name ?? "";
  return [category, p.description, p.variants.map((v) => `${v.label} ${v.sku}`).join(" ")].join(" ");
}

export function applyFilters(f: ListingFilters) {
  let list = products.map((p) => ({ p, s: f.q ? score(f.q, { name: p.name, keywords: searchKeywords(p) }) : 1 }));
  list = list.filter(({ p, s }) => {
    if (s === 0) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.segments.length && !f.segments.some((seg) => p.segments.includes(seg))) return false;
    if (f.inStock && totalStock(p) === 0) return false;
    return true;
  });
  const price = (p: Product) => fromPrice(p).price;
  list.sort((a, b) => {
    switch (f.sort) {
      case "menor-preco":
        return price(a.p) - price(b.p);
      case "maior-preco":
        return price(b.p) - price(a.p);
      case "nome":
        return a.p.name.localeCompare(b.p.name, "pt-BR");
      default:
        // sem estoque vai para o fim; depois, relevância da busca
        return Number(totalStock(b.p) > 0) - Number(totalStock(a.p) > 0) || b.s - a.s;
    }
  });
  return list.map(({ p }) => p);
}

/** monta a URL da listagem mantendo os filtros atuais e trocando só o que mudou */
export function listingHref(base: string, f: ListingFilters, change: Partial<ListingFilters>) {
  const next = { ...f, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category && base === "/produtos") params.set("categoria", next.category);
  next.segments.forEach((s) => params.append("segmento", s));
  if (next.inStock) params.set("disponivel", "1");
  if (next.sort !== "relevancia") params.set("ordem", next.sort);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
