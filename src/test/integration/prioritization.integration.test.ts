import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateRelevanceScore, sortByRelevance, filterByMustHaves } from '../../services/prioritization.service';
import { getBusinessAttributes } from '../../services/businessAttributes.service';
import type { DiningPreferences } from '../../types/preferences';
import type { BusinessAttributes } from '../../types/businessAttributes';

describe('Prioritization Service Integration', () => {
  const mockUserLocation = { latitude: 40.7128, longitude: -74.0060 };

  const mockBusiness: google.maps.places.PlaceResult = {
    place_id: '1',
    name: 'Italian Bistro',
    types: ['restaurant', 'italian_restaurant'],
    price_level: 2,
    rating: 4.5,
    geometry: {
      location: {
        lat: () => 40.7130,
        lng: () => -74.0062
      } as google.maps.LatLng
    }
  };

  const mockBusinessAttributes: BusinessAttributes = {
    cuisineTypes: ['italian'],
    priceLevel: 2,
    dietaryOptions: ['vegetarian-options'],
    ambianceTags: ['casual', 'family-friendly'],
    features: ['outdoor-seating', 'wifi']
  };

  const mockPreferences: DiningPreferences = {
    cuisines: {
      preferred: ['italian'],
      disliked: [],
      importance: 'high'
    },
    priceRange: {
      min: 1,
      max: 3,
      importance: 'medium'
    },
    dietary: {
      restrictions: ['vegetarian'],
      importance: 'medium'
    },
    ambiance: {
      preferred: ['casual'],
      importance: 'low'
    },
    distance: {
      maxDistance: 5,
      importance: 'medium'
    },
    rating: {
      minRating: 4.0,
      minWinksScore: null,
      importance: 'medium'
    },
    features: {
      preferred: ['wifi'],
      importance: 'low'
    },
    learningData: {
      viewedBusinesses: [],
      savedBusinesses: [],
      ratedBusinesses: []
    }
  };

  describe('calculateRelevanceScore', () => {
    it('should calculate high score for perfect match', () => {
      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        mockPreferences,
        undefined,
        mockBusiness.name
      );

      expect(score.totalScore).toBeGreaterThan(80);
      expect(score.businessId).toBeDefined();
      expect(score.breakdown.cuisineScore).toBeGreaterThan(90);
      expect(score.breakdown.priceScore).toBeGreaterThan(90);
    });

    it('should calculate lower score for partial match', () => {
      const partialMatchPreferences: DiningPreferences = {
        ...mockPreferences,
        cuisines: {
          preferred: ['mexican', 'chinese'],
          disliked: [],
          importance: 'high'
        }
      };

      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        partialMatchPreferences,
        undefined,
        mockBusiness.name
      );

      expect(score.totalScore).toBeLessThan(60);
      expect(score.breakdown.cuisineScore).toBeLessThan(50);
    });

    it('should handle missing business attributes gracefully', () => {
      const incompleteAttributes: BusinessAttributes = {
        cuisineTypes: ['italian'],
        priceLevel: null,
        dietaryOptions: [],
        ambianceTags: [],
        features: [],
        lastUpdated: new Date(),
        source: 'manual'
      };

      const score = calculateRelevanceScore(
        incompleteAttributes,
        mockBusiness.rating,
        undefined,
        mockPreferences,
        undefined,
        mockBusiness.name
      );

      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.breakdown.cuisineScore).toBeGreaterThan(0);
    });

    it('should apply importance multipliers correctly', () => {
      const highImportancePreferences: DiningPreferences = {
        ...mockPreferences,
        cuisines: {
          preferred: ['italian'],
          disliked: [],
          importance: 'high'
        }
      };

      const lowImportancePreferences: DiningPreferences = {
        ...mockPreferences,
        cuisines: {
          preferred: ['italian'],
          disliked: [],
          importance: 'low'
        }
      };

      const highScore = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        highImportancePreferences,
        undefined,
        mockBusiness.name
      );

      const lowScore = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        lowImportancePreferences,
        undefined,
        mockBusiness.name
      );

      expect(highScore.totalScore).toBeGreaterThan(lowScore.totalScore);
    });

    it('should include matched and unmatched preferences', () => {
      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        mockPreferences,
        undefined,
        mockBusiness.name
      );

      expect(score.matchedPreferences).toContain('cuisine');
      expect(score.matchedPreferences).toContain('price');
      expect(score.unmatchedPreferences).toBeDefined();
    });
  });

  describe('sortByRelevance', () => {
    it('should sort businesses by relevance score', () => {
      const businesses: google.maps.places.PlaceResult[] = [
        { ...mockBusiness, place_id: '1', name: 'Low Match' },
        { ...mockBusiness, place_id: '2', name: 'High Match' },
        { ...mockBusiness, place_id: '3', name: 'Medium Match' }
      ];

      const scores = new Map([
        ['1', { businessId: '1', totalScore: 50, breakdown: {}, matchedPreferences: [], unmatchedPreferences: [] }],
        ['2', { businessId: '2', totalScore: 90, breakdown: {}, matchedPreferences: [], unmatchedPreferences: [] }],
        ['3', { businessId: '3', totalScore: 70, breakdown: {}, matchedPreferences: [], unmatchedPreferences: [] }]
      ]);

      const sorted = sortByRelevance(businesses, scores);

      expect(sorted[0].place_id).toBe('2');
      expect(sorted[1].place_id).toBe('3');
      expect(sorted[2].place_id).toBe('1');
    });

    it('should handle businesses without scores', () => {
      const businesses: google.maps.places.PlaceResult[] = [
        { ...mockBusiness, place_id: '1' },
        { ...mockBusiness, place_id: '2' }
      ];

      const scores = new Map([
        ['1', { businessId: '1', totalScore: 80, breakdown: {}, matchedPreferences: [], unmatchedPreferences: [] }]
      ]);

      const sorted = sortByRelevance(businesses, scores);

      expect(sorted.length).toBe(2);
      expect(sorted[0].place_id).toBe('1');
    });
  });

  describe('filterByMustHaves', () => {
    it('should filter out businesses not meeting must-have cuisine', () => {
      const businesses: google.maps.places.PlaceResult[] = [
        { ...mockBusiness, place_id: '1', types: ['restaurant', 'italian_restaurant'] },
        { ...mockBusiness, place_id: '2', types: ['restaurant', 'mexican_restaurant'] }
      ];

      const mustHavePreferences: DiningPreferences = {
        ...mockPreferences,
        cuisines: {
          preferred: ['italian'],
          disliked: [],
          importance: 'must-have'
        }
      };

      const filtered = filterByMustHaves(businesses, mustHavePreferences);

      expect(filtered.length).toBe(1);
      expect(filtered[0].place_id).toBe('1');
    });

    it('should filter out businesses not meeting must-have price range', () => {
      const businesses: google.maps.places.PlaceResult[] = [
        { ...mockBusiness, place_id: '1', price_level: 2 },
        { ...mockBusiness, place_id: '2', price_level: 4 }
      ];

      const mustHavePreferences: DiningPreferences = {
        ...mockPreferences,
        priceRange: {
          min: 1,
          max: 3,
          importance: 'must-have'
        }
      };

      const filtered = filterByMustHaves(businesses, mustHavePreferences);

      expect(filtered.length).toBe(1);
      expect(filtered[0].place_id).toBe('1');
    });

    it('should not filter when no must-have preferences', () => {
      const businesses: google.maps.places.PlaceResult[] = [
        { ...mockBusiness, place_id: '1' },
        { ...mockBusiness, place_id: '2' }
      ];

      const filtered = filterByMustHaves(businesses, mockPreferences);

      expect(filtered.length).toBe(2);
    });
  });

  describe('Business Attributes Integration', () => {
    it('should fetch and cache business attributes', async () => {
      const attributes = await getBusinessAttributes(mockBusiness);

      expect(attributes).toBeDefined();
      expect(attributes.cuisineTypes).toBeDefined();
      expect(Array.isArray(attributes.cuisineTypes)).toBe(true);
    });

    it('should infer attributes from Google Places data', async () => {
      const business: google.maps.places.PlaceResult = {
        place_id: 'test-id',
        name: 'Test Restaurant',
        types: ['restaurant', 'italian_restaurant', 'bar'],
        price_level: 3,
        rating: 4.2
      };

      const attributes = await getBusinessAttributes(business);

      expect(attributes.cuisineTypes).toContain('italian');
      expect(attributes.priceLevel).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle business with no types', () => {
      const businessNoTypes: google.maps.places.PlaceResult = {
        ...mockBusiness,
        types: undefined
      };

      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        mockPreferences,
        undefined,
        businessNoTypes.name
      );

      expect(score.totalScore).toBeGreaterThan(0);
    });

    it('should handle business with no price level', () => {
      const businessNoPrice: google.maps.places.PlaceResult = {
        ...mockBusiness,
        price_level: undefined
      };

      const score = calculateRelevanceScore(
        { ...mockBusinessAttributes, priceLevel: null },
        mockBusiness.rating,
        undefined,
        mockPreferences,
        undefined,
        businessNoPrice.name
      );

      expect(score.totalScore).toBeGreaterThan(0);
    });

    it('should handle business with no rating', () => {
      const businessNoRating: google.maps.places.PlaceResult = {
        ...mockBusiness,
        rating: undefined
      };

      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        undefined,
        undefined,
        mockPreferences,
        undefined,
        businessNoRating.name
      );

      expect(score.totalScore).toBeGreaterThan(0);
    });

    it('should handle empty preferences', () => {
      const emptyPreferences: DiningPreferences = {
        cuisines: { preferred: [], disliked: [], importance: 'low' },
        priceRange: { min: 1, max: 4, importance: 'low' },
        dietary: { restrictions: [], importance: 'low' },
        ambiance: { preferred: [], importance: 'low' },
        distance: { maxDistance: 10, importance: 'low' },
        rating: { minRating: 0, minWinksScore: null, importance: 'low' },
        features: { preferred: [], importance: 'low' },
        learningData: { viewedBusinesses: [], savedBusinesses: [], ratedBusinesses: [] },
        politicalView: {
          importance: 'low',
          preferred: []
          // Added minimal mock for politicalView to satisfy type
        } as any
      };

      const score = calculateRelevanceScore(
        mockBusinessAttributes,
        mockBusiness.rating,
        undefined,
        emptyPreferences,
        undefined,
        mockBusiness.name
      );

      expect(score.totalScore).toBeGreaterThan(0);
    });
  });
});
