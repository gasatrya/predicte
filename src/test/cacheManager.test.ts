import * as assert from 'assert';
import { CacheManager } from '../managers/cacheManager';

suite('CacheManager Test Suite', () => {
  test('should store and retrieve values', () => {
    const cache = new CacheManager<string, string>();
    cache.set('key1', 'value1');
    assert.strictEqual(cache.get('key1'), 'value1');
  });

  test('should return undefined for missing keys', () => {
    const cache = new CacheManager<string, string>();
    assert.strictEqual(cache.get('missing'), undefined);
  });

  test('should respect TTL', async () => {
    // 100ms TTL
    const cache = new CacheManager<string, string>(100, 100);
    cache.set('key1', 'value1');

    assert.strictEqual(cache.get('key1'), 'value1');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.strictEqual(cache.get('key1'), undefined);
  });

  test('should respect maxSize (LRU)', () => {
    // Max size 2
    const cache = new CacheManager<string, string>(2);

    cache.set('1', 'a');
    cache.set('2', 'b');
    cache.set('3', 'c'); // Should evict '1'

    assert.strictEqual(cache.get('1'), undefined);
    assert.strictEqual(cache.get('2'), 'b');
    assert.strictEqual(cache.get('3'), 'c');
  });

  test('should update LRU order on access', () => {
    const cache = new CacheManager<string, string>(2);

    cache.set('1', 'a');
    cache.set('2', 'b');

    // Access '1', making it most recently used. '2' becomes LRU.
    cache.get('1');

    cache.set('3', 'c'); // Should evict '2'

    assert.strictEqual(cache.get('1'), 'a');
    assert.strictEqual(cache.get('2'), undefined);
    assert.strictEqual(cache.get('3'), 'c');
  });

  test('clear should remove all entries', () => {
    const cache = new CacheManager<string, string>();
    cache.set('1', 'a');
    cache.clear();
    assert.strictEqual(cache.size(), 0);
  });
});
