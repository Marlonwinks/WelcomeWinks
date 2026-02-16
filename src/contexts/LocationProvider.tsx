import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { LocationData } from '../types/onboarding';
import { performanceCache, debounce } from '../lib/performance';
import { usePreferences } from './PreferencesProvider';

interface LocationContextType {
  location: LocationData;
  loading: boolean;
  confirmLocation: () => void;
  updateManualLocation: (locationData: Partial<LocationData>) => void;
  retryLocationDetection: () => void;
  clearLocationPreference: () => void;

  hasLocationPreference: boolean;
  isInitialized: boolean;
  detectLocation: () => Promise<void>;
  getLocationHistory: () => LocationData[];
  setLocationFromHistory: (historicalLocation: LocationData) => void;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  lastError: any | null; // using any to avoid type export issues, or strictly: LocationError
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'welcome-winks-location-preference';
const LOCATION_CACHE_KEY = 'current-location';
const LOCATION_HISTORY_CACHE_KEY = 'location-history';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const geolocation = useGeolocation();
  const { preferences } = usePreferences();
  const [hasLocationPreference, setHasLocationPreference] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const hasAttemptedAutoDetect = useRef(false);

  // Load saved location preference and history on mount
  useEffect(() => {
    // Only auto-detect location if user has enabled location sharing
    if (!preferences.privacy.shareLocation) {
      return;
    }

    // Try to load from performance cache first
    const cachedLocation = performanceCache.get(LOCATION_CACHE_KEY);
    if (cachedLocation) {
      geolocation.updateManualLocation(cachedLocation);
      setHasLocationPreference(true);
      return;
    }

    // Load current location preference from localStorage
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        // Check if saved location is still valid (not older than 24 hours)
        const savedTime = new Date(parsedLocation.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 24 && parsedLocation.userConfirmed) {
          const locationData = {
            ...parsedLocation,
            timestamp: savedTime,
          };
          geolocation.updateManualLocation(locationData);
          // Cache for quick access
          performanceCache.set(LOCATION_CACHE_KEY, locationData, 30 * 60 * 1000); // 30 minutes
          setHasLocationPreference(true);
        } else {
          // Remove expired location preference
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          performanceCache.delete(LOCATION_CACHE_KEY);
        }
      } catch (error) {
        console.error('Error loading saved location:', error);
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        performanceCache.delete(LOCATION_CACHE_KEY);
      }
    }

    // Load location history from cache or preferences
    const cachedHistory = performanceCache.get(LOCATION_HISTORY_CACHE_KEY);
    if (cachedHistory) {
      setLocationHistory(cachedHistory);
    } else {
      try {
        const preferencesData = localStorage.getItem('welcome-winks-user-preferences');
        if (preferencesData) {
          const preferences = JSON.parse(preferencesData);
          if (preferences.location?.locationHistory) {
            const history = preferences.location.locationHistory.map((loc: any) => ({
              ...loc,
              timestamp: new Date(loc.timestamp),
            }));
            setLocationHistory(history);
            // Cache for quick access
            performanceCache.set(LOCATION_HISTORY_CACHE_KEY, history, 60 * 60 * 1000); // 1 hour
          }
        }
      } catch (error) {
        console.error('Error loading location history:', error);
      }
    }

    setIsInitialized(true);
  }, [geolocation.updateManualLocation, preferences.privacy.shareLocation]);

  useEffect(() => {
    if (!preferences.privacy.shareLocation) return;

    const hasCoordinates = geolocation.location.latitude !== null && geolocation.location.longitude !== null;
    if (hasCoordinates || geolocation.loading) {
      return;
    }

    if (geolocation.lastError && !geolocation.lastError.retryable) {
      return;
    }

    if (hasAttemptedAutoDetect.current || !isInitialized || hasLocationPreference) {
      return;
    }

    const handleUserGesture = () => {
      if (hasAttemptedAutoDetect.current) return;
      hasAttemptedAutoDetect.current = true;
      geolocation.detectLocation();
    };

    window.addEventListener('pointerdown', handleUserGesture, { once: true });
    window.addEventListener('keydown', handleUserGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, [
    geolocation.detectLocation,
    geolocation.lastError,
    geolocation.loading,
    geolocation.location.latitude,
    geolocation.location.longitude,
    hasLocationPreference,
    isInitialized,
    preferences.privacy.shareLocation,
  ]);

  // Debounced save function for better performance
  const debouncedSaveLocation = useCallback(
    debounce((location: LocationData) => {
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        performanceCache.set(LOCATION_CACHE_KEY, location, 30 * 60 * 1000); // 30 minutes
        setHasLocationPreference(true);
      } catch (error) {
        console.error('Error saving location preference:', error);
      }
    }, 500),
    []
  );

  // Save location preference when user confirms location
  useEffect(() => {
    if (geolocation.location.userConfirmed &&
      geolocation.location.latitude !== null &&
      geolocation.location.longitude !== null) {
      debouncedSaveLocation(geolocation.location);
    }
  }, [geolocation.location, debouncedSaveLocation]);

  const clearLocationPreference = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    performanceCache.delete(LOCATION_CACHE_KEY);
    setHasLocationPreference(false);
    geolocation.retryLocationDetection();
  }, [geolocation]);

  // Automatic 15-minute location refresh
  useEffect(() => {
    if (!preferences.privacy.shareLocation) return;

    console.log('🔄 Setting up 15-minute location refresh timer');
    const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

    const intervalId = setInterval(() => {
      console.log('⏰ 15-minute automatic location refresh triggering...');
      // Only attempt refresh if we already have a location (implies permission granted)
      // or if we have a saved preference
      if (hasLocationPreference || geolocation.location.latitude !== null) {
        geolocation.detectLocation(true);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [hasLocationPreference, geolocation.location.latitude, preferences.privacy.shareLocation, geolocation.detectLocation]);

  // Enhanced location detection
  const detectLocation = useCallback(async () => {
    return geolocation.detectLocation();
  }, [geolocation]);

  // Get location history
  const getLocationHistory = useCallback(() => {
    return locationHistory;
  }, [locationHistory]);

  // Set location from history
  const setLocationFromHistory = useCallback((historicalLocation: LocationData) => {
    const updatedLocation = {
      ...historicalLocation,
      timestamp: new Date(),
      userConfirmed: true,
    };
    geolocation.updateManualLocation(updatedLocation);
  }, [geolocation]);

  const contextValue: LocationContextType = {
    location: geolocation.location,
    loading: geolocation.loading,
    confirmLocation: geolocation.confirmLocation,
    updateManualLocation: geolocation.updateManualLocation,
    retryLocationDetection: geolocation.retryLocationDetection,
    clearLocationPreference,
    hasLocationPreference,
    isInitialized,
    detectLocation,
    getLocationHistory,
    setLocationFromHistory,
    retryCount: geolocation.retryCount,
    maxRetries: geolocation.maxRetries,
    canRetry: geolocation.canRetry,
    lastError: geolocation.lastError,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
