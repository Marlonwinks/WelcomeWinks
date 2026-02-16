import { BusinessAttributes } from '../types/businessAttributes';

/**
 * Business Attributes Inference Utilities
 * 
 * This module provides enhanced inference logic to extract business attributes
 * from Google Places data. It includes:
 * 
 * - Cuisine type inference from Google Places types (40+ cuisine mappings)
 * - Price level extraction from Google Places data
 * - Dietary options inference from business types, names, and patterns
 * - Ambiance tag inference from business types and characteristics
 * - Feature extraction from Google Places data and types
 * - Distance calculation using Haversine formula
 * 
 * The inference is designed to be lightweight and work with limited data,
 * providing reasonable defaults when specific information is not available.
 */

/**
 * Infer business attributes from Google Places data
 * This is a lightweight inference for immediate use in prioritization
 */
export function inferBusinessAttributes(
  place: google.maps.places.PlaceResult,
  userLocation?: { latitude: number; longitude: number }
): BusinessAttributes {
  // Infer cuisine types from Google Places types
  const cuisineTypes = inferCuisineTypes(place.types || []);

  // Get price level from Google Places
  const priceLevel = place.price_level !== undefined ? place.price_level : null;

  // Infer dietary options from types and name
  const dietaryOptions = inferDietaryOptions(place.types || [], place.name || '');

  // Infer ambiance tags from types
  const ambianceTags = inferAmbianceTags(place.types || []);

  // Extract features from Google Places
  const features = extractFeatures(place);

  // Calculate distance from user if location provided
  let distanceFromUser: number | undefined;
  if (userLocation && place.geometry?.location) {
    distanceFromUser = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
  }

  return {
    cuisineTypes,
    priceLevel,
    dietaryOptions,
    ambianceTags,
    features,
    distanceFromUser,
    lastUpdated: new Date(),
    source: 'inferred',
    ratingCount: place.user_ratings_total,
    rawTypes: place.types || [],
  };
}

/**
 * Infer cuisine types from Google Places types
 * Enhanced to handle more cuisine variations and edge cases
 */
function inferCuisineTypes(types: string[]): string[] {
  const cuisineMap: Record<string, string> = {
    // Specific restaurant types
    'italian_restaurant': 'italian',
    'mexican_restaurant': 'mexican',
    'chinese_restaurant': 'chinese',
    'japanese_restaurant': 'japanese',
    'thai_restaurant': 'thai',
    'indian_restaurant': 'indian',
    'french_restaurant': 'french',
    'mediterranean_restaurant': 'mediterranean',
    'greek_restaurant': 'greek',
    'korean_restaurant': 'korean',
    'vietnamese_restaurant': 'vietnamese',
    'spanish_restaurant': 'spanish',
    'middle_eastern_restaurant': 'middle-eastern',
    'seafood_restaurant': 'seafood',
    'steak_house': 'steakhouse',
    'pizza_restaurant': 'pizza',
    'hamburger_restaurant': 'burger',
    'sushi_restaurant': 'sushi',
    'barbecue_restaurant': 'bbq',
    'american_restaurant': 'american',

    // Casual dining and cafes
    'cafe': 'cafe',
    'coffee_shop': 'cafe',
    'bakery': 'bakery',
    'dessert_shop': 'dessert',
    'ice_cream_shop': 'dessert',
    'sandwich_shop': 'american',
    'deli': 'american',

    // Fast food and quick service
    'fast_food_restaurant': 'american',
    'meal_takeaway': 'takeout',

    // Bars and pubs
    'bar': 'bar',
    'pub': 'bar',
    'sports_bar': 'bar',
    'wine_bar': 'bar',

    // Asian cuisines
    'ramen_restaurant': 'japanese',
    'noodle_house': 'asian',
    'asian_restaurant': 'asian',
    'dim_sum_restaurant': 'chinese',

    // Other specific types
    'brazilian_restaurant': 'brazilian',
    'turkish_restaurant': 'turkish',
    'lebanese_restaurant': 'middle-eastern',
    'ethiopian_restaurant': 'ethiopian',
    'caribbean_restaurant': 'caribbean',
    'soul_food_restaurant': 'american',
    'southern_restaurant': 'american',
  };

  const cuisines: string[] = [];

  types.forEach(type => {
    const cuisine = cuisineMap[type];
    if (cuisine && !cuisines.includes(cuisine)) {
      cuisines.push(cuisine);
    }
  });

  // If no specific cuisine found, use generic types
  if (cuisines.length === 0) {
    if (types.includes('restaurant')) {
      cuisines.push('restaurant');
    }
    if (types.includes('food')) {
      cuisines.push('food');
    }
  }

  return cuisines;
}

/**
 * Infer dietary options from types and name
 * Enhanced to detect more dietary options and patterns
 */
