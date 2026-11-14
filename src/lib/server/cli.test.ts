import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { openDb } from "./db";
import { attemptLogin, ensureOwner } from "./auth";
import { runCli } from "./cli";

// Comandos de emergência do container (node cli.js ...), sobre um DATA_DIR temporário.

let dir: string;
let lines: { out: string[]; err: string[] };
const io = { out: (l: string) => lines.out.push(l), err: (l: string) => lines.err.push(l) };
const prevDataDir = process.env.DATA_DIR;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-cli-"));
  process.env.DATA_DIR = dir;
  lines = { out: [], err: [] };
});
afterEach(() => {
  if (prevDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = prevDataDir;
});

function siteDb() {
  const db = openDb(path.join(dir, "site.db"));
  ensureOwner(db, "dono@fixa.test", "senha-inicial-1");
  db.prepare("UPDATE users SET must_change_password = 0, recovery_hash = 'scrypt$aa$bb' WHERE role = 'owner'").run();
  return db;
}

describe("cli reset-owner", () => {
  it("troca e-mail e senha, exige troca no próximo login e zera o código de recuperação", async () => {
    siteDb().close();
    const code = await runCli(["reset-owner", "--email", "Novo@Fixa.test", "--password", "temporaria-123"], io);
    expect(code).toBe(0);
    expect(lines.out.join("\n")).toMatch(/novo@fixa\.test/);
    const db = openDb(path.join(dir, "site.db"));
    expect(db.prepare("SELECT email, must_change_password AS m, recovery_hash AS r FROM users WHERE role = 'owner'").get()).toEqual({
      email: "novo@fixa.test",
      m: 1,
      r: null,
    });
    const r = await attemptLogin(db, { email: "novo@fixa.test", password: "temporaria-123", ip: "10.0.0.1", now: new Date() });
    expect(r.ok).toBe(true);
    db.close();
  });

  it("sem --email ou --password: código 2 e a ajuda", async () => {
    siteDb().close();
    expect(await runCli(["reset-owner", "--email", "a@b.co"], io)).toBe(2);
    expect(lines.err.join("\n")).toMatch(/Uso:/);
  });

  it("senha curta: erro claro e nada muda", async () => {
    siteDb().close();
    expect(await runCli(["reset-owner", "--email", "a@b.co", "--password", "curta"], io)).toBe(1);
    expect(lines.err.join("\n")).toMatch(/8 caracteres/);
  });

  it("sem banco no DATA_DIR: recusa em vez de criar um banco vazio", async () => {
    expect(await runCli(["reset-owner", "--email", "a@b.co", "--password", "temporaria-123"], io)).toBe(1);
    expect(lines.err.join("\n")).toMatch(/DATA_DIR/);
    expect(fs.existsSync(path.join(dir, "site.db"))).toBe(false);
  });
});

describe("cli backup", () => {
  it("grava uma cópia consistente com os dados, sem sobrar .tmp", async () => {
    siteDb().close();
    const dest = path.join(dir, "copia.db");
    expect(await runCli(["backup", dest], io)).toBe(0);
    const copy = new Database(dest, { readonly: true });
    expect(copy.prepare("SELECT email FROM users").all()).toEqual([{ email: "dono@fixa.test" }]);
    copy.close();
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("não sobrescreve um arquivo que já existe", async () => {
    siteDb().close();
    const dest = path.join(dir, "existe.db");
    fs.writeFileSync(dest, "x");
    expect(await runCli(["backup", dest], io)).toBe(1);
    expect(fs.readFileSync(dest, "utf8")).toBe("x");
  });

  it("sem destino: código 2", async () => {
    expect(await runCli(["backup"], io)).toBe(2);
  });
});

describe("cli sem comando", () => {
  it("comando desconhecido mostra a ajuda com código 2", async () => {
    expect(await runCli(["apagar-tudo"], io)).toBe(2);
    expect(lines.err.join("\n")).toMatch(/Comando desconhecido/);
  });
});
