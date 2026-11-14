import "server-only";
import convert from "heic-convert";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { dataDir } from "./db";

// Fotos de produto enviadas pelo painel (portado do site da Revival). Aceita JPG, PNG, WebP e
// HEIC (foto de iPhone) até 10 MB, sempre regravadas como WebP: o sharp decodifica e recodifica,
// o que descarta metadados (GPS, EXIF) e qualquer coisa escondida no arquivo. SVG não entra.
// Salva em `${DATA_DIR}/uploads/<uuid>.webp`, servido por src/app/uploads/[name]/route.ts.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** limite de pixels decodificados: barra "bombas" (arquivo pequeno que vira imagem gigante) */
export const MAX_INPUT_PIXELS = 50_000_000;

export const UPLOAD_ERRORS = {
  tooBig: "Foto muito grande (máximo 10 MB).",
  type: "Envie uma foto JPG, PNG, WebP ou HEIC.",
  unreadable: "Não consegui ler essa foto. Tente outra.",
} as const;

const HEIC_BRANDS = ["heic", "heif", "mif1", "heix", "hevc", "hevx", "msf1"];

/** Tipo pelos bytes (o nome do arquivo e o mime do navegador não valem). */
export function detectMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp" && HEIC_BRANDS.includes(buf.toString("latin1", 8, 12)))
    return "image/heic";
  return null;
}

// Dimensões declaradas no HEIF (caixas "ispe"), lidas sem decodificar nada.
// Devolve a maior área encontrada, ou null se não achar (o chamador recusa).
function heicPixels(buf: Buffer): number | null {
  let max: number | null = null;
  let from = 0;
  for (;;) {
    const i = buf.indexOf("ispe", from, "latin1");
    if (i < 4 || i + 16 > buf.length) break;
    const pixels = buf.readUInt32BE(i + 8) * buf.readUInt32BE(i + 12);
    if (max === null || pixels > max) max = pixels;
    from = i + 4;
  }
  return max;
}

/** Converte para WebP de no máximo 1600 px, girando conforme o EXIF. Lança se não conseguir ler. */
export async function processImage(buf: Buffer, mime: string): Promise<Buffer> {
  let input = buf;
  if (mime === "image/heic" || mime === "image/heif") {
    const pixels = heicPixels(buf);
    if (pixels === null || pixels > MAX_INPUT_PIXELS) throw new Error("HEIC com dimensões ausentes ou grandes demais");
    input = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.92 }));
  }
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

const UPLOAD_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/** só o nome que o próprio saveUpload gera: sem pasta, sem "..", sem barra */
export function isUploadName(name: string): boolean {
  return UPLOAD_NAME.test(name);
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

/** caminho no disco de um nome já validado por isUploadName */
export function uploadPath(name: string): string {
  return path.join(uploadsDir(), name);
}

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function saveUpload(buf: Buffer): Promise<UploadResult> {
  if (buf.length > MAX_UPLOAD_BYTES) return { ok: false, error: UPLOAD_ERRORS.tooBig };
  const mime = detectMime(buf);
  if (!mime) return { ok: false, error: UPLOAD_ERRORS.type };
  let out: Buffer;
  try {
    out = await processImage(buf, mime);
  } catch {
    return { ok: false, error: UPLOAD_ERRORS.unreadable };
  }
  const name = `${crypto.randomUUID()}.webp`;
  await fs.promises.mkdir(uploadsDir(), { recursive: true });
  await fs.promises.writeFile(uploadPath(name), out);
  return { ok: true, url: `/uploads/${name}` };
}

/** Apaga uma foto enviada pelo painel (`/uploads/<nome>`). Fotos de /images ficam intactas. */
export async function removeUpload(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const name = url.slice("/uploads/".length);
  if (!isUploadName(name)) return;
  await fs.promises.rm(uploadPath(name), { force: true });
}
