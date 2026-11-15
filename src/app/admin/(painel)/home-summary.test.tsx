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

  it("cartão com pedidos fica em destaque; cartão zerado fica apagado", () => {
    render(<HomeSummary counts={{ pago: 2, separado: 0, pago_sem_estoque: 0 }} lowStock={[]} />);
    const pago = screen.getByRole("link", { name: /Pagos para separar/ });
    const separado = screen.getByRole("link", { name: /Separados para enviar/ });
    expect(pago).toHaveAttribute("data-state", "pendente");
    expect(separado).toHaveAttribute("data-state", "vazio");
  });

  it("mostra só os 8 mais urgentes (menor disponível primeiro) e link para o resto", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ sku: `C-${i}`, name: `Item ${i}`, label: "Padrão", available: (i * 7) % 6 }));
    render(<HomeSummary counts={{ pago: 0, separado: 0, pago_sem_estoque: 0 }} lowStock={many} />);
    const items = within(screen.getByRole("list", { name: "Códigos acabando" })).getAllByRole("link");
    expect(items).toHaveLength(8);
    const shown = items.map((a) => Number(a.querySelector("[data-available]")?.getAttribute("data-available")));
    expect(shown).toEqual([...shown].sort((a, b) => a - b));
    expect(shown[0]).toBe(0);
    expect(screen.getByRole("link", { name: "Ver os outros 3 no estoque" })).toHaveAttribute("href", "/admin/estoque?filtro=acabando");
  });

  it("com até 8 códigos não mostra o link de outros", () => {
    render(<HomeSummary counts={{ pago: 0, separado: 0, pago_sem_estoque: 0 }} lowStock={low} />);
    expect(screen.queryByRole("link", { name: /Ver os outros/ })).toBeNull();
  });

  it("lista os códigos acabando com o disponível", () => {
    render(<HomeSummary counts={{ pago: 0, separado: 0, pago_sem_estoque: 0 }} lowStock={low} />);
    const list = screen.getByRole("list", { name: "Códigos acabando" });
    const item = within(list).getByRole("link", { name: /Parafuso/ });
    expect(item).toHaveAttribute("href", "/admin/estoque/PB-6");
    expect(item).toHaveTextContent("3");
  });
});
