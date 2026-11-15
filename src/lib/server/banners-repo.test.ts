import { describe, it, expect } from "vitest";
import type { BannerInput } from "../banners";
import { openDb } from "./db";
import { createBanner, deleteBanner, getBanner, listBanners, moveBanner, updateBanner } from "./banners-repo";

const IMG = "/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp";
const now = new Date("2026-11-14T12:00:00.000Z");
const input = (over: Partial<BannerInput> = {}): BannerInput => ({
  title: "Black November",
  imageDesktop: IMG,
  imageMobile: "",
  link: "/produtos",
  startsOn: "2026-11-20",
  endsOn: "",
  active: true,
  ...over,
});

describe("banners-repo", () => {
  it("cria, lê e edita mantendo os campos", () => {
    const db = openDb(":memory:");
    const id = createBanner(db, input(), now);
    expect(getBanner(db, id)).toEqual({ id, position: 1, ...input() });
    updateBanner(db, id, input({ title: "Natal", active: false, startsOn: "" }), now);
    expect(getBanner(db, id)).toMatchObject({ title: "Natal", active: false, startsOn: "", position: 1 });
    expect(getBanner(db, 999)).toBeNull();
  });

  it("banner novo entra no fim da fila", () => {
    const db = openDb(":memory:");
    const a = createBanner(db, input({ title: "A" }), now);
    const b = createBanner(db, input({ title: "B" }), now);
    expect(listBanners(db).map((x) => [x.id, x.position])).toEqual([
      [a, 1],
      [b, 2],
    ]);
  });

  it("mover troca de lugar com o vizinho; nas pontas não faz nada", () => {
    const db = openDb(":memory:");
    const a = createBanner(db, input({ title: "A" }), now);
    const b = createBanner(db, input({ title: "B" }), now);
    const c = createBanner(db, input({ title: "C" }), now);
    moveBanner(db, c, "up");
    expect(listBanners(db).map((x) => x.title)).toEqual(["A", "C", "B"]);
    moveBanner(db, a, "up");
    moveBanner(db, b, "down");
    expect(listBanners(db).map((x) => x.title)).toEqual(["A", "C", "B"]);
  });

  it("excluir devolve o banner apagado (para apagar as imagens) e mantém a ordem dos outros", () => {
    const db = openDb(":memory:");
    const a = createBanner(db, input({ title: "A" }), now);
    const b = createBanner(db, input({ title: "B" }), now);
    expect(deleteBanner(db, a)?.title).toBe("A");
    expect(deleteBanner(db, a)).toBeNull();
    expect(listBanners(db).map((x) => x.id)).toEqual([b]);
  });
});
