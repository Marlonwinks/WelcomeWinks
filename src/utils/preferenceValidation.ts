import { DiningPreferences, PreferenceImportance } from '../types/preferences';
import { CUISINE_TYPES, DIETARY_OPTIONS, AMBIANCE_TAGS, FEATURE_OPTIONS } from '../types/businessAttributes';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validation error messages
const ERROR_MESSAGES = {
  INVALID_IMPORTANCE: 'Importance level must be one of: must-have, high, medium, low',
  INVALID_PRICE_RANGE: 'Price range must be between 1 and 4',
  INVALID_PRICE_MIN_MAX: 'Minimum price must be less than or equal to maximum price',
  INVALID_CUISINE: 'Invalid cuisine type',
  INVALID_DIETARY: 'Invalid dietary restriction',
  INVALID_AMBIANCE: 'Invalid ambiance tag',
  INVALID_AMBIANCE_IMPORTANCE: 'Ambiance importance cannot be must-have',
  INVALID_FEATURE: 'Invalid feature option',
  INVALID_DISTANCE: 'Distance must be a positive number',
  INVALID_DISTANCE_IMPORTANCE: 'Distance importance cannot be must-have',
  INVALID_RATING: 'Rating must be between 0 and 5',
  INVALID_RATING_IMPORTANCE: 'Rating importance cannot be must-have',
  INVALID_WINKS_SCORE: 'Winks score must be a positive number or null',
  INVALID_FEATURE_IMPORTANCE: 'Feature importance cannot be must-have',
};

/**
 * Validates importance level
 */
