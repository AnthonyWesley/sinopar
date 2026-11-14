"use client";

import { ImageUp, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useActionState, useId, useState, useTransition, type ReactNode } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, Field } from "@/components/admin/field";
import { FormError } from "@/components/admin/form-error";
import { SubmitButton } from "@/components/admin/submit-button";
import { Toast } from "@/components/admin/toast";
import { saveProduct, uploadProductPhoto, type ProductFormState } from "@/lib/actions/products";
import { categories, NO_PHOTO, segments, type Segment } from "@/lib/catalog";
import { centsToInput } from "@/lib/money";
import type { AdminProduct } from "@/lib/server/catalog-repo";

// Formulário de produto (novo e edição). Tudo é controlado: o React limpa um formulário depois
// da action, e aqui os valores precisam sobreviver a um erro. Variações e características vão
// como listas paralelas no FormData (uma posição por linha), lidas em src/lib/product-form.ts.
// O estoque só aparece para consulta: ele muda pela tela Estoque, que guarda o histórico.

const MAX_PHOTO = 10 * 1024 * 1024;
const INPUT = "block min-h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-base text-ink";

type SpecRow = { key: number; label: string; value: string };
type VariantRow = { key: number; id: string; sku: string; label: string; price: string; compareAt: string; boxQty: string; stock?: number; available?: number };

let nextKey = 1;
const newVariant = (): VariantRow => ({ key: nextKey++, id: "", sku: "", label: "", price: "", compareAt: "", boxQty: "1" });
const newSpec = (): SpecRow => ({ key: nextKey++, label: "", value: "" });

function initial(p?: AdminProduct) {
  return {
    name: p?.name ?? "",
    category: p?.category ?? "",
    description: p?.description ?? "",
    unit: p?.unit ?? "Unidade",
    variantName: p?.variantName ?? "",
    image: p && p.image !== NO_PHOTO ? p.image : "",
    featured: p?.featured ?? false,
    segments: p?.segments ?? ([] as Segment[]),
    specs: p?.specs.length ? p.specs.map((s) => ({ key: nextKey++, ...s })) : [newSpec()],
    variants: p
      ? p.variants.map((v) => ({
          key: nextKey++,
          id: String(v.id),
          sku: v.sku,
          // "Padrão" é o rótulo automático de produto sem variação
          label: p.variantName ? v.label : "",
          price: centsToInput(v.price),
          compareAt: centsToInput(v.compareAt),
          boxQty: String(v.boxQty),
          stock: v.stock,
          available: v.available,
        }))
      : [newVariant()],
  };
}

const EMPTY: ProductFormState = {};

