// Roda uma vez quando o servidor do Next sobe. As tarefas (Responsável inicial, backup e
// varredura) só existem no runtime Node e nunca durante o `next build`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startServerJobs } = await import("./lib/server/jobs");
  startServerJobs();
}
