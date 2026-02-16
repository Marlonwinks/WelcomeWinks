// Business Attributes Model
export interface BusinessAttributes {
  // Cuisine types (from Google Places types + custom)
  cuisineTypes: string[];

  // Price level (from Google Places)
  priceLevel: number | null; // 1-4

  // Dietary options (inferred or manually tagged)
  dietaryOptions: string[]; // e.g., ['vegetarian-options', 'vegan-options', 'gluten-free-options']

  // Ambiance tags (inferred from reviews or manually tagged)
  ambianceTags: string[];

  // Features (from Google Places)
  features: string[]; // e.g., ['outdoor-seating', 'wifi', 'parking']

  // Distance from user (calculated at query time)
  distanceFromUser?: number; // in miles

  // Metadata
  lastUpdated: Date;
  source: 'google' | 'inferred' | 'manual';

  // Scoring Helpers
  ratingCount?: number;
  rawTypes?: string[];
}

// Relevance Score Model
export interface RelevanceScore {
  businessId: string;
  totalScore: number; // 0-100
  breakdown: {
    cuisineScore: number;
    priceScore: number;
    dietaryScore: number;
    ambianceScore: number;
    distanceScore: number;
    ratingScore: number;
    featuresScore: number;
    timeScore: number;
    nicheScore: number;
  };
  matchedPreferences: string[]; // List of matched preference categories
  unmatchedPreferences: string[]; // List of unmatched preference categories
}

// Common cuisine types
export const CUISINE_TYPES = [
  'american',
  'italian',
  'mexican',
  'chinese',
  'japanese',
  'thai',
  'indian',
  'french',
  'mediterranean',
  'greek',
  'korean',
  'vietnamese',
  'spanish',
  'middle-eastern',
  'seafood',
  'steakhouse',
  'pizza',
  'burger',
  'sushi',
  'bbq',
  'cafe',
  'bakery',
  'dessert',
] as const;

export type CuisineType = typeof CUISINE_TYPES[number];

// Common dietary options
export const DIETARY_OPTIONS = [
  'vegetarian-options',
  'vegan-options',
  'gluten-free-options',
  'halal',
  'kosher',
  'dairy-free-options',
  'nut-free-options',
] as const;

export type DietaryOption = typeof DIETARY_OPTIONS[number];

// Common ambiance tags
export const AMBIANCE_TAGS = [
  'casual',
  'fine-dining',
  'family-friendly',
  'romantic',
  'lively',
  'quiet',
  'trendy',
  'cozy',
  'upscale',
  'dive-bar',
  'sports-bar',
] as const;

export type AmbianceTag = typeof AMBIANCE_TAGS[number];

// Common features
export const FEATURE_OPTIONS = [
  'outdoor-seating',
  'wifi',
  'parking',
  'wheelchair-accessible',
  'takeout',
  'delivery',
  'reservations',
  'live-music',
  'pet-friendly',
  'bar',
  'happy-hour',
] as const;

export type FeatureOption = typeof FEATURE_OPTIONS[number];
