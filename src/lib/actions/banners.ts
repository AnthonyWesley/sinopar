"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { parseBannerForm, type BannerErrors } from "../banners";
import { TAG_BANNERS } from "../cache-tags";
import { createBanner, deleteBanner, getBanner, moveBanner, updateBanner } from "../server/banners-repo";
import { getDb } from "../server/db";
import { MAX_UPLOAD_BYTES, removeUpload, saveUpload, UPLOAD_ERRORS } from "../server/images";
import { authorizeAction } from "../session";

// Server Actions da tela Banners (Responsável e funcionário). Mesmo esquema da tela Produtos:
// confere a sessão, valida, grava e invalida o cache da loja (tag `banners`).

export type BannerFormState = { error?: string; errors?: BannerErrors; message?: string };
export type BannerImageState = { error?: string; url?: string };

/** banner largo de computador: até 2400 px no lado maior, para não borrar em tela grande */
const BANNER_MAX_SIZE = 2400;

const idOf = (form: FormData) => {
  const n = Number(form.get("id"));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

/** Cria (sem `id`) ou edita (com `id`). Campos em parseBannerForm. */
export async function saveBanner(_prev: BannerFormState, form: FormData): Promise<BannerFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const parsed = parseBannerForm(form);
  if (!parsed.ok) return { error: "Confira os campos marcados.", errors: parsed.errors };
  const db = getDb();
  const now = new Date();

  if (!form.get("id")) {
    const id = createBanner(db, parsed.input, now);
    updateTag(TAG_BANNERS);
    redirect(`/admin/banners/${id}?criado=1`);
  }

  const id = idOf(form);
  const before = id == null ? null : getBanner(db, id);
  if (id == null || !before) return { error: "Banner não encontrado." };
  updateBanner(db, id, parsed.input, now);
  updateTag(TAG_BANNERS);
  // imagem trocada ou tirada: a anterior não é usada por mais ninguém
  if (before.imageDesktop !== parsed.input.imageDesktop) await removeUpload(before.imageDesktop);
  if (before.imageMobile && before.imageMobile !== parsed.input.imageMobile) await removeUpload(before.imageMobile);
  return { message: "Alterações salvas." };
}

/** Campo: id. */
export async function deleteBannerAction(_prev: BannerFormState, form: FormData): Promise<BannerFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  const b = id == null ? null : deleteBanner(getDb(), id);
  if (!b) return { error: "Banner não encontrado." };
  updateTag(TAG_BANNERS);
  await removeUpload(b.imageDesktop);
  if (b.imageMobile) await removeUpload(b.imageMobile);
  redirect("/admin/banners?excluido=1");
}

/** Campos: id, dir ("up" | "down"). */
export async function moveBannerAction(_prev: BannerFormState, form: FormData): Promise<BannerFormState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const id = idOf(form);
  const dir = form.get("dir");
  if (id == null || (dir !== "up" && dir !== "down")) return { error: "Pedido inválido." };
  if (moveBanner(getDb(), id, dir)) updateTag(TAG_BANNERS);
  return {};
}

/** Campo: photo (arquivo). Devolve a URL da imagem já convertida em WebP. */
export async function uploadBannerImage(_prev: BannerImageState, form: FormData): Promise<BannerImageState> {
  const auth = await authorizeAction();
  if (!auth.ok) return { error: auth.error };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha uma imagem." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: UPLOAD_ERRORS.tooBig };
  const r = await saveUpload(Buffer.from(await file.arrayBuffer()), { maxSize: BANNER_MAX_SIZE });
  return r.ok ? { url: r.url } : { error: r.error };
}
