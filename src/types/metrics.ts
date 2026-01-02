/**
 * Metrics and cache types for Predicte extension
 */

/**
 * Performance metrics summary for reporting
 */
export interface MetricsSummary {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;
  successRate: number;
  failureRate: number;
  errorTypes: Record<string, number>;
  cacheHitRate: number;
  cacheHitCount: number;
  cacheMissCount: number;
  totalRequests: number;
  streamingRate: number;
  nonStreamingRate: number;
}

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}
