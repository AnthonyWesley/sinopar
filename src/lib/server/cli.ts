import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { dataDir, openDb, type Db } from "./db";
import { resetOwner } from "./users";

// Comandos de emergência, rodados dentro do container (sem painel):
//   node cli.js reset-owner --email <e-mail> --password <senha temporária>
//   node cli.js backup <arquivo.db>
// O bundle (cli.js, ao lado do server.js do standalone) é gerado por scripts/build-cli.mjs.
// Usa o mesmo banco do site: ${DATA_DIR}/site.db.

export const USAGE = `Uso:
  node cli.js reset-owner --email <e-mail> --password <senha temporária>
      Define e-mail e senha do Responsável. A senha precisa ser trocada no próximo login;
      o código de recuperação é apagado e as sessões abertas caem.
  node cli.js backup <arquivo.db>
      Grava uma cópia consistente do banco no arquivo indicado (que não pode existir).

O banco usado é \${DATA_DIR}/site.db (DATA_DIR padrão: ./data).`;

export type CliIo = { out: (line: string) => void; err: (line: string) => void };

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

function openExisting(io: CliIo): Db | null {
  const file = path.join(dataDir(), "site.db");
  if (!fs.existsSync(file)) {
    io.err(`Banco não encontrado em ${path.resolve(file)}. Confira a variável DATA_DIR.`);
    return null;
  }
  return openDb(file);
}

/** Roda um comando e devolve o código de saída (0 = deu certo). */
export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const [command, ...args] = argv;

  if (command === "reset-owner") {
    const email = flag(args, "--email");
    const password = flag(args, "--password");
    if (!email || !password) {
      io.err("Informe --email e --password.\n\n" + USAGE);
      return 2;
    }
    const db = openExisting(io);
    if (!db) return 1;
    try {
      await resetOwner(db, email, password);
      io.out(`Responsável redefinido (${email.trim().toLowerCase()}). Entre com a senha temporária e troque no primeiro acesso.`);
      return 0;
    } catch (e) {
      io.err(e instanceof Error ? e.message : String(e));
      return 1;
    } finally {
      db.close();
    }
  }

  if (command === "backup") {
    const target = args[0];
    if (!target || target.startsWith("--")) {
      io.err("Informe o arquivo de destino.\n\n" + USAGE);
      return 2;
    }
    const dest = path.resolve(target);
    if (fs.existsSync(dest)) {
      io.err(`O arquivo ${dest} já existe. Escolha outro nome.`);
      return 1;
    }
    const db = openExisting(io);
    if (!db) return 1;
    // grava num .tmp e renomeia, para nunca deixar uma cópia pela metade com o nome final
    const tmp = `${dest}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    try {
      await db.backup(tmp);
      fs.renameSync(tmp, dest);
      io.out(`Cópia salva em ${dest}`);
      return 0;
    } catch (e) {
      io.err(`Não consegui gravar a cópia: ${e instanceof Error ? e.message : String(e)}`);
      return 1;
    } finally {
      fs.rmSync(tmp, { force: true });
      db.close();
    }
  }

  if (command === "help" || command === "--help" || command === "-h") {
    io.out(USAGE);
    return 0;
  }
  io.err((command ? `Comando desconhecido: ${command}\n\n` : "") + USAGE);
  return 2;
}
