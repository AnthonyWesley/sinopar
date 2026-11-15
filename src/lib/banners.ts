// Banners da página inicial: regras puras (validação do formulário do painel e quando um banner
// está no ar). Sem banco aqui; o acesso fica em src/lib/server/banners-repo.ts.

export type Banner = {
  id: number;
  /** o que o banner diz, em texto: vira o alt da imagem (leitor de tela e Google) */
  title: string;
  /** imagem larga, para computador (`/uploads/<nome>.webp`) */
  imageDesktop: string;
  /** imagem para celular; vazio = usa a do computador */
  imageMobile: string;
  /** para onde o clique leva; vazio = banner sem link */
  link: string;
  /** primeiro dia no ar (AAAA-MM-DD); vazio = desde já */
  startsOn: string;
  /** último dia no ar (AAAA-MM-DD); vazio = sem fim */
  endsOn: string;
  active: boolean;
  position: number;
};

export type BannerInput = Omit<Banner, "id" | "position">;
export type BannerStatus = "no-ar" | "agendado" | "encerrado" | "pausado";
export type BannerErrors = Partial<Record<keyof BannerInput, string>>;

export const BANNER_STATUS_LABEL: Record<BannerStatus, string> = {
  "no-ar": "No ar",
  agendado: "Agendado",
  encerrado: "Encerrado",
  pausado: "Pausado",
};

export const MAX_BANNER_TITLE = 160;

/** Fuso da loja (Sinop, MT). As datas de início e fim valem pelo dia de lá. */
export const STORE_TIME_ZONE = "America/Cuiaba";

const UPLOAD_URL = /^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};

function validDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Link aceito: página da própria loja ("/produtos") ou endereço https completo. */
export function validLink(link: string): boolean {
  if (link.startsWith("/")) return !link.startsWith("//") && !link.includes("\\");
  try {
    const u = new URL(link);
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

/** Campos: title, imageDesktop, imageMobile, link, startsOn, endsOn, active ("on" quando marcado). */
export function parseBannerForm(form: FormData): { ok: true; input: BannerInput } | { ok: false; errors: BannerErrors } {
  const input: BannerInput = {
    title: text(form, "title").replace(/\s+/g, " "),
    imageDesktop: text(form, "imageDesktop"),
    imageMobile: text(form, "imageMobile"),
    link: text(form, "link"),
    startsOn: text(form, "startsOn"),
    endsOn: text(form, "endsOn"),
    active: form.get("active") === "on",
  };
  const errors: BannerErrors = {};
  if (!input.title) errors.title = "Escreva o que o banner diz.";
  else if (input.title.length > MAX_BANNER_TITLE) errors.title = `Use até ${MAX_BANNER_TITLE} caracteres.`;
  if (!input.imageDesktop) errors.imageDesktop = "Envie a imagem para computador.";
  else if (!UPLOAD_URL.test(input.imageDesktop)) errors.imageDesktop = "Envie a imagem pelo botão.";
  if (input.imageMobile && !UPLOAD_URL.test(input.imageMobile)) errors.imageMobile = "Envie a imagem pelo botão.";
  if (input.link && !validLink(input.link))
    errors.link = "Use uma página da loja (começando com /) ou um endereço completo com https://.";
  if (input.startsOn && !validDate(input.startsOn)) errors.startsOn = "Data inválida.";
  if (input.endsOn && !validDate(input.endsOn)) errors.endsOn = "Data inválida.";
  else if (input.startsOn && input.endsOn && !errors.startsOn && input.endsOn < input.startsOn)
    errors.endsOn = "O fim não pode ser antes do início.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, input };
}

/** Dia de hoje (AAAA-MM-DD) no fuso da loja. */
export function todayInStore(now: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function bannerStatus(b: Pick<Banner, "active" | "startsOn" | "endsOn">, today: string): BannerStatus {
  if (!b.active) return "pausado";
  if (b.startsOn && today < b.startsOn) return "agendado";
  if (b.endsOn && today > b.endsOn) return "encerrado";
  return "no-ar";
}

/** Banners no ar hoje, na ordem definida no painel. */
export function liveBanners<T extends Banner>(list: T[], today: string): T[] {
  return list.filter((b) => bannerStatus(b, today) === "no-ar").sort((a, b) => a.position - b.position || a.id - b.id);
}
