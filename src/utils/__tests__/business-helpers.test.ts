import { describe, it, expect } from 'vitest';
import {
  convertGooglePlacesToBusiness,
  hasRatings,
  getWelcomingLevel,
  formatBusinessAddress,
  getBusinessCategory,
  calculateDistance,
  formatDistance,
  getRatingSummary,
  matchesSearchCriteria,
  filterByWelcomingLevel,
  sortBusinesses,
  validateBusinessData,
  createBusinessSummary,
} from '../business-helpers';
import { Business } from '@/types/firebase';

const mockBusiness: Business = {
  businessId: 'test-place-id',
  name: 'Test Restaurant',
  address: '123 Test St, Test City, State 12345',
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  googlePlacesData: {
    place_id: 'test-place-id',
    name: 'Test Restaurant',
    types: ['restaurant', 'food', 'establishment'],
  },
  averageScore: 5,
  totalRatings: 10,
  ratingBreakdown: {
    veryWelcoming: 8,
    moderatelyWelcoming: 2,
    notWelcoming: 0,
  },
  status: 'rated',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGooglePlace: google.maps.places.PlaceResult = {
  place_id: 'test-place-id',
  name: 'Test Restaurant',
  formatted_address: '123 Test St, Test City, State 12345',
  vicinity: '123 Test St',
  geometry: {
    location: {
      lat: () => 40.7128,
      lng: () => -74.006,
    } as google.maps.LatLng,
  } as google.maps.places.PlaceGeometry,
  types: ['restaurant', 'food', 'establishment'],
};

describe('business-helpers', () => {
  describe('convertGooglePlacesToBusiness', () => {
    it('should convert Google Places data to Business format', () => {
      const result = convertGooglePlacesToBusiness(mockGooglePlace);

      expect(result).toMatchObject({
        businessId: 'test-place-id',
        name: 'Test Restaurant',
        address: '123 Test St, Test City, State 12345',
        location: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        googlePlacesData: mockGooglePlace,
        averageScore: null,
        totalRatings: 0,
        status: 'neutral',
      });
    });

    it('should throw error for missing place_id', () => {
      const invalidPlace = { ...mockGooglePlace, place_id: undefined };
      expect(() => convertGooglePlacesToBusiness(invalidPlace)).toThrow(
        'Google Places data must include place_id'
      );
    });

    it('should handle missing optional fields', () => {
      const minimalPlace: google.maps.places.PlaceResult = {
        place_id: 'test-id',
        geometry: {
          location: {
            lat: () => 40.7128,
            lng: () => -74.006,
          } as google.maps.LatLng,
        } as google.maps.places.PlaceGeometry,
      };

      const result = convertGooglePlacesToBusiness(minimalPlace);

      expect(result.name).toBe('Unknown Business');
      expect(result.address).toBe('Address not available');
    });
  });

  describe('hasRatings', () => {
    it('should return true for business with ratings', () => {
      expect(hasRatings(mockBusiness)).toBe(true);
    });

    it('should return false for business without ratings', () => {
      const businessWithoutRatings = { ...mockBusiness, totalRatings: 0 };
      expect(hasRatings(businessWithoutRatings)).toBe(false);
    });
  });

  describe('getWelcomingLevel', () => {
    it('should return "very-welcoming" for high scores', () => {
      expect(getWelcomingLevel(5)).toBe('very-welcoming');
      expect(getWelcomingLevel(10)).toBe('very-welcoming');
    });

    it('should return "moderately-welcoming" for medium scores', () => {
      expect(getWelcomingLevel(0)).toBe('moderately-welcoming');
      expect(getWelcomingLevel(3)).toBe('moderately-welcoming');
      expect(getWelcomingLevel(-1)).toBe('moderately-welcoming');
    });

    it('should return "not-welcoming" for low scores', () => {
      expect(getWelcomingLevel(-3)).toBe('not-welcoming');
      expect(getWelcomingLevel(-10)).toBe('not-welcoming');
    });

    it('should return "unrated" for null scores', () => {
      expect(getWelcomingLevel(null)).toBe('unrated');
    });
  });

  describe('formatBusinessAddress', () => {
    it('should shorten long addresses', () => {
      const result = formatBusinessAddress(mockBusiness);
      expect(result).toBe('123 Test St, Test City');
    });

    it('should return full address for short addresses', () => {
      const shortAddressBusiness = { ...mockBusiness, address: 'Short Address' };
      const result = formatBusinessAddress(shortAddressBusiness);
      expect(result).toBe('Short Address');
    });

    it('should handle missing address', () => {
      const noAddressBusiness = { ...mockBusiness, address: '' };
      const result = formatBusinessAddress(noAddressBusiness);
      expect(result).toBe('Address not available');
    });
  });

  describe('getBusinessCategory', () => {
    it('should return mapped category for known types', () => {
      expect(getBusinessCategory(mockBusiness)).toBe('Restaurant');
    });

    it('should format unknown types nicely', () => {
      const customBusiness = {
        ...mockBusiness,
        googlePlacesData: { types: ['custom_type'] },
      };
      expect(getBusinessCategory(customBusiness)).toBe('Custom Type');
    });

    it('should return "Business" for missing types', () => {
      const noTypesBusiness = { ...mockBusiness, googlePlacesData: {} };
      expect(getBusinessCategory(noTypesBusiness)).toBe('Business');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7589, -73.9851);
      expect(distance).toBeCloseTo(5.4, 0); // Approximate distance between NYC coordinates
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format distances in meters for < 1km', () => {
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.123)).toBe('123m');
    });

    it('should format distances in km with decimals for < 10km', () => {
      expect(formatDistance(2.5)).toBe('2.5km');
      expect(formatDistance(9.9)).toBe('9.9km');
    });

    it('should format distances in whole km for >= 10km', () => {
      expect(formatDistance(15.7)).toBe('16km');
      expect(formatDistance(100.2)).toBe('100km');
    });
  });

  describe('getRatingSummary', () => {
    it('should return rating summary for rated business', () => {
      const result = getRatingSummary(mockBusiness);
      expect(result).toBe('Very Welcoming (10 ratings)');
    });

    it('should handle singular rating', () => {
      const singleRatingBusiness = { ...mockBusiness, totalRatings: 1 };
      const result = getRatingSummary(singleRatingBusiness);
      expect(result).toBe('Very Welcoming (1 rating)');
    });

    it('should return "Not yet rated" for unrated business', () => {
      const unratedBusiness = { ...mockBusiness, totalRatings: 0, averageScore: null };
      const result = getRatingSummary(unratedBusiness);
      expect(result).toBe('Not yet rated');
    });
  });

  describe('matchesSearchCriteria', () => {
    it('should match business name', () => {
      expect(matchesSearchCriteria(mockBusiness, 'Test')).toBe(true);
      expect(matchesSearchCriteria(mockBusiness, 'Restaurant')).toBe(true);
    });

    it('should match business address', () => {
      expect(matchesSearchCriteria(mockBusiness, 'Test St')).toBe(true);
      expect(matchesSearchCriteria(mockBusiness, 'City')).toBe(true);
    });

    it('should match business category', () => {
      expect(matchesSearchCriteria(mockBusiness, 'restaurant')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesSearchCriteria(mockBusiness, 'TEST')).toBe(true);
      expect(matchesSearchCriteria(mockBusiness, 'restaurant')).toBe(true);
    });

    it('should return true for empty search term', () => {
      expect(matchesSearchCriteria(mockBusiness, '')).toBe(true);
      expect(matchesSearchCriteria(mockBusiness, '   ')).toBe(true);
    });

    it('should return false for non-matching terms', () => {
      expect(matchesSearchCriteria(mockBusiness, 'Pizza')).toBe(false);
      expect(matchesSearchCriteria(mockBusiness, 'Nonexistent')).toBe(false);
    });
  });

  describe('filterByWelcomingLevel', () => {
    const businesses = [
      { ...mockBusiness, averageScore: 8 }, // very-welcoming
      { ...mockBusiness, averageScore: 2 }, // moderately-welcoming
      { ...mockBusiness, averageScore: -5 }, // not-welcoming
      { ...mockBusiness, averageScore: null }, // unrated
    ];

    it('should filter by single welcoming level', () => {
      const result = filterByWelcomingLevel(businesses, ['very-welcoming']);
      expect(result).toHaveLength(1);
      expect(result[0].averageScore).toBe(8);
    });

    it('should filter by multiple welcoming levels', () => {
      const result = filterByWelcomingLevel(businesses, ['very-welcoming', 'unrated']);
      expect(result).toHaveLength(2);
    });
  });

  describe('sortBusinesses', () => {
    const businesses = [
      { ...mockBusiness, name: 'B Restaurant', averageScore: 2, totalRatings: 5 },
      { ...mockBusiness, name: 'A Restaurant', averageScore: 8, totalRatings: 10 },
      { ...mockBusiness, name: 'C Restaurant', averageScore: -2, totalRatings: 3 },
    ];

    it('should sort by score high to low', () => {
      const result = sortBusinesses(businesses, 'score-high');
      expect(result[0].averageScore).toBe(8);
      expect(result[2].averageScore).toBe(-2);
    });

    it('should sort by score low to high', () => {
      const result = sortBusinesses(businesses, 'score-low');
      expect(result[0].averageScore).toBe(-2);
      expect(result[2].averageScore).toBe(8);
    });

    it('should sort by rating count', () => {
      const result = sortBusinesses(businesses, 'rating-high');
      expect(result[0].totalRatings).toBe(10);
      expect(result[2].totalRatings).toBe(3);
    });

    it('should sort by name alphabetically', () => {
      const result = sortBusinesses(businesses, 'name');
      expect(result[0].name).toBe('A Restaurant');
      expect(result[2].name).toBe('C Restaurant');
    });
  });

  describe('validateBusinessData', () => {
    it('should return no errors for valid business data', () => {
      const validBusiness = {
        businessId: 'test-id',
        name: 'Test Business',
        address: '123 Test St',
        location: { latitude: 40.7128, longitude: -74.006 },
      };

      const errors = validateBusinessData(validBusiness);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidBusiness = {};
      const errors = validateBusinessData(invalidBusiness);

      expect(errors).toContain('Business ID is required');
      expect(errors).toContain('Business name is required');
      expect(errors).toContain('Business address is required');
      expect(errors).toContain('Business location is required');
    });

    it('should validate location coordinates', () => {
      const invalidLocationBusiness = {
        businessId: 'test-id',
        name: 'Test Business',
        address: '123 Test St',
        location: { latitude: 200, longitude: -200 }, // Invalid coordinates
      };

      const errors = validateBusinessData(invalidLocationBusiness);
      expect(errors).toContain('Valid latitude is required');
      expect(errors).toContain('Valid longitude is required');
    });
  });

  describe('createBusinessSummary', () => {
    it('should create comprehensive business summary', () => {
      const summary = createBusinessSummary(mockBusiness);

      expect(summary).toMatchObject({
        id: 'test-place-id',
        name: 'Test Restaurant',
        category: 'Restaurant',
        address: '123 Test St, Test City',
        welcomingLevel: 'very-welcoming',
        ratingSummary: 'Very Welcoming (10 ratings)',
        hasRatings: true,
        totalRatings: 10,
        averageScore: 5,
        location: mockBusiness.location,
      });
    });
  });
});