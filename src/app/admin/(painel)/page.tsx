import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";

// Provisória: a tela de verdade chega numa próxima etapa do back office.
export const metadata: Metadata = { title: "Início" };

export default function HomePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Início" intro="Resumo da loja." />
      <Panel>
        <p>Em breve.</p>
      </Panel>
    </div>
  );
}
