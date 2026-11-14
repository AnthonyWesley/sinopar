import fs from "node:fs";
import { isUploadName, uploadPath } from "@/lib/server/images";

// GET /uploads/<nome>.webp: fotos enviadas pelo painel, que ficam em ${DATA_DIR}/uploads (fora de
// public/, porque o volume de dados é que sobrevive a um novo deploy). Só aceita o nome exato
// que o painel gera (uuid.webp): nada de pasta, "..", barra ou contrabarra. O nome nunca se
// repete (cada envio gera um novo), por isso o cache pode ser longo e imutável.

const notFound = () => new Response("Não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[name]">): Promise<Response> {
  const { name } = await ctx.params;
  if (!isUploadName(name)) return notFound();
  let data: Buffer;
  try {
    data = await fs.promises.readFile(uploadPath(name));
  } catch {
    return notFound();
  }
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
