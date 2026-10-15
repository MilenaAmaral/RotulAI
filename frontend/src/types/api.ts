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
  | 'OUTRO';

export interface User {
  id: string;
  name: string;
  email: string;
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
  createdAt: string;
  updatedAt: string;
  ingredients: ProductIngredient[];
}

export interface ProductInput {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
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
