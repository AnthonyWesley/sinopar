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
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
};

/** Peso e medidas da embalagem de uma variação, para o frete. */
export type Package = { weightG: number; lengthCm: number; widthCm: number; heightCm: number };

function toPackage(r: VariantRow): Package | null {
  if (r.weight_g == null || r.length_cm == null || r.width_cm == null || r.height_cm == null) return null;
  return { weightG: r.weight_g, lengthCm: r.length_cm, widthCm: r.width_cm, heightCm: r.height_cm };
}

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

// ---------- painel: leitura com situação e escrita ----------
// As actions (src/lib/actions/products.ts) validam o formato com zod; aqui ficam as regras que
// dependem do banco (slug único, código único, o que pode ou não ser apagado).
// O estoque não é editado por aqui: variação nova nasce com 0 e entra pela tela Estoque.

export type ProductStatus = "ativo" | "pausado";
export type Situation = "ativo" | "pausado" | "esgotado";

export type VariantInput = {
  /** id da variação existente; ausente = variação nova */
  id?: number;
  sku: string;
  label: string;
  price: number;
  compareAt: number | null;
  boxQty: number;
  /** ausente ou null = ainda sem peso e medidas */
  pack?: Package | null;
};

export type ProductInput = {
  name: string;
  category: string;
  image: string;
  variantName: string | null;
  unit: string;
  segments: Segment[];
  description: string;
  specs: { label: string; value: string }[];
  featured: boolean;
  variants: VariantInput[];
};

export type AdminVariant = {
  id: number;
  sku: string;
  label: string;
  price: number;
  compareAt: number | null;
  boxQty: number;
  pack: Package | null;
  stock: number;
  reserved: number;
  available: number;
};

export type AdminProduct = Omit<Product, "variants" | "featured"> & {
  id: number;
  status: ProductStatus;
  situation: Situation;
  featured: boolean;
  variants: AdminVariant[];
};

export type Fail = { ok: false; error: string; field?: string };
export type WriteResult = { ok: true; id: number; slug: string; oldSlug?: string } | Fail;
export type DeleteResult =
  | { ok: true; deleted: true; slug: string; image: string }
  | { ok: true; deleted: false; slug: string; image: string; message: string }
  | Fail;

export const SKU_TAKEN = "Este código já está em outro produto.";
export const PAUSED_ORDERS = "Este produto já teve pedidos; ele foi pausado em vez de excluído.";
export const PAUSED_MOVEMENTS = "Este produto já teve movimentações de estoque; ele foi pausado em vez de excluído.";
const NOT_FOUND = "Produto não encontrado.";

/** `Alicate Universal 8" (Pró)` → "alicate-universal-8-pro" */
export function slugify(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return s || "produto";
}

function uniqueSlug(db: Db, base: string, exceptId: number | null): string {
  const stmt = db.prepare("SELECT 1 FROM products WHERE slug = ? AND id IS NOT ?");
  const taken = (slug: string) => stmt.get(slug, exceptId) !== undefined;
  if (!taken(base)) return base;
  for (let n = 2; ; n++) if (!taken(`${base}-${n}`)) return `${base}-${n}`;
}

type AdminRow = ProductRow & { status: ProductStatus };
const ADMIN_COLS = `${PRODUCT_COLS}, status`;

function toAdminVariant(r: VariantRow): AdminVariant {
  return {
    id: r.id,
    sku: r.sku,
    label: r.label,
    price: r.price,
    compareAt: r.compare_at,
    boxQty: r.box_qty,
    pack: toPackage(r),
    stock: r.stock,
    reserved: r.reserved,
    available: Math.max(0, r.stock - r.reserved),
  };
}

function toAdminProduct(r: AdminRow, variants: VariantRow[]): AdminProduct {
  const vs = variants.map(toAdminVariant);
  const soldOut = vs.every((v) => v.available === 0);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    image: r.image,
    variantName: r.variant_name,
    unit: r.unit,
    segments: JSON.parse(r.segments) as Segment[],
    description: r.description,
    specs: JSON.parse(r.specs) as Product["specs"],
    featured: r.featured === 1,
    status: r.status,
    situation: r.status === "pausado" ? "pausado" : soldOut ? "esgotado" : "ativo",
    variants: vs,
  };
}

