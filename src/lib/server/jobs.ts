import crypto from "node:crypto";
import { ensureOwner } from "./auth";
import { runDailyBackup } from "./backups";
import { dataDir, getDb } from "./db";
import { sweep } from "./stock";

// Tarefas do servidor, iniciadas por src/instrumentation.ts (só no runtime Node, fora do build):
//   - cria o Responsável a partir de ADMIN_EMAIL/ADMIN_PASSWORD, se ainda não houver;
//   - backup na subida e a cada 6 h (um arquivo por dia, então só a primeira do dia grava);
//   - varredura de pedidos vencidos na subida e a cada 1 h.
//
// Cache da loja: `revalidateTag` só funciona dentro de uma requisição (fora dela o Next lança
// "static generation store missing"). Por isso a varredura de hora em hora chama a rota interna
// POST /api/interno/varredura no próprio processo, que varre e invalida as tags. A chave dessa
// rota é aleatória, criada aqui e guardada só na memória do processo. Se a chamada falhar, a
// varredura roda direto no banco e a loja se atualiza sozinha pelo cacheLife("hours"); a primeira
// falha gera um aviso no log (em geral PORT ou HOSTNAME fora do padrão 3000 / 0.0.0.0), e as
// seguintes não repetem o aviso.
// Na subida não precisa invalidar: o cache em memória começa vazio.

const HOUR = 60 * 60 * 1000;

type JobsGlobal = { __fxJobsStarted?: boolean; __fxInternalKey?: string; __fxSweepRouteWarned?: boolean };
const g = globalThis as unknown as JobsGlobal;

/** Chave da rota interna de varredura, ou undefined se as tarefas não foram iniciadas neste processo. */
export function internalKey(): string | undefined {
  return g.__fxInternalKey;
}

function log(msg: string, err?: unknown) {
  if (err) console.error(`[tarefas] ${msg}:`, err instanceof Error ? err.message : err);
  else console.log(`[tarefas] ${msg}`);
}

async function backup() {
  try {
    const file = await runDailyBackup(getDb(), dataDir(), new Date());
    if (file) log(`backup salvo em ${file}`);
  } catch (err) {
    log("backup falhou", err);
  }
}

function sweepDirect() {
  try {
    const { expired } = sweep(getDb(), new Date());
    if (expired.length) log(`varredura: ${expired.length} pedido(s) vencido(s)`);
  } catch (err) {
    log("varredura falhou", err);
  }
}

/** Varredura de hora em hora pela rota interna (exportada para os testes). */
export async function sweepViaRoute(): Promise<void> {
  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/interno/varredura`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-fx-interno": g.__fxInternalKey ?? "" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { expired } = (await res.json()) as { expired: number };
    if (expired) log(`varredura: ${expired} pedido(s) vencido(s), cache invalidado`);
  } catch (err) {
    if (!g.__fxSweepRouteWarned) {
      g.__fxSweepRouteWarned = true;
      console.warn(
        `[tarefas] AVISO: a varredura não conseguiu chamar ${url} (${err instanceof Error ? err.message : String(err)}). ` +
          "Confira se o servidor escuta em todas as interfaces (HOSTNAME=0.0.0.0) e se PORT é a porta do servidor. " +
          "Enquanto isso a varredura roda direto no banco, e a loja leva até 1 h para mostrar o estoque liberado. " +
          "Este aviso aparece só uma vez.",
      );
    }
    sweepDirect();
  }
}

export function startServerJobs(): void {
  if (g.__fxJobsStarted) return; // o dev server pode carregar a instrumentação de novo
  g.__fxJobsStarted = true;
  g.__fxInternalKey = crypto.randomBytes(32).toString("hex");

  try {
    ensureOwner(getDb(), process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  } catch (err) {
    log("não foi possível criar o Responsável", err);
  }

  void backup();
  setInterval(() => void backup(), 6 * HOUR).unref();

  sweepDirect();
  setInterval(() => void sweepViaRoute(), HOUR).unref();
}
