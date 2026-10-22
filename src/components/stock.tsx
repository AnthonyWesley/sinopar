import { LOW_STOCK } from "@/lib/catalog";

/** estado de estoque com texto (nunca só cor) e número real quando está baixo */
export function StockStatus({ stock, className = "" }: { stock: number; className?: string }) {
  if (stock <= 0)
    return (
      <p className={`flex items-center gap-1.5 text-sm font-semibold text-stock-out ${className}`}>
        <span className="size-2 rounded-full border-2 border-stock-out" aria-hidden="true" />
        Esgotado
      </p>
    );
  if (stock <= LOW_STOCK)
    return (
      <p className={`flex items-center gap-1.5 text-sm font-semibold text-stock-low ${className}`}>
        <span className="size-2 rounded-full bg-stock-low" aria-hidden="true" />
        {stock === 1 ? "Última unidade" : `Restam ${stock} unidades`}
      </p>
    );
  return (
    <p className={`flex items-center gap-1.5 text-sm font-semibold text-stock-ok ${className}`}>
      <span className="size-2 rounded-full bg-stock-ok" aria-hidden="true" />
      Em estoque
    </p>
  );
}
