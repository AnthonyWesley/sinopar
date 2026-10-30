import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Listing, ListingSkeleton } from "@/components/listing";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Brocas, serras copo, discos e abrasivos, alicates, ferramentas manuais, organizadores e EPI com preço e estoque. Retirada em Sinop (MT) ou envio para todo o Brasil.",
  alternates: { canonical: "/produtos" },
};

export default function ProductsPage(props: PageProps<"/produtos">) {
  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Produtos" }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">Todos os produtos</h1>
      <Suspense fallback={<ListingSkeleton />}>
        <Listing searchParams={props.searchParams} base="/produtos" />
      </Suspense>
    </div>
  );
}
