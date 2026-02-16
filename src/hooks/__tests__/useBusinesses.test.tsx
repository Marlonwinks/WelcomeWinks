import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useBusinesses, useBusiness } from '../useBusinesses';
import { ratingsService } from '@/services/ratings.service';
import { Business } from '@/types/firebase';

// Mock the ratings service
vi.mock('@/services/ratings.service', () => ({
  ratingsService: {
    getBusinessesByLocation: vi.fn(),
    createBusiness: vi.fn(),
    getBusiness: vi.fn(),
    searchBusinessesByName: vi.fn(),
    getTopRatedBusinesses: vi.fn(),
  },
}));

// Mock Firebase error handler
vi.mock('@/utils/firebase-errors', () => ({
  handleFirebaseError: vi.fn((error) => error.message || 'Firebase error'),
}));

const mockBusiness: Business = {
  businessId: 'test-place-id',
  name: 'Test Restaurant',
  address: '123 Test St, Test City',
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  googlePlacesData: {
    place_id: 'test-place-id',
    name: 'Test Restaurant',
    formatted_address: '123 Test St, Test City',
  },
  averageScore: null,
  totalRatings: 0,
  ratingBreakdown: {
    veryWelcoming: 0,
    moderatelyWelcoming: 0,
    notWelcoming: 0,
  },
  status: 'neutral',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGooglePlacesData = {
  place_id: 'test-place-id',
  name: 'Test Restaurant',
  formatted_address: '123 Test St, Test City',
  geometry: {
    location: {
      lat: () => 40.7128,
      lng: () => -74.006,
    },
  },
  types: ['restaurant', 'food', 'establishment'],
};

describe('useBusinesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBusinesses', () => {
    it('should fetch businesses by location successfully', async () => {
      const mockBusinesses = [mockBusiness];
      vi.mocked(ratingsService.getBusinessesByLocation).mockResolvedValue(mockBusinesses);

      const { result } = renderHook(() =>
        useBusinesses({ latitude: 40.7128, longitude: -74.006 })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.businesses).toEqual([]);

      await act(async () => {
        await result.current.fetchBusinesses();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.businesses).toEqual(mockBusinesses);
      expect(result.current.error).toBeNull();
      expect(ratingsService.getBusinessesByLocation).toHaveBeenCalledWith(40.7128, -74.006, 5);
    });

    it('should handle fetch error', async () => {
      const errorMessage = 'Network error';
      vi.mocked(ratingsService.getBusinessesByLocation).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useBusinesses({ latitude: 40.7128, longitude: -74.006 })
      );

      await act(async () => {
        await result.current.fetchBusinesses();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.businesses).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should require location coordinates', async () => {
      const { result } = renderHook(() => useBusinesses());

      await act(async () => {
        await result.current.fetchBusinesses();
      });

      expect(result.current.error).toBe('Location coordinates are required to fetch businesses');
      expect(ratingsService.getBusinessesByLocation).not.toHaveBeenCalled();
    });
  });

  describe('createBusinessFromGooglePlaces', () => {
    it('should create business from Google Places data successfully', async () => {
      vi.mocked(ratingsService.createBusiness).mockResolvedValue(mockBusiness);

      const { result } = renderHook(() => useBusinesses());

      let createdBusiness: Business | null = null;
      await act(async () => {
        createdBusiness = await result.current.createBusinessFromGooglePlaces(mockGooglePlacesData);
      });

      expect(createdBusiness).toEqual(mockBusiness);
      expect(result.current.businesses).toContain(mockBusiness);
      expect(result.current.error).toBeNull();
      expect(ratingsService.createBusiness).toHaveBeenCalledWith(mockGooglePlacesData);
    });

    it('should handle invalid Google Places data', async () => {
      const { result } = renderHook(() => useBusinesses());

      let createdBusiness: Business | null = null;
      await act(async () => {
        createdBusiness = await result.current.createBusinessFromGooglePlaces({});
      });

      expect(createdBusiness).toBeNull();
      expect(result.current.error).toBe('Invalid Google Places data provided');
      expect(ratingsService.createBusiness).not.toHaveBeenCalled();
    });
  });

  describe('searchBusinessesByName', () => {
    it('should search businesses by name successfully', async () => {
      const mockSearchResults = [mockBusiness];
      vi.mocked(ratingsService.searchBusinessesByName).mockResolvedValue(mockSearchResults);

      const { result } = renderHook(() => useBusinesses());

      let searchResults: Business[] = [];
      await act(async () => {
        searchResults = await result.current.searchBusinessesByName('Test Restaurant');
      });

      expect(searchResults).toEqual(mockSearchResults);
      expect(result.current.error).toBeNull();
      expect(ratingsService.searchBusinessesByName).toHaveBeenCalledWith('Test Restaurant');
    });

    it('should return empty array for empty search term', async () => {
      const { result } = renderHook(() => useBusinesses());

      let searchResults: Business[] = [];
      await act(async () => {
        searchResults = await result.current.searchBusinessesByName('');
      });

      expect(searchResults).toEqual([]);
      expect(ratingsService.searchBusinessesByName).not.toHaveBeenCalled();
    });
  });

  describe('auto-fetch', () => {
    it('should auto-fetch businesses when autoFetch is enabled', async () => {
      const mockBusinesses = [mockBusiness];
      vi.mocked(ratingsService.getBusinessesByLocation).mockResolvedValue(mockBusinesses);

      renderHook(() =>
        useBusinesses({
          latitude: 40.7128,
          longitude: -74.006,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(ratingsService.getBusinessesByLocation).toHaveBeenCalledWith(40.7128, -74.006, 5);
      });
    });
  });
});

describe('useBusiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single business successfully', async () => {
    vi.mocked(ratingsService.getBusiness).mockResolvedValue(mockBusiness);

    const { result } = renderHook(() => useBusiness('test-place-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.business).toEqual(mockBusiness);
    expect(result.current.error).toBeNull();
    expect(ratingsService.getBusiness).toHaveBeenCalledWith('test-place-id');
  });

  it('should handle fetch error', async () => {
    const errorMessage = 'Business not found';
    vi.mocked(ratingsService.getBusiness).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useBusiness('invalid-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.business).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('should require business ID', async () => {
    const { result } = renderHook(() => useBusiness());

    await act(async () => {
      await result.current.fetchBusiness();
    });

    expect(result.current.error).toBe('Business ID is required');
    expect(ratingsService.getBusiness).not.toHaveBeenCalled();
  });
});