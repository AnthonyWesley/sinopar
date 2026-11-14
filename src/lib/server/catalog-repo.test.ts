import { describe, it, expect, beforeEach } from "vitest";
import { openDb, type Db } from "./db";
import { seedIfEmpty } from "./seed";
import {
  createProduct,
  deleteOrPauseProduct,
  findVariant,
  getAdminProduct,
  getProductBySlug,
  listAdminProducts,
  listProducts,
  productSlugExists,
  setProductStatus,
  slugify,
  updateProduct,
  type ProductInput,
} from "./catalog-repo";
import { products } from "../catalog";

let db: Db;
const first = products[0];
const second = products[1];

beforeEach(() => {
  db = openDb(":memory:");
  seedIfEmpty(db);
});

const pause = (slug: string) => db.prepare("UPDATE products SET status = 'pausado' WHERE slug = ?").run(slug);

describe("catalog-repo", () => {
  it("listProducts devolve o catálogo no mesmo formato e ordem do seed", () => {
    const list = listProducts(db);
    expect(list).toHaveLength(products.length);
    expect(list.map((p) => p.slug)).toEqual(products.map((p) => p.slug));
    expect(list[0]).toEqual(first);
  });

  it("listProducts esconde pausados e calcula o disponível (stock 10, reserved 3 → 7)", () => {
    const sku = first.variants[0].sku;
    db.prepare("UPDATE variants SET stock = 10, reserved = 3 WHERE sku = ?").run(sku);
    pause(second.slug);
    const list = listProducts(db);
    expect(list.some((p) => p.slug === second.slug)).toBe(false);
    expect(list.find((p) => p.slug === first.slug)!.variants[0].stock).toBe(7);
  });

  it("includePaused mostra os pausados", () => {
    pause(second.slug);
    expect(listProducts(db, { includePaused: true }).some((p) => p.slug === second.slug)).toBe(true);
    expect(getProductBySlug(db, second.slug)).toBeNull();
    expect(getProductBySlug(db, second.slug, { includePaused: true })?.slug).toBe(second.slug);
  });

  it("getProductBySlug de slug inexistente → null", () => {
    expect(getProductBySlug(db, "nao-existe")).toBeNull();
    expect(getProductBySlug(db, first.slug)).toEqual(first);
  });

  it("findVariant devolve produto, variação e id; produto pausado → null", () => {
    const sku = first.variants[1].sku;
    const found = findVariant(db, sku);
    expect(found?.product.slug).toBe(first.slug);
    expect(found?.variant).toEqual(first.variants[1]);
    expect(typeof found?.variantId).toBe("number");
    expect(findVariant(db, "nao-existe")).toBeNull();
    pause(first.slug);
    expect(findVariant(db, sku)).toBeNull();
  });

  it("productSlugExists só para ativos", () => {
    expect(productSlugExists(db, first.slug)).toBe(true);
    expect(productSlugExists(db, "nao-existe")).toBe(false);
    pause(first.slug);
    expect(productSlugExists(db, first.slug)).toBe(false);
  });
});

// ---------- escrita (painel) ----------

const now = new Date("2026-11-14T12:00:00Z");

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: "Trena de aço 5 m",
  category: "medicao",
  image: "/uploads/abc.webp",
  variantName: null,
  unit: "Unidade",
  segments: ["construcao"],
  description: "Trena com trava.",
  specs: [{ label: "Comprimento", value: "5 m" }],
  featured: false,
  variants: [{ sku: "TR-500", label: "Padrão", price: 2990, compareAt: null, boxQty: 12 }],
  ...over,
});

const one = (sku: string) => [{ sku, label: "Padrão", price: 100, compareAt: null, boxQty: 1 }];
const idOf = (slug: string) => (db.prepare("SELECT id FROM products WHERE slug = ?").get(slug) as { id: number }).id;
/** variações atuais no formato de entrada (com id), para editar */
const editable = (id: number) =>
  getAdminProduct(db, id)!.variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label, price: v.price, compareAt: v.compareAt, boxQty: v.boxQty }));

