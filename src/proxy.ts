import { NextResponse, type NextRequest } from "next/server";
import { categories, products } from "./lib/catalog";

// As páginas de categoria e de produto leem o slug dentro de <Suspense> (navegação instantânea
// do Next 16). Com isso, um notFound() lá dentro chega depois do início do streaming e a resposta
// sai 200 + noindex. Aqui o slug inexistente é barrado antes, com 404 de verdade.
// Quando o catálogo vier de um banco/ERP, trocar estas listas pela consulta equivalente.
const categorySlugs = new Set(categories.map((c) => c.slug));
const productSlugs = new Set(products.map((p) => p.slug));

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  const known = section === "produtos" ? categorySlugs.has(slug) : productSlugs.has(slug);
  if (known && extra === undefined) return NextResponse.next();
  // rota que não existe: o Next responde com app/not-found.tsx e status 404
  return NextResponse.rewrite(new URL("/_nao-encontrado", request.url));
}

export const config = {
  matcher: ["/produtos/:slug+", "/produto/:slug+"],
};
