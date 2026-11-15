import { describe, it, expect } from "vitest";
import { mobileMenuFor, MOBILE_BAR_MAX } from "./menu";

const hrefs = (xs: { href: string }[]) => xs.map((x) => x.href);

describe("menu do celular", () => {
  it("Responsável: 4 atalhos na barra e o resto (com Trocar senha) em Mais", () => {
    const { bar, more } = mobileMenuFor("owner");
    expect(hrefs(bar)).toEqual(["/admin", "/admin/produtos", "/admin/estoque", "/admin/pedidos"]);
    expect(hrefs(more)).toEqual(["/admin/banners", "/admin/usuarios", "/admin/seguranca", "/admin/senha"]);
  });

  it("Funcionário: Mais com Banners e sem Usuários", () => {
    const { bar, more } = mobileMenuFor("staff");
    expect(hrefs(bar)).toHaveLength(4);
    expect(hrefs(more)).toEqual(["/admin/banners", "/admin/seguranca", "/admin/senha"]);
  });

  it("a barra nunca passa de 5 posições contando o Mais", () => {
    for (const role of ["owner", "staff"] as const) {
      const { bar, more } = mobileMenuFor(role);
      expect(bar.length + (more.length ? 1 : 0)).toBeLessThanOrEqual(MOBILE_BAR_MAX);
    }
  });
});
