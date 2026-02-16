import { DiningPreferences } from '../types/preferences';
import { BusinessAttributes, RelevanceScore } from '../types/businessAttributes';
import {
  calculateCuisineScore,
  calculatePriceScore,
  calculateDietaryScore,
  calculateAmbianceScore,
  calculateDistanceScore,
  calculateRatingScore,
  calculateFeaturesScore,
  calculateTimeScore,
  calculateNicheScore,
  BusinessWithScore,
} from './prioritization.service';
import { cacheService, generatePreferencesHash } from './cache.service';
import { businessAttributesService } from './businessAttributes.service';
import { DEFAULT_CATEGORY_WEIGHTS, IMPORTANCE_MULTIPLIERS } from '../types/preferences';

/**
 * Batch configuration
 */
const BATCH_SIZE = 20; // Process businesses in batches of 20
const PARALLEL_LIMIT = 5; // Max parallel operations

/**
 * Performance monitoring
 */
export interface DetailedPerformanceMetrics {
  totalTime: number;
  batchFetchTime: number;
  parallelScoringTime: number;
  sortingTime: number;
  cacheHitRate: number;
  businessesProcessed: number;
  batchesProcessed: number;
  averageTimePerBusiness: number;
  timestamp: number;
}

/**
 * Optimized Prioritization Service
 * Implements batching, parallelization, lazy loading, and performance monitoring
 */
export class OptimizedPrioritizationService {
  private static instance: OptimizedPrioritizationService;
  private metricsHistory: DetailedPerformanceMetrics[] = [];
  private readonly MAX_METRICS = 50;

  public static getInstance(): OptimizedPrioritizationService {
    if (!OptimizedPrioritizationService.instance) {
      OptimizedPrioritizationService.instance = new OptimizedPrioritizationService();
    }
    return OptimizedPrioritizationService.instance;
  }

  /**
   * Optimized batch processing with parallel execution
   */
  async processBusinessesOptimized(
    businesses: google.maps.places.PlaceResult[],
    preferences: DiningPreferences,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<{
    businessesWithScores: BusinessWithScore[];
    metrics: DetailedPerformanceMetrics;
  }> {
    const startTime = performance.now();
    const preferencesHash = generatePreferencesHash(preferences);

    // Step 1: Batch fetch all attributes in parallel
    const batchFetchStart = performance.now();
    const businessesWithAttributes = await this.batchFetchAttributes(
      businesses,
      userLocation
    );
    const batchFetchTime = performance.now() - batchFetchStart;

    // Step 2: Parallel score calculation with batching
    const scoringStart = performance.now();
    const businessesWithScores = await this.parallelScoreCalculation(
      businessesWithAttributes,
      preferences,
      preferencesHash
    );
    const parallelScoringTime = performance.now() - scoringStart;

    // Step 3: Optimized sorting
    const sortingStart = performance.now();
    const sorted = this.optimizedSort(businessesWithScores, preferences);
    const sortingTime = performance.now() - sortingStart;

    const totalTime = performance.now() - startTime;

    // Calculate metrics
    const cacheStats = cacheService.getAllStats();
    const metrics: DetailedPerformanceMetrics = {
      totalTime,
      batchFetchTime,
      parallelScoringTime,
      sortingTime,
      cacheHitRate: cacheStats.attributes.hitRate,
      businessesProcessed: businesses.length,
      batchesProcessed: Math.ceil(businesses.length / BATCH_SIZE),
      averageTimePerBusiness: totalTime / businesses.length,
      timestamp: Date.now(),
    };

    this.recordMetrics(metrics);

    return {
      businessesWithScores: sorted,
      metrics,
    };
  }

  /**
   * Batch fetch attributes with parallel processing
   */
  private async batchFetchAttributes(
    businesses: google.maps.places.PlaceResult[],
    userLocation?: { latitude: number; longitude: number }
  ): Promise<
    Array<{
      business: google.maps.places.PlaceResult;
      attributes: BusinessAttributes;
    }>
  > {
    const placeIds = businesses
      .map(b => b.place_id)
      .filter((id): id is string => id !== undefined);

    // Batch load from cache/Firestore
    const attributesMap = await businessAttributesService.batchLoadBusinessAttributes(placeIds);

    // Identify businesses that need attribute inference
    const needsInference = businesses.filter(
      b => b.place_id && !attributesMap.has(b.place_id)
    );

    // Process inference in parallel batches
    if (needsInference.length > 0) {
      const batches = this.createBatches(needsInference, BATCH_SIZE);

      for (const batch of batches) {
        // Process each batch in parallel
        const inferredBatch = await Promise.all(
          batch.map(async business => {
            const placeId = business.place_id!;
            const attributes = businessAttributesService.inferAttributesFromGooglePlaces(
              business,
              userLocation
            );
            return { placeId, attributes };
          })
        );

        // Add to map and cache
        inferredBatch.forEach(({ placeId, attributes }) => {
          attributesMap.set(placeId, attributes);
          cacheService.setBusinessAttributes(placeId, attributes);
        });

        // Batch save to Firestore (fire and forget)
        const saveMap = new Map(inferredBatch.map(({ placeId, attributes }) => [placeId, attributes]));
        businessAttributesService.batchSaveBusinessAttributes(saveMap).catch(error => {
          console.warn('Batch save failed:', error);
        });
      }
    }

    // Combine businesses with their attributes
    return businesses.map(business => ({
      business,
      attributes: attributesMap.get(business.place_id!)!,
    }));
  }

  /**
   * Parallel score calculation with batching
   */
  private async parallelScoreCalculation(
    businessesWithAttributes: Array<{
      business: google.maps.places.PlaceResult;
      attributes: BusinessAttributes;
    }>,
    preferences: DiningPreferences,
    preferencesHash: string
  ): Promise<BusinessWithScore[]> {
    // Create batches for parallel processing
    const batches = this.createBatches(businessesWithAttributes, BATCH_SIZE);
    const results: BusinessWithScore[] = [];

    // Process batches with limited parallelism
    for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
      const parallelBatches = batches.slice(i, i + PARALLEL_LIMIT);

      const batchResults = await Promise.all(
        parallelBatches.map(batch =>
          this.processBatch(batch, preferences, preferencesHash)
        )
      );

      results.push(...batchResults.flat());
    }

    return results;
  }

