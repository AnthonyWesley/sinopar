// CATÁLOGO DE EXEMPLO. Nada aqui vem da Sinopar: nomes, preços, estoques, descontos e
// especificações foram montados só para desenhar a loja e devem ser trocados pelo catálogo
// real (planilha ou ERP) antes de publicar. As fotos são provisórias, do Wikimedia Commons
// (créditos em docs/creditos-imagens.md).

export type Segment = "construcao" | "rural" | "industria" | "casa";

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type Variant = {
  sku: string;
  label: string;
  /** centavos */
  price: number;
  /** preço "de", em centavos; só existe quando há desconto */
  compareAt?: number;
  stock: number;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  image: string;
  /** o que a variação muda (medida, tamanho...); null = produto sem variação */
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

export const categories: Category[] = [
  { slug: "parafusos", name: "Parafusos", description: "Sextavados, autobrocantes, para madeira, drywall e Allen.", image: "/images/produtos/parafuso-autobrocante.webp" },
  { slug: "porcas-e-arruelas", name: "Porcas e arruelas", description: "Porcas sextavadas, autotravantes e arruelas lisas.", image: "/images/produtos/porca-sextavada.webp" },
  { slug: "buchas-e-chumbadores", name: "Buchas e chumbadores", description: "Fixação em alvenaria e concreto.", image: "/images/produtos/bucha-nylon.webp" },
  { slug: "ferramentas-manuais", name: "Ferramentas manuais", description: "Martelos, chaves, alicates e medição.", image: "/images/produtos/martelo-unha.webp" },
  { slug: "ferramentas-eletricas", name: "Ferramentas elétricas", description: "Parafusadeiras, esmerilhadeiras e serras.", image: "/images/produtos/parafusadeira-bateria.webp" },
  { slug: "brocas-e-discos", name: "Brocas e discos", description: "Brocas para metal e concreto, discos de corte e flap.", image: "/images/produtos/jogo-brocas.webp" },
  { slug: "epi", name: "EPI e segurança", description: "Luvas, óculos, protetores auriculares e capacetes.", image: "/images/produtos/capacete.webp" },
];

const img = (name: string) => `/images/produtos/${name}.webp`;

export const products: Product[] = [
  // ---------- parafusos ----------
  {
    slug: "parafuso-sextavado-soberbo",
    name: "Parafuso sextavado soberbo zincado",
    category: "parafusos",
    image: img("parafuso-sextavado"),
    variantName: "Medida",
    unit: "Caixa com 50",
    segments: ["construcao", "rural"],
    description: "Parafuso de cabeça sextavada com rosca soberba, para fixar em madeira: estruturas, cercas, currais, decks e telhados.",
    specs: [{ label: "Acabamento", value: "Zincado" }, { label: "Rosca", value: "Soberba (madeira)" }],
    featured: true,
    variants: [
      { sku: "SPR-SXT-0838", label: '3/8" x 1.1/2"', price: 3990, stock: 42 },
      { sku: "SPR-SXT-0850", label: '3/8" x 2"', price: 4590, stock: 18 },
      { sku: "SPR-SXT-1250", label: '1/2" x 2"', price: 6890, stock: 4 },
      { sku: "SPR-SXT-1275", label: '1/2" x 3"', price: 8490, stock: 0 },
    ],
  },
  {
    slug: "parafuso-autobrocante-telha",
    name: "Parafuso autobrocante para telha metálica",
    category: "parafusos",
    image: img("parafuso-autobrocante"),
    variantName: "Medida",
    unit: "Pacote com 100",
    segments: ["construcao", "rural"],
    description: "Fura e fixa em uma só operação, sem pré-furo. Para telhas e chapas metálicas em galpões, barracões e coberturas.",
    specs: [{ label: "Cabeça", value: "Sextavada flangeada" }, { label: "Ponta", value: "Broca" }],
    featured: true,
    variants: [
      { sku: "SPR-ABT-1225", label: "12 x 25 mm", price: 4290, compareAt: 4990, stock: 60 },
      { sku: "SPR-ABT-1240", label: "12 x 40 mm", price: 5190, compareAt: 5890, stock: 35 },
      { sku: "SPR-ABT-1450", label: "14 x 50 mm", price: 6490, stock: 3 },
    ],
  },
  {
    slug: "parafuso-madeira-cabeca-chata",
    name: "Parafuso para madeira cabeça chata Phillips",
    category: "parafusos",
    image: img("parafuso-madeira"),
    variantName: "Medida",
    unit: "Caixa com 200",
    segments: ["casa", "construcao"],
    description: "Para móveis, portas, batentes e marcenaria em geral. Cabeça chata que fica rente à superfície.",
    specs: [{ label: "Fenda", value: "Phillips" }, { label: "Cabeça", value: "Chata" }],
    variants: [
      { sku: "SPR-MAD-3530", label: "3,5 x 30 mm", price: 2190, stock: 80 },
      { sku: "SPR-MAD-4040", label: "4,0 x 40 mm", price: 2790, stock: 55 },
      { sku: "SPR-MAD-5060", label: "5,0 x 60 mm", price: 3890, stock: 22 },
    ],
  },
  {
    slug: "parafuso-drywall-ponta-agulha",
    name: "Parafuso drywall ponta agulha",
    category: "parafusos",
    image: img("parafuso-drywall"),
    variantName: "Medida",
    unit: "Caixa com 500",
    segments: ["construcao"],
    description: "Para fixar chapas de gesso em perfis metálicos leves.",
    specs: [{ label: "Ponta", value: "Agulha" }, { label: "Cabeça", value: "Trombeta" }],
    variants: [
      { sku: "SPR-DRY-3525", label: "3,5 x 25 mm", price: 3490, stock: 40 },
      { sku: "SPR-DRY-3535", label: "3,5 x 35 mm", price: 3990, stock: 27 },
    ],
  },
  {
    slug: "parafuso-allen-cabeca-cilindrica",
    name: "Parafuso Allen cabeça cilíndrica",
    category: "parafusos",
    image: img("parafuso-allen"),
    variantName: "Medida",
    unit: "Pacote com 25",
    segments: ["industria"],
    description: "Para máquinas, moldes e montagens mecânicas que pedem aperto firme em espaço reduzido.",
    specs: [{ label: "Encaixe", value: "Sextavado interno (Allen)" }],
    variants: [
      { sku: "SPR-ALN-0620", label: "M6 x 20 mm", price: 1890, stock: 30 },
      { sku: "SPR-ALN-0830", label: "M8 x 30 mm", price: 2690, stock: 12 },
      { sku: "SPR-ALN-1040", label: "M10 x 40 mm", price: 3990, stock: 0 },
    ],
  },

  // ---------- porcas e arruelas ----------
  {
    slug: "porca-sextavada-zincada",
    name: "Porca sextavada zincada",
    category: "porcas-e-arruelas",
    image: img("porca-sextavada"),
    variantName: "Medida",
    unit: "Pacote com 100",
    segments: ["construcao", "industria", "rural"],
    description: "Porca sextavada comum para uso com parafusos e barras roscadas.",
    specs: [{ label: "Acabamento", value: "Zincado" }],
    variants: [
      { sku: "SPC-SXT-0038", label: '3/8"', price: 1990, stock: 70 },
      { sku: "SPC-SXT-0012", label: '1/2"', price: 2890, stock: 44 },
    ],
  },
  {
    slug: "porca-autotravante-nylon",
    name: "Porca autotravante com anel de nylon",
    category: "porcas-e-arruelas",
    image: img("porca-autotravante"),
    variantName: "Medida",
    unit: "Pacote com 50",
    segments: ["industria", "rural"],
    description: "O anel de nylon impede que a porca se solte com a vibração. Indicada para máquinas e implementos.",
    specs: [{ label: "Trava", value: "Anel de nylon" }],
    variants: [
      { sku: "SPC-NYL-0008", label: "M8", price: 1790, compareAt: 2190, stock: 25 },
      { sku: "SPC-NYL-0010", label: "M10", price: 2390, compareAt: 2890, stock: 2 },
    ],
  },
  {
    slug: "arruela-lisa-zincada",
    name: "Arruela lisa zincada",
    category: "porcas-e-arruelas",
    image: img("arruela-lisa"),
    variantName: "Medida",
    unit: "Pacote com 100",
    segments: ["construcao", "industria", "casa"],
    description: "Distribui a pressão do aperto e protege a superfície.",
    specs: [{ label: "Acabamento", value: "Zincado" }],
    variants: [
      { sku: "SAR-LIS-0038", label: '3/8"', price: 1290, stock: 90 },
      { sku: "SAR-LIS-0012", label: '1/2"', price: 1690, stock: 65 },
    ],
  },

  // ---------- buchas e chumbadores ----------
  {
    slug: "bucha-nylon-com-aba",
    name: "Bucha de nylon para alvenaria",
    category: "buchas-e-chumbadores",
    image: img("bucha-nylon"),
    variantName: "Tamanho",
    unit: "Pacote com 100",
    segments: ["casa", "construcao"],
    description: "Para fixar suportes, prateleiras e acessórios em tijolo e concreto.",
    specs: [{ label: "Material", value: "Nylon" }],
    featured: true,
    variants: [
      { sku: "SBU-NYL-0006", label: "6 mm", price: 990, stock: 150 },
      { sku: "SBU-NYL-0008", label: "8 mm", price: 1290, stock: 120 },
      { sku: "SBU-NYL-0010", label: "10 mm", price: 1690, stock: 75 },
    ],
  },
  {
    slug: "chumbador-parabolt",
    name: "Chumbador parabolt com porca e arruela",
    category: "buchas-e-chumbadores",
    image: img("chumbador-parabolt"),
    variantName: "Medida",
    unit: "Caixa com 25",
    segments: ["construcao", "industria", "rural"],
    description: "Ancoragem mecânica em concreto para estruturas, máquinas, guarda-corpos e portões.",
    specs: [{ label: "Base", value: "Concreto" }],
    variants: [
      { sku: "SCH-PAR-0875", label: '3/8" x 3"', price: 5490, stock: 16 },
      { sku: "SCH-PAR-1200", label: '1/2" x 4"', price: 7990, stock: 5 },
    ],
  },

  // ---------- ferramentas manuais ----------
  {
    slug: "martelo-unha-27mm",
    name: "Martelo de unha com cabo de fibra",
    category: "ferramentas-manuais",
    image: img("martelo-unha"),
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa"],
    description: "Martelo de unha para pregar e arrancar pregos. Cabo de fibra que absorve impacto.",
    specs: [{ label: "Cabo", value: "Fibra" }],
    featured: true,
    variants: [{ sku: "FMA-MAR-0027", label: "Padrão", price: 5990, compareAt: 6990, stock: 14 }],
  },
  {
    slug: "jogo-chaves-combinadas",
    name: "Jogo de chaves combinadas com suporte",
    category: "ferramentas-manuais",
    image: img("jogo-chaves-combinadas"),
    variantName: "Jogo",
    unit: "Jogo",
    segments: ["industria", "rural", "casa"],
    description: "Boca e estrela na mesma chave, organizadas em suporte para a caixa de ferramentas.",
    specs: [{ label: "Tipo", value: "Boca e estrela" }],
    featured: true,
    variants: [
      { sku: "FMA-CHC-0008", label: "8 peças (8 a 19 mm)", price: 11990, stock: 9 },
      { sku: "FMA-CHC-0012", label: "12 peças (6 a 22 mm)", price: 17990, stock: 4 },
    ],
  },
  {
    slug: "alicate-universal-8",
    name: 'Alicate universal 8"',
    category: "ferramentas-manuais",
    image: img("alicate-universal"),
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "casa", "construcao"],
    description: "Prende, dobra e corta fios. Ferramenta básica de qualquer caixa.",
    specs: [{ label: "Tamanho", value: '8"' }],
    variants: [{ sku: "FMA-ALI-0008", label: "Padrão", price: 3990, stock: 31 }],
  },
  {
    slug: "trena-5m",
    name: "Trena com trava",
    category: "ferramentas-manuais",
    image: img("trena"),
    variantName: "Comprimento",
    unit: "Unidade",
    segments: ["construcao", "casa", "rural"],
    description: "Trena de fita metálica com trava e clipe para cinto.",
    specs: [{ label: "Trava", value: "Sim" }],
    variants: [
      { sku: "FMA-TRE-0005", label: "5 m", price: 2490, stock: 40 },
      { sku: "FMA-TRE-0008", label: "8 m", price: 3490, stock: 0 },
    ],
  },
  {
    slug: "jogo-chaves-fenda-phillips",
    name: "Jogo de chaves de fenda e Phillips",
    category: "ferramentas-manuais",
    image: img("jogo-chaves-fenda"),
    variantName: null,
    unit: "Jogo com 4",
    segments: ["casa", "industria"],
    description: "Duas chaves de fenda e duas Phillips para montagem e manutenção.",
    specs: [{ label: "Peças", value: "4" }],
    variants: [{ sku: "FMA-CHF-0004", label: "Padrão", price: 2990, stock: 23 }],
  },
  {
    slug: "chave-ajustavel",
    name: "Chave ajustável (chave inglesa)",
    category: "ferramentas-manuais",
    image: img("chave-ajustavel"),
    variantName: "Tamanho",
    unit: "Unidade",
    segments: ["industria", "rural", "casa"],
    description: "Uma chave que serve em várias medidas de porca e parafuso.",
    specs: [{ label: "Tipo", value: "Ajustável" }],
    variants: [
      { sku: "FMA-CHA-0008", label: '8"', price: 3790, stock: 17 },
      { sku: "FMA-CHA-0012", label: '12"', price: 5490, stock: 6 },
    ],
  },

  // ---------- ferramentas elétricas ----------
  {
    slug: "parafusadeira-furadeira-bateria",
    name: "Parafusadeira e furadeira a bateria",
    category: "ferramentas-eletricas",
    image: img("parafusadeira-bateria"),
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "casa", "industria"],
    description: "Parafusa e fura sem fio. Ajuste de torque para não espanar o parafuso.",
    specs: [{ label: "Alimentação", value: "Bateria" }],
    featured: true,
    variants: [{ sku: "FEL-PAR-0001", label: "Padrão", price: 32990, compareAt: 37990, stock: 7 }],
  },
  {
    slug: "esmerilhadeira-angular",
    name: 'Esmerilhadeira angular 4.1/2"',
    category: "ferramentas-eletricas",
    image: img("esmerilhadeira"),
    variantName: "Tensão",
    unit: "Unidade",
    segments: ["industria", "construcao", "rural"],
    description: "Para corte, desbaste e acabamento em metal com o disco adequado.",
    specs: [{ label: "Disco", value: '4.1/2" (115 mm)' }],
    featured: true,
    variants: [
      { sku: "FEL-ESM-0127", label: "127 V", price: 27990, stock: 5 },
      { sku: "FEL-ESM-0220", label: "220 V", price: 27990, stock: 8 },
    ],
  },
  {
    slug: "serra-circular",
    name: 'Serra circular 7.1/4"',
    category: "ferramentas-eletricas",
    image: img("serra-circular"),
    variantName: "Tensão",
    unit: "Unidade",
    segments: ["construcao", "rural"],
    description: "Cortes retos em madeira e compensado, com guia paralela.",
    specs: [{ label: "Disco", value: '7.1/4" (184 mm)' }],
    variants: [
      { sku: "FEL-SER-0127", label: "127 V", price: 49990, stock: 2 },
      { sku: "FEL-SER-0220", label: "220 V", price: 49990, stock: 0 },
    ],
  },

  // ---------- brocas e discos ----------
  {
    slug: "jogo-brocas-multiuso",
    name: "Jogo de brocas multiuso",
    category: "brocas-e-discos",
    image: img("jogo-brocas"),
    variantName: null,
    unit: "Jogo com 7",
    segments: ["casa", "construcao"],
    description: "Brocas para metal, madeira e alvenaria em um só jogo.",
    specs: [{ label: "Peças", value: "7" }],
    variants: [{ sku: "FBR-JOG-0007", label: "Padrão", price: 4990, stock: 20 }],
  },
  {
    slug: "broca-aco-rapido",
    name: "Broca de aço rápido para metal",
    category: "brocas-e-discos",
    image: img("broca-concreto"),
    variantName: "Diâmetro",
    unit: "Unidade",
    segments: ["industria", "rural"],
    description: "Para furar aço, ferro e metais não ferrosos.",
    specs: [{ label: "Material", value: "Aço rápido (HSS)" }],
    variants: [
      { sku: "FBR-HSS-0006", label: "6 mm", price: 990, stock: 50 },
      { sku: "FBR-HSS-0008", label: "8 mm", price: 1490, stock: 38 },
      { sku: "FBR-HSS-0010", label: "10 mm", price: 2190, stock: 3 },
    ],
  },
  {
    slug: "disco-corte-metal",
    name: 'Disco de corte para metal 4.1/2"',
    category: "brocas-e-discos",
    image: img("disco-corte"),
    variantName: null,
    unit: "Pacote com 10",
    segments: ["industria", "construcao", "rural"],
    description: "Disco fino para cortes rápidos em metal com esmerilhadeira angular.",
    specs: [{ label: "Diâmetro", value: '4.1/2" (115 mm)' }],
    featured: true,
    variants: [{ sku: "FBR-DIS-0115", label: "Padrão", price: 3990, compareAt: 4690, stock: 45 }],
  },
  {
    slug: "disco-flap",
    name: 'Disco flap para desbaste 4.1/2"',
    category: "brocas-e-discos",
    image: img("disco-flap"),
    variantName: "Grão",
    unit: "Unidade",
    segments: ["industria"],
    description: "Desbaste e acabamento de soldas e superfícies metálicas.",
    specs: [{ label: "Diâmetro", value: '4.1/2" (115 mm)' }],
    variants: [
      { sku: "FBR-FLP-0040", label: "Grão 40", price: 1290, stock: 33 },
      { sku: "FBR-FLP-0080", label: "Grão 80", price: 1290, stock: 29 },
    ],
  },

  // ---------- EPI ----------
  {
    slug: "luva-vaqueta",
    name: "Luva de vaqueta",
    category: "epi",
    image: img("luva-vaqueta"),
    variantName: "Tamanho",
    unit: "Par",
    segments: ["construcao", "rural", "industria"],
    description: "Luva de couro para trabalho pesado, manuseio de materiais e serviços no campo.",
    specs: [{ label: "Material", value: "Couro (vaqueta)" }],
    featured: true,
    variants: [
      { sku: "EPI-LUV-000M", label: "M", price: 2290, stock: 24 },
      { sku: "EPI-LUV-000G", label: "G", price: 2290, stock: 30 },
      { sku: "EPI-LUV-00GG", label: "GG", price: 2290, stock: 1 },
    ],
  },
  {
    slug: "oculos-protecao-incolor",
    name: "Óculos de proteção incolor",
    category: "epi",
    image: img("oculos-protecao"),
    variantName: null,
    unit: "Unidade",
    segments: ["construcao", "industria", "casa"],
    description: "Proteção contra partículas em corte, furação e desbaste.",
    specs: [{ label: "Lente", value: "Incolor" }],
    variants: [{ sku: "EPI-OCU-0001", label: "Padrão", price: 1490, stock: 58 }],
  },
  {
    slug: "abafador-ruido-concha",
    name: "Protetor auricular tipo concha",
    category: "epi",
    image: img("abafador-ruido"),
    variantName: null,
    unit: "Unidade",
    segments: ["industria", "rural", "construcao"],
    description: "Protetor tipo concha com haste ajustável, para ambientes com ruído de máquinas.",
    specs: [{ label: "Tipo", value: "Concha" }],
    variants: [{ sku: "EPI-ABA-0001", label: "Padrão", price: 4590, stock: 0 }],
  },
  {
    slug: "capacete-seguranca-carneira",
    name: "Capacete de segurança com carneira",
    category: "epi",
    image: img("capacete"),
    variantName: "Cor",
    unit: "Unidade",
    segments: ["construcao", "industria"],
    description: "Capacete com carneira ajustável para obra e indústria.",
    specs: [{ label: "Ajuste", value: "Carneira" }],
    variants: [
      { sku: "EPI-CAP-00LA", label: "Laranja", price: 3490, stock: 19 },
      { sku: "EPI-CAP-00AM", label: "Amarelo", price: 3490, stock: 11 },
      { sku: "EPI-CAP-00BR", label: "Branco", price: 3490, stock: 4 },
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
