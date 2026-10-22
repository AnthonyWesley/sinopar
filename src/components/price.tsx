import { discountPercent, formatPrice } from "@/lib/format";

/** preço em destaque; com desconto, sempre junto do preço original */
export function Price({
  price,
  compareAt,
  from = false,
  size = "md",
}: {
  price: number;
  compareAt?: number;
  from?: boolean;
  size?: "md" | "lg";
}) {
  const discounted = compareAt !== undefined && compareAt > price;
  return (
    <div className="flex flex-col">
      {/* linhas de altura fixa: cartões com e sem desconto ficam do mesmo tamanho */}
      <span className={`h-5 text-sm text-muted ${from ? "" : "invisible"}`}>a partir de</span>
      <span className={`h-5 text-sm ${discounted ? "" : "invisible"}`}>
        {discounted && (
          <>
            <span className="text-muted line-through tabular-nums">
              <span className="sr-only">De </span>
              {formatPrice(compareAt)}
            </span>{" "}
            <span className="font-bold text-discount">−{discountPercent(price, compareAt)}%</span>
          </>
        )}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={`price leading-tight ${size === "lg" ? "text-4xl" : "text-2xl"} ${discounted ? "text-discount" : "text-ink"}`}>
          {discounted && <span className="sr-only">Por </span>}
          {formatPrice(price)}
        </span>
      </span>
    </div>
  );
}
