// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/lib/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

import { AdminShell } from "./admin-shell";

afterEach(cleanup);

const links = () =>
  screen
    .getAllByRole("navigation", { name: "Menu do painel" })
    .flatMap((nav) => within(nav).queryAllByRole("link"))
    .map((a) => a.getAttribute("href"));

describe("AdminShell", () => {
  it("o funcionário não vê Usuários no menu", () => {
    render(
      <AdminShell user={{ name: "Ana Souza", role: "staff" }} nav>
        <p>conteúdo</p>
      </AdminShell>,
    );
    expect(links()).not.toContain("/admin/usuarios");
    expect(links()).toEqual(expect.arrayContaining(["/admin", "/admin/produtos", "/admin/estoque", "/admin/pedidos", "/admin/seguranca"]));
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("no celular: barra com 4 atalhos + Mais, e Mais abre o resto das telas", () => {
    render(
      <AdminShell user={{ name: "Dono", role: "owner" }} nav>
        <p>conteúdo</p>
      </AdminShell>,
    );
    const bar = screen.getByRole("navigation", { name: "Menu do celular" });
    expect(within(bar).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin", "/admin/produtos", "/admin/estoque", "/admin/pedidos"]);
    const more = within(bar).getByRole("button", { name: "Mais" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "Mais opções" })).toBeNull();
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    const sheet = screen.getByRole("dialog", { name: "Mais opções" });
    expect(within(sheet).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin/banners", "/admin/usuarios", "/admin/seguranca", "/admin/senha"]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Mais opções" })).toBeNull();
  });

  it("o Responsável vê Usuários no menu", () => {
    render(
      <AdminShell user={{ name: "Dono", role: "owner" }} nav>
        <p>conteúdo</p>
      </AdminShell>,
    );
    expect(links()).toContain("/admin/usuarios");
    expect(screen.getByRole("button", { name: /Sair/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver site/ })).toHaveAttribute("href", "/");
  });
});