/** produto do painel (pausado também), com o id, o estoque e o reservado de cada variação */
export function getAdminProduct(db: Db, id: number): AdminProduct | null {
  const row = db.prepare(`SELECT ${ADMIN_COLS} FROM products WHERE id = ?`).get(id) as AdminRow | undefined;
  return row ? toAdminProduct(row, variantsOf(db, row.id)) : null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** lista do painel: todos os produtos (pausados também), com filtro por nome/código, departamento e situação */
export function listAdminProducts(db: Db, filter: { q?: string; category?: string; situation?: Situation } = {}): AdminProduct[] {
  const rows = db.prepare(`SELECT ${ADMIN_COLS} FROM products ORDER BY id`).all() as AdminRow[];
  const variants = db.prepare("SELECT * FROM variants ORDER BY product_id, position, id").all() as VariantRow[];
  const byProduct = new Map<number, VariantRow[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id);
    if (list) list.push(v);
    else byProduct.set(v.product_id, [v]);
  }
  const q = fold(filter.q ?? "");
  return rows
    .map((r) => toAdminProduct(r, byProduct.get(r.id) ?? []))
    .filter(
      (p) =>
        (!filter.category || p.category === filter.category) &&
        (!filter.situation || p.situation === filter.situation) &&
        (!q || fold(p.name).includes(q) || p.variants.some((v) => fold(v.sku).includes(q))),
    );
}

// Variação com histórico (linha de pedido ou movimentação de estoque) não pode ser apagada:
// stock_movements.variant_id é ON DELETE RESTRICT e o pedido precisa continuar apontando para ela.
function anyRow(db: Db, table: "order_lines" | "stock_movements", variantIds: number[]): boolean {
  if (variantIds.length === 0) return false;
  const marks = variantIds.map(() => "?").join(",");
  return db.prepare(`SELECT 1 FROM ${table} WHERE variant_id IN (${marks}) LIMIT 1`).get(...variantIds) !== undefined;
}

/** índice da primeira variação cujo código já está em outro produto, ou -1 */
function takenSkuIndex(db: Db, variants: VariantInput[], productId: number | null): number {
  const stmt = db.prepare("SELECT 1 FROM variants WHERE sku = ? AND product_id IS NOT ?");
  return variants.findIndex((v) => stmt.get(v.sku, productId) !== undefined);
}

const productParams = (input: ProductInput) => [
  input.name,
  input.category,
  input.image,
  input.variantName,
  input.unit,
  JSON.stringify(input.segments),
  input.description,
  JSON.stringify(input.specs),
  input.featured ? 1 : 0,
];

const INSERT_VARIANT =
  "INSERT INTO variants (product_id,sku,label,price,compare_at,stock,reserved,box_qty,position,weight_g,length_cm,width_cm,height_cm) VALUES (?,?,?,?,?,0,0,?,?,?,?,?,?)";
const packParams = (pack: Package | null | undefined) =>
  pack ? [pack.weightG, pack.lengthCm, pack.widthCm, pack.heightCm] : [null, null, null, null];

