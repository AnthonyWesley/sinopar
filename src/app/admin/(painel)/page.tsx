import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { getDb } from "@/lib/server/db";
import { countOrdersByStatus } from "@/lib/server/orders-repo";
import { listStock } from "@/lib/server/stock-repo";
import { requireUser } from "@/lib/session";
import { HomeSummary } from "./home-summary";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  await requireUser();
  const db = getDb();
  const counts = countOrdersByStatus(db);
  const lowStock = listStock(db, { filter: "acabando" }).filter((r) => r.status === "ativo");

  return (
    <div className="space-y-5">
      <PageHeader title="Início" intro="O que precisa de atenção hoje." />
      <HomeSummary
        counts={{ pago: counts.pago, separado: counts.separado, pago_sem_estoque: counts.pago_sem_estoque }}
        lowStock={lowStock}
      />
    </div>
  );
}
