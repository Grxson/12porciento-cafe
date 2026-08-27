/**
 * 12% Brew — types
 *
 * Mirrors the server-side enums and shapes. Keep in sync with
 * server/src/lib/recipe-engine.ts and the /api/brew/* response payloads.
 */

export type BrewMethodCategory =
  | 'POUR_OVER'
  | 'IMMERSION'
  | 'PRESSURE'
  | 'STOVETOP'
  | 'COLD'
  | 'TRADITIONAL'
  | 'EVALUATION';

export type BrewRecipeProfile =
  | 'BALANCED'
  | 'SWEET'
  | 'BRIGHT'
  | 'FRUITY'
  | 'FLORAL'
  | 'FULL_BODY'
  | 'CLEAN'
  | 'INTENSE'
  | 'REFRESHING'
  | 'EXPERIMENTAL';

export type BrewRecipeType =
  | 'OFFICIAL_12_PERCENT'
  | 'CREATOR'
  | 'BARISTA'
  | 'COMPETITION'
  | 'COMMUNITY'
  | 'PERSONAL';

export type BrewStepType =
  | 'PREPARE'
  | 'RINSE'
  | 'ADD_COFFEE'
  | 'BLOOM'
  | 'POUR'
  | 'WAIT'
  | 'STIR'
  | 'SWIRL'
  | 'PRESS'
  | 'REMOVE_HEAT'
  | 'COOL'
  | 'SERVE'
  | 'CUSTOM';

export type BrewStepAction =
  | 'ADD'
  | 'POUR'
  | 'WAIT'
  | 'STIR'
  | 'SWIRL'
  | 'TAP'
  | 'PRESS'
  | 'BREATHE'
  | 'CUSTOM';

export type PourPattern =
  | 'CENTER'
  | 'CIRCULAR'
  | 'SPIRAL_OUT'
  | 'SPIRAL_IN'
  | 'CENTER_TO_OUT'
  | 'OUT_TO_CENTER'
  | 'PULSE'
  | 'CUSTOM';

export type BrewSessionStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BrewSessionResult =
  | 'SOUR'
  | 'BITTER'
  | 'WATERY'
  | 'STRONG'
  | 'ASTRINGENT'
  | 'UNDEREXTRACTED'
  | 'OVEREXTRACTED'
  | 'BALANCED'
  | 'GOOD'
  | 'EXCELLENT';

export interface BrewMethod {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: BrewMethodCategory;
  icon: string | null;
  image: string | null;
  difficulty: string;
  defaultRatioMin: number;
  defaultRatioMax: number;
  defaultTemperatureMin: number;
  defaultTemperatureMax: number;
  defaultGrindMin: number | null;
  defaultGrindMax: number | null;
  active: boolean;
}

export interface BrewStepStructured {
  order: number;
  title?: string | null;
  description?: string | null;
  type?: BrewStepType;
  duration?: number | null;
  startTimeSeconds?: number | null;
  waterAmountGrams?: number | null;
  targetTotalWaterGrams?: number | null;
  action?: BrewStepAction | null;
  pourPattern?: PourPattern | null;
  flowRateGramsPerSecond?: number | null;
  temperatureCelsius?: number | null;
  instruction?: string | null;
  optional?: boolean;
}

export interface BrewRecipeStructured {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  method: string;
  difficulty: string;
  prepTime: number | null;
  imageUrl: string | null;
  isPublished: boolean;
  isPremium: boolean;
  productId: string | null;
  brewMethodId: string | null;
  brewMethod?: Pick<BrewMethod, 'id' | 'slug' | 'name' | 'icon' | 'category'> | null;
  coffeeDoseGrams: number | null;
  waterGrams: number | null;
  /** water:coffee as float (e.g. 15.0 for 1:15). Server parses the legacy
   *  `Recipe.ratio` string ("15" or "1:15") so the client gets a number. */
  ratio: number | null;
  waterTemperatureCelsius: number | null;
  grindTargetMicrons: number | null;
  profile: BrewRecipeProfile | null;
  recipeType: BrewRecipeType;
  featured: boolean;
  official: boolean;
  parentRecipeId: string | null;
  steps: BrewStepStructured[];
  product?: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string;
  } | null;
  _count?: { steps?: number; brewSessions?: number };
}

export interface BrewSession {
  id: string;
  userId: string;
  coffeeId: string | null;
  recipeId: string | null;
  brewMethodId: string | null;
  recipeSnapshot: BrewRecipeStructured | null;
  coffeeDoseGrams: number | null;
  waterGrams: number | null;
  ratio: number | null;
  temperatureCelsius: number | null;
  grindSetting: string | null;
  grindMicrons: number | null;
  brewTimeSeconds: number | null;
  equipmentSnapshot: unknown;
  rating: number | null;
  notes: string | null;
  sweetnessRating: number | null;
  acidityRating: number | null;
  bodyRating: number | null;
  clarityRating: number | null;
  result: BrewSessionResult | null;
  status: BrewSessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  coffee?: { id: string; slug: string; name: string; imageUrl: string } | null;
  recipe?: { id: string; slug: string; title: string } | null;
  brewMethod?: { id: string; slug: string; name: string; icon: string | null } | null;
  favorited?: boolean;
}

export interface DialInRecommendation {
  primaryChange: string;
  reason: string;
  reasonCode: string;
  suggestions: string[];
}

export interface WaterProfile {
  id: string;
  userId: string | null;
  name: string;
  tds: number | null;
  gh: number | null;
  kh: number | null;
  calcium: number | null;
  magnesium: number | null;
  sodium: number | null;
  description: string | null;
  official: boolean;
}

export interface ScaledRecipe {
  coffeeDoseGrams: number;
  waterGrams: number;
  ratio: number;
  waterTemperatureCelsius: number | null;
  grindTargetMicrons: number | null;
  steps: BrewStepStructured[];
  scale: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
