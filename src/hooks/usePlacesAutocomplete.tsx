import { useState, useCallback, useMemo } from 'react';
import { performanceCache, debounce } from '../lib/performance';

const PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const PLACES_CACHE_KEY = 'places-autocomplete';

interface PlaceSuggestion {
  description: string;
  place_id: string;
}

interface PlacesError {
  code: string;
  message: string;
  retryable: boolean;
}

interface UsePlacesAutocompleteOptions {
  location?: { lat: number; lng: number };
  radius?: number;
  types?: string[];
}

export const usePlacesAutocomplete = (options: UsePlacesAutocompleteOptions = {}) => {
  const { location, radius = 5000, types = [] } = options;

  // Memoize location to prevent unnecessary re-renders
  const stableLocation = useMemo(() => location, [location?.lat, location?.lng]);
  const stableTypes = useMemo(() => types, [types.join(',')]);

  const [suggestions, setSuggestions] = useState<google.maps.places.PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PlacesError | null>(null);

  const isBot = useCallback(() => {
    if (typeof navigator === 'undefined') return false;
    const botAgents = ['bot', 'crawler', 'spider', 'ping', 'google', 'baidu', 'bing', 'yandex', 'lighthouse', 'gtmetrix'];
    const userAgent = navigator.userAgent.toLowerCase();
    return botAgents.some(bot => userAgent.includes(bot)) || (navigator as any).webdriver || userAgent.includes('headless');
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setError(null);
      return;
    }

    if (isBot()) {
      console.warn('🤖 PlacesAutocomplete: Bot detected, blocking request.');
      setSuggestions([]);
      return;
    }

    // Check if Google Maps API is loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      setError({
        code: 'GOOGLE_MAPS_NOT_LOADED',
        message: 'Google Maps API not loaded yet. Please wait...',
        retryable: true,
      });
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${PLACES_CACHE_KEY}-${input.toLowerCase()}`;
    const cachedSuggestions = performanceCache.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use Google Places Autocomplete Service directly
      const service = new google.maps.places.AutocompleteService();

      const request: google.maps.places.AutocompletionRequest = {
        input: input,
        // Omit types to allow all business suggestions - 'establishment' type has restrictions
        // types: undefined - let Google decide the best suggestions
      };

      // Add location bias if available 
      // Note: Using deprecated location/radius until new locationBias API is stable
      if (stableLocation) {
        request.location = new google.maps.LatLng(stableLocation.lat, stableLocation.lng);
        request.radius = radius;
      }

      service.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Transform to match PlaceResult interface
          const placeSuggestions = predictions.map((prediction: any) => ({
            name: prediction.structured_formatting?.main_text || prediction.description,
            formatted_address: prediction.description,
            place_id: prediction.place_id,
            geometry: null, // Will be filled when place details are fetched
            types: prediction.types,
          }));

          setSuggestions(placeSuggestions);
          setError(null);

          // Cache suggestions for 24 hours to reduce costs
          performanceCache.set(cacheKey, placeSuggestions, 24 * 60 * 60 * 1000);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
          setError(null);
          // Cache empty result for 1 hour
          performanceCache.set(cacheKey, [], 60 * 60 * 1000);
        } else {
          // Only log unexpected statuses, not common ones like ZERO_RESULTS
          if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.warn('Places service status:', status);
          }

          setError({
            code: 'PLACES_SERVICE_ERROR',
            message: 'Unable to search for places. Please try again.',
            retryable: true,
          });
          setSuggestions([]);
        }
        setLoading(false);
      });
    } catch (error: any) {
      // Only log unexpected errors, not common ones
      if (error && typeof error === 'object' && error.code !== 'ZERO_RESULTS') {
        console.warn('Places service error:', error.code || error.message);
      }

      setError({
        code: 'PLACES_ERROR',
        message: 'Search unavailable. Please try again.',
        retryable: true,
      });

      setSuggestions([]);
      setLoading(false);
    }
  }, [stableLocation, radius, stableTypes, isBot]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((input: string) => {
      fetchSuggestions(input);
    }, 300),
    [fetchSuggestions]
  );

  const searchPlaces = useCallback((input: string) => {
    debouncedSearch(input);
  }, [debouncedSearch]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  const retrySearch = useCallback(async (input: string) => {
    if (!error?.retryable) {
      return;
    }
    await fetchSuggestions(input);
  }, [error, fetchSuggestions]);

  return {
    suggestions,
    loading,
    error,
    searchPlaces,
    clearSuggestions,
    retrySearch,
    canRetry: error?.retryable,
  };
};
