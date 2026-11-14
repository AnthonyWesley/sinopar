import { NextResponse, type NextRequest } from "next/server";
import { categories } from "./lib/catalog";
import { productSlugExists } from "./lib/server/catalog-repo";
import { getDb } from "./lib/server/db";

// As páginas de categoria e de produto leem o slug dentro de <Suspense> (navegação instantânea
// do Next 16). Com isso, um notFound() lá dentro chega depois do início do streaming e a resposta
// sai 200 + noindex. Aqui o slug inexistente é barrado antes, com 404 de verdade.
// Categoria: lista fixa de catalog.ts. Produto: consulta o banco (o proxy roda em Node), que
// responde 404 também para produto pausado. É uma consulta por índice, sem cache: pausar ou
// apagar um produto vale na hora.
const categorySlugs = new Set(categories.map((c) => c.slug));

export function proxy(request: NextRequest) {
  const [, section, slug, extra] = request.nextUrl.pathname.split("/");
  const known = extra === undefined && (section === "produtos" ? categorySlugs.has(slug) : productSlugExists(getDb(), slug));
  if (known) return NextResponse.next();
  // rota que não existe: o Next responde com app/not-found.tsx e status 404
  return NextResponse.rewrite(new URL("/_nao-encontrado", request.url));
}

export const config = {
  matcher: ["/produtos/:slug+", "/produto/:slug+"],
};
