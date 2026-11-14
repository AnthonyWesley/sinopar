import type { MetadataRoute } from "next";
import { categories } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-data";
import { site } from "@/lib/site";

// gerado na requisição (o catálogo vem do banco, que não existe no build)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalog();
  const paths = ["/", "/produtos", "/servicos", "/contato", ...categories.map((c) => `/produtos/${c.slug}`), ...products.map((p) => `/produto/${p.slug}`)];
  return paths.map((p) => ({ url: `${site.url}${p}` }));
}
