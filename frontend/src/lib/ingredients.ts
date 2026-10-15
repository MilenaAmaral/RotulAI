/**
 * Converte o texto de um rótulo em lista de ingredientes.
 * Separa por vírgula, ponto e vírgula ou quebra de linha, mas preserva vírgulas
 * dentro de nomes químicos como "1,2-Hexanediol" (vírgula seguida de dígito).
 */
export function parseIngredientText(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const piece of text.split(/,(?!\d)|;|\n/)) {
    const name = piece.replace(/\s+/g, ' ').trim().replace(/\.$/, '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export const formatIngredientText = (names: string[]) => names.join(', ');
