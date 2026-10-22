import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Carrinho" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Carrinho</h1>
      <CartView />
    </div>
  );
}
