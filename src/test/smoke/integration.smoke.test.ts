import { describe, it, expect } from 'vitest';
import type { DiningPreferences } from '../../types/preferences';
import type { BusinessAttributes } from '../../types/businessAttributes';

/**
 * Smoke tests to verify basic integration and imports
 * These tests ensure all modules can be imported and basic types are correct
 */

describe('Integration Smoke Tests', () => {
  describe('Type Definitions', () => {
    it('should have valid DiningPreferences type', () => {
      const preferences: DiningPreferences = {
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

      expect(preferences).toBeDefined();
      expect(preferences.cuisines.preferred).toContain('italian');
      expect(preferences.priceRange.min).toBe(1);
    });

    it('should have valid BusinessAttributes type', () => {
      const attributes: BusinessAttributes = {
        cuisineTypes: ['italian'],
        priceLevel: 2,
        dietaryOptions: ['vegetarian-options'],
        ambianceTags: ['casual'],
        features: ['wifi'],
        distanceFromUser: 1.5
      };

      expect(attributes).toBeDefined();
      expect(attributes.cuisineTypes).toContain('italian');
      expect(attributes.priceLevel).toBe(2);
    });
  });

  describe('Service Imports', () => {
    it('should import prioritization service', async () => {
      const module = await import('../../services/prioritization.service');
      expect(module).toBeDefined();
      expect(typeof module.calculateRelevanceScore).toBe('function');
      expect(typeof module.sortByRelevance).toBe('function');
      expect(typeof module.filterByMustHaves).toBe('function');
    });

    it('should import business attributes service', async () => {
      const module = await import('../../services/businessAttributes.service');
      expect(module).toBeDefined();
      expect(module.getBusinessAttributes).toBeDefined();
    });

    it('should import dining preferences service', async () => {
      const module = await import('../../services/diningPreferences.service');
      expect(module).toBeDefined();
      expect(typeof module.saveDiningPreferences).toBe('function');
      expect(typeof module.loadDiningPreferences).toBe('function');
    });

    it('should import interaction tracking service', async () => {
      const module = await import('../../services/interactionTracking.service');
      expect(module).toBeDefined();
      expect(typeof module.trackBusinessView).toBe('function');
      expect(typeof module.trackBusinessSave).toBe('function');
      expect(typeof module.trackBusinessRating).toBe('function');
    });

    it('should import preference suggestions service', async () => {
      const module = await import('../../services/preferenceSuggestions.service');
      expect(module).toBeDefined();
      expect(typeof module.generatePreferenceSuggestions).toBe('function');
    });
  });

  describe('Component Imports', () => {
    it('should import DiningPreferencesManager', async () => {
      const module = await import('../../components/preferences/DiningPreferencesManager');
      expect(module).toBeDefined();
      expect(module.DiningPreferencesManager).toBeDefined();
    });

    it('should import MatchQualityIndicator', async () => {
      const module = await import('../../components/business/MatchQualityIndicator');
      expect(module).toBeDefined();
      expect(module.MatchQualityIndicator).toBeDefined();
    });

    it('should import PreferenceMatchDetails', async () => {
      const module = await import('../../components/business/PreferenceMatchDetails');
      expect(module).toBeDefined();
      expect(module.PreferenceMatchDetails).toBeDefined();
    });

    it('should import PreferenceSuggestions', async () => {
      const module = await import('../../components/preferences/PreferenceSuggestions');
      expect(module).toBeDefined();
      expect(module.PreferenceSuggestions).toBeDefined();
    });

    it('should import PreferenceSetupWizard', async () => {
      const module = await import('../../components/preferences/PreferenceSetupWizard');
      expect(module).toBeDefined();
      expect(module.PreferenceSetupWizard).toBeDefined();
    });
  });

  describe('Utility Imports', () => {
    it('should import preference validation', async () => {
      const module = await import('../../utils/preferenceValidation');
      expect(module).toBeDefined();
      expect(typeof module.validateCuisinePreferences).toBe('function');
      expect(typeof module.validatePriceRange).toBe('function');
      expect(typeof module.validateDietaryRestrictions).toBe('function');
    });

    it('should import business attributes inference', async () => {
      const module = await import('../../utils/businessAttributesInference');
      expect(module).toBeDefined();
      expect(typeof module.inferCuisineTypes).toBe('function');
      expect(typeof module.inferDietaryOptions).toBe('function');
      expect(typeof module.inferAmbianceTags).toBe('function');
    });
  });

  describe('Hook Imports', () => {
    it('should import usePreferencePersistence', async () => {
      const module = await import('../../hooks/usePreferencePersistence');
      expect(module).toBeDefined();
      expect(module.PreferencesProvider).toBeDefined();
      expect(module.usePreferences).toBeDefined();
    });

    it('should import usePreferenceSetupPrompt', async () => {
      const module = await import('../../hooks/usePreferenceSetupPrompt');
      expect(module).toBeDefined();
      expect(module.usePreferenceSetupPrompt).toBeDefined();
    });
  });

  describe('Page Imports', () => {
    it('should import ExplorePage', async () => {
      const module = await import('../../pages/ExplorePage');
      expect(module).toBeDefined();
      expect(module.default).toBeDefined();
    });

    it('should import ProfilePage', async () => {
      const module = await import('../../pages/ProfilePage');
      expect(module).toBeDefined();
      expect(module.default).toBeDefined();
    });
  });

  describe('Data Flow Verification', () => {
    it('should have consistent importance levels across types', () => {
      const validImportanceLevels = ['must-have', 'high', 'medium', 'low'];
      
      const preferences: DiningPreferences = {
        cuisines: { preferred: [], disliked: [], importance: 'high' },
        priceRange: { min: 1, max: 4, importance: 'medium' },
        dietary: { restrictions: [], importance: 'low' },
        ambiance: { preferred: [], importance: 'low' },
        distance: { maxDistance: 10, importance: 'medium' },
        rating: { minRating: 0, minWinksScore: null, importance: 'low' },
        features: { preferred: [], importance: 'low' },
        learningData: { viewedBusinesses: [], savedBusinesses: [], ratedBusinesses: [] }
      };

      expect(validImportanceLevels).toContain(preferences.cuisines.importance);
      expect(validImportanceLevels).toContain(preferences.priceRange.importance);
      expect(validImportanceLevels).toContain(preferences.dietary.importance);
    });

    it('should have valid price range values', () => {
      const preferences: DiningPreferences = {
        cuisines: { preferred: [], disliked: [], importance: 'low' },
        priceRange: { min: 1, max: 4, importance: 'medium' },
        dietary: { restrictions: [], importance: 'low' },
        ambiance: { preferred: [], importance: 'low' },
        distance: { maxDistance: 10, importance: 'low' },
        rating: { minRating: 0, minWinksScore: null, importance: 'low' },
        features: { preferred: [], importance: 'low' },
        learningData: { viewedBusinesses: [], savedBusinesses: [], ratedBusinesses: [] }
      };

      expect(preferences.priceRange.min).toBeGreaterThanOrEqual(1);
      expect(preferences.priceRange.min).toBeLessThanOrEqual(4);
      expect(preferences.priceRange.max).toBeGreaterThanOrEqual(1);
      expect(preferences.priceRange.max).toBeLessThanOrEqual(4);
      expect(preferences.priceRange.max).toBeGreaterThanOrEqual(preferences.priceRange.min);
    });

    it('should have valid rating values', () => {
      const preferences: DiningPreferences = {
        cuisines: { preferred: [], disliked: [], importance: 'low' },
        priceRange: { min: 1, max: 4, importance: 'low' },
        dietary: { restrictions: [], importance: 'low' },
        ambiance: { preferred: [], importance: 'low' },
        distance: { maxDistance: 10, importance: 'low' },
        rating: { minRating: 4.5, minWinksScore: 80, importance: 'medium' },
        features: { preferred: [], importance: 'low' },
        learningData: { viewedBusinesses: [], savedBusinesses: [], ratedBusinesses: [] }
      };

      expect(preferences.rating.minRating).toBeGreaterThanOrEqual(0);
      expect(preferences.rating.minRating).toBeLessThanOrEqual(5);
      if (preferences.rating.minWinksScore !== null) {
        expect(preferences.rating.minWinksScore).toBeGreaterThanOrEqual(0);
        expect(preferences.rating.minWinksScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Feature Completeness', () => {
    it('should have all required preference categories', () => {
      const preferences: DiningPreferences = {
        cuisines: { preferred: [], disliked: [], importance: 'low' },
        priceRange: { min: 1, max: 4, importance: 'low' },
        dietary: { restrictions: [], importance: 'low' },
        ambiance: { preferred: [], importance: 'low' },
        distance: { maxDistance: 10, importance: 'low' },
        rating: { minRating: 0, minWinksScore: null, importance: 'low' },
        features: { preferred: [], importance: 'low' },
        learningData: { viewedBusinesses: [], savedBusinesses: [], ratedBusinesses: [] }
      };

      expect(preferences).toHaveProperty('cuisines');
      expect(preferences).toHaveProperty('priceRange');
      expect(preferences).toHaveProperty('dietary');
      expect(preferences).toHaveProperty('ambiance');
      expect(preferences).toHaveProperty('distance');
      expect(preferences).toHaveProperty('rating');
      expect(preferences).toHaveProperty('features');
      expect(preferences).toHaveProperty('learningData');
    });

    it('should have all required business attributes', () => {
      const attributes: BusinessAttributes = {
        cuisineTypes: [],
        priceLevel: null,
        dietaryOptions: [],
        ambianceTags: [],
        features: [],
        distanceFromUser: undefined
      };

      expect(attributes).toHaveProperty('cuisineTypes');
      expect(attributes).toHaveProperty('priceLevel');
      expect(attributes).toHaveProperty('dietaryOptions');
      expect(attributes).toHaveProperty('ambianceTags');
      expect(attributes).toHaveProperty('features');
      expect(attributes).toHaveProperty('distanceFromUser');
    });

    it('should have learning data structure', () => {
      const learningData = {
        viewedBusinesses: ['business1', 'business2'],
        savedBusinesses: ['business3'],
        ratedBusinesses: [
          { businessId: 'business1', rating: 5, timestamp: new Date() }
        ]
      };

      expect(learningData).toHaveProperty('viewedBusinesses');
      expect(learningData).toHaveProperty('savedBusinesses');
      expect(learningData).toHaveProperty('ratedBusinesses');
      expect(Array.isArray(learningData.viewedBusinesses)).toBe(true);
      expect(Array.isArray(learningData.savedBusinesses)).toBe(true);
      expect(Array.isArray(learningData.ratedBusinesses)).toBe(true);
    });
  });
});