function inferDietaryOptions(types: string[], name: string): string[] {
  const options: string[] = [];
  const nameLower = name.toLowerCase();

  // Check for vegetarian/vegan indicators
  if (nameLower.includes('vegan') || types.includes('vegan_restaurant')) {
    options.push('vegan-options');
    options.push('vegetarian-options'); // Vegan implies vegetarian
  } else if (nameLower.includes('vegetarian') || types.includes('vegetarian_restaurant')) {
    options.push('vegetarian-options');
  }

  // Check for gluten-free indicators
  if (nameLower.includes('gluten-free') ||
    nameLower.includes('gluten free') ||
    nameLower.includes('gf ') ||
    nameLower.includes(' gf')) {
    options.push('gluten-free-options');
  }

  // Check for halal indicators
  if (nameLower.includes('halal') ||
    types.includes('halal_restaurant') ||
    nameLower.includes('middle eastern') ||
    nameLower.includes('turkish') ||
    nameLower.includes('lebanese')) {
    options.push('halal');
  }

  // Check for kosher indicators
  if (nameLower.includes('kosher') ||
    types.includes('kosher_restaurant') ||
    nameLower.includes('jewish')) {
    options.push('kosher');
  }

  // Check for dairy-free indicators
  if (nameLower.includes('dairy-free') ||
    nameLower.includes('dairy free') ||
    nameLower.includes('lactose-free')) {
    options.push('dairy-free-options');
  }

  // Check for nut-free indicators
  if (nameLower.includes('nut-free') ||
    nameLower.includes('nut free') ||
    nameLower.includes('allergy-friendly')) {
    options.push('nut-free-options');
  }

  // Infer from cuisine types
  if (types.includes('vegan_restaurant') || types.includes('vegetarian_restaurant')) {
    if (!options.includes('vegetarian-options')) {
      options.push('vegetarian-options');
    }
  }

  // Salad bars and health food typically have vegetarian options
  if (types.includes('salad_bar') ||
    types.includes('health_food_restaurant') ||
    nameLower.includes('salad') ||
    nameLower.includes('juice bar')) {
    if (!options.includes('vegetarian-options')) {
      options.push('vegetarian-options');
    }
  }

  return options;
}

/**
 * Infer ambiance tags from types
 * Enhanced to detect more ambiance patterns
 */
function inferAmbianceTags(types: string[]): string[] {
  const tags: string[] = [];

  // Fine dining indicators
  if (types.includes('fine_dining_restaurant') ||
    types.includes('french_restaurant')) {
    tags.push('fine-dining');
    tags.push('upscale');
  }

  // Upscale indicators
  if (types.includes('wine_bar') ||
    types.includes('cocktail_bar')) {
    if (!tags.includes('upscale')) {
      tags.push('upscale');
    }
  }

  // Casual indicators
  if (types.includes('cafe') ||
    types.includes('fast_food_restaurant') ||
    types.includes('sandwich_shop') ||
    types.includes('deli') ||
    types.includes('bakery')) {
    tags.push('casual');
  }

  // Family-friendly indicators
  if (types.includes('family_restaurant') ||
    types.includes('pizza_restaurant') ||
    types.includes('ice_cream_shop')) {
    tags.push('family-friendly');
  }

  // Romantic indicators
  if (types.includes('fine_dining_restaurant') ||
    types.includes('wine_bar') ||
    types.includes('french_restaurant') ||
    types.includes('italian_restaurant')) {
    tags.push('romantic');
  }

  // Bar/lively indicators
  if (types.includes('bar') ||
    types.includes('night_club') ||
    types.includes('live_music_venue')) {
    tags.push('lively');
  }

  // Sports bar
  if (types.includes('sports_bar')) {
    tags.push('sports-bar');
    if (!tags.includes('lively')) {
      tags.push('lively');
    }
  }

  // Dive bar
  if (types.includes('dive_bar')) {
    tags.push('dive-bar');
  }

  // Cozy indicators
  if (types.includes('cafe') ||
    types.includes('coffee_shop') ||
    types.includes('bakery')) {
    tags.push('cozy');
  }

  // Trendy indicators
  if (types.includes('cocktail_bar') ||
    types.includes('wine_bar') ||
    types.includes('sushi_restaurant') ||
    types.includes('ramen_restaurant')) {
    tags.push('trendy');
  }

  // Quiet indicators
  if (types.includes('library') ||
    types.includes('tea_house')) {
    tags.push('quiet');
  }

  return tags;
}

/**
 * Extract features from Google Places data
 * Enhanced to extract more features from place details
 */
function extractFeatures(place: google.maps.places.PlaceResult): string[] {
  const features: string[] = [];
  const types = place.types || [];

  // Check for outdoor seating
  if (types.includes('outdoor_seating')) {
    features.push('outdoor-seating');
  }

  // Check for takeout
  if (types.includes('meal_takeaway') || types.includes('takeout')) {
    features.push('takeout');
  }

  // Check for delivery
  if (types.includes('meal_delivery') || types.includes('delivery')) {
    features.push('delivery');
  }

  // Check for bar
  if (types.includes('bar') || types.includes('liquor_store')) {
    features.push('bar');
  }

  // Check for parking (if available in place data)
  if (types.includes('parking')) {
    features.push('parking');
  }

  // Check for wheelchair accessibility (if available)
  if (types.includes('wheelchair_accessible_entrance')) {
    features.push('wheelchair-accessible');
  }

  // Check for WiFi (if available in place details)
  // Note: This would require place details API call
  // For now, infer from cafe/coffee shop types
  if (types.includes('cafe') || types.includes('coffee_shop')) {
    features.push('wifi');
  }

  // Check for reservations (typically fine dining and upscale)
  if (types.includes('fine_dining_restaurant') ||
    types.includes('french_restaurant')) {
    features.push('reservations');
  }

  // Check for live music
  if (types.includes('live_music_venue') ||
    types.includes('night_club')) {
    features.push('live-music');
  }

  // Check for pet-friendly (if available)
  // Typically outdoor seating places are more pet-friendly
  if (types.includes('outdoor_seating') ||
    types.includes('park')) {
    features.push('pet-friendly');
  }

  // Check for happy hour (bars and pubs typically have this)
  if (types.includes('bar') ||
    types.includes('pub') ||
    types.includes('sports_bar')) {
    features.push('happy-hour');
  }

  return features;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
