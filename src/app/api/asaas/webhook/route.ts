import { revalidateTag } from "next/cache";
import { TAG_CATALOG, productTag } from "@/lib/cache-tags";
import { processAsaasEvent, tokenMatches } from "@/lib/server/asaas-webhook";
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
  let result: { status: number; slugs: string[] };
  try {
    result = processAsaasEvent(getDb(), body, new Date());
  } catch (e) {
    // erro transitório (banco ocupado/trancado): 500 para o Asaas reenviar
    console.log(`[asaas] erro transitório: ${String((e as Error)?.message ?? e).slice(0, 100)}`);
    return new Response(null, { status: 500, headers });
  }
  const { status, slugs } = result;
  if (slugs.length) {
    revalidateTag(TAG_CATALOG, "max");
    for (const slug of slugs) revalidateTag(productTag(slug), "max");
  }
  return Response.json({ ok: status === 200 }, { status, headers });
}
