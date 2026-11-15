import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

// banco num arquivo temporário: getDb() lê DATA_DIR na primeira chamada
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-banners-"));
process.env.DATA_DIR = dir;

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("../session", () => ({ authorizeAction: vi.fn() }));

import { updateTag } from "next/cache";
import { authorizeAction } from "../session";
import { TAG_BANNERS } from "../cache-tags";
import { getDb } from "../server/db";
import { getBanner, listBanners } from "../server/banners-repo";
import { deleteBannerAction, moveBannerAction, saveBanner, uploadBannerImage, type BannerFormState } from "./banners";

const staff = { id: 2, email: "f@x.com", name: "Func", role: "staff" as const, mustChangePassword: false, hasRecoveryCode: true };
const EMPTY: BannerFormState = {};

async function upload(width = 2000, height = 1000): Promise<string> {
  const png = await sharp({ create: { width, height, channels: 3, background: "#f80" } }).png().toBuffer();
  const f = new FormData();
  f.set("photo", new File([new Uint8Array(png)], "banner.png", { type: "image/png" }));
  const r = await uploadBannerImage({}, f);
  if (!r.url) throw new Error(r.error);
  return r.url;
}

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ title: "Black November", imageDesktop: "", imageMobile: "", link: "", startsOn: "", endsOn: "", active: "on", ...over }))
    f.append(k, v);
  return f;
}

async function redirected(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as { url: string }).url;
  }
  throw new Error("esperava redirect");
}

const fileOf = (url: string) => path.join(dir, url);
const tags = () => vi.mocked(updateTag).mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.mocked(updateTag).mockClear();
  vi.mocked(authorizeAction).mockResolvedValue({ ok: true, user: staff });
});

describe("banners: ações do painel", () => {
  it("sem sessão: nada é gravado nem enviado", async () => {
    vi.mocked(authorizeAction).mockResolvedValue({ ok: false, error: "Sua sessão expirou. Entre de novo." });
    expect(await saveBanner(EMPTY, form({ title: "Sem sessão" }))).toEqual({ error: "Sua sessão expirou. Entre de novo." });
    expect(await uploadBannerImage({}, new FormData())).toEqual({ error: "Sua sessão expirou. Entre de novo." });
    expect(listBanners(getDb()).some((b) => b.title === "Sem sessão")).toBe(false);
  });

  it("imagem do banner é guardada em WebP com até 2400 px", async () => {
    const url = await upload(3000, 1500);
    const meta = await sharp(fileOf(url)).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", 2400, 1200]);
  });

  it("campos inválidos: volta os erros e não grava", async () => {
    const r = await saveBanner(EMPTY, form({ title: "" }));
    expect(r.error).toBe("Confira os campos marcados.");
    expect(r.errors?.title).toBeTruthy();
    expect(r.errors?.imageDesktop).toBeTruthy();
    expect(tags()).toEqual([]);
  });

  it("criar → vai para a página do banner e atualiza a loja", async () => {
    const img = await upload();
    const url = await redirected(saveBanner(EMPTY, form({ imageDesktop: img, link: "/produtos" })));
    const b = listBanners(getDb()).find((x) => x.imageDesktop === img)!;
    expect(url).toBe(`/admin/banners/${b.id}?criado=1`);
    expect(b).toMatchObject({ title: "Black November", link: "/produtos", active: true });
    expect(tags()).toEqual([TAG_BANNERS]);
  });

  it("editar trocando a imagem apaga a antiga do disco", async () => {
    const old = await upload();
    await redirected(saveBanner(EMPTY, form({ imageDesktop: old })));
    const id = listBanners(getDb()).find((x) => x.imageDesktop === old)!.id;
    const novo = await upload();
    const r = await saveBanner(EMPTY, form({ id: String(id), title: "Natal", imageDesktop: novo }));
    expect(r).toEqual({ message: "Alterações salvas." });
    expect(getBanner(getDb(), id)).toMatchObject({ title: "Natal", imageDesktop: novo });
    expect(fs.existsSync(fileOf(old))).toBe(false);
    expect(fs.existsSync(fileOf(novo))).toBe(true);
  });

  it("editar banner que não existe → erro", async () => {
    const img = await upload();
    expect(await saveBanner(EMPTY, form({ id: "99999", imageDesktop: img }))).toEqual({ error: "Banner não encontrado." });
  });

  it("excluir apaga o banner e as duas imagens", async () => {
    const desk = await upload();
    const mob = await upload(800, 800);
    await redirected(saveBanner(EMPTY, form({ imageDesktop: desk, imageMobile: mob })));
    const id = listBanners(getDb()).find((x) => x.imageDesktop === desk)!.id;
    const f = new FormData();
    f.set("id", String(id));
    expect(await redirected(deleteBannerAction(EMPTY, f))).toBe("/admin/banners?excluido=1");
    expect(getBanner(getDb(), id)).toBeNull();
    expect(fs.existsSync(fileOf(desk))).toBe(false);
    expect(fs.existsSync(fileOf(mob))).toBe(false);
  });

  it("mover muda a ordem e atualiza a loja", async () => {
    const ids = listBanners(getDb()).map((b) => b.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const last = ids[ids.length - 1];
    const f = new FormData();
    f.set("id", String(last));
    f.set("dir", "up");
    await moveBannerAction(EMPTY, f);
    const after = listBanners(getDb()).map((b) => b.id);
    expect(after[after.length - 2]).toBe(last);
    expect(tags()).toEqual([TAG_BANNERS]);
  });
});
