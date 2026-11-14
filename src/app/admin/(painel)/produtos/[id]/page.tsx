import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Toast } from "@/components/admin/toast";
import { getAdminProduct } from "@/lib/server/catalog-repo";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/session";
import { BackLink } from "../back-link";
import { ProductActions } from "../product-actions";
import { ProductForm } from "../product-form";
import { SituationBadge } from "../situation-badge";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage(props: PageProps<"/admin/produtos/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const n = Number(id);
  const product = /^\d+$/.test(id) && Number.isSafeInteger(n) ? getAdminProduct(getDb(), n) : null;
  if (!product) notFound();
  const created = Boolean((await props.searchParams).criado);

  return (
    <div className="space-y-5">
      <BackLink />
      <PageHeader
        title={<span className="break-words">{product.name}</span>}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            <SituationBadge situation={product.situation} />
            {product.status === "ativo" ? (
              <Link href={`/produto/${product.slug}`} target="_blank" className="inline-flex min-h-11 items-center gap-1 font-medium text-ink underline underline-offset-4">
                Ver na loja <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </Link>
            ) : (
              <span>Fora da loja enquanto estiver pausado.</span>
            )}
          </span>
        }
      />
      <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Situação</h2>
        <ProductActions id={product.id} name={product.name} status={product.status} />
      </section>
      <ProductForm product={product} />
      <Toast message={created ? "Produto cadastrado. Lance o estoque na tela Estoque." : undefined} token={created} />
    </div>
  );
}
