import { useState, useEffect, useCallback, useMemo } from 'react';
import { LocationData, LocationSource } from '../types/onboarding';
import { performanceCache } from '../lib/performance';

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const IP_LOCATION_CACHE_KEY = 'ip-location-data';
const GEOCODING_CACHE_KEY = 'geocoding-data';
const LOCATION_STORAGE_KEY = 'geolocation-saved-location';

// Helper to save location to localStorage
const saveLocationToStorage = (locationData: LocationData): void => {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      ...locationData,
      timestamp: locationData.timestamp.toISOString(),
    }));
    console.log('💾 Location saved to localStorage:', locationData.latitude, locationData.longitude);
  } catch (error) {
    console.warn('Failed to save location to localStorage:', error);
  }
};

const hasValidCoordinates = (latitude: unknown, longitude: unknown): boolean => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};

// Helper to load location from localStorage
const loadLocationFromStorage = (): LocationData | null => {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if location is less than 24 hours old
      const savedTime = new Date(parsed.timestamp);
      const hoursSinceSaved = (Date.now() - savedTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSaved < 24 && hasValidCoordinates(parsed.latitude, parsed.longitude)) {
        console.log('💾 Restored location from localStorage:', parsed.latitude, parsed.longitude);
        return {
          ...parsed,
          timestamp: savedTime,
        };
      } else {
        console.log('💾 Saved location expired or invalid, clearing');
        localStorage.removeItem(LOCATION_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn('Failed to load location from localStorage:', error);
  }
  return null;
};

interface LocationError {
  code: string;
  message: string;
  retryable: boolean;
}

const createLocationError = (code: string, message: string, retryable = true): LocationError => ({
  code,
  message,
  retryable,
});

const LOCATION_ERRORS = {
  PERMISSION_DENIED: createLocationError('PERMISSION_DENIED', 'Location access denied by user', false),
  POSITION_UNAVAILABLE: createLocationError('POSITION_UNAVAILABLE', 'Location information unavailable', true),
  TIMEOUT: createLocationError('TIMEOUT', 'Location request timed out', true),
  NETWORK_ERROR: createLocationError('NETWORK_ERROR', 'Network error occurred', true),
  API_ERROR: createLocationError('API_ERROR', 'Location service error', true),
  UNKNOWN_ERROR: createLocationError('UNKNOWN_ERROR', 'An unknown error occurred', true),
};

export const useGeolocation = () => {
  // Initialize from localStorage if available
  const [location, setLocation] = useState<LocationData>(() => {
    const saved = loadLocationFromStorage();
    if (saved) {
      return saved;
    }
    return {
      latitude: null,
      longitude: null,
      city: null,
      address: null,
      source: 'gps',
      accuracy: null,
      timestamp: new Date(),
      userConfirmed: false,
      error: null,
    };
  });
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<LocationError | null>(null);

  const maxRetries = 3;
  const retryDelay = 1000; // Start with 1 second delay

  const fetchIpLocation = useCallback(async (isRetry = false) => {
    // Check cache first
    const cachedIpLocation = performanceCache.get(IP_LOCATION_CACHE_KEY);
    if (cachedIpLocation && !isRetry) {
      setLocation(cachedIpLocation);
      setLoading(false);
      setLastError(null);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createLocationError('API_ERROR', `IP API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (hasValidCoordinates(data.latitude, data.longitude)) {
        const locationData: LocationData = {
          latitude: data.latitude,
          longitude: data.longitude,
          city: `${data.city}, ${data.region_code}`,
          address: `${data.city}, ${data.region_code}, ${data.country_name}`,
          source: 'ip' as LocationSource,
          accuracy: null, // IP location doesn't provide accuracy
          timestamp: new Date(),
          userConfirmed: false,
          error: null,
        };

        setLocation(locationData);
        saveLocationToStorage(locationData);
        setLastError(null);
        setRetryCount(0);
        // Cache IP location for 1 hour
        performanceCache.set(IP_LOCATION_CACHE_KEY, locationData, 60 * 60 * 1000);
      } else {
        throw createLocationError('API_ERROR', data.message || 'Failed to retrieve location from IP API');
      }
    } catch (error: any) {
      console.error("IP Geolocation error:", error);

      let locationError: LocationError;
      if (error.name === 'AbortError') {
        locationError = LOCATION_ERRORS.TIMEOUT;
      } else if (error.code) {
        locationError = error;
      } else {
        locationError = createLocationError('NETWORK_ERROR', 'Could not determine location from IP');
      }

      setLastError(locationError);
      setLocation(prev => ({
        ...prev,
        error: locationError.message,
        timestamp: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number, accuracy?: number, isRetry = false, autoConfirm = false) => {
    // Create cache key based on rounded coordinates for better cache hits
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const cacheKey = `${GEOCODING_CACHE_KEY}-${roundedLat}-${roundedLng}`;

    // Check cache first
    const cachedGeocode = performanceCache.get(cacheKey);
    if (cachedGeocode && !isRetry) {
      const locationData: LocationData = {
        ...cachedGeocode,
        latitude: lat,
        longitude: lng,
        accessToken: null,
        accuracy: accuracy || null,
        timestamp: new Date(),
        userConfirmed: autoConfirm,
      };
      setLocation(locationData);
      saveLocationToStorage(locationData);
      setLoading(false);
      setLastError(null);
      return;
    }

    try {
      let formattedAddress: string | null = null;

      // Prefer Google Maps JS API Geocoder if available
      if (window.google?.maps) {
        const geocoder = new google.maps.Geocoder();
        try {
          const response = await geocoder.geocode({ location: { lat, lng } });
          if (response.results && response.results[0]) {
            formattedAddress = response.results[0].formatted_address;
          }
        } catch (error) {
          console.warn('Google Maps Geocoder failed, trying fallback...', error);
        }
      }

      // Fallback to REST API if JS Geocoder failed or not available (and we have an API key)
      if (!formattedAddress && API_KEY) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results[0]) {
              formattedAddress = data.results[0].formatted_address;
            }
          }
        } catch (e) {
          console.warn('REST Geocoding fallback failed', e);
        }
      }

      let locationData: LocationData;

      if (formattedAddress) {
        console.log('📍 Geocoding successful:', {
          lat,
          lng,
          formatted_address: formattedAddress,
          accuracy
        });
        locationData = {
          latitude: lat,
          longitude: lng,
          city: formattedAddress,
          address: formattedAddress,
          source: 'gps' as LocationSource,
          accuracy: accuracy || null,
          timestamp: new Date(),
          userConfirmed: autoConfirm,
          error: null,
        };

        // Cache successful geocoding for 24 hours
        performanceCache.set(cacheKey, {
          city: formattedAddress,
          address: formattedAddress,
          source: 'gps' as LocationSource,
          error: null,
        }, 24 * 60 * 60 * 1000);
      } else {
        // Fallback when no results but coordinates are valid
        console.log('📍 Geocoding returned no results, using coordinate fallback:', {
          lat,
          lng,
          accuracy
        });
        locationData = {
          latitude: lat,
          longitude: lng,
          city: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          source: 'gps' as LocationSource,
          accuracy: accuracy || null,
          timestamp: new Date(),
          userConfirmed: autoConfirm,
          error: null,
        };
      }

      setLocation(locationData);
      saveLocationToStorage(locationData); // Save to localStorage immediately
      setLastError(null);
      setRetryCount(0);
    } catch (error: any) {
      console.error("Reverse geocoding error:", error);

      // Even if everything fails, we still have the coordinates!
      // Don't treat this as a fatal error for the user.
      setLocation({
        latitude: lat,
        longitude: lng,
        city: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        source: 'gps' as LocationSource,
        accuracy: accuracy || null,
        timestamp: new Date(),
        userConfirmed: autoConfirm,
        error: null,
      });
      // Still save fallback location to storage
      saveLocationToStorage({
        latitude: lat,
        longitude: lng,
        city: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        source: 'gps' as LocationSource,
        accuracy: accuracy || null,
        timestamp: new Date(),
        userConfirmed: autoConfirm,
        error: null,
      });

      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmLocation = useCallback(() => {
    setLocation(prev => {
      const updated = {
        ...prev,
        userConfirmed: true,
        timestamp: new Date(),
      };
      saveLocationToStorage(updated);
      return updated;
    });
  }, []);

  const updateManualLocation = useCallback((locationData: Partial<LocationData>) => {
    setLocation(prev => {
      const updated = {
        ...prev,
        ...locationData,
        source: 'manual' as LocationSource,
        timestamp: new Date(),
        userConfirmed: true, // Manual entry is always confirmed
      };
      saveLocationToStorage(updated);
      return updated;
    });
    setLoading(false);
  }, []);

  // Helper to handle errors consistently
  const handleGeolocationError = useCallback((error: GeolocationPositionError) => {
    let locationError: LocationError;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        locationError = LOCATION_ERRORS.PERMISSION_DENIED;
        break;
      case error.POSITION_UNAVAILABLE:
        locationError = LOCATION_ERRORS.POSITION_UNAVAILABLE;
        break;
      case error.TIMEOUT:
        locationError = LOCATION_ERRORS.TIMEOUT;
        break;
      default:
        locationError = LOCATION_ERRORS.UNKNOWN_ERROR;
    }

    setLastError(locationError);
    setLocation(prev => ({
      ...prev,
      error: locationError.message,
      timestamp: new Date(),
    }));
    setLoading(false);
  }, []);

  const retryLocationDetection = useCallback(async () => {
    if (!lastError?.retryable || retryCount >= maxRetries) {
      return;
    }

    setLoading(true);
    setRetryCount(prev => prev + 1);

    // Exponential backoff delay
    const delay = retryDelay * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));

    setLocation(prev => ({
      ...prev,
      error: null,
      timestamp: new Date(),
    }));

    if (navigator.geolocation) {
      // First attempt: High Accuracy
      // Second attempt (retry): Low Accuracy (often faster/more reliable indoors)
      const useHighAccuracy = retryCount === 0;

      const geolocationOptions = {
        enableHighAccuracy: useHighAccuracy,
        timeout: useHighAccuracy ? 5000 : 10000, // 5s for high acc (fail fast), 10s for low acc
        maximumAge: 0,
      };

      console.log(`📍 Attempting GPS detection (Attempt ${retryCount + 1}). High Accuracy: ${useHighAccuracy}`);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy,
            true // isRetry
          );
        },
        (error) => {
          console.warn(`Browser Geolocation error: ${error.message}.`);

          // If high accuracy failed (timeout or position unavailable), try low accuracy automatically
          if (useHighAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            console.log('📍 High accuracy failed, retrying with low accuracy immediately...');
            // We don't increment retryCount here because this is an immediate internal retry.
            // The next *user-initiated* retry will be retryCount + 1.
            // For this immediate retry, we just call getCurrentPosition again with low accuracy.
            navigator.geolocation.getCurrentPosition(
              (pos) => reverseGeocode(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, true),
              (err) => handleGeolocationError(err),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
            return;
          }

          handleGeolocationError(error);
        },
        geolocationOptions
      );
    } else {
      console.warn("Browser Geolocation not supported.");
      // Fallback to manual entry - do NOT use IP as user requested accuracy
      setLastError(createLocationError('NOT_SUPPORTED', 'Geolocation not supported'));
      setLoading(false);
    }
  }, [reverseGeocode, lastError, retryCount, maxRetries, retryDelay, handleGeolocationError]);

  const detectLocation = useCallback(async (autoConfirm = false) => {
    setLoading(true);
    // Reset state for a fresh detection
    setRetryCount(0);
    setLastError(null);

    if (navigator.geolocation) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      console.log(`📍 Starting geolocation detection (Auto-confirm: ${autoConfirm})...`);

      const handlePosition = (position: GeolocationPosition, allowAccuracyRetry = true) => {
        const { accuracy, latitude, longitude } = position.coords;
        if (accuracy && accuracy > 1000 && allowAccuracyRetry) {
          console.log('📍 Low accuracy detected, retrying for better GPS fix...');
          navigator.geolocation.getCurrentPosition(
            (retryPosition) => handlePosition(retryPosition, false),
            (retryError) => handleGeolocationError(retryError),
            {
              enableHighAccuracy: true,
              timeout: isMobile ? 25000 : 15000,
              maximumAge: 0,
            }
          );
          return;
        }

        reverseGeocode(
          latitude,
          longitude,
          accuracy,
          false, // isRetry
          autoConfirm
        );
      };

      // Request high accuracy first for GPS-quality coordinates when possible.
      const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: isMobile ? 20000 : 15000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => handlePosition(position),
        (error) => {
          console.warn(`Browser Geolocation error: ${error.message}. Code: ${error.code}`);
          // If high accuracy failed (timeout or position unavailable), try low accuracy automatically
          if (geolocationOptions.enableHighAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            console.log('📍 High accuracy failed on initial try, retrying with low accuracy immediately...');
            navigator.geolocation.getCurrentPosition(
              (pos) => handlePosition(pos, false),
              (err) => handleGeolocationError(err),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
            );
            return;
          }
          handleGeolocationError(error);
          if (error.code !== error.PERMISSION_DENIED) {
            fetchIpLocation(true);
          }
        },
        geolocationOptions
      );
    } else {
      setLastError(createLocationError('NOT_SUPPORTED', 'Geolocation not supported'));
      setLoading(false);
    }
  }, [reverseGeocode, handleGeolocationError, fetchIpLocation]);

  // Removed auto-detection useEffect to comply with iOS user gesture requirements
  // useEffect(() => {
  //   detectLocation();
  // }, [detectLocation]);

  return useMemo(() => ({
    location,
    loading,
    confirmLocation,
    updateManualLocation,
    retryLocationDetection,
    canRetry: lastError?.retryable && retryCount < maxRetries,
    retryCount,
    maxRetries,
    lastError,
    detectLocation,
  }), [
    location,
    loading,
    confirmLocation,
    updateManualLocation,
    retryLocationDetection,
    lastError,
    retryCount,
    maxRetries,
    detectLocation
  ]);
};
