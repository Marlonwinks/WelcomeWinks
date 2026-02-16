import React from 'react';
import {
  usePerformanceMonitoring,
  formatTime,
  formatBytes,
  formatPercentage,
} from '../../hooks/usePerformanceMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

/**
 * Performance Monitor Component
 * Displays real-time performance metrics and cache statistics
 */
export function PerformanceMonitor() {
  const {
    performanceData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshData,
    clearMetrics,
    clearCaches,
  } = usePerformanceMonitoring();

  if (!performanceData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={startMonitoring}>Start Monitoring</Button>
        </CardContent>
      </Card>
    );
  }

  const { recentMetrics, averageMetrics, totalStats, cacheStats, memoryUsage } = performanceData;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Performance Monitor</span>
            <Badge variant={isMonitoring ? 'default' : 'secondary'}>
              {isMonitoring ? 'Monitoring' : 'Paused'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            {isMonitoring ? (
              <Button onClick={stopMonitoring} variant="outline">
                Stop Monitoring
              </Button>
            ) : (
              <Button onClick={startMonitoring}>Start Monitoring</Button>
            )}
            <Button onClick={refreshData} variant="outline">
              Refresh
            </Button>
            <Button onClick={clearMetrics} variant="outline">
              Clear Metrics
            </Button>
            <Button onClick={clearCaches} variant="destructive">
              Clear Caches
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Metrics */}
      {recentMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Operation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatTime(recentMetrics.totalTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Businesses Processed</p>
                <p className="text-2xl font-bold">{recentMetrics.businessesProcessed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Fetch Time</p>
                <p className="text-lg">{formatTime(recentMetrics.batchFetchTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scoring Time</p>
                <p className="text-lg">{formatTime(recentMetrics.parallelScoringTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sorting Time</p>
                <p className="text-lg">{formatTime(recentMetrics.sortingTime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Time/Business</p>
                <p className="text-lg">{formatTime(recentMetrics.averageTimePerBusiness)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <p className="text-lg">{formatPercentage(recentMetrics.cacheHitRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Average Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Average Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg Total Time</p>
              <p className="text-lg font-semibold">{formatTime(averageMetrics.totalTime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Cache Hit Rate</p>
              <p className="text-lg font-semibold">
                {formatPercentage(averageMetrics.cacheHitRate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Batch Fetch</p>
              <p className="text-lg">{formatTime(averageMetrics.batchFetchTime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Scoring</p>
              <p className="text-lg">{formatTime(averageMetrics.parallelScoringTime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Sorting</p>
              <p className="text-lg">{formatTime(averageMetrics.sortingTime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Time/Business</p>
              <p className="text-lg">{formatTime(averageMetrics.averageTimePerBusiness)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Total Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Businesses Processed</p>
              <p className="text-2xl font-bold">{totalStats.businessesProcessed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Batches Processed</p>
              <p className="text-2xl font-bold">{totalStats.batchesProcessed}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Attributes Cache */}
            <div>
              <h4 className="font-semibold mb-2">Business Attributes Cache</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{cacheStats.attributes.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hits</p>
                  <p className="font-medium">{cacheStats.attributes.hits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Misses</p>
                  <p className="font-medium">{cacheStats.attributes.misses}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hit Rate</p>
                  <p className="font-medium">{formatPercentage(cacheStats.attributes.hitRate)}</p>
                </div>
              </div>
            </div>

            {/* Scores Cache */}
            <div>
              <h4 className="font-semibold mb-2">Relevance Scores Cache</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{cacheStats.scores.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hits</p>
                  <p className="font-medium">{cacheStats.scores.hits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Misses</p>
                  <p className="font-medium">{cacheStats.scores.misses}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hit Rate</p>
                  <p className="font-medium">{formatPercentage(cacheStats.scores.hitRate)}</p>
                </div>
              </div>
            </div>

            {/* Batch Cache */}
            <div>
              <h4 className="font-semibold mb-2">Batch Results Cache</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{cacheStats.batch.size}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hits</p>
                  <p className="font-medium">{cacheStats.batch.hits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Misses</p>
                  <p className="font-medium">{cacheStats.batch.misses}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hit Rate</p>
                  <p className="font-medium">{formatPercentage(cacheStats.batch.hitRate)}</p>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div>
              <h4 className="font-semibold mb-2">Memory Usage</h4>
              <p className="text-2xl font-bold">{formatBytes(memoryUsage)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
