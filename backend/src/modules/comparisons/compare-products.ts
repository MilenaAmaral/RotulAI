/**
 * Comparação determinística de produtos. Função pura, sem IA e sem acesso ao banco,
 * para que o resultado seja reprodutível e testável.
 */
export interface ComparableIngredient {
  id: string;
  name: string;
  position: number;
}

export interface ComparableProduct {
  id: string;
  /** Slug do catálogo público; null em comparações antigas feitas com produtos pessoais. */
  slug: string | null;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  ingredients: ComparableIngredient[];
}

export interface ComparisonResult {
  productA: ProductSummary;
  productB: ProductSummary;
  sameBrand: boolean;
  sameCategory: boolean;
  commonIngredients: Array<{ id: string; name: string; positionA: number; positionB: number }>;
  exclusiveToA: ComparableIngredient[];
  exclusiveToB: ComparableIngredient[];
  /** Percentual de sobreposição (índice de Jaccard). Indica semelhança de composição, não qualidade. */
  overlapPercentage: number;
}

interface ProductSummary {
  id: string;
  slug: string | null;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  ingredientCount: number;
}

const byPosition = (a: ComparableIngredient, b: ComparableIngredient) => a.position - b.position;

function summarize(product: ComparableProduct): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    ingredientCount: product.ingredients.length,
  };
}

export function compareProducts(productA: ComparableProduct, productB: ComparableProduct): ComparisonResult {
  const ingredientsA = [...productA.ingredients].sort(byPosition);
  const ingredientsB = [...productB.ingredients].sort(byPosition);
  const positionsInB = new Map(ingredientsB.map((item) => [item.id, item.position]));
  const idsInA = new Set(ingredientsA.map((item) => item.id));

  const commonIngredients = ingredientsA.flatMap((item) => {
    const positionB = positionsInB.get(item.id);
    return positionB === undefined ? [] : [{ id: item.id, name: item.name, positionA: item.position, positionB }];
  });
  const exclusiveToA = ingredientsA.filter((item) => !positionsInB.has(item.id));
  const exclusiveToB = ingredientsB.filter((item) => !idsInA.has(item.id));

  const unionSize = commonIngredients.length + exclusiveToA.length + exclusiveToB.length;
  const overlapPercentage = unionSize === 0 ? 0 : Math.round((commonIngredients.length / unionSize) * 100);

  return {
    productA: summarize(productA),
    productB: summarize(productB),
    sameBrand: productA.brand.trim().toLowerCase() === productB.brand.trim().toLowerCase(),
    sameCategory: productA.category === productB.category,
    commonIngredients,
    exclusiveToA,
    exclusiveToB,
    overlapPercentage,
  };
}
