// Dados da loja. O que a loja ainda não confirmou fica null e a interface mostra
// "a confirmar" em vez de inventar (telefone, e-mail, horário, redes, CNPJ).
// Fixa Store é o nome fantasia; a empresa (notas fiscais, CNPJ) é a Sinopar. O site não mostra
// endereço nem oferece retirada: a loja física fica fora do site (pedido do cliente em 09/11/2026).

const whatsapp = process.env.WHATSAPP_NUMBER?.replace(/\D/g, "") || null;

export const site = {
  name: "Fixa Store",
  shortName: "Fixa Store",
  tagline: "Ferramentas e acessórios com envio para todo o Brasil",
  description:
    "Brocas, serras copo, discos e abrasivos, alicates, ferramentas manuais, organizadores e EPI com envio para todo o Brasil. Pague com Pix ou cartão de crédito.",
  url: process.env.SITE_URL ?? "http://localhost:3000",
  /** origem do envio (base do cálculo de frete); não aparece no site */
  city: "Sinop",
  state: "MT",
  /** razão social e CNPJ da empresa, só no rodapé: a confirmar */
  legalName: null as string | null,
  cnpj: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  hours: null as string | null,
  instagram: null as string | null,
  whatsapp,
};

export function whatsappLink(message?: string) {
  if (!site.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}

export const mainNav = [
  { href: "/produtos", label: "Produtos" },
  { href: "/servicos", label: "Serviços" },
  { href: "/contato", label: "Contato" },
];

// Resumo legal que vale para qualquer loja online no Brasil (CDC). A política própria da
// Sinopar, se for mais generosa, entra aqui.
export const returnsSummary = {
  short: "7 dias para desistir da compra após receber (CDC, art. 49).",
  warranty: "Garantia legal de 90 dias contra defeitos (CDC, art. 26), além da garantia do fabricante.",
};

export const paymentMethods = ["Pix", "Cartão de crédito"] as const;
