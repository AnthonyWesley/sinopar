import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Listing, ListingSkeleton } from "@/components/listing";
import { categories, getCategory } from "@/lib/catalog";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return categories.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata(props: PageProps<"/produtos/[categoria]">): Promise<Metadata> {
  const category = getCategory((await props.params).categoria);
  if (!category) return {};
  return {
    title: `${category.name} em ${site.city}`,
    description: `${category.description} Compre online na ${site.name}, com retirada em ${site.city} (${site.state}) ou envio para todo o Brasil.`,
    alternates: { canonical: `/produtos/${category.slug}` },
  };
}

// params é dado da URL: fica dentro de Suspense para o "esqueleto" da rota ser o mesmo para
// todas as categorias (navegação instantânea do Next 16)
export default function CategoryPage(props: PageProps<"/produtos/[categoria]">) {
  return (
    <Suspense
      fallback={
        <div className="container-site pt-4">
          <div className="h-11 w-48 rounded-md bg-surface-2" />
          <div className="mt-2 h-9 w-64 rounded-md bg-surface-2" />
          <ListingSkeleton />
        </div>
      }
    >
      <CategoryContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function CategoryContent({ params, searchParams }: Pick<PageProps<"/produtos/[categoria]">, "params" | "searchParams">) {
  const category = getCategory((await params).categoria);
  if (!category) notFound();
  const base = `/produtos/${category.slug}`;

  return (
    <div className="container-site pt-4">
      <Breadcrumbs items={[{ label: "Produtos", href: "/produtos" }, { label: category.name }]} />
      <h1 className="font-wide mt-2 text-[length:var(--text-title)]">{category.name}</h1>
      <p className="mt-1 text-muted">{category.description}</p>
      <Suspense fallback={<ListingSkeleton />}>
        <Listing searchParams={searchParams} base={base} category={category.slug} />
      </Suspense>
    </div>
  );
}
