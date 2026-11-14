import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Db } from "./db";

// Cópias do banco. Portado de kadoshi-sushi-page (server/backups.ts), com a data no fuso de
// Sinop-MT (America/Cuiaba).

const PATTERN = /^site-\d{4}-\d{2}-\d{2}\.db$/;

/** "Hoje" em Cuiabá (YYYY-MM-DD). */
export function todayInCuiaba(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cuiaba" }).format(now);
}

/** Nome do arquivo que o Responsável baixa pelo painel. */
export function downloadFileName(now: Date): string {
  return `fixastore-dados-${todayInCuiaba(now)}.db`;
}

// Uma cópia por dia em <dataDir>/backups/site-AAAA-MM-DD.db, guardando as `keep` mais recentes.
// Grava num .tmp e renomeia, para nunca deixar uma cópia pela metade com o nome final.
// Devolve o arquivo criado, ou null se a cópia do dia já existia.
export async function runDailyBackup(db: Db, dataDir: string, now: Date, keep = 7): Promise<string | null> {
  const dir = path.join(dataDir, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `site-${todayInCuiaba(now)}.db`);
  let created: string | null = null;
  if (!fs.existsSync(file)) {
    const tmp = `${file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    try {
      await db.backup(tmp);
      fs.renameSync(tmp, file);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
    created = file;
  }
  const old = fs.readdirSync(dir).filter((f) => PATTERN.test(f)).sort().reverse().slice(keep);
  for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  return created;
}

// Cópia na hora, para o Responsável baixar. Lê para a memória e apaga o arquivo temporário.
export async function snapshotDb(db: Db, dataDir: string): Promise<Buffer> {
  const tmp = path.join(dataDir, `.download-${crypto.randomBytes(6).toString("hex")}.db`);
  try {
    await db.backup(tmp);
    return fs.readFileSync(tmp);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
