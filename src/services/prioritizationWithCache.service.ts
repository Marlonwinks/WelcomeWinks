import { DiningPreferences } from '../types/preferences';
import { BusinessAttributes, RelevanceScore } from '../types/businessAttributes';
import {
  calculateRelevanceScore,
  filterByMustHaves,
  sortByRelevance,
  sortBusinessesWithFallback,
  hasPreferencesSet,
  BusinessWithScore,
} from './prioritization.service';
import { cacheService, generatePreferencesHash } from './cache.service';
import { businessAttributesService } from './businessAttributes.service';

/**
 * Performance monitoring data
 */
export interface PerformanceMetrics {
  totalTime: number;
  attributeFetchTime: number;
  scoringTime: number;
  sortingTime: number;
  cacheHitRate: number;
  businessesProcessed: number;
}

/**
 * Enhanced Prioritization Service with Caching and Performance Optimization
 */
export class PrioritizationWithCacheService {
  private static instance: PrioritizationWithCacheService;
  private performanceMetrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 100;

  public static getInstance(): PrioritizationWithCacheService {
    if (!PrioritizationWithCacheService.instance) {
      PrioritizationWithCacheService.instance = new PrioritizationWithCacheService();
    }
    return PrioritizationWithCacheService.instance;
  }

  /**
   * Calculate relevance score with caching
   */
  calculateRelevanceScoreWithCache(
    placeId: string,
    businessAttributes: BusinessAttributes,
    googleRating: number | undefined,
    winksScore: number | undefined,
    preferences: DiningPreferences,
    preferencesHash: string,
    businessName: string = ''
  ): RelevanceScore {
    // Check cache first
    const cached = cacheService.getRelevanceScore(placeId, preferencesHash);
    if (cached) {
      return cached;
    }

    // Calculate score
    const score = calculateRelevanceScore(
      businessAttributes,
      googleRating,
      winksScore,
      preferences,
      undefined, // Default weights
      businessName
    );

    // Set businessId
    score.businessId = placeId;

    // Cache the result
    cacheService.setRelevanceScore(placeId, preferencesHash, score);

    return score;
  }

