/**
 * Example: Using Optimized Prioritization Service
 * 
 * This example demonstrates how to use the optimized prioritization service
 * with caching, batching, and performance monitoring.
 */

import React, { useState, useEffect } from 'react';
import { optimizedPrioritizationService } from '../services/optimizedPrioritization.service';
import { DiningPreferences } from '../types/preferences';
import { BusinessWithScore } from '../services/prioritization.service';
import { PerformanceMonitor } from '../components/debug/PerformanceMonitor';

export function OptimizedPrioritizationExample() {
  const [businesses, setBusinesses] = useState<google.maps.places.PlaceResult[]>([]);
  const [sortedBusinesses, setSortedBusinesses] = useState<BusinessWithScore[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState<number>(0);

  // Example preferences
  const preferences: DiningPreferences = {
    cuisines: {
      preferred: ['italian', 'mexican'],
      disliked: ['seafood'],
      importance: 'high',
    },
    priceRange: {
      min: 2,
      max: 3,
      importance: 'medium',
    },
    dietary: {
      restrictions: ['vegetarian'],
      importance: 'high',
    },
    ambiance: {
      preferred: ['casual', 'family-friendly'],
      importance: 'medium',
    },
    distance: {
      maxDistance: 5,
      importance: 'medium',
    },
    rating: {
      minRating: 4.0,
      minWinksScore: null,
      importance: 'medium',
    },
    features: {
      preferred: ['outdoor-seating', 'parking'],
      importance: 'low',
    },
    learningData: {
      viewedBusinesses: [],
      savedBusinesses: [],
      ratedBusinesses: [],
    },
  };

  /**
   * Process businesses with optimized service
   */
  const processBusinesses = async () => {
    if (businesses.length === 0) {
      console.warn('No businesses to process');
      return;
    }

    setIsProcessing(true);

    try {
      const userLocation = {
        latitude: 37.7749,
        longitude: -122.4194,
      };

      const result = await optimizedPrioritizationService.processBusinessesOptimized(
        businesses,
        preferences,
        userLocation
      );

      setSortedBusinesses(result.businessesWithScores);
      setProcessingTime(result.metrics.totalTime);

      console.log('Processing complete:', {
        businessesProcessed: result.metrics.businessesProcessed,
        totalTime: result.metrics.totalTime,
        cacheHitRate: result.metrics.cacheHitRate,
        averageTimePerBusiness: result.metrics.averageTimePerBusiness,
      });
    } catch (error) {
      console.error('Error processing businesses:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get performance statistics
   */
  const getPerformanceStats = () => {
    const stats = optimizedPrioritizationService.getPerformanceStats();
    console.log('Performance Statistics:', stats);
  };

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    const stats = optimizedPrioritizationService.getCacheStats();
    console.log('Cache Statistics:', stats);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Optimized Prioritization Example</h1>
        
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={processBusinesses}
              disabled={isProcessing || businesses.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {isProcessing ? 'Processing...' : 'Process Businesses'}
            </button>
            <button
              onClick={getPerformanceStats}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Get Performance Stats
            </button>
            <button
              onClick={getCacheStats}
              className="px-4 py-2 bg-purple-500 text-white rounded"
            >
              Get Cache Stats
            </button>
          </div>

          {/* Processing Time */}
          {processingTime > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-semibold">Processing Time: {processingTime.toFixed(2)}ms</p>
              <p className="text-sm text-gray-600">
                Processed {sortedBusinesses.length} businesses
              </p>
            </div>
          )}

          {/* Results */}
          {sortedBusinesses.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Sorted Results</h2>
              <div className="space-y-2">
                {sortedBusinesses.slice(0, 10).map((item, index) => (
                  <div
                    key={item.business.place_id}
                    className="p-3 border rounded bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          {index + 1}. {item.business.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Score: {item.score.totalScore.toFixed(1)} | 
                          Rating: {item.googleRating || 'N/A'} | 
                          Distance: {item.attributes.distanceFromUser?.toFixed(2) || 'N/A'} mi
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-green-600">
                          Matched: {item.score.matchedPreferences.join(', ')}
                        </p>
                        {item.score.unmatchedPreferences.length > 0 && (
                          <p className="text-red-600">
                            Unmatched: {item.score.unmatchedPreferences.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Monitor */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Monitor</h2>
        <PerformanceMonitor />
      </div>

      {/* Usage Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-2">Usage Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Load businesses from Google Places API</li>
          <li>Click "Process Businesses" to sort with optimized algorithm</li>
          <li>View performance metrics in real-time</li>
          <li>Check cache statistics to see hit rates</li>
          <li>Monitor memory usage and processing times</li>
        </ol>
      </div>

      {/* Key Features */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded">
        <h3 className="font-semibold mb-2">Key Optimizations:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Batch fetching of business attributes (reduces Firestore reads)</li>
          <li>Parallel score calculations (processes multiple businesses simultaneously)</li>
          <li>Multi-level caching (attributes, scores, and batch results)</li>
          <li>Lazy loading for non-critical data</li>
          <li>Performance monitoring and metrics tracking</li>
          <li>Automatic cache invalidation on preference changes</li>
          <li>Memory-efficient cache management with TTL</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Integration Example for ExplorePage
 * 
 * Replace the existing prioritization logic in ExplorePage with:
 */
export const ExplorePageIntegrationExample = `
import { optimizedPrioritizationService } from '../services/optimizedPrioritization.service';

// In your ExplorePage component:
const sortBusinesses = async (businesses: google.maps.places.PlaceResult[]) => {
  if (!preferences.dining) return businesses;

  try {
    const result = await optimizedPrioritizationService.processBusinessesOptimized(
      businesses,
      preferences.dining,
      userLocation
    );

    // Log performance metrics (optional)
    console.log('Prioritization metrics:', result.metrics);

    return result.businessesWithScores.map(item => item.business);
  } catch (error) {
    console.error('Error sorting businesses:', error);
    return businesses;
  }
};
`;

/**
 * Cache Invalidation Example
 * 
 * When preferences change, invalidate cached scores:
 */
export const CacheInvalidationExample = `
import { cacheService, generatePreferencesHash } from '../services/cache.service';

// When preferences are updated:
const updatePreferences = (newPreferences: DiningPreferences) => {
  // Save preferences
  savePreferences(newPreferences);

  // Invalidate cached scores for old preferences
  const oldHash = generatePreferencesHash(oldPreferences);
  cacheService.invalidateScoresByPreferences(oldHash);
};
`;
