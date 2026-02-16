// Preference importance levels
export type PreferenceImportance = 'must-have' | 'high' | 'medium' | 'low';

// Dining Preferences Model
export interface DiningPreferences {
  // Cuisine preferences
  cuisines: {
    preferred: string[]; // e.g., ['italian', 'mexican', 'japanese']
    disliked: string[]; // e.g., ['seafood']
    importance: PreferenceImportance;
  };
  
  // Price range preferences
  priceRange: {
    min: number; // 1-4 (Google Places price level)
    max: number; // 1-4
    importance: PreferenceImportance;
  };
  
  // Dietary restrictions
  dietary: {
    restrictions: string[]; // e.g., ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher']
    importance: PreferenceImportance;
  };
  
  // Ambiance preferences
  ambiance: {
    preferred: string[]; // e.g., ['casual', 'fine-dining', 'family-friendly', 'romantic', 'lively']
    importance: 'high' | 'medium' | 'low'; // Cannot be must-have
  };
  
  // Distance preferences
  distance: {
    maxDistance: number; // in miles
    importance: 'high' | 'medium' | 'low'; // Cannot be must-have
  };
  
  // Rating preferences
  rating: {
    minRating: number; // 0-5 (Google rating)
    minWinksScore: number | null; // null means no preference
    importance: 'high' | 'medium' | 'low'; // Cannot be must-have
  };

  // Political perspective for Winks Score prioritization
  politicalView: 'liberal' | 'conservative' | 'none';
  
  // Features preferences
  features: {
    preferred: string[]; // e.g., ['outdoor-seating', 'wifi', 'parking', 'wheelchair-accessible']
    importance: 'high' | 'medium' | 'low'; // Cannot be must-have
  };
  
  // Learning data (for future ML enhancements)
  learningData: {
    viewedBusinesses: string[]; // businessIds
    savedBusinesses: string[]; // businessIds
    ratedBusinesses: Array<{
      businessId: string;
      rating: number;
      timestamp: Date;
    }>;
  };
}

// Default dining preferences
export const DEFAULT_DINING_PREFERENCES: DiningPreferences = {
  cuisines: {
    preferred: [],
    disliked: [],
    importance: 'medium',
  },
  priceRange: {
    min: 1,
    max: 4,
    importance: 'medium',
  },
  dietary: {
    restrictions: [],
    importance: 'medium',
  },
  ambiance: {
    preferred: [],
    importance: 'medium',
  },
  distance: {
    maxDistance: 10, // 10 miles default
    importance: 'medium',
  },
  rating: {
    minRating: 0,
    minWinksScore: null,
    importance: 'medium',
  },
  features: {
    preferred: [],
    importance: 'low',
  },
  politicalView: 'none',
  learningData: {
    viewedBusinesses: [],
    savedBusinesses: [],
    ratedBusinesses: [],
  },
};

// Category weights for scoring algorithm
export interface CategoryWeights {
  cuisine: number;
  price: number;
  dietary: number;
  ambiance: number;
  distance: number;
  rating: number;
  features: number;
}

// Default category weights (must sum to 100)
// NOTE: Rating is now used as a multiplier, not a weighted category
export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  cuisine: 30,    // Increased - most important preference match
  price: 15,      // Same
  dietary: 25,    // Increased - critical for dietary restrictions
  ambiance: 15,   // Same
  distance: 10,   // Same
  rating: 0,      // Not used in weighted sum (used as multiplier instead)
  features: 5,    // Same
};

// Importance multipliers for scoring
export const IMPORTANCE_MULTIPLIERS: Record<PreferenceImportance, number> = {
  'must-have': 0, // Special case: filter instead of score
  'high': 1.5,
  'medium': 1.0,
  'low': 0.5,
};