  /**
   * Batch process businesses with parallel attribute fetching and scoring
   */
  async batchProcessBusinesses(
    businesses: google.maps.places.PlaceResult[],
    preferences: DiningPreferences,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<{
    businessesWithScores: BusinessWithScore[];
    metrics: PerformanceMetrics;
  }> {
    const startTime = performance.now();
    const preferencesHash = generatePreferencesHash(preferences);

    // Step 1: Batch fetch attributes (parallel)
    const attributeFetchStart = performance.now();
    const placeIds = businesses
      .map(b => b.place_id)
      .filter((id): id is string => id !== undefined);

    // Try batch load from cache/Firestore first
    const attributesMap = await businessAttributesService.batchLoadBusinessAttributes(placeIds);

    // For missing attributes, infer them in parallel
    const missingBusinesses = businesses.filter(
      b => b.place_id && !attributesMap.has(b.place_id)
    );

    if (missingBusinesses.length > 0) {
      const inferredAttributes = await Promise.all(
        missingBusinesses.map(async business => {
          const placeId = business.place_id!;
          const attributes = await businessAttributesService.getBusinessAttributes(
            placeId,
            business,
            userLocation
          );
          return { placeId, attributes };
        })
      );

      // Add inferred attributes to map
      inferredAttributes.forEach(({ placeId, attributes }) => {
        attributesMap.set(placeId, attributes);
      });
    }

    const attributeFetchTime = performance.now() - attributeFetchStart;

    // Step 2: Calculate scores in parallel
    const scoringStart = performance.now();
    const businessesWithScores: BusinessWithScore[] = await Promise.all(
      businesses.map(async business => {
        const placeId = business.place_id!;
        const attributes = attributesMap.get(placeId)!;
        const googleRating = business.rating;
        const winksScore = undefined; // TODO: Get from Winks data if available

        const score = this.calculateRelevanceScoreWithCache(
          placeId,
          attributes,
          googleRating,
          winksScore,
          preferences,
          preferencesHash,
          business.name || ''
        );

        return {
          business,
          attributes,
          score,
          googleRating,
          winksScore,
        };
      })
    );

    const scoringTime = performance.now() - scoringStart;

    // Step 3: Sort businesses
    const sortingStart = performance.now();
    const { sorted } = sortBusinessesWithFallback(businessesWithScores, preferences);
    const sortingTime = performance.now() - sortingStart;

    const totalTime = performance.now() - startTime;

    // Calculate cache hit rate
    const cacheStats = cacheService.getAllStats();
    const totalHits = cacheStats.attributes.hits + cacheStats.scores.hits;
    const totalRequests = totalHits + cacheStats.attributes.misses + cacheStats.scores.misses;
    const cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    const metrics: PerformanceMetrics = {
      totalTime,
      attributeFetchTime,
      scoringTime,
      sortingTime,
      cacheHitRate,
      businessesProcessed: businesses.length,
    };

    // Store metrics for monitoring
    this.addMetrics(metrics);

    return {
      businessesWithScores: sorted,
      metrics,
    };
  }

  /**
   * Lazy load business attributes for non-critical data
   * Returns immediately with cached/basic data, fetches full data in background
   */
  async lazyLoadBusinessAttributes(
    placeId: string,
    place: google.maps.places.PlaceResult,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<BusinessAttributes> {
    // Check cache first
    const cached = cacheService.getBusinessAttributes(placeId);
    if (cached) {
      return cached;
    }

    // Return inferred attributes immediately
    const inferred = businessAttributesService.inferAttributesFromGooglePlaces(
      place,
      userLocation
    );

    // Fetch from Firestore in background
    businessAttributesService
      .loadBusinessAttributes(placeId)
      .then(stored => {
        if (stored) {
          cacheService.setBusinessAttributes(placeId, stored);
        } else {
          // Save inferred attributes to Firestore
          businessAttributesService.saveBusinessAttributes(placeId, inferred);
        }
      })
      .catch(error => {
        console.warn(`Background fetch failed for ${placeId}:`, error);
      });

    return inferred;
  }

  /**
   * Invalidate cache when preferences change
   */
  invalidateCacheForPreferences(preferences: DiningPreferences): void {
    const preferencesHash = generatePreferencesHash(preferences);
    cacheService.invalidateScoresByPreferences(preferencesHash);
  }

  /**
   * Add performance metrics
   */
  private addMetrics(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);

    // Keep only last N metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageTime: number;
    averageAttributeFetchTime: number;
    averageScoringTime: number;
    averageSortingTime: number;
    averageCacheHitRate: number;
    totalBusinessesProcessed: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageTime: 0,
        averageAttributeFetchTime: 0,
        averageScoringTime: 0,
        averageSortingTime: 0,
        averageCacheHitRate: 0,
        totalBusinessesProcessed: 0,
      };
    }

    const sum = this.performanceMetrics.reduce(
      (acc, m) => ({
        totalTime: acc.totalTime + m.totalTime,
        attributeFetchTime: acc.attributeFetchTime + m.attributeFetchTime,
        scoringTime: acc.scoringTime + m.scoringTime,
        sortingTime: acc.sortingTime + m.sortingTime,
        cacheHitRate: acc.cacheHitRate + m.cacheHitRate,
        businessesProcessed: acc.businessesProcessed + m.businessesProcessed,
      }),
      {
        totalTime: 0,
        attributeFetchTime: 0,
        scoringTime: 0,
        sortingTime: 0,
        cacheHitRate: 0,
        businessesProcessed: 0,
      }
    );

    const count = this.performanceMetrics.length;

    return {
      averageTime: sum.totalTime / count,
      averageAttributeFetchTime: sum.attributeFetchTime / count,
      averageScoringTime: sum.scoringTime / count,
      averageSortingTime: sum.sortingTime / count,
      averageCacheHitRate: sum.cacheHitRate / count,
      totalBusinessesProcessed: sum.businessesProcessed,
    };
  }

  /**
   * Clear all performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getAllStats();
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheService.clearAll();
  }
}

// Export singleton instance
export const prioritizationWithCacheService = PrioritizationWithCacheService.getInstance();
