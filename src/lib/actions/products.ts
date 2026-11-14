"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { productTag, TAG_CATALOG } from "../cache-tags";
import { parseProductForm, type FieldErrors } from "../product-form";
import {
  createProduct,
  deleteOrPauseProduct,
  getAdminProduct,
  setProductStatus as repoSetStatus,
  updateProduct,
} from "../server/catalog-repo";
import { getDb } from "../server/db";
import { MAX_UPLOAD_BYTES, removeUpload, saveUpload, UPLOAD_ERRORS } from "../server/images";
import { authorizeAction } from "../session";

// Server Actions da tela de Produtos (Responsável e funcionário). Cada uma confere a sessão
// (authorizeAction), valida a entrada e invalida o cache da loja com updateTag: a lista
// (`catalogo`) e a página do produto (`produto:<slug>`, o antigo e o novo quando o slug muda).
// Formato para useActionState: (estado anterior, FormData) => estado.

export type ProductFormState = { error?: string; errors?: FieldErrors; message?: string };
export type PhotoState = { error?: string; url?: string };

const idOf = (form: FormData) => {
  const n = Number(form.get("id"));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

function invalidate(...slugs: (string | undefined)[]) {
  updateTag(TAG_CATALOG);
  for (const slug of new Set(slugs)) if (slug) updateTag(productTag(slug));
}

/**
 * Cria (sem `id`) ou edita (com `id`) um produto. Campos: name, category, description, unit,
 * variantName, image, featured, segments[], specLabel[]/specValue[] e, por variação,
 * variantId[]/sku[]/label[]/price[]/compareAt[]/boxQty[]. O estoque não entra aqui.
 */
export async function saveProduct(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const parsed = parseProductForm(form);
  if (!parsed.ok) return { error: "Confira os campos marcados.", errors: parsed.errors };

  const db = getDb();
  const now = new Date();
  const editing = form.has("id") && form.get("id") !== "";
  if (!editing) {
    const r = createProduct(db, parsed.input, now);
    if (!r.ok) return r.field ? { error: "Confira os campos marcados.", errors: { [r.field]: r.error } } : { error: r.error };
    invalidate(r.slug);
    redirect(`/admin/produtos/${r.id}?criado=1`);
  }

  const id = idOf(form);
  const before = id == null ? null : getAdminProduct(db, id);
  if (id == null || !before) return { error: "Produto não encontrado." };
  const r = updateProduct(db, id, parsed.input, now);
  if (!r.ok) return r.field ? { error: "Confira os campos marcados.", errors: { [r.field]: r.error } } : { error: r.error };
  invalidate(r.oldSlug, r.slug);
  // foto trocada: a enviada antes não é usada por mais ninguém
  if (before.image !== parsed.input.image) await removeUpload(before.image);
  return { message: "Alterações salvas." };
}

/** Campos: id, status ("ativo" | "pausado"). */
export async function setProductStatus(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  const status = form.get("status");
  if (status !== "ativo" && status !== "pausado") return { error: "Situação inválida." };
  if (id == null) return { error: "Produto não encontrado." };
  const r = repoSetStatus(getDb(), id, status, new Date());
  if (!r.ok) return { error: r.error };
  invalidate(r.slug);
  return { message: status === "pausado" ? "Produto pausado. Ele não aparece mais na loja." : "Produto ativo de novo na loja." };
}

/** Campo: id. Com histórico (pedido ou movimentação de estoque) o produto é pausado em vez de excluído. */
export async function deleteProduct(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  if (id == null) return { error: "Produto não encontrado." };
  const r = deleteOrPauseProduct(getDb(), id, new Date());
  if (!r.ok) return { error: r.error };
  invalidate(r.slug);
  if (!r.deleted) return { message: r.message };
  await removeUpload(r.image);
  redirect("/admin/produtos?excluido=1");
}

/** Campo: photo (arquivo). Devolve a URL da foto já convertida em WebP, para o campo `image`. */
export async function uploadProductPhoto(_prev: PhotoState, form: FormData): Promise<PhotoState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha uma foto." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: UPLOAD_ERRORS.tooBig };
  const r = await saveUpload(Buffer.from(await file.arrayBuffer()));
  return r.ok ? { url: r.url } : { error: r.error };
}
