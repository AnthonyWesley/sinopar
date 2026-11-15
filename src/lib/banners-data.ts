import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { liveBanners, todayInStore, type Banner } from "./banners";
import { TAG_BANNERS } from "./cache-tags";
import { listBanners } from "./server/banners-repo";
import { getDb } from "./server/db";

// Banners da página inicial lidos do banco (mesmo esquema do catalog-data.ts). O cache guarda
// os banners ativos; o filtro por data roda a cada requisição, então um banner agendado entra
// e sai no dia certo sem esperar o cache vencer.

export async function getLiveBanners(): Promise<Banner[]> {
  await connection();
  return liveBanners(await cachedActiveBanners(), todayInStore());
}

async function cachedActiveBanners(): Promise<Banner[]> {
  "use cache";
  cacheTag(TAG_BANNERS);
  cacheLife("hours");
  return listBanners(getDb()).filter((b) => b.active);
}
