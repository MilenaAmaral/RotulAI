export type ProductCategory =
  | 'LIMPEZA'
  | 'TONICO'
  | 'SERUM'
  | 'HIDRATANTE'
  | 'PROTETOR_SOLAR'
  | 'ESFOLIANTE'
  | 'MASCARA'
  | 'OLHOS'
  | 'LABIOS'
  | 'TRATAMENTO'
  | 'OUTRO';

export type SkinType = 'OILY' | 'DRY' | 'COMBINATION' | 'SENSITIVE' | 'NORMAL';
export type SkinConcern = 'ACNE_PRONE' | 'PIGMENTATION' | 'DEHYDRATION' | 'SENSITIVITY' | 'SUN_PROTECTION';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'FREE' | 'PREMIUM' | 'ADMIN';
  createdAt: string;
}

export interface Session {
  user: User;
  accessToken: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface IngredientSummary {
  id: string;
  name: string;
  synonyms?: string[];
  functions: string[];
  isCurated: boolean;
}

export interface ProductIngredient extends IngredientSummary {
  position: number;
}

export interface ProductListItem {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  ingredientCount: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  referenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: ProductIngredient[];
}

export interface PublicProductListItem {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  ingredientCount: number;
}

export interface PublicProductSearchPage extends Page<PublicProductListItem> {
  suggestions: PublicProductListItem[];
}

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  referenceUrl: string | null;
  ingredients: ProductIngredient[];
}

/** O admin recebe o mesmo formato do detalhe público. */
export type AdminProduct = PublicProduct;

export interface FavoriteProduct extends PublicProductListItem {
  referenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  favoritedAt: string;
}

export interface AdminProductInput {
  name: string;
  brand: string;
  category: ProductCategory;
  referenceUrl: string | null;
  ingredients: string[];
}

export interface AdminIngredientInput {
  name: string;
  synonyms: string[];
  functions: string[];
  description: string | null;
  usageInfo: string | null;
  cautions: string | null;
  sources: Array<{ title: string; publisher: string; url: string; note: string | null }>;
}

export interface AdminIngredient extends IngredientDetail {
  normalizedName: string;
  searchTerms: string[];
}

export interface AdminSearchSynonym {
  id: string;
  phrase: string;
  normalizedPhrase: string;
  expansions: string[];
  category: ProductCategory | null;
}

export interface AdminSearchSynonymInput {
  phrase: string;
  expansions: string[];
  category: ProductCategory | null;
}

export interface RecommendationRule {
  id: string;
  ingredientId: string;
  skinType: SkinType;
  concern: SkinConcern;
  rationale: string;
  justification: string;
  version: number;
  isActive: boolean;
  ingredient: { id: string; name: string; isCurated: boolean };
}

export interface RecommendationRuleInput {
  ingredientId: string;
  skinType: SkinType;
  concern: SkinConcern;
  rationale: string;
  justification: string;
  isActive: boolean;
}

export interface PublicIngredientSummary {
  id: string;
  name: string;
  synonyms: string[];
  functions: string[];
}

export type PublicIngredient = Omit<IngredientDetail, 'userProducts'>;

export interface ProductInput {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  referenceUrl: string | null;
  ingredients: string[];
}

export interface IngredientSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  note: string | null;
}

export interface IngredientDetail {
  id: string;
  name: string;
  synonyms: string[];
  functions: string[];
  description: string | null;
  usageInfo: string | null;
  cautions: string | null;
  isCurated: boolean;
  sources: IngredientSource[];
  userProducts?: Array<{ id: string; name: string; brand: string }>;
}

export interface AiExplanation {
  text: string;
  model: string | null;
}

export interface IngredientAnalysis {
  id: string;
  query: string;
  foundInCatalog: boolean;
  createdAt: string;
  ingredient: IngredientDetail | null;
  aiExplanation: AiExplanation | null;
}

export interface ComparedIngredient {
  id: string;
  name: string;
  position: number;
}

export interface ComparisonProductSummary {
  id: string;
  /** Presente nas comparações do catálogo público; ausente nas antigas, feitas com produtos pessoais. */
  slug?: string | null;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  ingredientCount: number;
}

export interface ComparisonResult {
  productA: ComparisonProductSummary;
  productB: ComparisonProductSummary;
  sameBrand: boolean;
  sameCategory: boolean;
  commonIngredients: Array<{ id: string; name: string; positionA: number; positionB: number }>;
  exclusiveToA: ComparedIngredient[];
  exclusiveToB: ComparedIngredient[];
  overlapPercentage: number;
}

export interface Comparison {
  id: string;
  createdAt: string;
  result: ComparisonResult;
  aiExplanation: AiExplanation | null;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  model: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  maxInputChars: number;
  setupInstructions: string | null;
}

export type ActivityType = 'PRODUCT_CREATED' | 'INGREDIENT_LOOKUP' | 'COMPARISON' | 'CONVERSATION';

export interface Dashboard {
  userName: string;
  stats: {
    products: number;
    ingredientLookups: number;
    distinctIngredientsLookedUp: number;
    comparisons: number;
    conversations: number;
  };
  productsByCategory: Array<{ category: ProductCategory; count: number }>;
  recentActivity: Array<{ type: ActivityType; id: string; title: string; date: string }>;
}

export interface HistoryPolicy {
  historyRetentionDays: number;
  aiUsageRetentionDays: number;
  aiDailyLimitPerUser: number;
  rules: string[];
}
