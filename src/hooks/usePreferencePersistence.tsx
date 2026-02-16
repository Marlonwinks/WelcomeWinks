import { useCallback, useEffect, useState, useRef } from 'react';
import { UserGoal, LocationData } from '../types/onboarding';
import { DiningPreferences, DEFAULT_DINING_PREFERENCES } from '../types/preferences';
import {
  saveDiningPreferences,
  loadDiningPreferences,
  PreferencesPersistenceError
} from '../services/diningPreferences.service';

// Extended preferences interface
export interface UserPreferences {
  // Navigation preferences
  navigation: {
    enableTransitions: boolean;
    rememberLastLocation: boolean;
    autoNavigateAfterOnboarding: boolean;
    preferredBackBehavior: 'browser' | 'contextual';
  };

  // Location preferences
  location: {
    autoDetect: boolean;
    fallbackToIP: boolean;
    rememberLocation: boolean;
    locationAccuracy: 'high' | 'medium' | 'low';
    lastKnownLocation?: LocationData;
    locationHistory: LocationData[];
    homeAddress?: string;
    homeCoordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Goal preferences
  goals: {
    preferredGoal?: UserGoal;
    rememberGoalChoice: boolean;
    goalHistory: Array<{
      goal: UserGoal;
      timestamp: Date;
      completed: boolean;
    }>;
  };

  // UI preferences
  ui: {
    defaultView: 'map' | 'list' | 'dual';
    exploreSortBy?: 'best-match' | 'nearest' | 'score-high' | 'score-low' | 'rating-high' | 'name';
    showBreadcrumbs: boolean;
    compactMode: boolean;
    reducedMotion: boolean;
  };

  // Privacy preferences
  privacy: {
    shareLocation: boolean;
    shareContributions: boolean;
    allowAnalytics: boolean;
    rememberChoices: boolean;
  };

  // Notification preferences
  notifications: {
    enabled: boolean;
    newBusinessesNearby: boolean;
    scoreUpdates: boolean;
    communityActivity: boolean;
    achievements: boolean;
    systemUpdates: boolean;
    nearbyRadius: number; // in miles
  };

  // Onboarding preferences
  onboarding: {
    skipIntro: boolean;
    showHints: boolean;
    completedSteps: string[];
    lastCompletionDate?: Date;
  };

  // Dining preferences for search prioritization
  dining: DiningPreferences;
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  navigation: {
    enableTransitions: true,
    rememberLastLocation: true,
    autoNavigateAfterOnboarding: true,
    preferredBackBehavior: 'contextual',
  },
  location: {
    autoDetect: true,
    fallbackToIP: true,
    rememberLocation: true,
    locationAccuracy: 'medium',
    locationHistory: [],
  },
  goals: {
    rememberGoalChoice: true,
    goalHistory: [],
  },
  ui: {
    defaultView: 'dual',
    showBreadcrumbs: true,
    compactMode: false,
    reducedMotion: false,
  },
  privacy: {
    shareLocation: true,
    shareContributions: true,
    allowAnalytics: true,
    rememberChoices: true,
  },
  notifications: {
    enabled: true,
    newBusinessesNearby: true,
    scoreUpdates: true,
    communityActivity: false,
    achievements: true,
    systemUpdates: true,
    nearbyRadius: 1.0, // 1 mile radius
  },
  onboarding: {
    skipIntro: false,
    showHints: true,
    completedSteps: [],
  },
  dining: DEFAULT_DINING_PREFERENCES,
};

// Storage keys
const PREFERENCES_STORAGE_KEY = 'welcome-winks-user-preferences';
const PREFERENCES_VERSION = '1.0';

// Helper functions
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const getDefaultPreferences = (): UserPreferences => {
  const isMobile = isMobileDevice();
  return {
    ...DEFAULT_PREFERENCES,
    ui: {
      ...DEFAULT_PREFERENCES.ui,
      defaultView: isMobile ? 'list' : 'dual', // List only on mobile, dual on desktop
    },
  };
};

const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Handle version migration if needed
      if (parsed.version !== PREFERENCES_VERSION) {
        console.log('Migrating preferences to new version');
        return migratePreferences(parsed);
      }

