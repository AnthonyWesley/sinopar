import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";

// Provisória: a tela de verdade chega numa próxima etapa do back office.
export const metadata: Metadata = { title: "Estoque" };

export default function StockPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Estoque" intro="Quantidades e histórico de entradas e saídas." />
      <Panel>
        <p>Em breve.</p>
      </Panel>
    </div>
  );
}
