import "server-only";
import type { Banner, BannerInput } from "../banners";
import type { Db } from "./db";

// Banners da página inicial no SQLite. A ordem (`position`) é a do carrossel: 1 primeiro.

type Row = {
  id: number;
  title: string;
  image_desktop: string;
  image_mobile: string;
  link: string;
  starts_on: string;
  ends_on: string;
  active: number;
  position: number;
};

const COLS = "id, title, image_desktop, image_mobile, link, starts_on, ends_on, active, position";

const toBanner = (r: Row): Banner => ({
  id: r.id,
  title: r.title,
  imageDesktop: r.image_desktop,
  imageMobile: r.image_mobile,
  link: r.link,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  active: r.active === 1,
  position: r.position,
});

export function listBanners(db: Db): Banner[] {
  return (db.prepare(`SELECT ${COLS} FROM banners ORDER BY position, id`).all() as Row[]).map(toBanner);
}

export function getBanner(db: Db, id: number): Banner | null {
  const r = db.prepare(`SELECT ${COLS} FROM banners WHERE id = ?`).get(id) as Row | undefined;
  return r ? toBanner(r) : null;
}

export function createBanner(db: Db, b: BannerInput, now: Date): number {
  const at = now.toISOString();
  const next = (db.prepare("SELECT COALESCE(MAX(position), 0) + 1 AS p FROM banners").get() as { p: number }).p;
  const r = db
    .prepare(
      `INSERT INTO banners (title, image_desktop, image_mobile, link, starts_on, ends_on, active, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(b.title, b.imageDesktop, b.imageMobile, b.link, b.startsOn, b.endsOn, b.active ? 1 : 0, next, at, at);
  return Number(r.lastInsertRowid);
}

/** Devolve false se o banner não existe. */
export function updateBanner(db: Db, id: number, b: BannerInput, now: Date): boolean {
  const r = db
    .prepare(
      `UPDATE banners SET title = ?, image_desktop = ?, image_mobile = ?, link = ?, starts_on = ?, ends_on = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(b.title, b.imageDesktop, b.imageMobile, b.link, b.startsOn, b.endsOn, b.active ? 1 : 0, now.toISOString(), id);
  return r.changes > 0;
}

/** Apaga e devolve o banner apagado (quem chama remove as imagens), ou null se não existia. */
export function deleteBanner(db: Db, id: number): Banner | null {
  return db.transaction(() => {
    const b = getBanner(db, id);
    if (!b) return null;
    db.prepare("DELETE FROM banners WHERE id = ?").run(id);
    return b;
  })();
}

/** Troca o banner de lugar com o vizinho de cima ou de baixo. Nas pontas não faz nada. */
export function moveBanner(db: Db, id: number, dir: "up" | "down"): boolean {
  return db.transaction(() => {
    const list = listBanners(db);
    const i = list.findIndex((b) => b.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return false;
    // renumera 1..n já com a troca, para não depender de posições repetidas ou com buracos
    [list[i], list[j]] = [list[j], list[i]];
    const set = db.prepare("UPDATE banners SET position = ? WHERE id = ?");
    list.forEach((b, k) => set.run(k + 1, b.id));
    return true;
  })();
}
