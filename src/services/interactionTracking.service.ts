/**
 * Interaction Tracking Service
 * 
 * Tracks user interactions with businesses to learn preferences over time.
 * Stores interaction data in the learningData section of dining preferences.
 */

import { DiningPreferences } from '../types/preferences';

export interface BusinessViewInteraction {
  businessId: string;
  timestamp: Date;
  durationSeconds: number;
  source: 'search' | 'map' | 'direct' | 'saved';
}

export interface BusinessSaveInteraction {
  businessId: string;
  timestamp: Date;
  action: 'save' | 'unsave';
}

export interface BusinessRatingInteraction {
  businessId: string;
  rating: number;
  timestamp: Date;
}

export interface SearchResultClickInteraction {
  businessId: string;
  timestamp: Date;
  position: number; // Position in search results
  relevanceScore?: number; // If prioritization was active
}

/**
 * Interaction Tracking Service
 */
export class InteractionTrackingService {
  private viewStartTimes: Map<string, Date> = new Map();

  /**
   * Start tracking a business view
   */
  startBusinessView(businessId: string): void {
    this.viewStartTimes.set(businessId, new Date());
  }

  /**
   * End tracking a business view and return the interaction data
   */
  endBusinessView(
    businessId: string,
    source: BusinessViewInteraction['source'] = 'direct'
  ): BusinessViewInteraction | null {
    const startTime = this.viewStartTimes.get(businessId);
    if (!startTime) {
      return null;
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    this.viewStartTimes.delete(businessId);

    return {
      businessId,
      timestamp: endTime,
      durationSeconds,
      source,
    };
  }

  /**
   * Track a business view in preferences
   */
  trackBusinessView(
    preferences: DiningPreferences,
    businessId: string,
    durationSeconds: number = 0
  ): DiningPreferences {
    // Only track if view duration is meaningful (> 3 seconds)
    if (durationSeconds < 3) {
      return preferences;
    }

    const viewedBusinesses = preferences.learningData.viewedBusinesses || [];
    
    // Add to viewed businesses if not already present
    if (!viewedBusinesses.includes(businessId)) {
      return {
        ...preferences,
        learningData: {
          ...preferences.learningData,
          viewedBusinesses: [...viewedBusinesses, businessId],
        },
      };
    }

    return preferences;
  }

  /**
   * Track a business save/favorite action
   */
  trackBusinessSave(
    preferences: DiningPreferences,
    businessId: string,
    action: 'save' | 'unsave'
  ): DiningPreferences {
    const savedBusinesses = preferences.learningData.savedBusinesses || [];

    if (action === 'save') {
      // Add to saved businesses if not already present
      if (!savedBusinesses.includes(businessId)) {
        return {
          ...preferences,
          learningData: {
            ...preferences.learningData,
            savedBusinesses: [...savedBusinesses, businessId],
          },
        };
      }
    } else {
      // Remove from saved businesses
      return {
        ...preferences,
        learningData: {
          ...preferences.learningData,
          savedBusinesses: savedBusinesses.filter(id => id !== businessId),
        },
      };
    }

    return preferences;
  }

  /**
   * Track a business rating
   */
  trackBusinessRating(
    preferences: DiningPreferences,
    businessId: string,
    rating: number
  ): DiningPreferences {
    const ratedBusinesses = preferences.learningData.ratedBusinesses || [];

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
        ...preferences,
        learningData: {
          ...preferences.learningData,
          ratedBusinesses: updatedRatings,
        },
      };
    } else {
      // Add new rating
      return {
        ...preferences,
        learningData: {
          ...preferences.learningData,
          ratedBusinesses: [
            ...ratedBusinesses,
            {
              businessId,
              rating,
              timestamp: new Date(),
            },
          ],
        },
      };
    }
  }

  /**
   * Track a search result click
   * This can be used to understand which results users find most relevant
   */
  trackSearchResultClick(
    businessId: string,
    position: number,
    relevanceScore?: number
  ): SearchResultClickInteraction {
    return {
      businessId,
      timestamp: new Date(),
      position,
      relevanceScore,
    };
  }

  /**
   * Get interaction statistics for a user
   */
  getInteractionStats(preferences: DiningPreferences): {
    totalViews: number;
    totalSaves: number;
    totalRatings: number;
    averageRating: number;
  } {
    const { viewedBusinesses, savedBusinesses, ratedBusinesses } = preferences.learningData;

    const totalRatings = ratedBusinesses?.length || 0;
    const averageRating = totalRatings > 0
      ? ratedBusinesses.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    return {
      totalViews: viewedBusinesses?.length || 0,
      totalSaves: savedBusinesses?.length || 0,
      totalRatings,
      averageRating,
    };
  }

  /**
   * Clear all interaction data
   */
  clearInteractionData(preferences: DiningPreferences): DiningPreferences {
    return {
      ...preferences,
      learningData: {
        viewedBusinesses: [],
        savedBusinesses: [],
        ratedBusinesses: [],
      },
    };
  }
}

// Export singleton instance
export const interactionTrackingService = new InteractionTrackingService();
