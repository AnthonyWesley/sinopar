// CATÁLOGO. Os produtos, os códigos do fornecedor (usados como SKU) e a quantidade por caixa
// vêm da planilha "LISTA DE ITENS SITE SINOPAR FERRAMENTAS.xlsx" enviada pela Sinopar.
// Preços, estoques, descontos, descrições e a divisão em departamentos ainda são EXEMPLO e
// devem ser trocados pelos dados reais (planilha ou ERP) antes de publicar. Fotos: só alguns
// itens têm foto provisória do Wikimedia Commons (créditos em docs/creditos-imagens.md); o
// resto usa "Foto em breve" até a Sinopar mandar as fotos.

export type Segment = "construcao" | "rural" | "industria" | "casa";

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type Variant = {
  /** código do fornecedor (coluna "CÓD. FORNECEDOR" da planilha) */
  sku: string;
  label: string;
  /** centavos */
  price: number;
  /** preço "de", em centavos; só existe quando há desconto */
  compareAt?: number;
  stock: number;
  /** quantidade por caixa do fornecedor (coluna "CX. EMBALAGEM"); não aparece na loja */
  boxQty: number;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  image: string;
  /** o que a variação muda (medida, modelo...); null = produto sem variação */
  variantName: string | null;
  unit: string;
  segments: Segment[];
  description: string;
  specs: { label: string; value: string }[];
  featured?: boolean;
  variants: Variant[];
};

export const segments: { slug: Segment; name: string }[] = [
  { slug: "construcao", name: "Construção" },
  { slug: "rural", name: "Rural e agro" },
  { slug: "industria", name: "Indústria e oficina" },
  { slug: "casa", name: "Casa e reparos" },
];

const img = (name: string) => `/images/produtos/${name}.webp`;
/** produtos ainda sem foto */
export const NO_PHOTO = img("sem-foto");

export const categories: Category[] = [
  { slug: "brocas-e-serras-copo", name: "Brocas e serras copo", description: "Brocas escalonadas e Forstner, serras copo, fresas, escareadores e afiador.", image: NO_PHOTO },
  { slug: "discos-e-abrasivos", name: "Discos e abrasivos", description: "Discos de lixa, polimento e desbaste, escovas e pontas montadas.", image: NO_PHOTO },
  { slug: "alicates", name: "Alicates", description: "Mini alicates, alicates para eletrônica, bico longo e cortador de PVC.", image: img("alicate-universal") },
  { slug: "ferramentas-manuais", name: "Ferramentas manuais", description: "Chaves, extratores, soquetes, espátulas e rebitador.", image: img("jogo-chaves-fenda") },
  { slug: "medicao", name: "Medição e traçagem", description: "Níveis, esquadros e gabarito de contorno.", image: NO_PHOTO },
  { slug: "acessorios-parafusadeira", name: "Acessórios para parafusadeira", description: "Adaptadores angulares, rebitador de cabeçote e coletor de pó.", image: NO_PHOTO },
  { slug: "organizacao", name: "Organização", description: "Caixas, estojos, painel porta-ferramentas, barra magnética e banqueta.", image: NO_PHOTO },
  { slug: "macaricos", name: "Maçaricos e gás", description: "Maçaricos portáteis e gás para recarga.", image: NO_PHOTO },
  { slug: "epi", name: "EPI e segurança", description: "Óculos de segurança, máscara facial e filtros.", image: img("oculos-protecao") },
];

/** variação: código do fornecedor, rótulo, preço (centavos), estoque, caixa, preço "de" */
const v = (sku: string, label: string, price: number, stock: number, boxQty: number, compareAt?: number): Variant => ({ sku, label, price, stock, boxQty, ...(compareAt ? { compareAt } : {}) });
/** produto sem variação */
const one = (sku: string, price: number, stock: number, boxQty: number, compareAt?: number) => [v(sku, "Padrão", price, stock, boxQty, compareAt)];

