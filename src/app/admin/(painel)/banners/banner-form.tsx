"use client";

import { ImageUp, Loader2, Save, X } from "lucide-react";
import { useActionState, useId, useState, useTransition, type ReactNode } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { saveBanner, uploadBannerImage, type BannerFormState } from "@/lib/actions/banners";
import { MAX_BANNER_TITLE, type Banner } from "@/lib/banners";

// Formulário de banner (novo e edição). Controlado, como o de produto: os valores sobrevivem a
// um erro da action. As imagens sobem na hora (uploadBannerImage) e o campo guarda só a URL.

const MAX_FILE = 10 * 1024 * 1024;

export function BannerForm({ banner }: { banner?: Banner }) {
  const [state, action] = useActionState(saveBanner, {} as BannerFormState);
  const [v, setV] = useState({
    title: banner?.title ?? "",
    imageDesktop: banner?.imageDesktop ?? "",
    imageMobile: banner?.imageMobile ?? "",
    link: banner?.link ?? "",
    startsOn: banner?.startsOn ?? "",
    endsOn: banner?.endsOn ?? "",
    active: banner?.active ?? true,
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((old) => ({ ...old, [k]: value }));
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <FormError message={state.error} />

      <Section title="Imagens">
        <ImagePicker
          label="Imagem para computador"
          name="imageDesktop"
          value={v.imageDesktop}
          onChange={(url) => set("imageDesktop", url)}
          error={errors.imageDesktop}
          shape="wide"
          help="Formato largo (2 por 1). Ideal: 2400 × 1200 px; no mínimo 1600 × 800. Deixe textos e preços longe das bordas: em algumas telas as pontas são cortadas."
        />
        <ImagePicker
          label="Imagem para celular"
          name="imageMobile"
          optional
          value={v.imageMobile}
          onChange={(url) => set("imageMobile", url)}
          error={errors.imageMobile}
          shape="square"
          help="Quadrada. Ideal: 1080 × 1080 px. Sem ela, o celular mostra a imagem de computador cortada no meio, e o texto da arte pode ficar pequeno demais."
        />
      </Section>

      <Section title="Texto e link">
        <Field
          label="Texto do banner"
          name="title"
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
          maxLength={MAX_BANNER_TITLE}
          help="Escreva o que a arte diz (ex.: Black November: até 40% de desconto). Quem usa leitor de tela e o Google leem este texto no lugar da imagem."
        />
        <Field
          label="Link"
          name="link"
          optional
          value={v.link}
          onChange={(e) => set("link", e.target.value)}
          error={errors.link}
          placeholder="/produtos/alicates"
          autoComplete="off"
          help="Para onde o clique leva. Uma página da loja começando com / (ex.: /produtos/discos-e-abrasivos) ou um endereço completo com https://. Vazio: o banner não é clicável."
        />
      </Section>

      <Section title="Quando aparece">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Começa em" name="startsOn" type="date" optional value={v.startsOn} onChange={(e) => set("startsOn", e.target.value)} error={errors.startsOn} help="Vazio: já entra no ar." />
          <Field label="Termina em" name="endsOn" type="date" optional value={v.endsOn} onChange={(e) => set("endsOn", e.target.value)} error={errors.endsOn} help="Último dia no ar. Vazio: fica até alguém tirar." />
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="active" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="size-5" />
          <span>
            <span className="font-medium">Ativo</span>
            <span className="block text-sm text-muted">Desmarque para tirar da loja sem apagar.</span>
          </span>
        </label>
      </Section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-1 flex flex-col gap-2 bg-surface-2/95 px-1 py-3 sm:bottom-0 sm:flex-row">
        <SubmitButton className={`${BTN_PRIMARY} w-full sm:w-auto`}>
          <Save className="size-5" aria-hidden="true" /> {banner ? "Salvar alterações" : "Cadastrar banner"}
        </SubmitButton>
      </div>
      <Toast message={state.message} token={state} />
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ImagePicker(props: {
  label: string;
  name: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  help: string;
  optional?: boolean;
  shape: "wide" | "square";
}) {
  const { label, name, value, onChange, error, help, optional, shape } = props;
  const id = useId();
  const [pending, start] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const shown = uploadError ?? error;

  function pick(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (file.size > MAX_FILE) {
      setUploadError("Imagem muito grande (máximo 10 MB).");
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("photo", file);
      try {
        const r = await uploadBannerImage({}, fd);
        if (r.url) onChange(r.url);
        else setUploadError(r.error ?? "Não consegui enviar a imagem. Tente de novo.");
      } catch {
        setUploadError("Não consegui enviar a imagem. Tente de novo.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <p id={`${id}-label`} className="font-medium">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(opcional)</span> : null}
      </p>
      <div className={`flex flex-col gap-3 ${shape === "wide" ? "" : "sm:flex-row sm:items-start"}`}>
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2 text-sm text-muted ${
            shape === "wide" ? "aspect-[2/1] w-full max-w-xl" : "aspect-square w-40"
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia da imagem recém-enviada
            <img src={value} alt={`Prévia: ${label.toLowerCase()}`} className="size-full object-cover" />
          ) : (
            <span>Sem imagem</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <label htmlFor={id} className={`${BTN_SECONDARY} cursor-pointer`} aria-disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ImageUp className="size-5" aria-hidden="true" />}
            {pending ? "Enviando…" : value ? "Trocar imagem" : "Escolher imagem"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="sr-only"
            disabled={pending}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-help`}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {value && optional ? (
            <button type="button" className={BTN_SECONDARY} onClick={() => onChange("")} disabled={pending}>
              <X className="size-5" aria-hidden="true" /> Tirar imagem
            </button>
          ) : null}
        </div>
      </div>
      <p id={`${id}-help`} className="text-sm text-muted">
        {help} JPG, PNG, WebP ou HEIC, até 10 MB.
      </p>
      <div aria-live="polite">{shown ? <p className="text-sm font-medium text-error">{shown}</p> : null}</div>
    </div>
  );
}
