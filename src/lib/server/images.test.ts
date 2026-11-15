import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-images-"));
process.env.DATA_DIR = dir;

const convert = vi.hoisted(() => vi.fn());
vi.mock("heic-convert", () => ({ default: convert }));

import { detectMime, processImage, saveUpload, uploadPath, isUploadName, MAX_UPLOAD_BYTES } from "./images";

const png = (width = 40, height = 30) =>
  sharp({ create: { width, height, channels: 3, background: "#c33" } }).png().toBuffer();

// ftyp 'heic' + uma caixa ispe declarando width x height (sem imagem de verdade)
function fakeHeic(width?: number, height?: number): Buffer {
  const ftyp = Buffer.concat([Buffer.from([0, 0, 0, 16]), Buffer.from("ftypheic"), Buffer.alloc(4)]);
  if (width === undefined) return Buffer.concat([ftyp, Buffer.alloc(32)]);
  const ispe = Buffer.alloc(20);
  ispe.writeUInt32BE(20, 0);
  ispe.write("ispe", 4, "latin1");
  ispe.writeUInt32BE(width, 12);
  ispe.writeUInt32BE(height!, 16);
  return Buffer.concat([ftyp, ispe]);
}

describe("saveUpload", () => {
  it("PNG vira WebP salvo em DATA_DIR/uploads", async () => {
    const r = await saveUpload(await png());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
    const file = path.join(dir, "uploads", r.url.slice("/uploads/".length));
    expect((await sharp(file).metadata()).format).toBe("webp");
    expect(uploadPath(r.url.slice("/uploads/".length))).toBe(file);
  });

  it("foto grande é reduzida para caber em 1600 px", async () => {
    const r = await saveUpload(await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#123" } }).jpeg().toBuffer());
    if (!r.ok) throw new Error(r.error);
    const meta = await sharp(path.join(dir, r.url)).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 1067]);
  });

  it("banner pode ir até 2400 px (maxSize)", async () => {
    const r = await saveUpload(await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#123" } }).jpeg().toBuffer(), { maxSize: 2400 });
    if (!r.ok) throw new Error(r.error);
    const meta = await sharp(path.join(dir, r.url)).metadata();
    expect([meta.width, meta.height]).toEqual([2400, 1200]);
  });

  it("arquivo de 11 MB é recusado", async () => {
    const big = Buffer.concat([await png(), Buffer.alloc(11 * 1024 * 1024)]);
    expect(big.length).toBeGreaterThan(MAX_UPLOAD_BYTES);
    expect(await saveUpload(big)).toEqual({ ok: false, error: "Foto muito grande (máximo 10 MB)." });
  });

  it(".svg é recusado (o tipo vem dos bytes)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
    expect(detectMime(svg)).toBeNull();
    expect(await saveUpload(svg)).toEqual({ ok: false, error: "Envie uma foto JPG, PNG, WebP ou HEIC." });
  });

  it("imagem com pixels demais (bomba de descompressão) é recusada", async () => {
    const bomb = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: "#123" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(await saveUpload(bomb)).toEqual({ ok: false, error: "Não consegui ler essa foto. Tente outra." });
  });

  it("nome de upload: só o formato que a gente gera", () => {
    expect(isUploadName("0f8e2c4a-1b2c-4d5e-8f90-123456789abc.webp")).toBe(true);
    for (const bad of ["../x", "..", "a/b.webp", "a\\b.webp", "", "x.svg", ".webp"]) expect(isUploadName(bad)).toBe(false);
  });
});

describe("HEIC", () => {
  beforeEach(() => convert.mockReset());

  it("20000x20000 é recusado antes do heic-convert", async () => {
    const buf = fakeHeic(20000, 20000);
    expect(detectMime(buf)).toBe("image/heic");
    await expect(processImage(buf, "image/heic")).rejects.toThrow();
    expect(convert).not.toHaveBeenCalled();
  });

  it("sem dimensões declaradas: recusa", async () => {
    await expect(processImage(fakeHeic(), "image/heic")).rejects.toThrow();
    expect(convert).not.toHaveBeenCalled();
  });

  it("dimensões normais seguem para o heic-convert e saem em WebP", async () => {
    const jpg = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    convert.mockResolvedValue(new Uint8Array(jpg).buffer);
    const out = await processImage(fakeHeic(4032, 3024), "image/heic");
    expect(convert).toHaveBeenCalledOnce();
    expect((await sharp(out).metadata()).format).toBe("webp");
  });
});
