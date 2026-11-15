// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BannerCarousel, type StoreBanner } from "./banner-carousel";

afterEach(cleanup);

const A: StoreBanner = { id: 1, title: "Black November: até 40% de desconto", desktop: "/uploads/a.webp", mobile: "/uploads/a-cel.webp", link: "/produtos" };
const B: StoreBanner = { id: 2, title: "Natal na Fixa Store", desktop: "/uploads/b.webp", mobile: "", link: "" };

describe("BannerCarousel", () => {
  it("um banner só: imagem com o texto como alt, link, sem botões de troca", () => {
    render(<BannerCarousel banners={[A]} />);
    const img = screen.getByRole("img", { name: A.title });
    expect(img).toHaveAttribute("src", A.desktop);
    expect(img.closest("a")).toHaveAttribute("href", "/produtos");
    expect(img.parentElement?.querySelector("source")).toHaveAttribute("srcset", A.mobile);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sem imagem de celular, o celular usa a do computador; sem link, não vira link", () => {
    render(<BannerCarousel banners={[B]} />);
    const img = screen.getByRole("img", { name: B.title });
    expect(img.parentElement?.querySelector("source")).toHaveAttribute("srcset", B.desktop);
    expect(img.closest("a")).toBeNull();
  });

  it("vários: mostra um por vez, com anterior/próximo, bolinhas e pausar", () => {
    render(<BannerCarousel banners={[A, B]} />);
    const slide = (title: string) => screen.getByRole("img", { name: title, hidden: true }).closest("[role=group]")!;
    expect(slide(A.title)).not.toHaveAttribute("hidden");
    expect(slide(B.title)).toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(slide(A.title)).toHaveAttribute("hidden");
    expect(slide(B.title)).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Mostrar banner 2 de 2" })).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: "Próximo banner" }));
    expect(slide(A.title)).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Banner anterior" }));
    expect(slide(B.title)).not.toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar banner 1 de 2" }));
    expect(slide(A.title)).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: /Pausar/ })).toBeInTheDocument();
  });
});