  /**
   * Process a single batch of businesses
   */
  private async processBatch(
    batch: Array<{
      business: google.maps.places.PlaceResult;
      attributes: BusinessAttributes;
    }>,
    preferences: DiningPreferences,
    preferencesHash: string
  ): Promise<BusinessWithScore[]> {
    return Promise.all(
      batch.map(async ({ business, attributes }) => {
        const placeId = business.place_id!;
        const googleRating = business.rating;
        const winksScore = undefined; // TODO: Get from Winks data

        // Check cache first
        let score = cacheService.getRelevanceScore(placeId, preferencesHash);

        if (!score) {
          // Calculate score using optimized function
          score = this.calculateScoreOptimized(
            placeId,
            attributes,
            googleRating,
            winksScore,
            preferences,
            business.name || ''
          );

          // Cache the result
          cacheService.setRelevanceScore(placeId, preferencesHash, score);
        }

        return {
          business,
          attributes,
          score,
          googleRating,
          winksScore,
        };
      })
    );
  }

  /**
   * Optimized score calculation
   * Reduces redundant calculations and uses early returns
   */
  private calculateScoreOptimized(
    placeId: string,
    attributes: BusinessAttributes,
    googleRating: number | undefined,
    winksScore: number | undefined,
    preferences: DiningPreferences,
    businessName: string = ''
  ): RelevanceScore {
    // Calculate individual scores (these are already optimized in the base service)
    const cuisineScore = calculateCuisineScore(attributes.cuisineTypes, preferences.cuisines);
    const priceScore = calculatePriceScore(attributes.priceLevel, preferences.priceRange);
    const dietaryScore = calculateDietaryScore(attributes.dietaryOptions, preferences.dietary);
    const ambianceScore = calculateAmbianceScore(attributes.ambianceTags, preferences.ambiance);
    const distanceScore = calculateDistanceScore(attributes.distanceFromUser, preferences.distance);
    const ratingScore = calculateRatingScore(googleRating, winksScore, preferences);
    const featuresScore = calculateFeaturesScore(attributes.features, preferences.features);

    // New Scores
    const timeScore = calculateTimeScore(attributes.rawTypes || attributes.cuisineTypes);
    const nicheScore = calculateNicheScore(attributes.ratingCount, attributes.rawTypes || attributes.cuisineTypes, businessName);

    // Pre-calculate importance multipliers
    const cuisineMultiplier = IMPORTANCE_MULTIPLIERS[preferences.cuisines.importance] || 1.0;
    const priceMultiplier = IMPORTANCE_MULTIPLIERS[preferences.priceRange.importance] || 1.0;
    const dietaryMultiplier = IMPORTANCE_MULTIPLIERS[preferences.dietary.importance] || 1.0;
    const ambianceMultiplier = IMPORTANCE_MULTIPLIERS[preferences.ambiance.importance] || 1.0;
    const distanceMultiplier = IMPORTANCE_MULTIPLIERS[preferences.distance.importance] || 1.0;
    const ratingMultiplier = IMPORTANCE_MULTIPLIERS[preferences.rating.importance] || 1.0;
    const featuresMultiplier = IMPORTANCE_MULTIPLIERS[preferences.features.importance] || 1.0;

    // Calculate weighted scores
    const weightedBaseScore =
      (cuisineScore * DEFAULT_CATEGORY_WEIGHTS.cuisine * cuisineMultiplier) / 100 +
      (priceScore * DEFAULT_CATEGORY_WEIGHTS.price * priceMultiplier) / 100 +
      (dietaryScore * DEFAULT_CATEGORY_WEIGHTS.dietary * dietaryMultiplier) / 100 +
      (ambianceScore * DEFAULT_CATEGORY_WEIGHTS.ambiance * ambianceMultiplier) / 100 +
      (distanceScore * DEFAULT_CATEGORY_WEIGHTS.distance * distanceMultiplier) / 100 +
      (featuresScore * DEFAULT_CATEGORY_WEIGHTS.features * featuresMultiplier) / 100;

    // Rating Multiplier (0.7 to 1.3)
    const ratingQualityMultiplier = 0.7 + (ratingScore * DEFAULT_CATEGORY_WEIGHTS.rating * ratingMultiplier / 100) * 0.6 / 100;
    // Wait, previous logic was: ratingScore * weight * multiplier.  
    // Base logic was: preferenceMatchScore + rating * weight.
    // Let's stick closer to the base implementation I just wrote:
    // Base: preferenceMatchScore * ratingMultiplier (where ratingMultiplier is 0.7 + (rating/100)*0.6)
    // But here `ratingScore` is just another component? 
    // In `prioritization.service.ts` original code (before my change):
    /*
      const weightedRatingScore = ...
      preferenceMatchScore = ...
      ratingMultiplier = 0.7 + (ratingScore / 100) * 0.6
      total = preferenceMatchScore * ratingMultiplier
    */
    // Here `ratingScore` uses WEIGHT. Hmm.
    // Let's adapt so it matches `prioritization.service.ts` updated logic.

    // Calculate preference match score (without ratings)
    // We already calculated `weightedBaseScore` BUT it includes features.
    // The original `optimized` code included `ratingScore` in the sum:
    /*
      const totalScore = ... + (ratingScore * DEFAULT_CATEGORY_WEIGHTS.rating * ratingMultiplier) / 100 ...
    */
    // This logic DIFFERS from `prioritization.service.ts`.
    // I should make them consistent. The `prioritization.service.ts` logic I wrote (Step 602) was:
    // `totalScore = preferenceMatchScore * ratingMultiplier * timeMultiplier * nicheMultiplier`
    // where `preferenceMatchScore` did NOT include rating.

    // Let's upgrade this `optimized` one to match that logic.
    const preferenceMatchScore =
      (cuisineScore * DEFAULT_CATEGORY_WEIGHTS.cuisine * cuisineMultiplier) / 100 +
      (priceScore * DEFAULT_CATEGORY_WEIGHTS.price * priceMultiplier) / 100 +
      (dietaryScore * DEFAULT_CATEGORY_WEIGHTS.dietary * dietaryMultiplier) / 100 +
      (ambianceScore * DEFAULT_CATEGORY_WEIGHTS.ambiance * ambianceMultiplier) / 100 +
      (distanceScore * DEFAULT_CATEGORY_WEIGHTS.distance * distanceMultiplier) / 100 +
      (featuresScore * DEFAULT_CATEGORY_WEIGHTS.features * featuresMultiplier) / 100;

    const baseRatingMultiplier = 0.7 + (ratingScore / 100) * 0.6;
    const timeBaseMultiplier = 0.2 + (timeScore / 100) * 0.8;
    const nicheBaseMultiplier = 0.5 + (nicheScore / 100) * 0.5;

    const totalScore = preferenceMatchScore * baseRatingMultiplier * timeBaseMultiplier * nicheBaseMultiplier;

    // Determine matched/unmatched preferences (optimized with early returns)
    const matchedPreferences: string[] = [];
    const unmatchedPreferences: string[] = [];
    const threshold = 60;

    if (cuisineScore >= threshold) matchedPreferences.push('cuisine');
    else if (preferences.cuisines.preferred.length > 0) unmatchedPreferences.push('cuisine');

    if (priceScore >= threshold) matchedPreferences.push('price');
    else if (preferences.priceRange.min > 1 || preferences.priceRange.max < 4)
      unmatchedPreferences.push('price');

    if (dietaryScore >= threshold) matchedPreferences.push('dietary');
    else if (preferences.dietary.restrictions.length > 0) unmatchedPreferences.push('dietary');

    if (ambianceScore >= threshold) matchedPreferences.push('ambiance');
    else if (preferences.ambiance.preferred.length > 0) unmatchedPreferences.push('ambiance');

    if (distanceScore >= threshold) matchedPreferences.push('distance');
    else if (preferences.distance.maxDistance < 10) unmatchedPreferences.push('distance');

    if (ratingScore >= threshold) matchedPreferences.push('rating');
    else if (preferences.rating.minRating > 0 || preferences.rating.minWinksScore !== null)
      unmatchedPreferences.push('rating');

    if (featuresScore >= threshold) matchedPreferences.push('features');
    else if (preferences.features.preferred.length > 0) unmatchedPreferences.push('features');

    return {
      businessId: placeId,
      totalScore: Math.min(100, Math.max(0, totalScore)),
      breakdown: {
        cuisineScore,
        priceScore,
        dietaryScore,
        ambianceScore,
        distanceScore,
        ratingScore,
        featuresScore,
        timeScore,
        nicheScore
      },
      matchedPreferences,
      unmatchedPreferences,
    };
  }

