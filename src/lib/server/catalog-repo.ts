import type { Db } from "./db";
import type { Product, Segment, Variant } from "../catalog";

// Leitura do catálogo sobre o banco, sem cache e sem Next: funções puras sobre `Db`.
// A loja não chama isto direto; usa src/lib/catalog-data.ts (com 'use cache').
// `variant.stock` sai como DISPONÍVEL (stock − reserved), que é o que a loja pode vender.

type Opts = { includePaused?: boolean };

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  category: string;
  image: string;
  variant_name: string | null;
  unit: string;
  segments: string;
  description: string;
  specs: string;
  featured: number;
};

type VariantRow = {
  id: number;
  product_id: number;
  sku: string;
  label: string;
  price: number;
  compare_at: number | null;
  stock: number;
  reserved: number;
  box_qty: number;
};

const PRODUCT_COLS = "id, slug, name, category, image, variant_name, unit, segments, description, specs, featured";

function toVariant(r: VariantRow): Variant {
  return {
    sku: r.sku,
    label: r.label,
    price: r.price,
    ...(r.compare_at != null ? { compareAt: r.compare_at } : {}),
    stock: Math.max(0, r.stock - r.reserved),
    boxQty: r.box_qty,
  };
}

function toProduct(r: ProductRow, variants: VariantRow[]): Product {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    image: r.image,
    variantName: r.variant_name,
    unit: r.unit,
    segments: JSON.parse(r.segments) as Segment[],
    description: r.description,
    specs: JSON.parse(r.specs) as Product["specs"],
    ...(r.featured ? { featured: true } : {}),
    variants: variants.map(toVariant),
  };
}

const statusFilter = (opts?: Opts) => (opts?.includePaused ? "" : "WHERE status = 'ativo'");

export function listProducts(db: Db, opts?: Opts): Product[] {
  const rows = db.prepare(`SELECT ${PRODUCT_COLS} FROM products ${statusFilter(opts)} ORDER BY id`).all() as ProductRow[];
  const variants = db.prepare("SELECT * FROM variants ORDER BY product_id, position, id").all() as VariantRow[];
  const byProduct = new Map<number, VariantRow[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id);
    if (list) list.push(v);
    else byProduct.set(v.product_id, [v]);
  }
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
}

function variantsOf(db: Db, productId: number) {
  return db.prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY position, id").all(productId) as VariantRow[];
}

export function getProductBySlug(db: Db, slug: string, opts?: Opts): Product | null {
  const where = opts?.includePaused ? "WHERE slug = ?" : "WHERE slug = ? AND status = 'ativo'";
  const row = db.prepare(`SELECT ${PRODUCT_COLS} FROM products ${where}`).get(slug) as ProductRow | undefined;
  return row ? toProduct(row, variantsOf(db, row.id)) : null;
}

/** variação vendável pelo SKU; produto pausado não vende → null */
export function findVariant(db: Db, sku: string): { product: Product; variant: Variant; variantId: number } | null {
  const v = db.prepare("SELECT * FROM variants WHERE sku = ?").get(sku) as VariantRow | undefined;
  if (!v) return null;
  const row = db.prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ? AND status = 'ativo'`).get(v.product_id) as ProductRow | undefined;
  if (!row) return null;
  return { product: toProduct(row, variantsOf(db, row.id)), variant: toVariant(v), variantId: v.id };
}

/** usado pelo proxy para responder 404 de verdade a produto inexistente ou pausado */
export function productSlugExists(db: Db, slug: string): boolean {
  return db.prepare("SELECT 1 FROM products WHERE slug = ? AND status = 'ativo'").get(slug) !== undefined;
}
