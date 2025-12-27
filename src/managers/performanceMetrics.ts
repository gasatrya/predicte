/**
 * Performance Metrics Manager
 *
 * Tracks and reports extension performance metrics for production monitoring.
 * Provides insights into latency, success rates, cache performance, and error patterns.
 *
 * Metrics tracked:
 * - Latency percentiles (P50, P90, P95, P99)
 * - Success/failure rates
 * - Error type breakdown
 * - Cache hit/miss rates
 * - Request type distribution (streaming vs non-streaming)
 *
 * For public release, this helps users understand extension performance
 * and provides data for troubleshooting.
 */

import { Logger } from '../utils/logger';

/**
 * Performance metrics data structure
 */
interface PerformanceMetrics {
  // Latency tracking (in milliseconds)
  latencies: number[];

  // Success/failure tracking
  successCount: number;
  failureCount: number;

  // Error breakdown
  errorTypes: Map<string, number>;

  // Cache tracking
  cacheHits: number;
  cacheMisses: number;

  // Request counting
  totalRequests: number;
  streamingRequests: number;
  nonStreamingRequests: number;
}

/**
 * Performance metrics summary for reporting
 */
export interface MetricsSummary {
  // Latency percentiles (in milliseconds)
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  avg: number;

  // Success metrics
  successRate: number;
  failureRate: number;

  // Error breakdown
  errorTypes: Record<string, number>;

  // Cache metrics
  cacheHitRate: number;
  cacheHitCount: number;
  cacheMissCount: number;

  // Request breakdown
  totalRequests: number;
  streamingRate: number;
  nonStreamingRate: number;
}

