// Tags do cache da loja ('use cache' em src/lib/catalog-data.ts). Quem grava no catálogo
// (back office, pedidos que mexem no estoque) invalida com updateTag/revalidateTag.
export const TAG_CATALOG = "catalogo";

export const productTag = (slug: string) => `produto:${slug}`;
