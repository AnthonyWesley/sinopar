import { revalidateTag } from "next/cache";
import { TAG_CATALOG, productTag } from "@/lib/cache-tags";
import { handleAsaasEvent, tokenMatches } from "@/lib/server/asaas-webhook";
import { getDb } from "@/lib/server/db";

// POST /api/asaas/webhook: eventos de pagamento do Asaas. Autenticado pelo cabeçalho
// `asaas-access-token` (ASAAS_WEBHOOK_TOKEN); sem a variável configurada, recusa tudo.

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  if (!tokenMatches(request.headers.get("asaas-access-token"))) {
    return new Response(null, { status: 401, headers });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400, headers });
  }
  const { status, slugs } = handleAsaasEvent(getDb(), body, new Date());
  if (slugs.length) {
    revalidateTag(TAG_CATALOG, "max");
    for (const slug of slugs) revalidateTag(productTag(slug), "max");
  }
  return Response.json({ ok: status === 200 }, { status, headers });
}