export function ProductForm({ product }: { product?: AdminProduct }) {
  const [state, action] = useActionState(saveProduct, EMPTY);
  const [values, setValues] = useState(() => initial(product));
  // depois de salvar, a página volta com o produto atualizado (ids das variações novas): recomeça dele
  const snapshot = JSON.stringify(product ?? null);
  const [seen, setSeen] = useState(snapshot);
  if (snapshot !== seen) {
    setSeen(snapshot);
    setValues(initial(product));
  }
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }));
  const errors = state.errors ?? {};
  const multi = values.variants.length > 1 || Boolean(values.variantName.trim());

  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    set("variants", values.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const setSpec = (i: number, patch: Partial<SpecRow>) => set("specs", values.specs.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <form action={action} noValidate className="space-y-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormError message={state.error} />

      <Section title="Produto">
        <Field label="Nome" name="name" required value={values.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
        <Select
          label="Departamento"
          name="category"
          value={values.category}
          onChange={(v) => set("category", v)}
          error={errors.category}
          options={[{ value: "", label: "Escolha…" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
        />
        <TextArea
          label="Descrição"
          name="description"
          value={values.description}
          onChange={(v) => set("description", v)}
          error={errors.description}
          optional
        />
        <Field
          label="Unidade de venda"
          name="unit"
          value={values.unit}
          onChange={(e) => set("unit", e.target.value)}
          error={errors.unit}
          help='Como o cliente compra: "Unidade", "Jogo com 5", "Caixa com 100".'
        />
        <fieldset className="space-y-2">
          <legend className="font-medium">Segmentos</legend>
          <p className="text-sm text-muted">Em quais vitrines da loja o produto aparece.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {segments.map((s) => (
              <label key={s.slug} className="flex min-h-11 items-center gap-3 rounded-xl border border-line-strong px-3">
                <input
                  type="checkbox"
                  name="segments"
                  value={s.slug}
                  checked={values.segments.includes(s.slug)}
                  onChange={(e) =>
                    set("segments", e.target.checked ? [...values.segments, s.slug] : values.segments.filter((x) => x !== s.slug))
                  }
                  className="size-5"
                />
                {s.name}
              </label>
            ))}
          </div>
          {errors.segments ? <p className="text-sm font-medium text-error">{errors.segments}</p> : null}
        </fieldset>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="featured" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} className="size-5" />
          <span>
            <span className="font-medium">Destaque</span>
            <span className="block text-sm text-muted">Aparece entre os destaques da página inicial.</span>
          </span>
        </label>
      </Section>

      <Section title="Foto">
        <Photo value={values.image} onChange={(url) => set("image", url)} error={errors.image} />
      </Section>

      <Section title="Características" intro="Ficha técnica mostrada na página do produto. Linhas vazias são ignoradas.">
        {values.specs.map((s, i) => (
          <div key={s.key} className="space-y-2 rounded-xl border border-line p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome" name="specLabel" value={s.label} onChange={(e) => setSpec(i, { label: e.target.value })} placeholder="Ex.: Material" />
              <Field label="Valor" name="specValue" value={s.value} onChange={(e) => setSpec(i, { value: e.target.value })} placeholder="Ex.: Aço cromo-vanádio" />
            </div>
            {errors[`spec-${i}`] ? <p className="text-sm font-medium text-error">{errors[`spec-${i}`]}</p> : null}
            <button type="button" className={`${BTN_SECONDARY} w-full sm:w-auto`} onClick={() => set("specs", values.specs.filter((_, j) => j !== i))}>
              <X className="size-5" aria-hidden="true" /> Remover característica
            </button>
          </div>
        ))}
        <button type="button" className={`${BTN_SECONDARY} w-full sm:w-auto`} onClick={() => set("specs", [...values.specs, newSpec()])}>
          <Plus className="size-5" aria-hidden="true" /> Adicionar característica
        </button>
      </Section>

      <Section
        title="Variações e preços"
        intro="Cada variação tem seu código e preço. Variação nova começa com estoque 0: o estoque entra pela tela Estoque."
      >
        <Field
          label="O que muda entre as variações"
          name="variantName"
          optional={values.variants.length <= 1}
          value={values.variantName}
          onChange={(e) => set("variantName", e.target.value)}
          error={errors.variantName}
          help="Ex.: Medida, Modelo, Faixa de furo. Deixe vazio se o produto tem uma variação só."
        />
        {errors.variants ? <FormError message={errors.variants} /> : null}
        {values.variants.map((v, i) => {
          const e = (f: string) => errors[`variant-${i}-${f}`];
          return (
            <fieldset key={v.key} className="space-y-3 rounded-xl border border-line p-3">
              <legend className="px-1 font-medium">Variação {i + 1}</legend>
              <input type="hidden" name="variantId" value={v.id} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Código" name="sku" value={v.sku} onChange={(ev) => setVariant(i, { sku: ev.target.value })} error={e("sku")} autoCapitalize="characters" help="Código do fornecedor." />
                {multi ? (
                  <Field
                    label={values.variantName.trim() || "Nome da variação"}
                    name="label"
                    value={v.label}
                    onChange={(ev) => setVariant(i, { label: ev.target.value })}
                    error={e("label")}
                    placeholder="Ex.: 4 a 12 mm"
                  />
                ) : (
                  <input type="hidden" name="label" value="" />
                )}
                <Field label="Preço (R$)" name="price" inputMode="decimal" placeholder="12,90" value={v.price} onChange={(ev) => setVariant(i, { price: ev.target.value })} error={e("price")} />
                <Field
                  label='Preço "de" (R$)'
                  name="compareAt"
                  optional
                  inputMode="decimal"
                  placeholder="15,90"
                  value={v.compareAt}
                  onChange={(ev) => setVariant(i, { compareAt: ev.target.value })}
                  error={e("compareAt")}
                  help="Preço riscado, só quando há desconto."
                />
                <Field label="Quantidade por caixa" name="boxQty" inputMode="numeric" value={v.boxQty} onChange={(ev) => setVariant(i, { boxQty: ev.target.value })} error={e("boxQty")} help="Do fornecedor. Não aparece na loja." />
                <div className="space-y-1.5">
                  <p className="font-medium">Estoque</p>
                  <p className="flex min-h-11 items-center text-muted">
                    {v.stock == null ? "0 (variação nova)" : `${v.stock} no estoque · ${v.available} disponível${v.available === 1 ? "" : "is"}`}
                  </p>
                </div>
              </div>
              {e("id") ? <p className="text-sm font-medium text-error">{e("id")}</p> : null}
              {values.variants.length > 1 ? (
                <button type="button" className={`${BTN_SECONDARY} w-full sm:w-auto`} onClick={() => set("variants", values.variants.filter((_, j) => j !== i))}>
                  <Trash2 className="size-5" aria-hidden="true" /> Remover variação
                </button>
              ) : null}
            </fieldset>
          );
        })}
        <button type="button" className={`${BTN_SECONDARY} w-full sm:w-auto`} onClick={() => set("variants", [...values.variants, newVariant()])}>
          <Plus className="size-5" aria-hidden="true" /> Adicionar variação
        </button>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 bg-surface-2/95 px-1 py-3 sm:flex-row">
        <SubmitButton className={`${BTN_PRIMARY} w-full sm:w-auto`}>
          <Save className="size-5" aria-hidden="true" /> {product ? "Salvar alterações" : "Cadastrar produto"}
        </SubmitButton>
      </div>
      <Toast message={state.message} token={state} />
    </form>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {intro ? <p className="text-sm text-muted">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Select(props: { label: string; name: string; value: string; onChange: (v: string) => void; error?: string; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">
        {props.label}
      </label>
      <select
        id={id}
        name={props.name}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        className={`${INPUT} ${props.error ? "border-error" : "border-line-strong"}`}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {props.error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-error">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

function TextArea(props: { label: string; name: string; value: string; onChange: (v: string) => void; error?: string; optional?: boolean }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">
        {props.label}
        {props.optional ? <span className="ml-1 font-normal text-muted">(opcional)</span> : null}
      </label>
      <textarea
        id={id}
        name={props.name}
        rows={4}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        className={`${INPUT} py-2 ${props.error ? "border-error" : "border-line-strong"}`}
      />
      {props.error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-error">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

/** Foto: envia na hora (vira WebP no servidor) e guarda a URL no campo `image`. */
function Photo({ value, onChange, error }: { value: string; onChange: (url: string) => void; error?: string }) {
  const id = useId();
  const [pending, start] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const shown = uploadError ?? error;

  function pick(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (file.size > MAX_PHOTO) {
      setUploadError("Foto muito grande (máximo 10 MB).");
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("photo", file);
      try {
        const r = await uploadProductPhoto({}, fd);
        if (r.url) onChange(r.url);
        else setUploadError(r.error ?? "Não consegui enviar a foto. Tente de novo.");
      } catch {
        setUploadError("Não consegui enviar a foto. Tente de novo.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="image" value={value} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Image src={value || NO_PHOTO} alt={value ? "Foto do produto" : "Sem foto"} width={160} height={160} className="size-40 shrink-0 rounded-xl border border-line bg-surface-2 object-cover" />
        <div className="grid grid-cols-1 gap-2">
          <label htmlFor={id} className={`${BTN_SECONDARY} cursor-pointer`} aria-disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ImageUp className="size-5" aria-hidden="true" />}
            {pending ? "Enviando…" : value ? "Trocar foto" : "Escolher foto"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="sr-only"
            disabled={pending}
            aria-describedby={`${id}-help`}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {value ? (
            <button type="button" className={BTN_SECONDARY} onClick={() => onChange("")} disabled={pending}>
              <X className="size-5" aria-hidden="true" /> Tirar foto
            </button>
          ) : null}
        </div>
      </div>
      <p id={`${id}-help`} className="text-sm text-muted">
        JPG, PNG, WebP ou HEIC (foto do celular), até 10 MB. A foto é ajustada para a loja automaticamente.
      </p>
      <div aria-live="polite">{shown ? <p className="text-sm font-medium text-error">{shown}</p> : null}</div>
    </div>
  );
}
