import { useState, useEffect, useCallback } from 'react';
import { ratingsService } from '@/services/ratings.service';
import { Business } from '@/types/firebase';
import { handleFirebaseError } from '@/utils/firebase-errors';

export interface UseBusinessesOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  autoFetch?: boolean;
}

export interface UseBusinessesReturn {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  fetchBusinesses: (lat?: number, lng?: number, radius?: number) => Promise<void>;
  createBusinessFromGooglePlaces: (googlePlacesData: any) => Promise<Business | null>;
  getBusiness: (businessId: string) => Promise<Business | null>;
  searchBusinessesByName: (searchTerm: string) => Promise<Business[]>;
  refreshBusinesses: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing business data from Firebase
 * Provides methods to fetch, create, and search businesses
 */
export const useBusinesses = (options: UseBusinessesOptions = {}): UseBusinessesReturn => {
  const { latitude, longitude, radiusKm = 5, autoFetch = false } = options;
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch businesses by location
   */
  const fetchBusinesses = useCallback(async (
    lat?: number, 
    lng?: number, 
    radius?: number
  ) => {
    const targetLat = lat ?? latitude;
    const targetLng = lng ?? longitude;
    const targetRadius = radius ?? radiusKm;

    if (!targetLat || !targetLng) {
      setError('Location coordinates are required to fetch businesses');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedBusinesses = await ratingsService.getBusinessesByLocation(
        targetLat,
        targetLng,
        targetRadius
      );
      setBusinesses(fetchedBusinesses);
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error fetching businesses:', err);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radiusKm]);

  /**
   * Create a business from Google Places data
   */
  const createBusinessFromGooglePlaces = useCallback(async (
    googlePlacesData: any
  ): Promise<Business | null> => {
    if (!googlePlacesData || !googlePlacesData.place_id) {
      setError('Invalid Google Places data provided');
      return null;
    }

    setError(null);

    try {
      const business = await ratingsService.createBusiness(googlePlacesData);
      
      // Add to current businesses list if it's not already there
      setBusinesses(prev => {
        const exists = prev.some(b => b.businessId === business.businessId);
        return exists ? prev : [...prev, business];
      });

      return business;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error creating business:', err);
      return null;
    }
  }, []);

  /**
   * Get a specific business by ID
   */
  const getBusiness = useCallback(async (businessId: string): Promise<Business | null> => {
    if (!businessId) {
      setError('Business ID is required');
      return null;
    }

    setError(null);

    try {
      const business = await ratingsService.getBusiness(businessId);
      return business;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error fetching business:', err);
      return null;
    }
  }, []);

  /**
   * Search businesses by name
   */
  const searchBusinessesByName = useCallback(async (searchTerm: string): Promise<Business[]> => {
    if (!searchTerm.trim()) {
      return [];
    }

    setError(null);

    try {
      const searchResults = await ratingsService.searchBusinessesByName(searchTerm.trim());
      return searchResults;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error searching businesses:', err);
      return [];
    }
  }, []);

  /**
   * Refresh the current businesses list
   */
  const refreshBusinesses = useCallback(async () => {
    if (latitude && longitude) {
      await fetchBusinesses(latitude, longitude, radiusKm);
    }
  }, [fetchBusinesses, latitude, longitude, radiusKm]);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch businesses when location changes (if enabled)
  useEffect(() => {
    if (autoFetch && latitude && longitude) {
      fetchBusinesses();
    }
  }, [autoFetch, latitude, longitude, fetchBusinesses]);

  return {
    businesses,
    loading,
    error,
    fetchBusinesses,
    createBusinessFromGooglePlaces,
    getBusiness,
    searchBusinessesByName,
    refreshBusinesses,
    clearError,
  };
};

/**
 * Hook for managing a single business
 */
export const useBusiness = (businessId?: string) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async (id?: string) => {
    const targetId = id || businessId;
    if (!targetId) {
      setError('Business ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedBusiness = await ratingsService.getBusiness(targetId);
      setBusiness(fetchedBusiness);
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error fetching business:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const refreshBusiness = useCallback(() => {
    if (businessId) {
      fetchBusiness(businessId);
    }
  }, [fetchBusiness, businessId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch business when ID changes
  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId, fetchBusiness]);

  return {
    business,
    loading,
    error,
    fetchBusiness,
    refreshBusiness,
    clearError,
  };
};

/**
 * Hook for getting top-rated businesses
 */
export const useTopRatedBusinesses = (limit: number = 20) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopRated = useCallback(async (limitCount?: number) => {
    setLoading(true);
    setError(null);

    try {
      const topBusinesses = await ratingsService.getTopRatedBusinesses(limitCount || limit);
      setBusinesses(topBusinesses);
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      console.error('Error fetching top-rated businesses:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refreshTopRated = useCallback(() => {
    fetchTopRated();
  }, [fetchTopRated]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchTopRated();
  }, [fetchTopRated]);

  return {
    businesses,
    loading,
    error,
    fetchTopRated,
    refreshTopRated,
    clearError,
  };
};