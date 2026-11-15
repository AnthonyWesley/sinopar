import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/field";
import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/page-header";
import { bannerStatus, todayInStore } from "@/lib/banners";
import { listBanners } from "@/lib/server/banners-repo";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/session";
import { MoveButtons } from "./banner-row-actions";
import { BannerStatusBadge, bannerPeriod } from "./status-badge";

export const metadata: Metadata = { title: "Banners" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Lista dos banners do topo da página inicial, na ordem do carrossel.
export default async function BannersPage(props: PageProps<"/admin/banners">) {
  await requireUser();
  const sp = await props.searchParams;
  const list = listBanners(getDb());
  const today = todayInStore();
  const live = list.filter((b) => bannerStatus(b, today) === "no-ar").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banners"
        intro="Aparecem no topo da página inicial da loja. Com mais de um no ar, eles se revezam nesta ordem."
        action={
          <Link href="/admin/banners/novo" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
            <Plus className="size-5" aria-hidden="true" /> Novo banner
          </Link>
        }
      />
      <p className="text-sm text-muted" aria-live="polite">
        {live === 0
          ? "Nenhum banner no ar agora: a loja mostra o destaque padrão (furadeira e “Ferramentas e acessórios…”)."
          : live === 1
            ? "1 banner no ar agora."
            : `${live} banners no ar agora, revezando.`}
      </p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-muted">Nenhum banner cadastrado.</p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {list.map((b, i) => (
            <li key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura da arte enviada pelo painel */}
              <img src={b.imageDesktop} alt="" className="aspect-[2/1] w-full shrink-0 rounded-lg border border-line bg-surface-2 object-cover sm:w-44" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted tabular-nums">{i + 1}º</span>
                  <span className="break-words font-medium">{b.title}</span>
                  <BannerStatusBadge status={bannerStatus(b, today)} />
                </p>
                <p className="text-sm text-muted">{bannerPeriod(b.startsOn, b.endsOn)}</p>
                <p className="break-all text-sm text-muted">{b.link ? `Leva para ${b.link}` : "Sem link"}</p>
              </div>
              <div className="flex items-center gap-2">
                <MoveButtons id={b.id} title={b.title} first={i === 0} last={i === list.length - 1} />
                <Link href={`/admin/banners/${b.id}`} className={`${BTN_SECONDARY} flex-1 sm:flex-none`}>
                  <Pencil className="size-5" aria-hidden="true" /> Editar
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
      <FlashToast param="excluido" message={one(sp.excluido) ? "Banner excluído." : undefined} />
    </div>
  );
}