export const products: Product[] = [
  // ---------- brocas e serras copo ----------
  {
    slug: "broca-escalonada",
    name: "Broca escalonada",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: "Faixa de furo",
    unit: "Unidade",
    segments: ["industria", "construcao"],
    description: "Faz furos de vários diâmetros com uma broca só, em chapas finas. Útil em quadros elétricos, calhas e funilaria.",
    specs: [{ label: "Tipo", value: "Escalonada" }],
    featured: true,
    variants: [
      v("981672", "4 a 12 mm", 4990, 14, 1),
      v("981680", "4 a 20 mm", 6990, 9, 1),
      v("981699", "4 a 32 mm", 9990, 4, 1),
    ],
  },
  {
    slug: "jogo-brocas-escalonadas-3-pecas",
    name: "Jogo de brocas escalonadas 3 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 3",
    segments: ["industria", "construcao"],
    description: "Três brocas escalonadas para furar e alargar chapas finas em vários diâmetros.",
    specs: [{ label: "Peças", value: "3" }],
    variants: one("348189", 11990, 8, 6, 13990),
  },
  {
    slug: "jogo-brocas-forstner-madeira-5-pecas",
    name: "Jogo de brocas Forstner para madeira 5 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 5",
    segments: ["casa", "construcao"],
    description: "Furos de fundo plano e borda limpa em madeira, para dobradiças e encaixes de marcenaria.",
    specs: [{ label: "Peças", value: "5" }, { label: "Uso", value: "Madeira" }],
    variants: one("991341", 8990, 6, 1),
  },
  {
    slug: "jogo-brocas-com-escareador-8-pecas",
    name: "Jogo de brocas com escareador 8 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 8",
    segments: ["casa", "construcao"],
    description: "Fura e escareia na mesma operação, para o parafuso ficar rente à superfície.",
    specs: [{ label: "Peças", value: "8" }],
    variants: one("262879", 6990, 10, 1),
  },
  {
    slug: "jogo-escareadores",
    name: "Jogo de escareadores",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: "Jogo",
    unit: "Jogo",
    segments: ["industria", "casa"],
    description: "Para chanfrar a borda do furo e embutir a cabeça do parafuso.",
    specs: [{ label: "Tipo", value: "Escareador" }],
    variants: [
      v("203105", "3 peças", 3990, 12, 1),
      v("198909", "5 peças", 5990, 7, 1),
    ],
  },
  {
    slug: "jogo-fresas-madeira",
    name: "Jogo de fresas para madeira",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: "Jogo",
    unit: "Jogo",
    segments: ["casa"],
    description: "Fresas para frisos, rebaixos e acabamento de bordas em madeira.",
    specs: [{ label: "Uso", value: "Madeira" }],
    variants: [
      v("276889", "3 peças", 5490, 6, 1),
      v("266190", "Dupla, 6 peças", 8990, 3, 1),
    ],
  },
  {
    slug: "jogo-limas-rotativas-5-pecas",
    name: "Jogo de limas rotativas 5 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 5",
    segments: ["industria"],
    description: "Para rebarbar, desbastar e dar forma em furos e cantos com retífica ou furadeira.",
    specs: [{ label: "Peças", value: "5" }],
    variants: one("266149", 7490, 5, 1),
  },
  {
    slug: "jogo-serra-copo-bimetalica-7-pecas",
    name: "Jogo de serra copo bimetálica 7 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 7",
    segments: ["construcao", "industria"],
    description: "Furos de diâmetro grande em madeira, metal fino e PVC, para caixas de luz, tubulação e fechaduras.",
    specs: [{ label: "Tipo", value: "Bimetálica" }, { label: "Peças", value: "7" }],
    featured: true,
    variants: one("943860", 12990, 7, 1),
  },
  {
    slug: "jogo-serra-copo-diamantada-12-pecas",
    name: "Jogo de serra copo diamantada 12 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 12",
    segments: ["construcao"],
    description: "Para furar porcelanato, cerâmica e vidro na instalação de tomadas, registros e ralos.",
    specs: [{ label: "Tipo", value: "Diamantada" }, { label: "Peças", value: "12" }],
    variants: one("243697", 15990, 4, 1),
  },
  {
    slug: "jogo-serras-copo-5-pecas",
    name: "Jogo de serras copo 5 peças",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 5",
    segments: ["construcao", "casa"],
    description: "Serras copo de uso geral para furos de diâmetro grande.",
    specs: [{ label: "Peças", value: "5" }],
    variants: one("143022", 5990, 15, 5),
  },
  {
    slug: "afiador-de-brocas",
    name: "Afiador de brocas",
    category: "brocas-e-serras-copo",
    image: NO_PHOTO,
    variantName: "Tensão",
    unit: "Unidade",
    segments: ["industria", "rural"],
    description: "Recupera o corte das brocas gastas em poucos segundos, sem precisar de esmeril.",
    specs: [{ label: "Alimentação", value: "Elétrica" }],
    variants: [
      v("180929", "110 V", 18990, 3, 1),
      v("180938", "220 V", 18990, 5, 1),
    ],
  },

  // ---------- discos e abrasivos ----------
  {
    slug: "disco-fixa-facil-velcro-4",
    name: 'Disco fixa fácil tipo velcro 4" (100 mm)',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: "Grão",
    unit: "Unidade",
    segments: ["industria", "construcao", "casa"],
    description: "Disco de lixa com fixação por velcro, troca rápida sem ferramenta. Grãos baixos para desbaste e grãos altos para acabamento e polimento.",
    specs: [{ label: "Diâmetro", value: '4" (100 mm)' }, { label: "Fixação", value: "Velcro" }],
    featured: true,
    variants: [
      v("6253", "G50", 390, 80, 10),
      v("6261", "G100", 390, 95, 10),
      v("6279", "G200", 390, 60, 10),
      v("6288", "G400", 420, 45, 10),
      v("6296", "G800", 450, 30, 10),
      v("6334", "G1500", 490, 20, 10),
      v("6342", "G3000", 520, 12, 10),
      v("361525", "G5000", 590, 8, 10),
      v("361533", "G10000", 690, 0, 10),
    ],
  },
  {
    slug: "disco-abrasivo-removedor",
    name: 'Disco abrasivo removedor 4.1/2" x 7/8"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "construcao"],
    description: "Remove tinta, ferrugem e resíduos de superfícies com esmerilhadeira angular.",
    specs: [{ label: "Medida", value: '4.1/2" x 7/8"' }],
    variants: one("876437", 2490, 25, 10, 2990),
  },
  {
    slug: "disco-flap-feltro-polimento",
    name: 'Disco flap de feltro para polimento 4.1/2" x 7/8"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria"],
    description: "Lâminas de feltro para dar brilho em metais com esmerilhadeira angular.",
    specs: [{ label: "Medida", value: '4.1/2" x 7/8"' }],
    variants: one("249449", 2290, 18, 10),
  },
  {
    slug: "disco-limpeza-pre-polimento",
    name: 'Disco para limpeza e pré-polimento 4.1/2" x 7/8"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria"],
    description: "Limpa a superfície e prepara para o polimento final.",
    specs: [{ label: "Medida", value: '4.1/2" x 7/8"' }],
    variants: one("199507", 1990, 22, 10),
  },
  {
    slug: "disco-polimento",
    name: 'Disco para polimento 4.1/2" x 7/8"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria"],
    description: "Para polimento de metais com esmerilhadeira angular.",
    specs: [{ label: "Medida", value: '4.1/2" x 7/8"' }],
    variants: one("266182", 1890, 16, 10),
  },
  {
    slug: "disco-feltro-polimento",
    name: 'Disco de feltro para polimento 4.1/2" x 7/8"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria"],
    description: "Feltro para o brilho final, usado com pasta de polir.",
    specs: [{ label: "Medida", value: '4.1/2" x 7/8"' }],
    variants: one("199515", 1690, 3, 10),
  },
  {
    slug: "disco-madeira-corrente-motosserra",
    name: 'Disco para madeira com corrente de motosserra 4.1/2"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["rural", "construcao"],
    description: "Transforma a esmerilhadeira em ferramenta de corte e entalhe em madeira.",
    specs: [{ label: "Diâmetro", value: '4.1/2"' }],
    featured: true,
    variants: one("235643", 6990, 6, 1, 7990),
  },
  {
    slug: "disco-desbaste-madeira",
    name: 'Disco de desbaste para madeira 4.1/2"',
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: "Formato",
    unit: "Unidade",
    segments: ["casa", "rural"],
    description: "Desbasta, modela e lixa madeira com esmerilhadeira angular.",
    specs: [{ label: "Diâmetro", value: '4.1/2"' }],
    variants: [
      v("297908", "Convexo", 5990, 5, 1),
      v("297916", "Reto", 5990, 7, 1),
    ],
  },
  {
    slug: "jogo-escovas-circulares",
    name: "Jogo de escovas circulares",
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: "Jogo",
    unit: "Jogo",
    segments: ["industria", "casa"],
    description: "Escovas de aço para remover ferrugem, tinta e rebarbas com furadeira.",
    specs: [{ label: "Tipo", value: "Circular" }],
    variants: [
      v("936375", "3 peças", 2990, 20, 10),
      v("936448", "6 peças", 4490, 12, 6),
      v("936421", "8 peças", 5490, 8, 6),
    ],
  },
  {
    slug: "jogo-escovas-inox-3-pecas",
    name: "Jogo de escovas inox 3 peças",
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 3",
    segments: ["industria"],
    description: "Escovas para limpeza de peças, soldas e superfícies.",
    specs: [{ label: "Peças", value: "3" }],
    variants: one("230935", 3990, 9, 3),
  },
  {
    slug: "jogo-escovas-3-pecas",
    name: "Jogo de escovas 3 peças",
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 3",
    segments: ["casa", "industria"],
    description: "Escovas para limpeza e remoção de ferrugem com furadeira ou parafusadeira.",
    specs: [{ label: "Peças", value: "3" }],
    variants: one("230927", 2990, 11, 1),
  },
  {
    slug: "jogo-ponta-montada",
    name: "Jogo de ponta montada",
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: "Jogo",
    unit: "Jogo",
    segments: ["industria"],
    description: "Pontas abrasivas com haste para retífica: rebarbar, desbastar e ajustar peças.",
    specs: [{ label: "Uso", value: "Retífica" }],
    variants: [
      v("337617", "5 peças", 2490, 14, 10),
      v("337625", "10 peças", 3990, 10, 10),
    ],
  },
  {
    slug: "jogo-ponta-montada-diamantada-20-pecas",
    name: "Jogo de ponta montada diamantada 20 peças",
    category: "discos-e-abrasivos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 20",
    segments: ["industria", "casa"],
    description: "Pontas diamantadas para gravar e desbastar vidro, pedra, cerâmica e metal com retífica.",
    specs: [{ label: "Tipo", value: "Diamantada" }, { label: "Peças", value: "20" }],
    variants: one("270481", 4990, 6, 1),
  },

  // ---------- alicates ----------
  {
    slug: "mini-alicate",
    name: "Mini alicate",
    category: "alicates",
    image: img("alicate-universal"),
    variantName: "Tipo",
    unit: "Unidade",
    segments: ["industria", "casa"],
    description: "Alicates compactos para eletrônica, bijuteria, artesanato e trabalhos de precisão.",
    specs: [{ label: "Tamanho", value: "Mini" }],
    featured: true,
    variants: [
      v("138533", "Universal", 2490, 18, 6),
      v("138487", "Corte diagonal", 2490, 15, 6),
      v("138550", "Corte frontal", 2690, 9, 6),
      v("138517", "Bico meia cana", 2490, 12, 6),
      v("184608", "Bico meia cana curvo", 2690, 6, 6),
      v("184551", "Bico agulha", 2490, 0, 6),
    ],
  },
  {
    slug: "jogo-mini-alicates-5-pecas",
    name: "Jogo de mini alicates 5 peças",
    category: "alicates",
    image: img("alicate-universal"),
    variantName: null,
    unit: "Jogo com 5",
    segments: ["industria", "casa"],
    description: "Cinco mini alicates de tipos diferentes para trabalhos de precisão.",
    specs: [{ label: "Peças", value: "5" }],
    featured: true,
    variants: one("184578", 8990, 7, 1, 10490),
  },
  {
    slug: "alicate-corte-diagonal-eletronica",
    name: "Alicate de corte diagonal para eletrônica",
    category: "alicates",
    image: img("alicate-universal"),
    variantName: null,
    unit: "Unidade",
    segments: ["industria"],
    description: "Corte rente de fios e terminais em placas e montagens eletrônicas.",
    specs: [{ label: "Corte", value: "Diagonal" }],
    variants: one("335410", 2990, 10, 1),
  },
  {
    slug: "alicate-bico-meia-cana-longo",
    name: "Alicate bico meia cana longo",
    category: "alicates",
    image: img("alicate-universal"),
    variantName: "Bico",
    unit: "Unidade",
    segments: ["industria", "casa"],
    description: "Bico longo para alcançar parafusos, porcas e fios em lugares apertados.",
    specs: [{ label: "Bico", value: "Meia cana longo" }],
    variants: [
      v("960225", "Reto", 3990, 8, 1),
      v("960250", "Curvo", 4190, 5, 1),
      v("960772", "Semirredondo", 4190, 2, 1),
    ],
  },
  {
    slug: "alicate-cortador-tubos-pvc",
    name: "Alicate cortador de tubos PVC",
    category: "alicates",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa", "rural"],
    description: "Corte reto e sem rebarba em tubos de PVC e mangueiras, sem serra.",
    specs: [{ label: "Uso", value: "Tubos de PVC" }],
    variants: one("142808", 5990, 9, 1),
  },

  // ---------- ferramentas manuais ----------
  {
    slug: "jogo-chave-fenda-phillips-vde-7-pecas",
    name: "Jogo de chaves fenda e Phillips VDE 7 peças",
    category: "ferramentas-manuais",
    image: img("jogo-chaves-fenda"),
    variantName: null,
    unit: "Jogo com 7",
    segments: ["construcao", "industria", "casa"],
    description: "Chaves isoladas (VDE) para serviços em instalações elétricas.",
    specs: [{ label: "Isolamento", value: "VDE" }, { label: "Peças", value: "7" }],
    featured: true,
    variants: one("263655", 11990, 8, 1),
  },
  {
    slug: "jogo-chaves-precisao-6-pecas",
    name: "Jogo de chaves de precisão 6 peças",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 6",
    segments: ["casa", "industria"],
    description: "Para óculos, relógios, celulares e eletrônicos.",
    specs: [{ label: "Peças", value: "6" }],
    variants: one("140368", 2490, 20, 1),
  },
  {
    slug: "chave-multifuncional-ponta-dupla",
    name: "Chave multifuncional ponta dupla",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "industria"],
    description: "Duas pontas na mesma chave para o dia a dia de montagem e manutenção.",
    specs: [{ label: "Pontas", value: "Dupla" }],
    variants: one("323216", 1990, 15, 1),
  },
  {
    slug: "chave-hidraulica-lavatorio-multifuncional",
    name: "Chave hidráulica para lavatório multifuncional",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Alcança as porcas de torneiras e flexíveis embaixo da pia e do lavatório.",
    specs: [{ label: "Uso", value: "Hidráulica" }],
    variants: one("400270", 4990, 6, 1),
  },
  {
    slug: "jogo-extratores-parafusos-6-pecas",
    name: "Jogo de extratores de parafusos 6 peças",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 6",
    segments: ["industria", "rural", "casa"],
    description: "Remove parafusos quebrados ou espanados sem danificar a peça.",
    specs: [{ label: "Peças", value: "6" }],
    variants: one("142824", 3990, 12, 6, 4690),
  },
  {
    slug: "soquete-universal",
    name: "Soquete universal",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "rural", "casa"],
    description: "Pinos internos que se ajustam a porcas, parafusos e ganchos de vários formatos e medidas.",
    specs: [{ label: "Tipo", value: "Universal" }],
    variants: one("252548", 2990, 18, 1),
  },
  {
    slug: "jogo-adaptadores-soquetes-3-pecas",
    name: "Jogo de adaptadores para soquetes 3 peças",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 3",
    segments: ["industria"],
    description: "Para usar soquetes na furadeira ou parafusadeira.",
    specs: [{ label: "Peças", value: "3" }],
    variants: one("594768", 1990, 14, 1),
  },
  {
    slug: "jogo-mini-pegadores-4-pecas",
    name: "Jogo de mini pegadores 4 peças",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Jogo com 4",
    segments: ["industria", "casa"],
    description: "Para pegar e segurar peças pequenas em montagens e eletrônica.",
    specs: [{ label: "Peças", value: "4" }],
    variants: one("340499", 2490, 10, 1),
  },
  {
    slug: "removedor-de-grampos",
    name: "Removedor de grampos",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "construcao"],
    description: "Tira grampos de tapeçaria, estofados e madeira sem estragar o material.",
    specs: [{ label: "Uso", value: "Grampos" }],
    variants: one("218943", 1890, 9, 1),
  },
  {
    slug: "espatula-gesso-drywall",
    name: "Espátula para gesso drywall",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: "Largura",
    unit: "Unidade",
    segments: ["construcao"],
    description: "Para aplicar e alisar massa em juntas e acabamento de drywall.",
    specs: [{ label: "Uso", value: "Gesso e drywall" }],
    variants: [
      v("400289", '8"', 2990, 15, 12),
      v("400750", '10"', 3490, 10, 12),
      v("401811", '12"', 3990, 6, 12),
    ],
  },
  {
    slug: "rebitador-manual-roscas-alavanca",
    name: "Rebitador manual de roscas com alavanca",
    category: "ferramentas-manuais",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "construcao"],
    description: "Aplica rebites com rosca (porca rebite) em chapas, com alavanca que reduz o esforço.",
    specs: [{ label: "Acionamento", value: "Alavanca" }],
    variants: one("5265", 24990, 3, 1),
  },

  // ---------- medição ----------
  {
    slug: "nivel-aluminio-mini",
    name: "Nível de alumínio mini",
    category: "medicao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Nível compacto para quadros, prateleiras e pequenas instalações.",
    specs: [{ label: "Corpo", value: "Alumínio" }],
    variants: one("359571", 1990, 22, 1),
  },
  {
    slug: "nivel-de-canto-3-bolhas",
    name: "Nível de canto 3 bolhas",
    category: "medicao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao"],
    description: "Encaixa no canto de pilares, postes e tubos e confere o prumo em duas direções.",
    specs: [{ label: "Bolhas", value: "3" }],
    variants: one("104574", 2490, 12, 1),
  },
  {
    slug: "gabarito-medidor-contorno-10",
    name: 'Gabarito medidor de contorno 10"',
    category: "medicao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Copia o contorno de rodapés, tubos e batentes para cortar pisos e revestimentos certinho.",
    specs: [{ label: "Largura", value: '10"' }],
    featured: true,
    variants: one("180717", 3490, 10, 1),
  },
  {
    slug: "esquadro-ajustavel",
    name: "Esquadro ajustável",
    category: "medicao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Marca e confere ângulos em marcenaria, serralheria e obra.",
    specs: [{ label: "Tipo", value: "Ajustável" }],
    variants: one("920940", 3990, 8, 1),
  },
  {
    slug: "esquadro-articulado-6-secoes",
    name: "Esquadro articulado 6 seções",
    category: "medicao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Seções articuladas que copiam ângulos e formatos para transferir ao material.",
    specs: [{ label: "Seções", value: "6" }],
    variants: one("163383", 4490, 5, 1),
  },

  // ---------- acessórios para parafusadeira ----------
  {
    slug: "adaptador-angular-parafusadeira",
    name: "Adaptador angular para parafusadeira",
    category: "acessorios-parafusadeira",
    image: NO_PHOTO,
    variantName: "Modelo",
    unit: "Unidade",
    segments: ["construcao", "industria", "casa"],
    description: "Leva a ponta da parafusadeira a 90° para parafusar em cantos e espaços apertados.",
    specs: [{ label: "Ângulo", value: "90°" }],
    variants: [
      v("254753", "Curto", 3990, 10, 1),
      v("254761", "Longo", 4990, 7, 1),
    ],
  },
  {
    slug: "rebitador-cabecote-parafusadeira",
    name: "Rebitador cabeçote para parafusadeira",
    category: "acessorios-parafusadeira",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "construcao"],
    description: "Acopla na parafusadeira e aplica rebites sem esforço manual.",
    specs: [{ label: "Uso", value: "Rebites" }],
    featured: true,
    variants: one("275637", 8990, 5, 1),
  },
  {
    slug: "coletor-de-po",
    name: "Coletor de pó",
    category: "acessorios-parafusadeira",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Segura o pó ao furar parede e teto, para não sujar o ambiente.",
    specs: [{ label: "Uso", value: "Furação em parede e teto" }],
    variants: one("471577", 1990, 16, 1),
  },

  // ---------- organização ----------
  {
    slug: "caixa-organizadora",
    name: "Caixa organizadora",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: "Modelo",
    unit: "Unidade",
    segments: ["casa", "industria", "construcao"],
    description: "Caixa com divisórias para guardar parafusos, buchas, brocas e peças pequenas.",
    specs: [{ label: "Uso", value: "Peças pequenas" }],
    variants: [
      v("364915", "390", 3990, 12, 1),
      v("364893", "460", 4990, 9, 1),
      v("364907", "530", 5990, 6, 1),
    ],
  },
  {
    slug: "caixa-multiuso",
    name: "Caixa multiuso",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "industria"],
    description: "Caixa para guardar e transportar ferramentas e materiais.",
    specs: [{ label: "Uso", value: "Multiuso" }],
    variants: one("364680", 2990, 18, 6),
  },
  {
    slug: "caixa-organizadora-com-kit-ferramentas",
    name: "Caixa organizadora com kit de ferramentas",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Kit",
    segments: ["casa"],
    description: "Caixa organizadora que já vem com ferramentas para os reparos de casa.",
    specs: [{ label: "Conteúdo", value: "Caixa + ferramentas" }],
    featured: true,
    variants: one("350582", 14990, 4, 1, 17990),
  },
  {
    slug: "estojo-organizador",
    name: "Estojo organizador",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: "Modelo",
    unit: "Unidade",
    segments: ["casa", "industria"],
    description: "Estojo com divisórias para pontas, brocas, parafusos e acessórios.",
    specs: [{ label: "Uso", value: "Peças pequenas e acessórios" }],
    variants: [
      v("364949", "114", 1490, 20, 1),
      v("364648", "165", 1690, 24, 6),
      v("364958", "210", 1990, 15, 1),
      v("364885", "245", 2290, 12, 1),
      v("364656", "265", 2490, 18, 6),
      v("364664", "303", 2790, 10, 6),
      v("364931", "362", 3290, 6, 1),
      v("364923", "373", 3490, 3, 1),
    ],
  },
  {
    slug: "painel-porta-ferramentas-43-pecas",
    name: "Painel porta-ferramentas 43 peças",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Kit com 43",
    segments: ["industria", "casa"],
    description: "Painel de parede com ganchos para deixar as ferramentas à vista e organizadas na oficina.",
    specs: [{ label: "Peças", value: "43" }],
    variants: one("940771", 12990, 5, 1),
  },
  {
    slug: "barra-magnetica-ferramentas-facas",
    name: "Barra magnética para ferramentas e facas",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "industria"],
    description: "Fixa na parede e segura ferramentas e facas pelo ímã.",
    specs: [{ label: "Fixação", value: "Magnética" }],
    variants: one("262934", 3990, 11, 1),
  },
  {
    slug: "banqueta-plastica-dobravel",
    name: "Banqueta plástica dobrável",
    category: "organizacao",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "rural"],
    description: "Dobra e ocupa pouco espaço. Para oficina, pescaria, camping e uso em casa.",
    specs: [{ label: "Material", value: "Plástico" }],
    variants: one("328811", 4990, 8, 1),
  },

  // ---------- maçaricos ----------
  {
    slug: "macarico-portatil-gas-automatico",
    name: "Maçarico portátil a gás automático",
    category: "macaricos",
    image: NO_PHOTO,
    variantName: "Modelo",
    unit: "Unidade",
    segments: ["industria", "casa", "rural"],
    description: "Acendimento automático, para soldas pequenas, aquecimento de peças e uso na cozinha.",
    specs: [{ label: "Acendimento", value: "Automático" }],
    featured: true,
    variants: [
      v("260931", "1100", 5990, 9, 1, 6990),
      v("307237", "1300", 7490, 6, 1, 8490),
    ],
  },
  {
    slug: "gas-isqueiros-macaricos",
    name: "Gás para isqueiros e maçaricos",
    category: "macaricos",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["casa", "industria"],
    description: "Refil de gás para recarregar maçaricos portáteis e isqueiros.",
    specs: [{ label: "Uso", value: "Recarga" }],
    variants: one("270236", 1990, 30, 1),
  },

  // ---------- EPI ----------
  {
    slug: "oculos-seguranca-wk90",
    name: "Óculos de segurança WK90",
    category: "epi",
    image: img("oculos-protecao"),
    variantName: "Lente",
    unit: "Unidade",
    segments: ["construcao", "industria", "rural"],
    description: "Proteção contra partículas em corte, furação e desbaste. Lente cinza ou espelhada para trabalho no sol.",
    specs: [{ label: "Modelo", value: "WK90" }],
    featured: true,
    variants: [
      v("362106", "Incolor", 1490, 40, 12),
      v("362114", "Cinza", 1590, 32, 12),
      v("362122", "Espelhado", 1790, 20, 12),
    ],
  },
  {
    slug: "oculos-seguranca-wk91-incolor",
    name: "Óculos de segurança WK91 incolor",
    category: "epi",
    image: img("oculos-protecao"),
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "industria", "casa"],
    description: "Óculos de proteção com lente incolor para uso geral.",
    specs: [{ label: "Modelo", value: "WK91" }, { label: "Lente", value: "Incolor" }],
    variants: one("362092", 1590, 28, 12),
  },
  {
    slug: "mascara-facial-inteira-2-filtros",
    name: "Máscara facial inteira para 2 filtros",
    category: "epi",
    image: NO_PHOTO,
    variantName: null,
    unit: "Unidade",
    segments: ["rural", "industria"],
    description: "Protege rosto, olhos e respiração na aplicação de defensivos, pintura e produtos químicos. Filtros vendidos à parte.",
    specs: [{ label: "Filtros", value: "2 (vendidos à parte)" }],
    featured: true,
    variants: one("299197", 34990, 3, 1),
  },
  {
    slug: "filtro-respiradores",
    name: "Filtro para respiradores",
    category: "epi",
    image: NO_PHOTO,
    variantName: "Proteção",
    unit: "Unidade",
    segments: ["rural", "industria"],
    description: "Filtro de reposição para a máscara facial. Escolha conforme o produto que vai manusear.",
    specs: [{ label: "Uso", value: "Máscara facial inteira" }],
    variants: [
      v("425699", "Pesticida", 4990, 14, 2),
      v("425702", "Vapor orgânico", 4990, 10, 2),
      v("425664", "Gases ácidos", 4990, 6, 2),
      v("425710", "Vapor orgânico + gases ácidos", 5990, 4, 2),
    ],
  },
];

// ---------- consultas ----------
// Funções síncronas sobre dados em memória. Com o catálogo real, viram chamadas à API/ERP
// mantendo a mesma assinatura.

export const LOW_STOCK = 5;

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug) ?? null;
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug) ?? null;
}

export function findVariant(sku: string) {
  for (const product of products) {
    const variant = product.variants.find((v) => v.sku === sku);
    if (variant) return { product, variant };
  }
  return null;
}

/** menor preço entre as variações com estoque (ou entre todas, se nada tiver estoque) */
export function fromPrice(product: Product) {
  const inStock = product.variants.filter((v) => v.stock > 0);
  const pool = inStock.length ? inStock : product.variants;
  return pool.reduce((min, v) => (v.price < min.price ? v : min));
}

export function totalStock(product: Product) {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

export function hasDiscount(product: Product) {
  return product.variants.some((v) => v.compareAt && v.compareAt > v.price);
}

export function relatedProducts(product: Product, limit = 4) {
  return products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, limit);
}