/**
 * Performance Monitor for tracking extension performance
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private logger: Logger;

  /**
   * Create a new PerformanceMonitor
   * @param logger Logger instance for debug output
   */
  constructor(logger: Logger) {
    this.logger = logger;
    this.metrics = {
      latencies: [],
      successCount: 0,
      failureCount: 0,
      errorTypes: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      streamingRequests: 0,
      nonStreamingRequests: 0,
    };

    this.logger.debug('PerformanceMonitor initialized');
  }

  /**
   * Record completion latency
   * @param latency Latency in milliseconds
   * @param isStreaming Whether this was a streaming request
   */
  recordLatency(latency: number, isStreaming: boolean): void {
    this.metrics.latencies.push(latency);
    this.metrics.totalRequests++;

    if (isStreaming) {
      this.metrics.streamingRequests++;
    } else {
      this.metrics.nonStreamingRequests++;
    }

    // Keep only last 1000 latency measurements to prevent memory bloat
    this.trimOldMetrics();

    this.logger.debug(
      `Recorded latency: ${latency}ms (streaming: ${isStreaming})`,
    );
  }

  /**
   * Record a successful completion
   */
  recordSuccess(): void {
    this.metrics.successCount++;
    this.logger.debug('Recorded success');
  }

  /**
   * Record a failed completion
   * @param errorType Type of error (e.g., 'NETWORK_ERROR', 'RATE_LIMIT', etc.)
   */
  recordFailure(errorType: string): void {
    this.metrics.failureCount++;
    const currentCount = this.metrics.errorTypes.get(errorType) ?? 0;
    this.metrics.errorTypes.set(errorType, currentCount + 1);

    this.logger.debug(`Recorded failure: ${errorType}`);
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.logger.debug('Recorded cache hit');
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
    this.logger.debug('Recorded cache miss');
  }

  /**
   * Get comprehensive metrics summary
   * @returns Metrics summary with calculated statistics
   */
  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      p50: this.getLatencyPercentile(50),
      p90: this.getLatencyPercentile(90),
      p95: this.getLatencyPercentile(95),
      p99: this.getLatencyPercentile(99),
      avg: this.getAverageLatency(),
      successRate: this.getSuccessRate(),
      failureRate: 1 - this.getSuccessRate(),
      errorTypes: Object.fromEntries(this.metrics.errorTypes),
      cacheHitRate: this.getCacheHitRate(),
      cacheHitCount: this.metrics.cacheHits,
      cacheMissCount: this.metrics.cacheMisses,
      totalRequests: this.metrics.totalRequests,
      streamingRate:
        this.metrics.totalRequests > 0
          ? this.metrics.streamingRequests / this.metrics.totalRequests
          : 0,
      nonStreamingRate:
        this.metrics.totalRequests > 0
          ? this.metrics.nonStreamingRequests / this.metrics.totalRequests
          : 0,
    };

    return summary;
  }

  /**
   * Calculate percentile for latency values
   * @param p Percentile value (0-100)
   * @returns Latency value at the given percentile
   */
  getLatencyPercentile(p: number): number {
    return this.calculatePercentile(this.metrics.latencies, p);
  }

  /**
   * Get average latency
   * @returns Average latency in milliseconds
   */
  getAverageLatency(): number {
    if (this.metrics.latencies.length === 0) {
      return 0;
    }

    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latencies.length;
  }

  /**
   * Get success rate
   * @returns Success rate as a decimal (0-1)
   */
  getSuccessRate(): number {
    const total = this.metrics.successCount + this.metrics.failureCount;
    if (total === 0) {
      return 1; // Default to 100% success if no requests yet
    }
    return this.metrics.successCount / total;
  }

  /**
   * Get cache hit rate
   * @returns Cache hit rate as a decimal (0-1)
   */
  getCacheHitRate(): number {
    const totalCacheOperations =
      this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheOperations === 0) {
      return 0;
    }
    return this.metrics.cacheHits / totalCacheOperations;
  }

  /**
   * Reset all metrics to zero
   */
  resetMetrics(): void {
    this.metrics = {
      latencies: [],
      successCount: 0,
      failureCount: 0,
      errorTypes: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      streamingRequests: 0,
      nonStreamingRequests: 0,
    };

    this.logger.debug('Performance metrics reset');
  }

  /**
   * Calculate percentile for an array of values
   * @param values Array of numeric values
   * @param p Percentile value (0-100)
   * @returns Value at the given percentile
   */
  private calculatePercentile(values: number[], p: number): number {
    if (values.length === 0) {
      return 0;
    }

    // Create a sorted copy of the values
    const sorted = [...values].sort((a, b) => a - b);

    // Calculate index for percentile
    const index = Math.ceil((p / 100) * sorted.length) - 1;

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1));

    return sorted[clampedIndex];
  }

  /**
   * Trim old metrics to prevent memory bloat
   * Keeps only the last 1000 latency measurements
   */
  private trimOldMetrics(): void {
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies = this.metrics.latencies.slice(-1000);
      this.logger.debug(
        `Trimmed latency measurements to ${this.metrics.latencies.length} entries`,
      );
    }
  }

  /**
   * Format metrics summary as a human-readable string
   * @returns Formatted metrics string
   */
  formatSummary(): string {
    const summary = this.getSummary();

    return `
Predicte Performance Metrics
============================

Latency (ms):
  - P50: ${summary.p50.toFixed(1)}
  - P90: ${summary.p90.toFixed(1)}
  - P95: ${summary.p95.toFixed(1)}
  - P99: ${summary.p99.toFixed(1)}
  - Average: ${summary.avg.toFixed(1)}

Success Rate: ${(summary.successRate * 100).toFixed(1)}%

Cache Performance:
  - Hit Rate: ${(summary.cacheHitRate * 100).toFixed(1)}%
  - Hits: ${summary.cacheHitCount}
  - Misses: ${summary.cacheMissCount}

Request Distribution:
  - Total Requests: ${summary.totalRequests}
  - Streaming: ${(summary.streamingRate * 100).toFixed(1)}%
  - Non-streaming: ${(summary.nonStreamingRate * 100).toFixed(1)}%

Error Breakdown:${
      Object.keys(summary.errorTypes).length > 0
        ? '\n' +
          Object.entries(summary.errorTypes)
            .map(([error, count]) => `  - ${error}: ${count}`)
            .join('\n')
        : ' None'
    }
    `.trim();
  }
}
