import type { MetadataRoute } from "next";
import { categories, products } from "@/lib/catalog";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/produtos", "/servicos", "/contato", ...categories.map((c) => `/produtos/${c.slug}`), ...products.map((p) => `/produto/${p.slug}`)];
  return paths.map((p) => ({ url: `${site.url}${p}` }));
}
