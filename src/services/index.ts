// Firebase configuration and initialization
export { default as app, auth, db, analytics } from './firebase';

// Service instances
export { authService } from './auth.service';
export { ratingsService } from './ratings.service';
export { cookieAccountService } from './cookieAccount.service';
export { ipAddressService } from './ipAddress.service';
export { activityTrackingService } from './activityTracking.service';
export { profileService } from './profile.service';
export { businessAttributesService } from './businessAttributes.service';

// Service classes (for testing or custom instantiation)
export { AuthService } from './auth.service';
export { RatingsService } from './ratings.service';
export { CookieAccountService } from './cookieAccount.service';
export { IPAddressService } from './ipAddress.service';
export { ActivityTrackingService } from './activityTracking.service';
export { BusinessAttributesService } from './businessAttributes.service';

// Types and interfaces
export type { SurveyResponses, WelcomingLevel } from './ratings.service';

// Prioritization service functions
export {
  calculateCuisineScore,
  calculatePriceScore,
  calculateDietaryScore,
  calculateAmbianceScore,
  calculateDistanceScore,
  calculateRatingScore,
  calculateFeaturesScore,
  calculateRelevanceScore,
  filterByMustHaves,
  sortByRelevance,
  hasPreferencesSet,
  relaxMustHaves,
  sortBusinessesWithFallback,
} from './prioritization.service';

export type { BusinessWithScore } from './prioritization.service';