export function createProduct(db: Db, input: ProductInput, now: Date): WriteResult {
  return db.transaction((): WriteResult => {
    const taken = takenSkuIndex(db, input.variants, null);
    if (taken >= 0) return { ok: false, error: SKU_TAKEN, field: `variant-${taken}-sku` };
    const slug = uniqueSlug(db, slugify(input.name), null);
    const at = now.toISOString();
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO products (name,category,image,variant_name,unit,segments,description,specs,featured,slug,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,'ativo',?,?)`,
      )
      .run(...productParams(input), slug, at, at);
    const id = Number(lastInsertRowid);
    const ins = db.prepare(INSERT_VARIANT);
    input.variants.forEach((v, i) => ins.run(id, v.sku, v.label, v.price, v.compareAt, v.boxQty, i, ...packParams(v.pack)));
    return { ok: true, id, slug };
  })();
}

export function updateProduct(db: Db, id: number, input: ProductInput, now: Date): WriteResult {
  return db.transaction((): WriteResult => {
    const current = db.prepare("SELECT slug, name FROM products WHERE id = ?").get(id) as { slug: string; name: string } | undefined;
    if (!current) return { ok: false, error: NOT_FOUND };
    const existing = variantsOf(db, id);
    const existingIds = new Set(existing.map((v) => v.id));
    if (input.variants.some((v) => v.id != null && !existingIds.has(v.id))) return { ok: false, error: "Variação não encontrada." };

    const keptIds = new Set(input.variants.map((v) => v.id));
    const removed = existing.filter((v) => !keptIds.has(v.id));
    const blocked = removed.find((v) => anyRow(db, "order_lines", [v.id]) || anyRow(db, "stock_movements", [v.id]));
    if (blocked) {
      return {
        ok: false,
        error: `A variação de código ${blocked.sku} já teve pedidos ou movimentações de estoque e não pode ser removida. Mantenha a variação ou pause o produto.`,
      };
    }

    const taken = takenSkuIndex(db, input.variants, id);
    if (taken >= 0) return { ok: false, error: SKU_TAKEN, field: `variant-${taken}-sku` };

    // o slug só muda quando o nome muda: editar preço ou foto não troca o endereço da página
    // (os produtos do catálogo original têm slugs que não saem do nome, e precisam ficar)
    const slug = current.name === input.name ? current.slug : uniqueSlug(db, slugify(input.name), id);

    db.prepare(
      `UPDATE products SET name=?, category=?, image=?, variant_name=?, unit=?, segments=?, description=?, specs=?, featured=?,
       slug=?, updated_at=? WHERE id=?`,
    ).run(...productParams(input), slug, now.toISOString(), id);

    const del = db.prepare("DELETE FROM variants WHERE id = ?");
    for (const v of removed) del.run(v.id);
    // códigos trocados entre variações: libera todos antes de gravar (sku é UNIQUE)
    const park = db.prepare("UPDATE variants SET sku = '~' || id WHERE id = ?");
    for (const v of input.variants) if (v.id != null) park.run(v.id);
    const upd = db.prepare("UPDATE variants SET sku=?, label=?, price=?, compare_at=?, box_qty=?, position=? WHERE id=?");
    // pack ausente (undefined) = não mexe no peso e medidas já gravados
    const updPack = db.prepare("UPDATE variants SET weight_g=?, length_cm=?, width_cm=?, height_cm=? WHERE id=?");
    const ins = db.prepare(INSERT_VARIANT);
    input.variants.forEach((v, i) => {
      if (v.id != null) {
        upd.run(v.sku, v.label, v.price, v.compareAt, v.boxQty, i, v.id);
        if (v.pack !== undefined) updPack.run(...packParams(v.pack), v.id);
      } else ins.run(id, v.sku, v.label, v.price, v.compareAt, v.boxQty, i, ...packParams(v.pack));
    });
    return { ok: true, id, slug, oldSlug: current.slug };
  })();
}

export function setProductStatus(db: Db, id: number, status: ProductStatus, now: Date): { ok: true; slug: string } | Fail {
  const row = db.prepare("SELECT slug FROM products WHERE id = ?").get(id) as { slug: string } | undefined;
  if (!row) return { ok: false, error: NOT_FOUND };
  db.prepare("UPDATE products SET status = ?, updated_at = ? WHERE id = ?").run(status, now.toISOString(), id);
  return { ok: true, slug: row.slug };
}

/**
 * Exclui o produto, a não ser que ele tenha histórico: com pedido ou movimentação de estoque ele
 * só é pausado (o histórico aponta para as variações, que precisam continuar existindo).
 */
export function deleteOrPauseProduct(db: Db, id: number, now: Date): DeleteResult {
  return db.transaction((): DeleteResult => {
    const row = db.prepare("SELECT slug, image FROM products WHERE id = ?").get(id) as { slug: string; image: string } | undefined;
    if (!row) return { ok: false, error: NOT_FOUND };
    const ids = variantsOf(db, id).map((v) => v.id);
    const message = anyRow(db, "order_lines", ids) ? PAUSED_ORDERS : anyRow(db, "stock_movements", ids) ? PAUSED_MOVEMENTS : null;
    if (message) {
      db.prepare("UPDATE products SET status = 'pausado', updated_at = ? WHERE id = ?").run(now.toISOString(), id);
      return { ok: true, deleted: false, slug: row.slug, image: row.image, message };
    }
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return { ok: true, deleted: true, slug: row.slug, image: row.image };
  })();
}

/** Sugestões do formulário de produto: nomes já usados, o mais usado primeiro (empate: ordem alfabética). */
export function productFormSuggestions(db: Db): { variantNames: string[]; specLabels: string[] } {
  const variantCount = new Map<string, number>();
  const specCount = new Map<string, number>();
  const bump = (m: Map<string, number>, raw: unknown) => {
    const k = typeof raw === "string" ? raw.trim() : "";
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  };
  const rows = db.prepare("SELECT variant_name, specs FROM products").all() as { variant_name: string; specs: string }[];
  for (const r of rows) {
    bump(variantCount, r.variant_name);
    let specs: unknown = [];
    try {
      specs = JSON.parse(r.specs || "[]");
    } catch {
      specs = [];
    }
    if (Array.isArray(specs)) for (const s of specs) bump(specCount, (s as { label?: unknown })?.label);
  }
  const sorted = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).map(([k]) => k);
  return { variantNames: sorted(variantCount), specLabels: sorted(specCount) };
}