describe("catalog-repo: escrita", () => {
  it("slugify tira acento e símbolos", () => {
    expect(slugify('  Alicate Universal 8" (Pró) ')).toBe("alicate-universal-8-pro");
    expect(slugify("***")).toBe("produto");
  });

  it("createProduct: aparece no listProducts com estoque 0", () => {
    const r = createProduct(db, input(), now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.slug).toBe("trena-de-aco-5-m");
    const p = listProducts(db).find((x) => x.slug === r.slug)!;
    expect(p).toMatchObject({ name: "Trena de aço 5 m", category: "medicao", image: "/uploads/abc.webp", unit: "Unidade" });
    expect(p.variants).toEqual([{ sku: "TR-500", label: "Padrão", price: 2990, stock: 0, boxQty: 12 }]);
    expect(getProductBySlug(db, r.slug)).toEqual(p);
  });

  it("nome repetido ganha -2, -3", () => {
    const a = createProduct(db, input(), now);
    const b = createProduct(db, input({ variants: one("TR-501") }), now);
    const c = createProduct(db, input({ variants: one("TR-502") }), now);
    expect([a.ok && a.slug, b.ok && b.slug, c.ok && c.slug]).toEqual(["trena-de-aco-5-m", "trena-de-aco-5-m-2", "trena-de-aco-5-m-3"]);
  });

  it("SKU que já está em outro produto → erro, nada gravado", () => {
    const r = createProduct(db, input({ variants: one(first.variants[0].sku) }), now);
    expect(r).toEqual({ ok: false, error: "Este código já está em outro produto.", field: "variant-0-sku" });
    expect(listProducts(db)).toHaveLength(products.length);
  });

  it("updateProduct: muda nome (slug novo), preço, acrescenta variação com 0 e não mexe no estoque", () => {
    const id = idOf(first.slug);
    const stockBefore = getAdminProduct(db, id)!.variants[0].stock;
    const variants: ProductInput["variants"] = editable(id);
    variants[0].price = 1234;
    variants.push({ sku: "NOVO-1", label: "4 a 40 mm", price: 15000, compareAt: null, boxQty: 1 });
    const r = updateProduct(db, id, { ...input(), name: "Broca escalonada HSS", category: first.category, variantName: "Faixa de furo", variants }, now);
    expect(r).toEqual({ ok: true, id, slug: "broca-escalonada-hss", oldSlug: first.slug });
    const after = getAdminProduct(db, id)!;
    expect(after.variants[0]).toMatchObject({ price: 1234, stock: stockBefore });
    expect(after.variants.at(-1)).toMatchObject({ sku: "NOVO-1", stock: 0, reserved: 0 });
    expect(getProductBySlug(db, first.slug)).toBeNull();
  });

  it("updateProduct sem trocar o nome mantém o slug, mesmo um slug que não sai do nome", () => {
    const p = products[2];
    expect(slugify(p.name)).not.toBe(p.slug);
    const id = idOf(p.slug);
    const r = updateProduct(db, id, { ...input(), name: p.name, variants: editable(id) }, now);
    expect(r).toMatchObject({ ok: true, slug: p.slug, oldSlug: p.slug });
  });

  it("updateProduct: trocar os códigos de duas variações entre si funciona", () => {
    const id = idOf(first.slug);
    const vs = editable(id);
    const [a, b] = [vs[0].sku, vs[1].sku];
    [vs[0].sku, vs[1].sku] = [b, a];
    expect(updateProduct(db, id, { ...input(), name: first.name, variants: vs }, now).ok).toBe(true);
    expect(getAdminProduct(db, id)!.variants.map((v) => v.sku).slice(0, 2)).toEqual([b, a]);
  });

  it("updateProduct: SKU de outro produto → erro", () => {
    const id = idOf(first.slug);
    const vs = editable(id);
    vs[1].sku = second.variants[0].sku;
    expect(updateProduct(db, id, { ...input(), name: first.name, variants: vs }, now)).toEqual({
      ok: false,
      error: "Este código já está em outro produto.",
      field: "variant-1-sku",
    });
  });

  it("updateProduct: variação com movimentação não pode ser removida", () => {
    const id = idOf(first.slug);
    const vs = editable(id);
    const r = updateProduct(db, id, { ...input(), name: first.name, variants: vs.slice(1) }, now);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(vs[0].sku);
    expect(getAdminProduct(db, id)!.variants).toHaveLength(vs.length);
  });

  it("updateProduct: variação nova sem histórico pode ser removida", () => {
    const c = createProduct(
      db,
      input({
        variantName: "Tamanho",
        variants: [
          { sku: "A1", label: "P", price: 100, compareAt: null, boxQty: 1 },
          { sku: "A2", label: "G", price: 200, compareAt: null, boxQty: 1 },
        ],
      }),
      now,
    );
    if (!c.ok) throw new Error("falhou");
    const r = updateProduct(db, c.id, { ...input({ variantName: "Tamanho" }), variants: editable(c.id).slice(1) }, now);
    expect(r.ok).toBe(true);
    expect(getAdminProduct(db, c.id)!.variants.map((v) => v.sku)).toEqual(["A2"]);
  });

  it("updateProduct: id de variação de outro produto é recusado", () => {
    const id = idOf(first.slug);
    const other = editable(idOf(second.slug))[0];
    const r = updateProduct(db, id, { ...input(), name: first.name, variants: [...editable(id), { ...other, sku: "X-9" }] }, now);
    expect(r).toMatchObject({ ok: false, error: "Variação não encontrada." });
  });

  it("updateProduct de produto inexistente", () => {
    expect(updateProduct(db, 99999, input(), now)).toEqual({ ok: false, error: "Produto não encontrado." });
  });

  it("setProductStatus: pausado some da loja e volta ao ativar", () => {
    const id = idOf(second.slug);
    expect(setProductStatus(db, id, "pausado", now)).toEqual({ ok: true, slug: second.slug });
    expect(listProducts(db).some((p) => p.slug === second.slug)).toBe(false);
    expect(productSlugExists(db, second.slug)).toBe(false);
    setProductStatus(db, id, "ativo", now);
    expect(productSlugExists(db, second.slug)).toBe(true);
    expect(setProductStatus(db, 99999, "ativo", now)).toEqual({ ok: false, error: "Produto não encontrado." });
  });

  it("deleteOrPauseProduct: produto com pedido é pausado com o aviso", () => {
    const id = idOf(second.slug);
    const variantId = getAdminProduct(db, id)!.variants[0].id;
    db.prepare(
      `INSERT INTO orders (id, token, status, created_at, customer, shipping, payment_method, subtotal, total)
       VALUES ('P1', 't1', 'pago', ?, '{}', '{}', 'PIX', 100, 100)`,
    ).run(now.toISOString());
    db.prepare("INSERT INTO order_lines (order_id, sku, variant_id, name, qty, unit_price) VALUES ('P1', ?, ?, 'x', 1, 100)").run(
      second.variants[0].sku,
      variantId,
    );
    expect(deleteOrPauseProduct(db, id, now)).toEqual({
      ok: true,
      deleted: false,
      slug: second.slug,
      image: second.image,
      message: "Este produto já teve pedidos; ele foi pausado em vez de excluído.",
    });
    expect(getAdminProduct(db, id)!.status).toBe("pausado");
  });

  it("deleteOrPauseProduct: só com movimentação também pausa", () => {
    expect(deleteOrPauseProduct(db, idOf(first.slug), now)).toMatchObject({
      ok: true,
      deleted: false,
      message: "Este produto já teve movimentações de estoque; ele foi pausado em vez de excluído.",
    });
    expect(productSlugExists(db, first.slug)).toBe(false);
  });

  it("deleteOrPauseProduct: produto sem histórico é excluído", () => {
    const c = createProduct(db, input(), now);
    if (!c.ok) throw new Error("falhou");
    expect(deleteOrPauseProduct(db, c.id, now)).toEqual({ ok: true, deleted: true, slug: c.slug, image: "/uploads/abc.webp" });
    expect(getAdminProduct(db, c.id)).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM variants WHERE sku = 'TR-500'").get()).toEqual({ n: 0 });
    expect(deleteOrPauseProduct(db, c.id, now)).toEqual({ ok: false, error: "Produto não encontrado." });
  });

  it("listAdminProducts: inclui pausados, filtra por busca, departamento e situação", () => {
    setProductStatus(db, idOf(second.slug), "pausado", now);
    const all = listAdminProducts(db);
    expect(all).toHaveLength(products.length);
    expect(all.find((p) => p.slug === second.slug)!.situation).toBe("pausado");

    db.prepare("UPDATE variants SET stock = 0, reserved = 0 WHERE product_id = ?").run(idOf(first.slug));
    expect(listAdminProducts(db, { situation: "esgotado" }).map((p) => p.slug)).toContain(first.slug);
    expect(listAdminProducts(db, { situation: "ativo" }).some((p) => p.slug === first.slug || p.slug === second.slug)).toBe(false);
    expect(listAdminProducts(db, { situation: "pausado" }).map((p) => p.slug)).toEqual([second.slug]);

    expect(listAdminProducts(db, { q: "ESCALONADA" }).map((p) => p.slug)).toContain(first.slug);
    expect(listAdminProducts(db, { q: first.variants[1].sku }).map((p) => p.slug)).toEqual([first.slug]);
    const cat = listAdminProducts(db, { category: "epi" });
    expect(cat.length).toBeGreaterThan(0);
    expect(cat.every((p) => p.category === "epi")).toBe(true);
  });

  it("listAdminProducts: disponível = estoque − reservado por variação", () => {
    const sku = first.variants[0].sku;
    db.prepare("UPDATE variants SET stock = 10, reserved = 3 WHERE sku = ?").run(sku);
    const row = listAdminProducts(db).find((p) => p.slug === first.slug)!;
    expect(row.variants[0]).toMatchObject({ sku, stock: 10, reserved: 3, available: 7 });
  });
});
