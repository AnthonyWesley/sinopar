// Agrupa itens por departamento, na ordem da lista de departamentos (a mesma da loja).
// Departamento que não existe mais vai para o fim, com o código como nome, para nada sumir.

export type CategoryGroup<T> = { slug: string; name: string; items: T[] };

export function groupByCategory<T extends { category: string }>(items: T[], categories: { slug: string; name: string }[]): CategoryGroup<T>[] {
  const groups = new Map<string, CategoryGroup<T>>(categories.map((c) => [c.slug, { slug: c.slug, name: c.name, items: [] }]));
  for (const item of items) {
    let g = groups.get(item.category);
    if (!g) {
      g = { slug: item.category, name: item.category, items: [] };
      groups.set(item.category, g);
    }
    g.items.push(item);
  }
  return [...groups.values()].filter((g) => g.items.length > 0);
}
