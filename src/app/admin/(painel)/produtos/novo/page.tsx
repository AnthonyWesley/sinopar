import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/session";
import { BackLink } from "../back-link";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <BackLink />
      <PageHeader title="Novo produto" intro="O produto entra ativo na loja, com estoque 0. Depois, lance o estoque na tela Estoque." />
      <ProductForm />
    </div>
  );
}
