import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";

// Provisória: a tela de verdade chega numa próxima etapa do back office.
export const metadata: Metadata = { title: "Pedidos" };

export default function OrdersPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Pedidos" intro="Pedidos da loja e situação de cada um." />
      <Panel>
        <p>Em breve.</p>
      </Panel>
    </div>
  );
}
