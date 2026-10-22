// Dados da loja. O que a Sinopar ainda não confirmou fica null e a interface mostra
// "a confirmar" em vez de inventar (endereço, telefone, horário, redes).

const whatsapp = process.env.WHATSAPP_NUMBER?.replace(/\D/g, "") || null;

export const site = {
  name: "Sinopar Ferramentas",
  shortName: "Sinopar",
  tagline: "Parafusos e ferramentas em Sinop, MT",
  description:
    "Parafusos, fixadores, ferramentas manuais e elétricas, brocas, discos e EPI para construtoras, produtores rurais, empresas e quem compra para casa. Sinop, Mato Grosso.",
  url: process.env.SITE_URL ?? "http://localhost:3000",
  city: "Sinop",
  state: "MT",
  /** rua e número: a confirmar */
  street: null as string | null,
  postalCode: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  hours: null as string | null,
  instagram: null as string | null,
  whatsapp,
  /** consulta do mapa; trocar pelo endereço completo quando confirmado */
  mapsQuery: "Sinop, MT",
};

export function whatsappLink(message?: string) {
  if (!site.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}

export const mainNav = [
  { href: "/produtos", label: "Produtos" },
  { href: "/servicos", label: "Serviços" },
  { href: "/contato", label: "Contato e localização" },
];

// Resumo legal que vale para qualquer loja online no Brasil (CDC). A política própria da
// Sinopar, se for mais generosa, entra aqui.
export const returnsSummary = {
  short: "7 dias para desistir da compra após receber (CDC, art. 49).",
  warranty: "Garantia legal de 90 dias contra defeitos (CDC, art. 26), além da garantia do fabricante.",
};

export const paymentMethods = ["Pix", "Boleto", "Cartão de crédito"] as const;
