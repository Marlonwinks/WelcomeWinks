import { useState, useEffect, useCallback } from 'react';
import { optimizedPrioritizationService } from '../services/optimizedPrioritization.service';
import { cacheService } from '../services/cache.service';

/**
 * Performance monitoring data
 */
export interface PerformanceData {
  recentMetrics: {
    totalTime: number;
    batchFetchTime: number;
    parallelScoringTime: number;
    sortingTime: number;
    cacheHitRate: number;
    businessesProcessed: number;
    averageTimePerBusiness: number;
  } | null;
  averageMetrics: {
    totalTime: number;
    batchFetchTime: number;
    parallelScoringTime: number;
    sortingTime: number;
    cacheHitRate: number;
    averageTimePerBusiness: number;
  };
  totalStats: {
    businessesProcessed: number;
    batchesProcessed: number;
  };
  cacheStats: {
    attributes: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    scores: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    batch: {
      size: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
  memoryUsage: number;
}

/**
 * Hook for monitoring prioritization performance
 */
export function usePerformanceMonitoring() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  /**
   * Refresh performance data
   */
  const refreshData = useCallback(() => {
    const stats = optimizedPrioritizationService.getPerformanceStats();
    const cacheStats = cacheService.getAllStats();
    const memoryUsage = cacheService.getMemoryUsage();

    setPerformanceData({
      recentMetrics: stats.recent,
      averageMetrics: stats.average,
      totalStats: stats.total,
      cacheStats,
      memoryUsage,
    });
  }, []);

  /**
   * Start monitoring (auto-refresh every 5 seconds)
   */
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    refreshData();
  }, [refreshData]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  /**
   * Clear all metrics
   */
  const clearMetrics = useCallback(() => {
    optimizedPrioritizationService.clearMetrics();
    refreshData();
  }, [refreshData]);

  /**
   * Clear all caches
   */
  const clearCaches = useCallback(() => {
    cacheService.clearAll();
    refreshData();
  }, [refreshData]);

  /**
   * Auto-refresh when monitoring is enabled
   */
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [isMonitoring, refreshData]);

  return {
    performanceData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshData,
    clearMetrics,
    clearCaches,
  };
}

/**
 * Format time in milliseconds to readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format bytes to readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
