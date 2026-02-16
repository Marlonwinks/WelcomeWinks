import { BusinessAttributes, RelevanceScore } from '../types/businessAttributes';

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Generic cache manager with TTL support
 */
class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttl: number, maxSize: number = 1000) {
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, customTtl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiry = Date.now() + (customTtl || this.ttl);
    this.cache.set(key, { data, expiry });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Cache Service
 * Centralized caching for business attributes and relevance scores
 */
export class CacheService {
  private static instance: CacheService;

  // Business attributes cache (1 hour TTL)
  private attributesCache: CacheManager<BusinessAttributes>;

  // Relevance scores cache (session-based, 30 minutes TTL)
  private scoresCache: CacheManager<RelevanceScore>;

  // Batch operations cache (5 minutes TTL)
  private batchCache: CacheManager<Map<string, BusinessAttributes>>;

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize caches with different TTLs
    this.attributesCache = new CacheManager<BusinessAttributes>(
      1000 * 60 * 60, // 1 hour
      1000 // max 1000 entries
    );

    this.scoresCache = new CacheManager<RelevanceScore>(
      1000 * 60 * 30, // 30 minutes
      500 // max 500 entries
    );

    this.batchCache = new CacheManager<Map<string, BusinessAttributes>>(
      1000 * 60 * 5, // 5 minutes
      50 // max 50 batch results
    );

    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ==================== Business Attributes Cache ====================

  /**
   * Get business attributes from cache
   */
  getBusinessAttributes(placeId: string): BusinessAttributes | null {
    return this.attributesCache.get(placeId);
  }

  /**
   * Set business attributes in cache
   */
  setBusinessAttributes(placeId: string, attributes: BusinessAttributes): void {
    this.attributesCache.set(placeId, attributes);
  }

  /**
   * Check if business attributes are cached
   */
  hasBusinessAttributes(placeId: string): boolean {
    return this.attributesCache.has(placeId);
  }

  /**
   * Delete business attributes from cache
   */
  deleteBusinessAttributes(placeId: string): void {
    this.attributesCache.delete(placeId);
  }

  // ==================== Relevance Scores Cache ====================

  /**
   * Generate cache key for relevance score
   * Includes placeId and preference hash for invalidation
   */
  private generateScoreKey(placeId: string, preferencesHash: string): string {
    return `${placeId}:${preferencesHash}`;
  }

  /**
   * Get relevance score from cache
   */
  getRelevanceScore(placeId: string, preferencesHash: string): RelevanceScore | null {
    const key = this.generateScoreKey(placeId, preferencesHash);
    return this.scoresCache.get(key);
  }

  /**
   * Set relevance score in cache
   */
  setRelevanceScore(
    placeId: string,
    preferencesHash: string,
    score: RelevanceScore
  ): void {
    const key = this.generateScoreKey(placeId, preferencesHash);
    this.scoresCache.set(key, score);
  }

  /**
   * Check if relevance score is cached
   */
  hasRelevanceScore(placeId: string, preferencesHash: string): boolean {
    const key = this.generateScoreKey(placeId, preferencesHash);
    return this.scoresCache.has(key);
  }

  /**
   * Delete relevance score from cache
   */
  deleteRelevanceScore(placeId: string, preferencesHash: string): void {
    const key = this.generateScoreKey(placeId, preferencesHash);
    this.scoresCache.delete(key);
  }

  /**
   * Invalidate all relevance scores for a specific preferences hash
   * Useful when preferences change
   */
  invalidateScoresByPreferences(preferencesHash: string): void {
    const keys = this.scoresCache.keys();
    keys.forEach(key => {
      if (key.endsWith(`:${preferencesHash}`)) {
        this.scoresCache.delete(key);
      }
    });
  }

  // ==================== Batch Cache ====================

  /**
   * Get batch results from cache
   */
  getBatchResults(batchKey: string): Map<string, BusinessAttributes> | null {
    return this.batchCache.get(batchKey);
  }

  /**
   * Set batch results in cache
   */
  setBatchResults(batchKey: string, results: Map<string, BusinessAttributes>): void {
    this.batchCache.set(batchKey, results);
  }

  /**
   * Generate batch key from place IDs
   */
  generateBatchKey(placeIds: string[]): string {
    return placeIds.sort().join(',');
  }

  // ==================== Cache Management ====================

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.attributesCache.clear();
    this.scoresCache.clear();
    this.batchCache.clear();
  }

  /**
   * Clear specific cache type
   */
  clearCache(type: 'attributes' | 'scores' | 'batch'): void {
    switch (type) {
      case 'attributes':
        this.attributesCache.clear();
        break;
      case 'scores':
        this.scoresCache.clear();
        break;
      case 'batch':
        this.batchCache.clear();
        break;
    }
  }

  /**
   * Get cache statistics for all caches
   */
  getAllStats(): {
    attributes: CacheStats;
    scores: CacheStats;
    batch: CacheStats;
  } {
    return {
      attributes: this.attributesCache.getStats(),
      scores: this.scoresCache.getStats(),
      batch: this.batchCache.getStats(),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.attributesCache.cleanup();
      this.scoresCache.cleanup();
      this.batchCache.cleanup();
    }, 1000 * 60 * 5);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get total memory usage estimate (in bytes)
   */
  getMemoryUsage(): number {
    // Rough estimate: each cache entry is ~1KB
    const attributesSize = this.attributesCache.size() * 1024;
    const scoresSize = this.scoresCache.size() * 512;
    const batchSize = this.batchCache.size() * 10240; // Batches are larger

    return attributesSize + scoresSize + batchSize;
  }
}

/**
 * Utility function to generate a hash from preferences
 * Used for cache key generation
 */
export function generatePreferencesHash(preferences: any): string {
  // Simple hash function for preferences object
  const str = JSON.stringify(preferences);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
