import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { BusinessAttributes } from './businessAttributes';

// Firebase User Account Model
export interface AppUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  ipAddress: string;
  accountType: 'full';
}

// Cookie Account Model
export interface CookieAccount {
  cookieId: string;
  ipAddress: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  accountType: 'cookie';
  isExpired: boolean;
}

// IP Address History Entry
export interface IPAddressEntry {
  ipAddress: string;
  timestamp: Date;
  action: string; // 'account_created', 'login', 'rating_submitted', etc.
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

// User Profile Model (for both account types)
export interface UserProfile {
  userId: string; // Firebase UID or cookie ID
  accountType: 'full' | 'cookie';
  
  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;
  
  // Preferences
  preferences?: UserPreferences;
  privacyConsent: boolean;
  termsAccepted: boolean;
  
  // IP Address tracking
  ipAddressHistory?: IPAddressEntry[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// User Preferences Model
export interface UserPreferences {
  defaultView: 'map' | 'list';
  locationSharing: boolean;
  notificationPreferences: {
    newBusinessesNearby: boolean;
    scoreUpdates: boolean;
    communityActivity: boolean;
  };
  privacySettings: {
    shareContributions: boolean;
    publicProfile: boolean;
  };
}

// Registration Data Model
export interface RegistrationData {
  // Required fields for full accounts
  email: string;
  password: string;
  
  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;
  
  // Preferences
  preferences?: UserPreferences;
  privacyConsent: boolean;
  termsAccepted: boolean;
}

// Business Model
export interface Business {
  businessId: string; // Google Places ID
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  googlePlacesData: any; // Raw Google Places data
  
  // Rating aggregation
  averageScore: number | null;
  totalRatings: number;
  ratingBreakdown: {
    veryWelcoming: number;
    moderatelyWelcoming: number;
    notWelcoming: number;
  };
  
  // Status
  status: 'neutral' | 'rated';
  
  // Business attributes for preference matching
  attributes?: BusinessAttributes;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Individual Rating Model
export interface BusinessRating {
  ratingId: string;
  businessId: string; // References Business.businessId
  userId: string; // Firebase UID or cookie ID
  userAccountType: 'full' | 'cookie' | 'anonymous';
  
  // Survey responses (6 questions)
  responses: {
    trumpWelcome: number; // -2 to +2
    obamaWelcome: number; // -2 to +2
    personOfColorComfort: number; // -2 to +2
    lgbtqSafety: number; // -2 to +2
    undocumentedSafety: number; // -2 to +2
    firearmNormal: number; // -2 to +2
  };
  
  // Calculated score
  totalScore: number; // Sum of all responses
  welcomingLevel: 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming';
  
  // Migration fields (optional)
  migratedAt?: Date; // When this rating was migrated from cookie to full account
  originalUserId?: string; // Original cookie ID if migrated
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date; // When the rating was last updated (for edits)
  userIpAddress: string;
}

// Rating Aggregation Model
export interface RatingAggregation {
  businessId: string;
  totalRatings: number;
  averageScore: number;
  scoreDistribution: {
    veryWelcoming: number;
    moderatelyWelcoming: number;
    notWelcoming: number;
  };
  lastUpdated: Date;
}

// Firestore document converters
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper type for converting Firestore timestamps to dates
export type WithFirestoreMetadata<T> = T & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// Authentication state
export interface AuthState {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  cookieAccount: CookieAccount | null;
  loading: boolean;
  error: string | null;
}

// Firebase error types
export interface FirebaseError {
  code: string;
  message: string;
  customData?: any;
}

export { FirebaseUser };