export const validateImportanceLevel = (
  importance: string,
  allowedLevels: PreferenceImportance[] = ['must-have', 'high', 'medium', 'low']
): ValidationResult => {
  const errors: string[] = [];
  
  if (!allowedLevels.includes(importance as PreferenceImportance)) {
    errors.push(ERROR_MESSAGES.INVALID_IMPORTANCE);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates cuisine preferences
 */
export const validateCuisinePreferences = (
  cuisines: DiningPreferences['cuisines']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level
  const importanceValidation = validateImportanceLevel(cuisines.importance);
  if (!importanceValidation.isValid) {
    errors.push(...importanceValidation.errors);
  }
  
  // Validate preferred cuisines
  if (cuisines.preferred && Array.isArray(cuisines.preferred)) {
    const invalidPreferred = cuisines.preferred.filter(
      cuisine => !CUISINE_TYPES.includes(cuisine as any)
    );
    if (invalidPreferred.length > 0) {
      errors.push(`${ERROR_MESSAGES.INVALID_CUISINE}: ${invalidPreferred.join(', ')}`);
    }
  }
  
  // Validate disliked cuisines
  if (cuisines.disliked && Array.isArray(cuisines.disliked)) {
    const invalidDisliked = cuisines.disliked.filter(
      cuisine => !CUISINE_TYPES.includes(cuisine as any)
    );
    if (invalidDisliked.length > 0) {
      errors.push(`${ERROR_MESSAGES.INVALID_CUISINE}: ${invalidDisliked.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates price range preferences
 */
export const validatePriceRangePreferences = (
  priceRange: DiningPreferences['priceRange']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level
  const importanceValidation = validateImportanceLevel(priceRange.importance);
  if (!importanceValidation.isValid) {
    errors.push(...importanceValidation.errors);
  }
  
  // Validate min price
  if (priceRange.min < 1 || priceRange.min > 4 || !Number.isInteger(priceRange.min)) {
    errors.push(`${ERROR_MESSAGES.INVALID_PRICE_RANGE} (min: ${priceRange.min})`);
  }
  
  // Validate max price
  if (priceRange.max < 1 || priceRange.max > 4 || !Number.isInteger(priceRange.max)) {
    errors.push(`${ERROR_MESSAGES.INVALID_PRICE_RANGE} (max: ${priceRange.max})`);
  }
  
  // Validate min <= max
  if (priceRange.min > priceRange.max) {
    errors.push(ERROR_MESSAGES.INVALID_PRICE_MIN_MAX);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates dietary restrictions preferences
 */
export const validateDietaryPreferences = (
  dietary: DiningPreferences['dietary']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level
  const importanceValidation = validateImportanceLevel(dietary.importance);
  if (!importanceValidation.isValid) {
    errors.push(...importanceValidation.errors);
  }
  
  // Validate dietary restrictions
  if (dietary.restrictions && Array.isArray(dietary.restrictions)) {
    const invalidRestrictions = dietary.restrictions.filter(
      restriction => !DIETARY_OPTIONS.includes(restriction as any)
    );
    if (invalidRestrictions.length > 0) {
      errors.push(`${ERROR_MESSAGES.INVALID_DIETARY}: ${invalidRestrictions.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates ambiance preferences
 */
export const validateAmbiancePreferences = (
  ambiance: DiningPreferences['ambiance']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level (cannot be must-have)
  const allowedLevels: PreferenceImportance[] = ['high', 'medium', 'low'];
  const importanceValidation = validateImportanceLevel(ambiance.importance, allowedLevels);
  if (!importanceValidation.isValid) {
    errors.push(ERROR_MESSAGES.INVALID_AMBIANCE_IMPORTANCE);
  }
  
  // Validate ambiance tags
  if (ambiance.preferred && Array.isArray(ambiance.preferred)) {
    const invalidTags = ambiance.preferred.filter(
      tag => !AMBIANCE_TAGS.includes(tag as any)
    );
    if (invalidTags.length > 0) {
      errors.push(`${ERROR_MESSAGES.INVALID_AMBIANCE}: ${invalidTags.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates distance preferences
 */
export const validateDistancePreferences = (
  distance: DiningPreferences['distance']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level (cannot be must-have)
  const allowedLevels: PreferenceImportance[] = ['high', 'medium', 'low'];
  const importanceValidation = validateImportanceLevel(distance.importance, allowedLevels);
  if (!importanceValidation.isValid) {
    errors.push(ERROR_MESSAGES.INVALID_DISTANCE_IMPORTANCE);
  }
  
  // Validate max distance
  if (distance.maxDistance <= 0 || !Number.isFinite(distance.maxDistance)) {
    errors.push(ERROR_MESSAGES.INVALID_DISTANCE);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates rating preferences
 */
export const validateRatingPreferences = (
  rating: DiningPreferences['rating']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level (cannot be must-have)
  const allowedLevels: PreferenceImportance[] = ['high', 'medium', 'low'];
  const importanceValidation = validateImportanceLevel(rating.importance, allowedLevels);
  if (!importanceValidation.isValid) {
    errors.push(ERROR_MESSAGES.INVALID_RATING_IMPORTANCE);
  }
  
  // Validate min rating
  if (rating.minRating < 0 || rating.minRating > 5 || !Number.isFinite(rating.minRating)) {
    errors.push(ERROR_MESSAGES.INVALID_RATING);
  }
  
  // Validate min winks score
  if (rating.minWinksScore !== null) {
    if (rating.minWinksScore < 0 || !Number.isFinite(rating.minWinksScore)) {
      errors.push(ERROR_MESSAGES.INVALID_WINKS_SCORE);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates features preferences
 */
export const validateFeaturesPreferences = (
  features: DiningPreferences['features']
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate importance level (cannot be must-have)
  const allowedLevels: PreferenceImportance[] = ['high', 'medium', 'low'];
  const importanceValidation = validateImportanceLevel(features.importance, allowedLevels);
  if (!importanceValidation.isValid) {
    errors.push(ERROR_MESSAGES.INVALID_FEATURE_IMPORTANCE);
  }
  
  // Validate feature options
  if (features.preferred && Array.isArray(features.preferred)) {
    const invalidFeatures = features.preferred.filter(
      feature => !FEATURE_OPTIONS.includes(feature as any)
    );
    if (invalidFeatures.length > 0) {
      errors.push(`${ERROR_MESSAGES.INVALID_FEATURE}: ${invalidFeatures.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates complete dining preferences object
 */
export const validateDiningPreferences = (
  preferences: DiningPreferences
): ValidationResult => {
  const errors: string[] = [];
  
  // Validate each section
  const cuisineValidation = validateCuisinePreferences(preferences.cuisines);
  if (!cuisineValidation.isValid) {
    errors.push(...cuisineValidation.errors.map(e => `Cuisine: ${e}`));
  }
  
  const priceValidation = validatePriceRangePreferences(preferences.priceRange);
  if (!priceValidation.isValid) {
    errors.push(...priceValidation.errors.map(e => `Price: ${e}`));
  }
  
  const dietaryValidation = validateDietaryPreferences(preferences.dietary);
  if (!dietaryValidation.isValid) {
    errors.push(...dietaryValidation.errors.map(e => `Dietary: ${e}`));
  }
  
  const ambianceValidation = validateAmbiancePreferences(preferences.ambiance);
  if (!ambianceValidation.isValid) {
    errors.push(...ambianceValidation.errors.map(e => `Ambiance: ${e}`));
  }
  
  const distanceValidation = validateDistancePreferences(preferences.distance);
  if (!distanceValidation.isValid) {
    errors.push(...distanceValidation.errors.map(e => `Distance: ${e}`));
  }
  
  const ratingValidation = validateRatingPreferences(preferences.rating);
  if (!ratingValidation.isValid) {
    errors.push(...ratingValidation.errors.map(e => `Rating: ${e}`));
  }
  
  const featuresValidation = validateFeaturesPreferences(preferences.features);
  if (!featuresValidation.isValid) {
    errors.push(...featuresValidation.errors.map(e => `Features: ${e}`));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitizes dining preferences by removing invalid values
 */
export const sanitizeDiningPreferences = (
  preferences: Partial<DiningPreferences>
): Partial<DiningPreferences> => {
  const sanitized: Partial<DiningPreferences> = {};
  
  // Sanitize cuisines
  if (preferences.cuisines) {
    sanitized.cuisines = {
      preferred: preferences.cuisines.preferred?.filter(c => 
        CUISINE_TYPES.includes(c as any)
      ) || [],
      disliked: preferences.cuisines.disliked?.filter(c => 
        CUISINE_TYPES.includes(c as any)
      ) || [],
      importance: ['must-have', 'high', 'medium', 'low'].includes(preferences.cuisines.importance)
        ? preferences.cuisines.importance
        : 'medium',
    };
  }
  
  // Sanitize price range
  if (preferences.priceRange) {
    const min = Math.max(1, Math.min(4, Math.floor(preferences.priceRange.min)));
    const max = Math.max(1, Math.min(4, Math.floor(preferences.priceRange.max)));
    sanitized.priceRange = {
      min: Math.min(min, max),
      max: Math.max(min, max),
      importance: ['must-have', 'high', 'medium', 'low'].includes(preferences.priceRange.importance)
        ? preferences.priceRange.importance
        : 'medium',
    };
  }
  
  // Sanitize dietary
  if (preferences.dietary) {
    sanitized.dietary = {
      restrictions: preferences.dietary.restrictions?.filter(r => 
        DIETARY_OPTIONS.includes(r as any)
      ) || [],
      importance: ['must-have', 'high', 'medium', 'low'].includes(preferences.dietary.importance)
        ? preferences.dietary.importance
        : 'medium',
    };
  }
  
  // Sanitize ambiance
  if (preferences.ambiance) {
    sanitized.ambiance = {
      preferred: preferences.ambiance.preferred?.filter(a => 
        AMBIANCE_TAGS.includes(a as any)
      ) || [],
      importance: ['high', 'medium', 'low'].includes(preferences.ambiance.importance)
        ? preferences.ambiance.importance
        : 'medium',
    };
  }
  
  // Sanitize distance
  if (preferences.distance) {
    sanitized.distance = {
      maxDistance: Math.max(0.1, preferences.distance.maxDistance),
      importance: ['high', 'medium', 'low'].includes(preferences.distance.importance)
        ? preferences.distance.importance
        : 'medium',
    };
  }
  
  // Sanitize rating
  if (preferences.rating) {
    sanitized.rating = {
      minRating: Math.max(0, Math.min(5, preferences.rating.minRating)),
      minWinksScore: preferences.rating.minWinksScore !== null
        ? Math.max(0, preferences.rating.minWinksScore)
        : null,
      importance: ['high', 'medium', 'low'].includes(preferences.rating.importance)
        ? preferences.rating.importance
        : 'medium',
    };
  }
  
  // Sanitize features
  if (preferences.features) {
    sanitized.features = {
      preferred: preferences.features.preferred?.filter(f => 
        FEATURE_OPTIONS.includes(f as any)
      ) || [],
      importance: ['high', 'medium', 'low'].includes(preferences.features.importance)
        ? preferences.features.importance
        : 'low',
    };
  }
  
  // Copy learning data as-is (no validation needed)
  if (preferences.learningData) {
    sanitized.learningData = preferences.learningData;
  }
  
  return sanitized;
};
