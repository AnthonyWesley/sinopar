import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { TAG_CATALOG, productTag } from "@/lib/cache-tags";
import { getDb } from "@/lib/server/db";
import { internalKey } from "@/lib/server/jobs";
import { sweep } from "@/lib/server/stock";

// POST /api/interno/varredura: chamada só pelo próprio servidor (src/lib/server/jobs.ts), de hora
// em hora, para varrer os pedidos vencidos e invalidar o cache da loja (revalidateTag só funciona
// dentro de uma requisição). A chave é aleatória e vive só na memória do processo.

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  const key = internalKey();
  const given = Buffer.from(request.headers.get("x-fx-interno") ?? "");
  if (!key || given.length !== Buffer.byteLength(key) || !crypto.timingSafeEqual(given, Buffer.from(key))) {
    return notFound();
  }
  const { expired, slugs } = sweep(getDb(), new Date());
  if (slugs.length) {
    revalidateTag(TAG_CATALOG, "max");
    for (const slug of slugs) revalidateTag(productTag(slug), "max");
  }
  return Response.json({ expired: expired.length }, { headers: { "Cache-Control": "no-store" } });
}
