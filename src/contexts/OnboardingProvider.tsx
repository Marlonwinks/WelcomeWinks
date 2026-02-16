import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  OnboardingState,
  UserPreferences,
  UserGoal,
  OnboardingStep,
  RegistrationStatus,
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_USER_PREFERENCES,
} from '../types/onboarding';

// Action types for the onboarding reducer
type OnboardingAction =
  | { type: 'SET_STEP'; payload: OnboardingStep }
  | { type: 'SET_PREFERRED_GOAL'; payload: UserGoal }
  | { type: 'SET_LOCATION_PREFERENCE'; payload: 'auto' | 'manual' }
  | { type: 'SET_REGISTRATION_STATUS'; payload: RegistrationStatus }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET_ONBOARDING' }
  | { type: 'LOAD_STATE'; payload: OnboardingState };

// Context interface
interface OnboardingContextType {
  state: OnboardingState;
  userPreferences: UserPreferences;
  setStep: (step: OnboardingStep) => void;
  setPreferredGoal: (goal: UserGoal) => void;
  setLocationPreference: (preference: 'auto' | 'manual') => void;
  setRegistrationStatus: (status: RegistrationStatus) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  isOnboardingComplete: boolean;
  shouldShowOnboarding: boolean;
}

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Reducer function
function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_PREFERRED_GOAL':
      return { ...state, preferredGoal: action.payload };
    
    case 'SET_LOCATION_PREFERENCE':
      return { ...state, locationPreference: action.payload };
    
    case 'SET_REGISTRATION_STATUS':
      return { ...state, registrationStatus: action.payload };
    
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasCompletedOnboarding: true,
        currentStep: 'completed',
        lastOnboardingDate: new Date(),
      };
    
    case 'RESET_ONBOARDING':
      return {
        ...DEFAULT_ONBOARDING_STATE,
        onboardingVersion: state.onboardingVersion,
      };
    
    case 'LOAD_STATE':
      return action.payload;
    
    default:
      return state;
  }
}

// Storage keys
const ONBOARDING_STORAGE_KEY = 'welcome-winks-onboarding';
const USER_PREFERENCES_STORAGE_KEY = 'welcome-winks-preferences';

// Helper functions for localStorage
const loadOnboardingState = (): OnboardingState => {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      if (parsed.lastOnboardingDate) {
        parsed.lastOnboardingDate = new Date(parsed.lastOnboardingDate);
      }
      return { ...DEFAULT_ONBOARDING_STATE, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load onboarding state from localStorage:', error);
  }
  return DEFAULT_ONBOARDING_STATE;
};

const saveOnboardingState = (state: OnboardingState): void => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save onboarding state to localStorage:', error);
  }
};

const loadUserPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_USER_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load user preferences from localStorage:', error);
  }
  return DEFAULT_USER_PREFERENCES;
};

const saveUserPreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save user preferences to localStorage:', error);
  }
};

// Provider component
interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, DEFAULT_ONBOARDING_STATE);
  const [userPreferences, setUserPreferences] = React.useState<UserPreferences>(DEFAULT_USER_PREFERENCES);

  // Load state from localStorage on mount
  useEffect(() => {
    const loadedState = loadOnboardingState();
    const loadedPreferences = loadUserPreferences();
    
    dispatch({ type: 'LOAD_STATE', payload: loadedState });
    setUserPreferences(loadedPreferences);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveOnboardingState(state);
  }, [state]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    saveUserPreferences(userPreferences);
  }, [userPreferences]);

  // Context methods
  const setStep = (step: OnboardingStep) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const setPreferredGoal = (goal: UserGoal) => {
    dispatch({ type: 'SET_PREFERRED_GOAL', payload: goal });
  };

  const setLocationPreference = (preference: 'auto' | 'manual') => {
    dispatch({ type: 'SET_LOCATION_PREFERENCE', payload: preference });
  };

  const setRegistrationStatus = (status: RegistrationStatus) => {
    dispatch({ type: 'SET_REGISTRATION_STATUS', payload: status });
  };

  const completeOnboarding = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
  };

  const resetOnboarding = () => {
    dispatch({ type: 'RESET_ONBOARDING' });
  };

  const updateUserPreferences = (newPreferences: Partial<UserPreferences>) => {
    setUserPreferences(prev => ({
      ...prev,
      ...newPreferences,
      // Handle nested objects properly
      notificationPreferences: {
        ...prev.notificationPreferences,
        ...(newPreferences.notificationPreferences || {}),
      },
      privacySettings: {
        ...prev.privacySettings,
        ...(newPreferences.privacySettings || {}),
      },
    }));
  };

  // Computed values
  const isOnboardingComplete = state.hasCompletedOnboarding;
  const shouldShowOnboarding = !state.hasCompletedOnboarding;

  const contextValue: OnboardingContextType = {
    state,
    userPreferences,
    setStep,
    setPreferredGoal,
    setLocationPreference,
    setRegistrationStatus,
    completeOnboarding,
    resetOnboarding,
    updateUserPreferences,
    isOnboardingComplete,
    shouldShowOnboarding,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook to use the onboarding context
export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};