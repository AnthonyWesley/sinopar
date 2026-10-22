// Busca tolerante a acento e erro de digitação, usada tanto na sugestão do cabeçalho
// (cliente) quanto na página de resultados (servidor). Sem dependências: o catálogo é
// pequeno o bastante para filtrar em memória.

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9/.,"]+/g, " ")
    .trim();
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** um termo casa com uma palavra se for prefixo dela ou estiver a 1–2 letras de distância */
function termMatches(term: string, words: string[]) {
  const tolerance = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  return words.some(
    (w) => w.startsWith(term) || (tolerance > 0 && distance(term, w.slice(0, term.length + 1)) <= tolerance),
  );
}

export type Searchable = { name: string; keywords: string };

/** 0 = não casa; quanto maior, mais relevante */
export function score(query: string, item: Searchable) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return 0;
  const nameWords = normalize(item.name).split(" ");
  const allWords = [...nameWords, ...normalize(item.keywords).split(" ")];
  let total = 0;
  for (const term of terms) {
    if (termMatches(term, nameWords)) total += 2;
    else if (termMatches(term, allWords)) total += 1;
    else return 0;
  }
  return total;
}
