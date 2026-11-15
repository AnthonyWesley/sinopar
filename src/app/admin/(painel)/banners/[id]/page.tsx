import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/page-header";
import { bannerStatus, todayInStore } from "@/lib/banners";
import { getBanner } from "@/lib/server/banners-repo";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/session";
import { BackLink } from "../back-link";
import { BannerForm } from "../banner-form";
import { DeleteBanner } from "../banner-row-actions";
import { BannerStatusBadge, bannerPeriod } from "../status-badge";

export const metadata: Metadata = { title: "Editar banner" };

export default async function EditBannerPage(props: PageProps<"/admin/banners/[id]">) {
  await requireUser();
  const { id } = await props.params;
  const n = Number(id);
  const banner = /^\d+$/.test(id) && Number.isSafeInteger(n) ? getBanner(getDb(), n) : null;
  if (!banner) notFound();
  const created = Boolean((await props.searchParams).criado);

  return (
    <div className="space-y-5">
      <BackLink />
      <PageHeader
        title={<span className="break-words">{banner.title}</span>}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            <BannerStatusBadge status={bannerStatus(banner, todayInStore())} />
            <span>{bannerPeriod(banner.startsOn, banner.endsOn)}</span>
          </span>
        }
      />
      <BannerForm key={banner.id} banner={banner} />
      <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Excluir</h2>
        <DeleteBanner id={banner.id} title={banner.title} />
      </section>
      <FlashToast param="criado" message={created ? "Banner cadastrado." : undefined} />
    </div>
  );
}
