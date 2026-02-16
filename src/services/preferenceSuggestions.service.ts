/**
 * Preference Suggestions Service
 * 
 * Analyzes user interaction patterns to generate preference adjustment suggestions.
 * Helps users refine their dining preferences based on their actual behavior.
 */

import { DiningPreferences } from '../types/preferences';
import { BusinessAttributes } from '../types/businessAttributes';
import { businessAttributesService } from './businessAttributes.service';

export interface PreferenceSuggestion {
  id: string;
  type: 'cuisine' | 'price' | 'dietary' | 'ambiance' | 'features';
  title: string;
  description: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number; // 0-1, how confident we are in this suggestion
  reason: string; // Why we're suggesting this
}

/**
 * Preference Suggestions Service
 */
export class PreferenceSuggestionsService {
  private static instance: PreferenceSuggestionsService;

  public static getInstance(): PreferenceSuggestionsService {
    if (!PreferenceSuggestionsService.instance) {
      PreferenceSuggestionsService.instance = new PreferenceSuggestionsService();
    }
    return PreferenceSuggestionsService.instance;
  }

  /**
   * Generate preference suggestions based on interaction patterns
   */
  async generateSuggestions(
    preferences: DiningPreferences
  ): Promise<PreferenceSuggestion[]> {
    const suggestions: PreferenceSuggestion[] = [];

    // Need at least 5 interactions to make meaningful suggestions
    const totalInteractions = 
      (preferences.learningData.viewedBusinesses?.length || 0) +
      (preferences.learningData.savedBusinesses?.length || 0) +
      (preferences.learningData.ratedBusinesses?.length || 0);

    if (totalInteractions < 5) {
      return suggestions;
    }

    // Get business attributes for all interacted businesses
    const businessIds = this.getUniqueBusinessIds(preferences);
    const attributesMap = await businessAttributesService.batchLoadBusinessAttributes(businessIds);

    // Analyze patterns and generate suggestions
    const cuisineSuggestions = this.analyzeCuisinePatterns(preferences, attributesMap);
    const priceSuggestions = this.analyzePricePatterns(preferences, attributesMap);
    const dietarySuggestions = this.analyzeDietaryPatterns(preferences, attributesMap);
    const ambianceSuggestions = this.analyzeAmbiancePatterns(preferences, attributesMap);
    const featureSuggestions = this.analyzeFeaturePatterns(preferences, attributesMap);

    suggestions.push(
      ...cuisineSuggestions,
      ...priceSuggestions,
      ...dietarySuggestions,
      ...ambianceSuggestions,
      ...featureSuggestions
    );

    // Sort by confidence (highest first)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze cuisine preferences based on interaction patterns
   */
  private analyzeCuisinePatterns(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>
  ): PreferenceSuggestion[] {
    const suggestions: PreferenceSuggestion[] = [];

    // Count cuisine types from highly-rated and saved businesses
    const cuisineCounts = new Map<string, number>();
    const totalWeight = this.calculateInteractionWeights(preferences, attributesMap, cuisineCounts);

    if (totalWeight === 0) {
      return suggestions;
    }

    // Find cuisines that appear frequently but aren't in preferences
    const currentPreferred = new Set(preferences.cuisines.preferred);
    const frequentCuisines: Array<{ cuisine: string; frequency: number }> = [];

    cuisineCounts.forEach((count, cuisine) => {
      const frequency = count / totalWeight;
      if (frequency >= 0.3 && !currentPreferred.has(cuisine)) {
        frequentCuisines.push({ cuisine, frequency });
      }
    });

    // Generate suggestions for top cuisines
    frequentCuisines
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .forEach(({ cuisine, frequency }) => {
        suggestions.push({
          id: `cuisine-add-${cuisine}`,
          type: 'cuisine',
          title: `Add ${this.formatCuisine(cuisine)} to preferred cuisines`,
          description: `You've frequently visited ${this.formatCuisine(cuisine)} restaurants`,
          currentValue: preferences.cuisines.preferred,
          suggestedValue: [...preferences.cuisines.preferred, cuisine],
          confidence: Math.min(frequency * 1.5, 1),
          reason: `${Math.round(frequency * 100)}% of your interactions involve ${this.formatCuisine(cuisine)} restaurants`,
        });
      });

    return suggestions;
  }

  /**
   * Analyze price range preferences
   */
  private analyzePricePatterns(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>
  ): PreferenceSuggestion[] {
    const suggestions: PreferenceSuggestion[] = [];

    // Collect price levels from highly-rated and saved businesses
    const priceLevels: number[] = [];
    
    // Weight saved businesses more heavily
    preferences.learningData.savedBusinesses?.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.priceLevel) {
        priceLevels.push(attributes.priceLevel);
        priceLevels.push(attributes.priceLevel); // Double weight for saved
      }
    });

    // Add highly-rated businesses (4+)
    preferences.learningData.ratedBusinesses
      ?.filter(r => r.rating >= 4)
      .forEach(r => {
        const attributes = attributesMap.get(r.businessId);
        if (attributes?.priceLevel) {
          priceLevels.push(attributes.priceLevel);
        }
      });

    if (priceLevels.length < 3) {
      return suggestions;
    }

    // Calculate average and range
    const avgPrice = priceLevels.reduce((sum, p) => sum + p, 0) / priceLevels.length;
    const minObserved = Math.min(...priceLevels);
    const maxObserved = Math.max(...priceLevels);

    // Suggest adjustment if observed pattern differs significantly from preferences
    const currentMin = preferences.priceRange.min;
    const currentMax = preferences.priceRange.max;

    if (Math.abs(avgPrice - (currentMin + currentMax) / 2) > 0.7) {
      const suggestedMin = Math.max(1, Math.floor(minObserved));
      const suggestedMax = Math.min(4, Math.ceil(maxObserved));

      suggestions.push({
        id: 'price-adjust',
        type: 'price',
        title: 'Adjust price range preference',
        description: `Your interactions suggest a preference for ${this.formatPriceLevel(Math.round(avgPrice))} restaurants`,
        currentValue: { min: currentMin, max: currentMax },
        suggestedValue: { min: suggestedMin, max: suggestedMax },
        confidence: Math.min(priceLevels.length / 10, 0.9),
        reason: `Based on ${priceLevels.length} interactions with restaurants in this price range`,
      });
    }

    return suggestions;
  }

  /**
   * Analyze dietary preferences
   */
  private analyzeDietaryPatterns(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>
  ): PreferenceSuggestion[] {
    const suggestions: PreferenceSuggestion[] = [];

    // Count dietary options from interacted businesses
    const dietaryCounts = new Map<string, number>();
    let totalBusinesses = 0;

    // Weight saved and highly-rated businesses
    const relevantBusinessIds = new Set([
      ...(preferences.learningData.savedBusinesses || []),
      ...(preferences.learningData.ratedBusinesses || [])
        .filter(r => r.rating >= 4)
        .map(r => r.businessId),
    ]);

    relevantBusinessIds.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.dietaryOptions) {
        totalBusinesses++;
        attributes.dietaryOptions.forEach(option => {
          dietaryCounts.set(option, (dietaryCounts.get(option) || 0) + 1);
        });
      }
    });

    if (totalBusinesses < 3) {
      return suggestions;
    }

    // Find dietary options that appear frequently but aren't in preferences
    const currentRestrictions = new Set(preferences.dietary.restrictions);

    dietaryCounts.forEach((count, option) => {
      const frequency = count / totalBusinesses;
      if (frequency >= 0.5 && !currentRestrictions.has(option)) {
        suggestions.push({
          id: `dietary-add-${option}`,
          type: 'dietary',
          title: `Add ${this.formatDietaryOption(option)} to dietary preferences`,
          description: `Many of your favorite places offer ${this.formatDietaryOption(option)} options`,
          currentValue: preferences.dietary.restrictions,
          suggestedValue: [...preferences.dietary.restrictions, option],
          confidence: Math.min(frequency * 1.2, 0.95),
          reason: `${Math.round(frequency * 100)}% of your favorite places offer this option`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze ambiance preferences
   */
  private analyzeAmbiancePatterns(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>
  ): PreferenceSuggestion[] {
    const suggestions: PreferenceSuggestion[] = [];

    // Count ambiance tags from saved and highly-rated businesses
    const ambianceCounts = new Map<string, number>();
    let totalBusinesses = 0;

    const relevantBusinessIds = new Set([
      ...(preferences.learningData.savedBusinesses || []),
      ...(preferences.learningData.ratedBusinesses || [])
        .filter(r => r.rating >= 4)
        .map(r => r.businessId),
    ]);

    relevantBusinessIds.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.ambianceTags && attributes.ambianceTags.length > 0) {
        totalBusinesses++;
        attributes.ambianceTags.forEach(tag => {
          ambianceCounts.set(tag, (ambianceCounts.get(tag) || 0) + 1);
        });
      }
    });

    if (totalBusinesses < 3) {
      return suggestions;
    }

    // Find ambiance tags that appear frequently but aren't in preferences
    const currentPreferred = new Set(preferences.ambiance.preferred);

    ambianceCounts.forEach((count, tag) => {
      const frequency = count / totalBusinesses;
      if (frequency >= 0.4 && !currentPreferred.has(tag)) {
        suggestions.push({
          id: `ambiance-add-${tag}`,
          type: 'ambiance',
          title: `Add ${this.formatAmbianceTag(tag)} to ambiance preferences`,
          description: `You tend to enjoy ${this.formatAmbianceTag(tag)} atmospheres`,
          currentValue: preferences.ambiance.preferred,
          suggestedValue: [...preferences.ambiance.preferred, tag],
          confidence: Math.min(frequency * 1.3, 0.9),
          reason: `${Math.round(frequency * 100)}% of your favorite places have this ambiance`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Analyze feature preferences
   */
  private analyzeFeaturePatterns(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>
  ): PreferenceSuggestion[] {
    const suggestions: PreferenceSuggestion[] = [];

    // Count features from saved and highly-rated businesses
    const featureCounts = new Map<string, number>();
    let totalBusinesses = 0;

    const relevantBusinessIds = new Set([
      ...(preferences.learningData.savedBusinesses || []),
      ...(preferences.learningData.ratedBusinesses || [])
        .filter(r => r.rating >= 4)
        .map(r => r.businessId),
    ]);

    relevantBusinessIds.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.features && attributes.features.length > 0) {
        totalBusinesses++;
        attributes.features.forEach(feature => {
          featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
        });
      }
    });

    if (totalBusinesses < 3) {
      return suggestions;
    }

    // Find features that appear frequently but aren't in preferences
    const currentPreferred = new Set(preferences.features.preferred);

    featureCounts.forEach((count, feature) => {
      const frequency = count / totalBusinesses;
      if (frequency >= 0.5 && !currentPreferred.has(feature)) {
        suggestions.push({
          id: `feature-add-${feature}`,
          type: 'features',
          title: `Add ${this.formatFeature(feature)} to preferred features`,
          description: `Your favorite places often have ${this.formatFeature(feature)}`,
          currentValue: preferences.features.preferred,
          suggestedValue: [...preferences.features.preferred, feature],
          confidence: Math.min(frequency * 1.2, 0.9),
          reason: `${Math.round(frequency * 100)}% of your favorite places offer this feature`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Helper: Get unique business IDs from all interactions
   */
  private getUniqueBusinessIds(preferences: DiningPreferences): string[] {
    const ids = new Set<string>();

    preferences.learningData.viewedBusinesses?.forEach(id => ids.add(id));
    preferences.learningData.savedBusinesses?.forEach(id => ids.add(id));
    preferences.learningData.ratedBusinesses?.forEach(r => ids.add(r.businessId));

    return Array.from(ids);
  }

  /**
   * Helper: Calculate interaction weights for cuisine analysis
   */
  private calculateInteractionWeights(
    preferences: DiningPreferences,
    attributesMap: Map<string, BusinessAttributes>,
    cuisineCounts: Map<string, number>
  ): number {
    let totalWeight = 0;

    // Saved businesses (weight: 3)
    preferences.learningData.savedBusinesses?.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.cuisineTypes) {
        attributes.cuisineTypes.forEach(cuisine => {
          cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 3);
          totalWeight += 3;
        });
      }
    });

    // Highly-rated businesses (4+) (weight: 2)
    preferences.learningData.ratedBusinesses
      ?.filter(r => r.rating >= 4)
      .forEach(r => {
        const attributes = attributesMap.get(r.businessId);
        if (attributes?.cuisineTypes) {
          attributes.cuisineTypes.forEach(cuisine => {
            cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 2);
            totalWeight += 2;
          });
        }
      });

    // Viewed businesses (weight: 1)
    preferences.learningData.viewedBusinesses?.forEach(businessId => {
      const attributes = attributesMap.get(businessId);
      if (attributes?.cuisineTypes) {
        attributes.cuisineTypes.forEach(cuisine => {
          cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 1);
          totalWeight += 1;
        });
      }
    });

    return totalWeight;
  }

  /**
   * Formatting helpers
   */
  private formatCuisine(cuisine: string): string {
    return cuisine
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatPriceLevel(level: number): string {
    const labels = ['', 'budget-friendly', 'moderate', 'upscale', 'fine dining'];
    return labels[level] || 'moderate';
  }

  private formatDietaryOption(option: string): string {
    return option
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatAmbianceTag(tag: string): string {
    return tag
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatFeature(feature: string): string {
    return feature
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const preferenceSuggestionsService = PreferenceSuggestionsService.getInstance();
