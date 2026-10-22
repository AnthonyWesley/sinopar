import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-site">
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Finalizar compra</h1>
      <p className="mt-1 text-muted">Sem cadastro: preencha os dados abaixo e confirme.</p>
      <CheckoutForm />
    </div>
  );
}
