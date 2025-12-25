/**
 * Cache Manager
 *
 * This module implements an LRU (Least Recently Used) cache for storing
 * completion results to reduce API calls and improve performance.
 */

export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

export class CacheManager<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from the cache
   *
   * @param key The cache key
   * @returns The cached value if exists and not expired, otherwise undefined
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end to mark as recently used (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   *
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Optional TTL in milliseconds
   */
  set(key: K, value: V, ttl?: number): void {
    const entry: CacheEntry<V> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to cache
    this.cache.set(key, entry);

    // Evict oldest entries if cache is too large
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }
  }

  /**
   * Check if a key exists in the cache and is not expired
   *
   * @param key The cache key
   * @returns true if the key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size
   *
   * @returns Number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries from the cache
   *
   * @returns Number of entries removed
   */
  prune(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all keys in the cache
   *
   * @returns Array of cache keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get statistics about the cache
   *
   * @returns Cache statistics object
   */
  getStats(): {
    size: number
    maxSize: number
    keys: number
    utilization: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: this.cache.size,
      utilization: this.cache.size / this.maxSize,
    };
  }
}
