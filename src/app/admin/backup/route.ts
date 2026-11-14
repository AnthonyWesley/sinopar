import { downloadFileName, snapshotDb } from "@/lib/server/backups";
import { dataDir, getDb } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/session";

// GET /admin/backup: cópia do banco na hora, só para o Responsável. Não muda nada no servidor
// (GET sem efeito colateral), por isso não precisa de proteção de Origin; o cookie é SameSite=Lax.

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (user.role !== "owner" || user.mustChangePassword) {
    return Response.json({ error: "Apenas o Responsável pode fazer isso." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const data = await snapshotDb(getDb(), dataDir());
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${downloadFileName(new Date())}"`,
      "Cache-Control": "no-store",
    },
  });
}
