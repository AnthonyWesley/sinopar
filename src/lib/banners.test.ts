import { describe, it, expect } from "vitest";
import { bannerStatus, liveBanners, parseBannerForm, todayInStore, type Banner } from "./banners";

const IMG = "/uploads/0f8fad5b-d9cb-469f-a165-70867728950e.webp";
const IMG2 = "/uploads/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp";

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const fields = { title: "Black November: até 40% de desconto", imageDesktop: IMG, imageMobile: "", link: "", startsOn: "", endsOn: "", active: "on", ...over };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) f.append(k, v);
  return f;
}

const banner = (over: Partial<Banner> = {}): Banner => ({
  id: 1,
  title: "B",
  imageDesktop: IMG,
  imageMobile: "",
  link: "",
  startsOn: "",
  endsOn: "",
  active: true,
  position: 1,
  ...over,
});

describe("parseBannerForm", () => {
  it("aceita o mínimo: texto e imagem do computador", () => {
    const r = parseBannerForm(form());
    expect(r).toEqual({
      ok: true,
      input: { title: "Black November: até 40% de desconto", imageDesktop: IMG, imageMobile: "", link: "", startsOn: "", endsOn: "", active: true },
    });
  });

  it("exige texto do banner e imagem do computador", () => {
    const r = parseBannerForm(form({ title: "  ", imageDesktop: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.title).toBeTruthy();
    expect(r.errors.imageDesktop).toBeTruthy();
  });

  it("imagem só pode ser uma enviada pelo painel", () => {
    const r = parseBannerForm(form({ imageDesktop: "https://outro.site/x.png", imageMobile: "/uploads/../site.db" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.imageDesktop).toBeTruthy();
    expect(r.errors.imageMobile).toBeTruthy();
  });

  it("link: página da loja (/...) ou endereço https; nada de // nem javascript:", () => {
    expect(parseBannerForm(form({ link: "/produtos/alicates" })).ok).toBe(true);
    expect(parseBannerForm(form({ link: "https://wa.me/5566999999999" })).ok).toBe(true);
    for (const bad of ["//evil.com", "javascript:alert(1)", "http://inseguro.com", "produtos"]) {
      const r = parseBannerForm(form({ link: bad }));
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.errors.link).toBeTruthy();
    }
  });

  it("datas no formato do campo de data, e o fim não pode ser antes do início", () => {
    expect(parseBannerForm(form({ startsOn: "2026-11-20", endsOn: "2026-11-30" })).ok).toBe(true);
    const r = parseBannerForm(form({ startsOn: "2026-11-30", endsOn: "2026-11-20" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsOn).toBeTruthy();
    expect(parseBannerForm(form({ startsOn: "30/11/2026" })).ok).toBe(false);
  });

  it("sem a caixa marcada, o banner fica pausado", () => {
    const f = form();
    f.delete("active");
    const r = parseBannerForm(f);
    expect(r.ok && r.input.active).toBe(false);
  });
});

describe("bannerStatus", () => {
  const today = "2026-11-14";
  it("no ar sem datas", () => expect(bannerStatus(banner(), today)).toBe("no-ar"));
  it("pausado ganha de tudo", () => expect(bannerStatus(banner({ active: false }), today)).toBe("pausado"));
  it("agendado antes do início", () => expect(bannerStatus(banner({ startsOn: "2026-11-15" }), today)).toBe("agendado"));
  it("encerrado depois do fim", () => expect(bannerStatus(banner({ endsOn: "2026-11-13" }), today)).toBe("encerrado"));
  it("no ar no primeiro e no último dia", () => {
    expect(bannerStatus(banner({ startsOn: today }), today)).toBe("no-ar");
    expect(bannerStatus(banner({ endsOn: today }), today)).toBe("no-ar");
  });
});

describe("liveBanners", () => {
  it("só os que estão no ar, na ordem de posição", () => {
    const list = [
      banner({ id: 1, position: 2 }),
      banner({ id: 2, position: 1, imageDesktop: IMG2 }),
      banner({ id: 3, active: false }),
      banner({ id: 4, startsOn: "2099-01-01" }),
    ];
    expect(liveBanners(list, "2026-11-14").map((b) => b.id)).toEqual([2, 1]);
  });
});

describe("todayInStore", () => {
  it("usa o horário de Sinop (UTC-4): 02h UTC ainda é o dia anterior", () => {
    expect(todayInStore(new Date("2026-11-15T02:00:00Z"))).toBe("2026-11-14");
    expect(todayInStore(new Date("2026-11-15T05:00:00Z"))).toBe("2026-11-15");
  });
});
