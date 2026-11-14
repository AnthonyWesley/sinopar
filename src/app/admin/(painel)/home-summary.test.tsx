// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { HomeSummary } from "./home-summary";

afterEach(cleanup);

const low = [{ sku: "PB-6", name: "Parafuso", label: "6 mm", available: 3 }];

describe("Início", () => {
  it("pago sem estoque > 0 aparece em destaque vermelho, com link para a aba", () => {
    render(<HomeSummary counts={{ pago: 2, separado: 1, pago_sem_estoque: 1 }} lowStock={low} />);
    const card = screen.getByRole("link", { name: /Pago sem estoque/ });
    expect(card).toHaveAttribute("href", "/admin/pedidos?etapa=pago_sem_estoque");
    expect(card.className).toMatch(/bg-error-soft/);
    expect(card).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /Pagos para separar/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Separados para enviar/ })).toHaveTextContent("1");
  });

  it("pago sem estoque = 0 não fica vermelho", () => {
    render(<HomeSummary counts={{ pago: 0, separado: 0, pago_sem_estoque: 0 }} lowStock={[]} />);
    expect(screen.getByRole("link", { name: /Pago sem estoque/ }).className).not.toMatch(/bg-error-soft/);
    expect(screen.getByText("Nenhum código acabando.")).toBeInTheDocument();
  });

  it("lista os códigos acabando com o disponível", () => {
    render(<HomeSummary counts={{ pago: 0, separado: 0, pago_sem_estoque: 0 }} lowStock={low} />);
    const list = screen.getByRole("list", { name: "Códigos acabando" });
    const item = within(list).getByRole("link", { name: /Parafuso/ });
    expect(item).toHaveAttribute("href", "/admin/estoque/PB-6");
    expect(item).toHaveTextContent("3");
  });
});
