import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { productTag, TAG_CATALOG } from "./cache-tags";
import type { Product } from "./catalog";
import { getDb } from "./server/db";
import { getProductBySlug, listProducts } from "./server/catalog-repo";

// Catálogo da loja lido do banco, com cache por tag.
//
// `await connection()` vem ANTES do cache: o better-sqlite3 é síncrono e, sem isso, o
// prerender do `next build` abriria o banco (que não existe no build do Docker). Com ele, tudo
// o que lê o catálogo fica fora do prerender (precisa estar dentro de <Suspense>) e roda só na
// requisição, servido do cache em memória até a tag ser invalidada.

export async function getCatalog(): Promise<Product[]> {
  await connection();
  return cachedCatalog();
}

export async function getProduct(slug: string): Promise<Product | null> {
  await connection();
  return cachedProduct(slug);
}

async function cachedCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(TAG_CATALOG);
  // a invalidação é por tag; o tempo é só uma rede de segurança
  cacheLife("hours");
  return listProducts(getDb());
}

async function cachedProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheTag(TAG_CATALOG, productTag(slug));
  cacheLife("hours");
  return getProductBySlug(getDb(), slug);
}