  /**
   * Optimized sorting using native sort with pre-calculated scores
   */
  private optimizedSort(
    businesses: BusinessWithScore[],
    preferences: DiningPreferences
  ): BusinessWithScore[] {
    // Use native sort which is highly optimized
    return businesses.sort((a, b) => {
      // Primary sort: relevance score (descending)
      const scoreDiff = b.score.totalScore - a.score.totalScore;
      if (scoreDiff !== 0) return scoreDiff;

      // Secondary sort: rating (descending)
      const ratingA = a.googleRating || 0;
      const ratingB = b.googleRating || 0;
      const ratingDiff = ratingB - ratingA;
      if (ratingDiff !== 0) return ratingDiff;

      // Tertiary sort: distance (ascending)
      const distanceA = a.attributes.distanceFromUser || Infinity;
      const distanceB = b.attributes.distanceFromUser || Infinity;
      return distanceA - distanceB;
    });
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: DetailedPerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Keep only recent metrics
    if (this.metricsHistory.length > this.MAX_METRICS) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    recent: DetailedPerformanceMetrics | null;
    average: {
      totalTime: number;
      batchFetchTime: number;
      parallelScoringTime: number;
      sortingTime: number;
      cacheHitRate: number;
      averageTimePerBusiness: number;
    };
    total: {
      businessesProcessed: number;
      batchesProcessed: number;
    };
  } {
    if (this.metricsHistory.length === 0) {
      return {
        recent: null,
        average: {
          totalTime: 0,
          batchFetchTime: 0,
          parallelScoringTime: 0,
          sortingTime: 0,
          cacheHitRate: 0,
          averageTimePerBusiness: 0,
        },
        total: {
          businessesProcessed: 0,
          batchesProcessed: 0,
        },
      };
    }

    const recent = this.metricsHistory[this.metricsHistory.length - 1];

    const sum = this.metricsHistory.reduce(
      (acc, m) => ({
        totalTime: acc.totalTime + m.totalTime,
        batchFetchTime: acc.batchFetchTime + m.batchFetchTime,
        parallelScoringTime: acc.parallelScoringTime + m.parallelScoringTime,
        sortingTime: acc.sortingTime + m.sortingTime,
        cacheHitRate: acc.cacheHitRate + m.cacheHitRate,
        averageTimePerBusiness: acc.averageTimePerBusiness + m.averageTimePerBusiness,
        businessesProcessed: acc.businessesProcessed + m.businessesProcessed,
        batchesProcessed: acc.batchesProcessed + m.batchesProcessed,
      }),
      {
        totalTime: 0,
        batchFetchTime: 0,
        parallelScoringTime: 0,
        sortingTime: 0,
        cacheHitRate: 0,
        averageTimePerBusiness: 0,
        businessesProcessed: 0,
        batchesProcessed: 0,
      }
    );

    const count = this.metricsHistory.length;

    return {
      recent,
      average: {
        totalTime: sum.totalTime / count,
        batchFetchTime: sum.batchFetchTime / count,
        parallelScoringTime: sum.parallelScoringTime / count,
        sortingTime: sum.sortingTime / count,
        cacheHitRate: sum.cacheHitRate / count,
        averageTimePerBusiness: sum.averageTimePerBusiness / count,
      },
      total: {
        businessesProcessed: sum.businessesProcessed,
        batchesProcessed: sum.batchesProcessed,
      },
    };
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metricsHistory = [];
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getAllStats();
  }
}

// Export singleton instance
export const optimizedPrioritizationService = OptimizedPrioritizationService.getInstance();
