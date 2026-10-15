/**
 * Regras puras de normalização de nomes de ingredientes.
 * A normalização garante que "Glycerin", " glycerin " e "GLYCERIN." apontem para o mesmo registro.
 */
export function normalizeIngredientName(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,]+$/, '')
    .trim()
    .toLowerCase();
}

/** Nome de exibição: preserva maiúsculas do rótulo, apenas remove espaços extras e pontuação final. */
export function cleanDisplayName(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,]+$/, '')
    .trim();
}

export interface UniqueIngredientName {
  displayName: string;
  normalizedName: string;
}

/** Remove vazios e duplicados preservando a ordem do rótulo (primeira ocorrência vence). */
export function uniqueIngredientNames(names: readonly string[]): UniqueIngredientName[] {
  const seen = new Set<string>();
  const result: UniqueIngredientName[] = [];
  for (const raw of names) {
    const normalizedName = normalizeIngredientName(raw);
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    result.push({ displayName: cleanDisplayName(raw), normalizedName });
  }
  return result;
}
