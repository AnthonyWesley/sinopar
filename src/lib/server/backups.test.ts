import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { openDb } from "./db";
import { downloadFileName, runDailyBackup, snapshotDb, todayInCuiaba } from "./backups";

// Portado de kadoshi-sushi-page (server/backups.test.ts). Datas no fuso de Sinop-MT
// (America/Cuiaba, UTC−4 o ano todo).

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "fx-bk-"));

const withUser = (db: ReturnType<typeof openDb>) =>
  db
    .prepare("INSERT INTO users (email, name, password_hash, role, created_at) VALUES ('a@b.co', 'A', 'x', 'owner', 'x')")
    .run();

describe("backup diário", () => {
  it("data de Cuiabá", () => {
    expect(todayInCuiaba(new Date("2026-11-14T03:30:00Z"))).toBe("2026-11-13");
    expect(todayInCuiaba(new Date("2026-11-14T04:30:00Z"))).toBe("2026-11-14");
    expect(todayInCuiaba(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-01");
  });

  it("cria backups/site-AAAA-MM-DD.db com os dados, sem sobrar .tmp", async () => {
    const dir = tmp();
    const db = openDb(path.join(dir, "site.db"));
    withUser(db);
    const file = await runDailyBackup(db, dir, new Date("2026-11-13T12:00:00Z"));
    expect(file).toBe(path.join(dir, "backups", "site-2026-11-13.db"));
    // antes de abrir a cópia (abrir um banco WAL cria -shm/-wal ao lado)
    expect(fs.readdirSync(path.join(dir, "backups"))).toEqual(["site-2026-11-13.db"]);
    const copy = new Database(file!, { readonly: true });
    expect(copy.prepare("SELECT email FROM users").get()).toEqual({ email: "a@b.co" });
    copy.close();
    db.close();
  });

  it("no mesmo dia não duplica", async () => {
    const dir = tmp();
    const db = openDb(path.join(dir, "site.db"));
    await runDailyBackup(db, dir, new Date("2026-11-13T08:00:00Z"));
    expect(await runDailyBackup(db, dir, new Date("2026-11-13T18:00:00Z"))).toBeNull();
    expect(fs.readdirSync(path.join(dir, "backups"))).toEqual(["site-2026-11-13.db"]);
    db.close();
  });

  it("guarda só os 7 mais recentes", async () => {
    const dir = tmp();
    const bk = path.join(dir, "backups");
    fs.mkdirSync(bk);
    for (let d = 1; d <= 9; d++) fs.writeFileSync(path.join(bk, `site-2026-11-0${d}.db`), "x");
    fs.writeFileSync(path.join(bk, "outro-arquivo.txt"), "fica");
    const db = openDb(path.join(dir, "site.db"));
    await runDailyBackup(db, dir, new Date("2026-11-13T12:00:00Z"));
    expect(fs.readdirSync(bk).sort()).toEqual([
      "outro-arquivo.txt",
      "site-2026-11-04.db",
      "site-2026-11-05.db",
      "site-2026-11-06.db",
      "site-2026-11-07.db",
      "site-2026-11-08.db",
      "site-2026-11-09.db",
      "site-2026-11-13.db",
    ]);
    db.close();
  });
});

describe("cópia para download", () => {
  it("nome do arquivo com a data de Cuiabá", () => {
    expect(downloadFileName(new Date("2026-11-14T02:00:00Z"))).toBe("fixastore-dados-2026-11-13.db");
  });

  it("devolve um SQLite válido e não deixa arquivo temporário", async () => {
    const dir = tmp();
    const db = openDb(path.join(dir, "site.db"));
    withUser(db);
    const buf = await snapshotDb(db, dir);
    expect(buf.subarray(0, 15).toString()).toBe("SQLite format 3");
    expect(fs.readdirSync(dir).filter((f) => f.includes("download"))).toEqual([]);
    db.close();
  });
});
