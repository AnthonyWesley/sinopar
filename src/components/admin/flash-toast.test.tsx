// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FlashToast } from "./flash-toast";

afterEach(cleanup);

describe("FlashToast", () => {
  it("mostra o aviso e tira o parâmetro da URL, para recarregar a página não repetir o aviso", () => {
    window.history.replaceState(null, "", "/admin/produtos/5?criado=1&aba=x#fotos");
    render(<FlashToast param="criado" message="Produto cadastrado." />);
    expect(screen.getByRole("status")).toHaveTextContent("Produto cadastrado.");
    expect(window.location.pathname).toBe("/admin/produtos/5");
    expect(window.location.search).toBe("?aba=x");
    expect(window.location.hash).toBe("#fotos");
  });

  it("sem aviso, não mexe na URL", () => {
    window.history.replaceState(null, "", "/admin/produtos?q=bucha");
    render(<FlashToast param="excluido" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(window.location.search).toBe("?q=bucha");
  });
});
