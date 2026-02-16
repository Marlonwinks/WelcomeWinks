// Onboarding TypeScript interfaces and types

export type UserGoal = 'mark-business' | 'find-welcoming';

export type OnboardingStep = 'location' | 'goal-selection' | 'preferences' | 'account' | 'completed';

export type LocationSource = 'gps' | 'ip' | 'manual';

export type WelcomingLevel = 'very-welcoming' | 'moderately-welcoming' | 'not-welcoming' | 'unrated';

export type RegistrationStatus = 'registered' | 'skipped' | 'remind-later' | 'not-prompted';

export interface LocationData {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  address: string | null;
  source: LocationSource;
  accuracy: number | null;
  timestamp: Date;
  userConfirmed: boolean;
  error: string | null;
}

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: OnboardingStep;
  preferredGoal: UserGoal | null;
  locationPreference: 'auto' | 'manual';
  registrationStatus: RegistrationStatus;
  lastOnboardingDate: Date | null;
  onboardingVersion: string;
}

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
  homeAddress?: string;
  homeCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface RegistrationData {
  // Required fields
  email: string;
  username: string;

  // Optional demographic fields
  name?: string;
  location?: string;
  gender?: string;
  race?: string;
  veteranStatus?: boolean;
  politicalPosition?: string;

  // Preferences
  preferences: UserPreferences;
  privacyConsent: boolean;
  termsAccepted: boolean;
}

export interface GoalOption {
  id: UserGoal;
  title: string;
  description: string;
  icon: string; // Icon name or component reference
  primaryAction: string;
}

export interface RegistrationBenefits {
  trackContributions: boolean;
  personalizedRecommendations: boolean;
  communityConnection: boolean;
  notificationPreferences: boolean;
}

// Default values and constants
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  hasCompletedOnboarding: false,
  currentStep: 'location',
  preferredGoal: null,
  locationPreference: 'auto',
  registrationStatus: 'not-prompted',
  lastOnboardingDate: null,
  onboardingVersion: '1.1.0', // Updated version for account step
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultView: 'map',
  locationSharing: true,
  notificationPreferences: {
    newBusinessesNearby: true,
    scoreUpdates: true,
    communityActivity: false,
  },
  privacySettings: {
    shareContributions: true,
    publicProfile: false,
  },
};

export const WELCOMING_SCORE_THRESHOLDS = {
  VERY_WELCOMING: 5,
  NOT_WELCOMING: -5,
} as const;

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'mark-business',
    title: 'Wink at a Business',
    description: 'Rate how welcoming a local business is to different groups',
    icon: 'star',
    primaryAction: 'Start Rating',
  },
  {
    id: 'find-welcoming',
    title: 'Find Welcoming Places',
    description: 'Discover businesses that are welcoming to people like you',
    icon: 'search',
    primaryAction: 'Explore Places',
  },
];