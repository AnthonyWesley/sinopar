import Image from "next/image";
import Link from "next/link";
import { fromPrice, totalStock, type Product } from "@/lib/catalog";
import { discountPercent } from "@/lib/format";
import { QuickAdd } from "./quick-add";
import { Price } from "./price";
import { StockStatus } from "./stock";

// Foto em moldura própria e texto solto embaixo. Altura estável: foto quadrada, nome sempre
// em 2 linhas, faixa de preço com espaço reservado para o preço "de" e botão no rodapé.
export function ProductCard({ product, priority = false, rail = false }: { product: Product; priority?: boolean; rail?: boolean }) {
  const best = fromPrice(product);
  const stock = totalStock(product);
  const varies = new Set(product.variants.map((v) => v.price)).size > 1;
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const href = `/produto/${product.slug}`;

  return (
    <article className={`group relative flex h-full flex-col ${rail ? "w-[min(66vw,15rem)] shrink-0 snap-start lg:w-full lg:min-w-0" : "w-full min-w-0"}`}>
      <Link href={href} className="block rounded-lg" tabIndex={-1} aria-hidden="true">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-line transition-shadow duration-150 group-hover:shadow-lg group-hover:ring-line-strong">
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 66vw"
            className={`object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.03] ${stock === 0 ? "opacity-60" : ""}`}
            priority={priority}
          />
          {best.compareAt && (
            <span className="absolute top-2 left-2 rounded-sm bg-discount px-2 py-0.5 text-sm font-bold text-white tabular-nums">
              −{discountPercent(best.price, best.compareAt)}%
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <p className="text-[0.8125rem] font-medium tracking-wide text-muted uppercase">{product.unit}</p>
        <h3 className="line-clamp-2 min-h-12 text-base leading-6 font-semibold">
          <Link href={href} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <Price price={best.price} compareAt={best.compareAt} from={varies} />
        <StockStatus stock={stock} />
        <div className="mt-auto pt-1.5">
          {single ? (
            <QuickAdd
              line={{
                sku: single.sku,
                slug: product.slug,
                name: product.name,
                variant: null,
                image: product.image,
                unitPrice: single.price,
                compareAt: single.compareAt,
                maxQty: single.stock,
              }}
              label={product.name}
            />
          ) : (
            <Link href={href} className="btn-outline w-full" aria-label={`Escolher ${product.variantName?.toLowerCase()} de ${product.name}`}>
              Escolher {product.variantName?.toLowerCase()}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
