import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { requireUser } from "@/lib/session";
import { BackLink } from "../back-link";
import { BannerForm } from "../banner-form";

export const metadata: Metadata = { title: "Novo banner" };

export default async function NewBannerPage() {
  await requireUser();
  return (
    <div className="space-y-5">
      <BackLink />
      <PageHeader title="Novo banner" intro="Entra no fim da fila. A ordem muda na lista de banners." />
      <BannerForm />
    </div>
  );
}