      // Convert date strings back to Date objects
      if (parsed.goals?.goalHistory) {
        parsed.goals.goalHistory = parsed.goals.goalHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }

      if (parsed.onboarding?.lastCompletionDate) {
        parsed.onboarding.lastCompletionDate = new Date(parsed.onboarding.lastCompletionDate);
      }

      if (parsed.location?.locationHistory) {
        parsed.location.locationHistory = parsed.location.locationHistory.map((loc: any) => ({
          ...loc,
          timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
        }));
      }

      // Convert dining preferences learning data timestamps
      if (parsed.dining?.learningData?.ratedBusinesses) {
        parsed.dining.learningData.ratedBusinesses = parsed.dining.learningData.ratedBusinesses.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }

      // Merge with defaults to ensure all properties exist
      return mergeWithDefaults(parsed, getDefaultPreferences());
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
  }
  return getDefaultPreferences();
};

const savePreferences = (preferences: UserPreferences): void => {
  try {
    const toSave = {
      ...preferences,
      version: PREFERENCES_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.warn('Failed to save user preferences:', error);
  }
};

const migratePreferences = (oldPreferences: any): UserPreferences => {
  // Handle migration from older versions
  // For now, just merge with defaults
  return mergeWithDefaults(oldPreferences, DEFAULT_PREFERENCES);
};

const mergeWithDefaults = (partial: any, defaults: UserPreferences): UserPreferences => {
  const merged = { ...defaults };

  // Deep merge each section
  Object.keys(defaults).forEach(key => {
    if (partial[key] && typeof partial[key] === 'object' && !Array.isArray(partial[key])) {
      merged[key as keyof UserPreferences] = {
        ...defaults[key as keyof UserPreferences],
        ...partial[key],
      } as any;
    } else if (partial[key] !== undefined) {
      merged[key as keyof UserPreferences] = partial[key];
    }
  });

  return merged;
};

// Main hook
export const usePreferencePersistence = (userId?: string | null) => {
  const [preferences, setPreferences] = useState<UserPreferences>(getDefaultPreferences());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastSyncedDiningPrefs = useRef<string>('');
  const isInitialLoad = useRef(true);

  // Load preferences on mount - prioritize Firebase if user is authenticated
  useEffect(() => {
    const loadInitialPreferences = async () => {
      // Always load from localStorage first
      const localPreferences = loadPreferences();
      setPreferences(localPreferences);
      setIsLoaded(true);

      // If user is authenticated, try to load from Firebase
      if (userId) {
        try {
          setIsSyncing(true);
          const firebasePreferences = await loadDiningPreferences(userId);

          // Merge Firebase preferences with local preferences
          // Firebase takes precedence for dining preferences
          const mergedPreferences = {
            ...localPreferences,
            dining: firebasePreferences,
          };

          setPreferences(mergedPreferences);
          savePreferences(mergedPreferences);
          lastSyncedDiningPrefs.current = JSON.stringify(firebasePreferences);
          setSyncError(null);
        } catch (error) {
          console.warn('Failed to load preferences from Firebase, using local:', error);
          setSyncError(error instanceof PreferencesPersistenceError ? error.message : 'Failed to sync with Firebase');
          // Continue with local preferences
        } finally {
          setIsSyncing(false);
          isInitialLoad.current = false;
        }
      } else {
        isInitialLoad.current = false;
      }
    };

    loadInitialPreferences();
  }, [userId]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && !isInitialLoad.current) {
      savePreferences(preferences);
    }
  }, [preferences, isLoaded]);

  // Sync dining preferences to Firebase when they change (debounced)
  useEffect(() => {
    if (!userId || !isLoaded || isInitialLoad.current || isSyncing) {
      return;
    }

    const currentDiningPrefs = JSON.stringify(preferences.dining);

    // Only sync if dining preferences have actually changed
    if (currentDiningPrefs === lastSyncedDiningPrefs.current) {
      return;
    }

    // Debounce Firebase saves to avoid excessive writes
    const timeoutId = setTimeout(async () => {
      try {
        setIsSyncing(true);
        await saveDiningPreferences(userId, preferences.dining);
        lastSyncedDiningPrefs.current = currentDiningPrefs;
        setSyncError(null);
      } catch (error) {
        console.error('Failed to sync dining preferences to Firebase:', error);
        setSyncError(error instanceof PreferencesPersistenceError ? error.message : 'Failed to sync with Firebase');
        // Don't throw - allow app to continue with local storage
      } finally {
        setIsSyncing(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [userId, preferences.dining, isLoaded, isSyncing]);

  // Update methods
  const updateNavigationPreferences = useCallback((updates: Partial<UserPreferences['navigation']>) => {
    setPreferences(prev => ({
      ...prev,
      navigation: { ...prev.navigation, ...updates },
    }));
  }, []);

  const updateLocationPreferences = useCallback((updates: Partial<UserPreferences['location']>) => {
    setPreferences(prev => ({
      ...prev,
      location: { ...prev.location, ...updates },
    }));
  }, []);

  const updateGoalPreferences = useCallback((updates: Partial<UserPreferences['goals']>) => {
    setPreferences(prev => ({
      ...prev,
      goals: { ...prev.goals, ...updates },
    }));
  }, []);

  const updateUIPreferences = useCallback((updates: Partial<UserPreferences['ui']>) => {
    setPreferences(prev => ({
      ...prev,
      ui: { ...prev.ui, ...updates },
    }));
  }, []);

  const updatePrivacyPreferences = useCallback((updates: Partial<UserPreferences['privacy']>) => {
    setPreferences(prev => ({
      ...prev,
      privacy: { ...prev.privacy, ...updates },
    }));
  }, []);

  const updateNotificationPreferences = useCallback((updates: Partial<UserPreferences['notifications']>) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates },
    }));
  }, []);

  const updateOnboardingPreferences = useCallback((updates: Partial<UserPreferences['onboarding']>) => {
    setPreferences(prev => ({
      ...prev,
      onboarding: { ...prev.onboarding, ...updates },
    }));
  }, []);

  const updateDiningPreferences = useCallback((updates: Partial<DiningPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      dining: { ...prev.dining, ...updates },
    }));
  }, []);

  // Interaction tracking methods
  const trackBusinessView = useCallback((businessId: string, durationSeconds: number = 0) => {
    setPreferences(prev => {
      // Only track if view duration is meaningful (> 3 seconds)
      if (durationSeconds < 3) {
        return prev;
      }

      const viewedBusinesses = prev.dining.learningData.viewedBusinesses || [];

      // Add to viewed businesses if not already present
      if (!viewedBusinesses.includes(businessId)) {
        return {
          ...prev,
          dining: {
            ...prev.dining,
            learningData: {
              ...prev.dining.learningData,
              viewedBusinesses: [...viewedBusinesses, businessId],
            },
          },
        };
      }

      return prev;
    });
  }, []);

  const trackBusinessSave = useCallback((businessId: string, action: 'save' | 'unsave') => {
    setPreferences(prev => {
      const savedBusinesses = prev.dining.learningData.savedBusinesses || [];

      if (action === 'save') {
        // Add to saved businesses if not already present
        if (!savedBusinesses.includes(businessId)) {
          return {
            ...prev,
            dining: {
              ...prev.dining,
              learningData: {
                ...prev.dining.learningData,
                savedBusinesses: [...savedBusinesses, businessId],
              },
            },
          };
        }
      } else {
        // Remove from saved businesses
        return {
          ...prev,
          dining: {
            ...prev.dining,
            learningData: {
              ...prev.dining.learningData,
              savedBusinesses: savedBusinesses.filter(id => id !== businessId),
            },
          },
        };
      }

      return prev;
    });
  }, []);

  const trackBusinessRating = useCallback((businessId: string, rating: number) => {
    setPreferences(prev => {
      const ratedBusinesses = prev.dining.learningData.ratedBusinesses || [];

      // Check if business was already rated
      const existingRatingIndex = ratedBusinesses.findIndex(
        r => r.businessId === businessId
      );

      if (existingRatingIndex >= 0) {
        // Update existing rating
        const updatedRatings = [...ratedBusinesses];
        updatedRatings[existingRatingIndex] = {
          businessId,
          rating,
          timestamp: new Date(),
        };

        return {
          ...prev,
          dining: {
            ...prev.dining,
            learningData: {
              ...prev.dining.learningData,
              ratedBusinesses: updatedRatings,
            },
          },
        };
      } else {
        // Add new rating
        return {
          ...prev,
          dining: {
            ...prev.dining,
            learningData: {
              ...prev.dining.learningData,
              ratedBusinesses: [
                ...ratedBusinesses,
                {
                  businessId,
                  rating,
                  timestamp: new Date(),
                },
              ],
            },
          },
        };
      }
    });
  }, []);

  // Location-specific methods
  const rememberLocation = useCallback((location: LocationData) => {
    setPreferences(prev => {
      const newHistory = [location, ...prev.location.locationHistory.slice(0, 9)]; // Keep last 10
      return {
        ...prev,
        location: {
          ...prev.location,
          lastKnownLocation: location,
          locationHistory: newHistory,
        },
      };
    });
  }, []);

  const getLastKnownLocation = useCallback((): LocationData | undefined => {
    return preferences.location.lastKnownLocation;
  }, [preferences.location.lastKnownLocation]);

  const getLocationHistory = useCallback((): LocationData[] => {
    return preferences.location.locationHistory;
  }, [preferences.location.locationHistory]);

  // Goal-specific methods
  const rememberGoal = useCallback((goal: UserGoal, completed: boolean = false) => {
    setPreferences(prev => {
      const goalEntry = {
        goal,
        timestamp: new Date(),
        completed,
      };

      const newHistory = [goalEntry, ...prev.goals.goalHistory.slice(0, 19)]; // Keep last 20

      return {
        ...prev,
        goals: {
          ...prev.goals,
          preferredGoal: goal,
          goalHistory: newHistory,
        },
      };
    });
  }, []);

  const getPreferredGoal = useCallback((): UserGoal | undefined => {
    return preferences.goals.preferredGoal;
  }, [preferences.goals.preferredGoal]);

  const getGoalHistory = useCallback(() => {
    return preferences.goals.goalHistory;
  }, [preferences.goals.goalHistory]);

  // Onboarding-specific methods
  const markStepCompleted = useCallback((step: string) => {
    setPreferences(prev => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        completedSteps: [...new Set([...prev.onboarding.completedSteps, step])],
      },
    }));
  }, []);

  const isStepCompleted = useCallback((step: string): boolean => {
    return preferences.onboarding.completedSteps.includes(step);
  }, [preferences.onboarding.completedSteps]);

  const markOnboardingCompleted = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        lastCompletionDate: new Date(),
      },
    }));
  }, []);

  // Reset methods
  const resetPreferences = useCallback(() => {
    setPreferences(getDefaultPreferences());
  }, []);

  const resetSection = useCallback((section: keyof UserPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [section]: getDefaultPreferences()[section],
    }));
  }, []);

  // Export/import methods
  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback((preferencesJson: string) => {
    try {
      const imported = JSON.parse(preferencesJson);
      const merged = mergeWithDefaults(imported, DEFAULT_PREFERENCES);
      setPreferences(merged);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, []);

  return {
    // State
    preferences,
    isLoaded,
    isSyncing,
    syncError,

    // Update methods
    updateNavigationPreferences,
    updateLocationPreferences,
    updateGoalPreferences,
    updateUIPreferences,
    updatePrivacyPreferences,
    updateNotificationPreferences,
    updateOnboardingPreferences,
    updateDiningPreferences,

    // Location methods
    rememberLocation,
    getLastKnownLocation,
    getLocationHistory,

    // Goal methods
    rememberGoal,
    getPreferredGoal,
    getGoalHistory,

    // Onboarding methods
    markStepCompleted,
    isStepCompleted,
    markOnboardingCompleted,

    // Interaction tracking methods
    trackBusinessView,
    trackBusinessSave,
    trackBusinessRating,

    // Utility methods
    resetPreferences,
    resetSection,
    exportPreferences,
    importPreferences,
  };
};