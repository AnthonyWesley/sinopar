import { RotateCcw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { PurchasePanel } from "@/components/purchase-panel";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { getCategory, getProduct, products, relatedProducts, segments } from "@/lib/catalog";
import { returnsSummary, site } from "@/lib/site";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const product = getProduct((await props.params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.description} ${product.unit}. Retirada em ${site.city} (${site.state}) ou envio para todo o Brasil.`,
    // uma URL por produto: as variações não geram páginas próprias
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: { images: [{ url: product.image, width: 800, height: 800, alt: product.name }] },
  };
}

// params é dado da URL: fica dentro de Suspense (navegação instantânea do Next 16)
export default function ProductPage(props: PageProps<"/produto/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-site pt-4">
          <div className="h-11 w-72 rounded-md bg-surface-2" />
          <div className="mt-3 grid gap-10 lg:grid-cols-2">
            <div className="aspect-[4/3] rounded-2xl bg-surface-2 lg:aspect-square" />
            <div className="h-96 rounded-2xl bg-surface-2" />
          </div>
        </div>
      }
    >
      <ProductContent params={props.params} />
    </Suspense>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/produto/[slug]">, "params">) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const category = getCategory(product.category)!;
  const related = relatedProducts(product);
  const prices = product.variants.map((v) => v.price);

  return (
    <div className="container-site pt-4 pb-24 lg:pb-0">
      <Breadcrumbs
        items={[
          { label: "Produtos", href: "/produtos" },
          { label: category.name, href: `/produtos/${category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
        {/* 1. nome */}
        <div className="lg:col-start-2 lg:row-start-1">
          <p className="text-sm font-semibold text-muted">{category.name}</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">{product.name}</h1>
        </div>

        {/* 2. imagem */}
        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-line lg:sticky lg:top-28 lg:aspect-square">
            <Image src={product.image} alt={product.name} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain lg:object-cover" />
          </div>
        </div>

        {/* 3–6. preço, variação, estoque e compra · 7. entrega · 8. trocas */}
        <div className="lg:col-start-2">
          <PurchasePanel product={product} />

          <section aria-labelledby="entrega" className="mt-6">
            <h2 id="entrega" className="sr-only">
              Entrega e retirada
            </h2>
            <ShippingCalculator items={[{ qty: 1 }]} />
          </section>

          <section aria-label="Trocas e segurança" className="mt-4 rounded-xl ring-1 ring-line">
            <ul className="divide-y divide-line">
              <li className="flex gap-3 p-4">
                <RotateCcw className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Trocas e devoluções</p>
                  <p className="text-sm text-muted">
                    {returnsSummary.short}{" "}
                    <Link href="/servicos#trocas" className="font-medium text-ink underline underline-offset-4">
                      Como funciona
                    </Link>
                  </p>
                </div>
              </li>
              <li className="flex gap-3 p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Compra segura</p>
                  <p className="text-sm text-muted">Pagamento processado pelo Asaas. Não guardamos dados de cartão.</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="descricao">
          <h2 id="descricao" className="font-wide text-xl">
            Descrição
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">{product.description}</p>
          <p className="mt-3 text-muted">
            Indicado para: {product.segments.map((s) => segments.find((x) => x.slug === s)?.name).join(", ")}.
          </p>
        </section>
        <section aria-labelledby="especificacoes">
          <h2 id="especificacoes" className="font-wide text-xl">
            Especificações
          </h2>
          <dl className="mt-3 divide-y divide-line rounded-xl ring-1 ring-line">
            {[...product.specs, { label: "Embalagem", value: product.unit }, ...(product.variantName && product.variants.length > 1 ? [{ label: product.variantName, value: product.variants.map((v) => v.label).join(" · ") }] : [])].map((s) => (
              <div key={s.label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-3">
                <dt className="text-muted">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="relacionados">
          <h2 id="relacionados" className="font-wide mb-3 text-xl">
            Mais em {category.name.toLowerCase()}
          </h2>
          <ul className="rail">
            {related.map((p) => (
              <li key={p.slug} className="flex">
                <ProductCard product={p} rail />
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: `${site.url}${product.image}`,
          sku: product.variants[0].sku,
          category: category.name,
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: product.variants.length,
            availability: product.variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${site.url}/produto/${product.slug}`,
          },
        }}
      />
    </div>
  );
}
