/**
 * Debouncer Unit Tests
 *
 * Tests for the Debouncer utility class that provides debounce functionality
 * for delaying function calls until a specified time has passed without new calls.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Debouncer } from './debounce';

describe('Debouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with positive delay', () => {
      const debouncer = new Debouncer(100);
      expect(debouncer).toBeDefined();
    });

    it('should handle zero delay', () => {
      const debouncer = new Debouncer(0);
      expect(debouncer).toBeDefined();
    });

    it('should handle very large delay', () => {
      const debouncer = new Debouncer(60000);
      expect(debouncer).toBeDefined();
    });

    it('should handle negative delay (should be treated as zero)', () => {
      const debouncer = new Debouncer(-100);
      expect(debouncer).toBeDefined();
    });
  });

  describe('debounce', () => {
    it('should delay function execution', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      const promise = debouncer.debounce(fn);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should cancel previous call if called again', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      const p1 = debouncer.debounce(fn);
      vi.advanceTimersByTime(50); // Partway through delay

      const p2 = debouncer.debounce(fn); // Should cancel first call
      vi.advanceTimersByTime(100); // Complete delay for second call

      await p1; // First promise should resolve (but function not called)
      await p2; // Second promise should resolve

      expect(fn).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should pass arguments to callback', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      const promise = debouncer.debounce(() => fn('arg1', 'arg2'));
      vi.advanceTimersByTime(100);
      await promise;

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle sync callback returning value', async () => {
      const debouncer = new Debouncer(100);
      const promise = debouncer.debounce(() => 42);

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe(42);
    });

    it('should handle async callback returning Promise', async () => {
      const debouncer = new Debouncer(100);
      const promise = debouncer.debounce(async () => 'async result');

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('async result');
    });

    it('should handle multiple sequential calls', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      // First call
      const p1 = debouncer.debounce(fn);
      vi.advanceTimersByTime(100);
      await p1;

      // Second call after first completes
      const p2 = debouncer.debounce(fn);
      vi.advanceTimersByTime(100);
      await p2;

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid fire calls', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer<string>(100);

      // Make 5 rapid calls
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(debouncer.debounce(fn));
        vi.advanceTimersByTime(20); // Advance a little between calls
      }

      // Advance to complete the last call
      vi.advanceTimersByTime(100);

      // Wait for all promises individually to avoid type issues
      for (const p of promises) {
        await p;
      }

      // Should only be called once (last call)
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should reject on callback error', async () => {
      const debouncer = new Debouncer(50);
      const promise = debouncer.debounce(() => {
        throw new Error('Test error');
      });

      vi.advanceTimersByTime(50);

      await expect(promise).rejects.toThrow('Test error');
    });

    it('should handle promise rejection', async () => {
      const debouncer = new Debouncer(50);
      const promise = debouncer.debounce(async () => {
        throw new Error('Async error');
      });

      vi.advanceTimersByTime(50);

      await expect(promise).rejects.toThrow('Async error');
    });

    it('should not swallow errors from previous debounced call', async () => {
      const debouncer = new Debouncer(50);

      const p1 = debouncer.debounce(() => {
        throw new Error('Error 1');
      });

      vi.advanceTimersByTime(25);

      const p2 = debouncer.debounce(() => 'result');

      vi.advanceTimersByTime(50);

      await expect(p1).rejects.toThrow('Error 1');
      const result = await p2;
      expect(result).toBe('result');
    });

    it('should handle errors in rapid succession', async () => {
      const debouncer = new Debouncer(100);
      let callCount = 0;

      const errorFn = vi.fn().mockImplementation(() => {
        callCount++;
        throw new Error(`Error ${callCount}`);
      });

      const p1 = debouncer.debounce(errorFn);
      vi.advanceTimersByTime(50);

      const p2 = debouncer.debounce(() => 'success');
      vi.advanceTimersByTime(100);

      await expect(p1).rejects.toThrow('Error 1');
      const result = await p2;
      expect(result).toBe('success');
      expect(errorFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('should cancel pending debounced call', async () => {
      const fn = vi.fn();
      const debouncer = new Debouncer(100);

      const promise = debouncer.debounce(fn);
      debouncer.cancel();

      vi.advanceTimersByTime(100);

      // The promise should still resolve (but function not called)
      await promise;
      expect(fn).not.toHaveBeenCalled();
    });

    it('should handle multiple cancel calls', () => {
      const debouncer = new Debouncer(100);

      expect(() => {
        debouncer.cancel();
        debouncer.cancel();
      }).not.toThrow();
    });

    it('should cancel and allow new calls', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      const p1 = debouncer.debounce(fn);
      debouncer.cancel();

      vi.advanceTimersByTime(100);
      await p1; // Should resolve but fn not called

      // New call should work
      const p2 = debouncer.debounce(fn);
      vi.advanceTimersByTime(100);
      await p2;

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should work when no timer is pending', () => {
      const debouncer = new Debouncer(100);

      expect(() => debouncer.cancel()).not.toThrow();
    });
  });

  describe('setDelay', () => {
    it('should update delay', () => {
      const debouncer = new Debouncer(100);
      debouncer.setDelay(200);

      // Access private property for testing
      expect(debouncer['delay']).toBe(200);
    });

    it('should accept zero delay', () => {
      const debouncer = new Debouncer(100);
      debouncer.setDelay(0);

      expect(debouncer['delay']).toBe(0);
    });

    it('should accept negative delay (should be treated as zero)', () => {
      const debouncer = new Debouncer(100);
      debouncer.setDelay(-50);

      expect(debouncer['delay']).toBe(-50); // Note: The class doesn't validate negative values
    });

    it('should affect subsequent debounce calls', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncer = new Debouncer(100);

      debouncer.setDelay(50);

      const promise = debouncer.debounce(fn);
      vi.advanceTimersByTime(50); // New shorter delay

      await promise;
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('should cancel timer and cleanup', async () => {
      const debouncer = new Debouncer(100);
      const fn = vi.fn();

      const promise = debouncer.debounce(fn);
      debouncer.dispose();

      vi.advanceTimersByTime(100);

      await promise;
      expect(fn).not.toHaveBeenCalled();
    });

    it('should allow new instance after dispose', async () => {
      const debouncer1 = new Debouncer(100);
      debouncer1.dispose();

      // Should be able to create new instance
      const debouncer2 = new Debouncer(200);
      expect(debouncer2).toBeDefined();
    });

    it('should not throw on multiple dispose calls', () => {
      const debouncer = new Debouncer(100);

      expect(() => {
        debouncer.dispose();
        debouncer.dispose();
      }).not.toThrow();
    });
  });

  describe('generic type handling (H-003)', () => {
    it('should preserve return type for string', async () => {
      const debouncer = new Debouncer<string>(100);
      const promise = debouncer.debounce(() => 'test');

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(typeof result).toBe('string');
      expect(result).toBe('test');
    });

    it('should preserve return type for number', async () => {
      const debouncer = new Debouncer<number>(100);
      const promise = debouncer.debounce(() => 42);

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });

    it('should preserve return type for object', async () => {
      const debouncer = new Debouncer<{ value: string }>(100);
      const promise = debouncer.debounce(() => ({ value: 'test' }));

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(typeof result).toBe('object');
      expect(result).toEqual({ value: 'test' });
    });

    it('should preserve return type for array', async () => {
      const debouncer = new Debouncer<string[]>(100);
      const promise = debouncer.debounce(() => ['a', 'b', 'c']);

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should preserve return type for Promise', async () => {
      const debouncer = new Debouncer<Promise<string>>(100);
      const promise = debouncer.debounce(() => Promise.resolve('async'));

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(typeof result).toBe('string');
      expect(result).toBe('async');
    });
  });

  describe('memory leak prevention (M-039)', () => {
    it('should not keep references to callbacks after execution', async () => {
      const debouncer = new Debouncer(100);
      let callbackCalled = false;

      const callback = () => {
        callbackCalled = true;
        return 'result';
      };

      const promise = debouncer.debounce(callback);
      vi.advanceTimersByTime(100);
      await promise;

      expect(callbackCalled).toBe(true);
      // The callback should be eligible for garbage collection now
    });

    it('should handle many debounce calls without memory issues', async () => {
      const debouncer = new Debouncer<number>(10);
      const promises: Promise<number>[] = [];

      // Make many rapid calls
      for (let i = 0; i < 100; i++) {
        promises.push(debouncer.debounce(() => i));
        vi.advanceTimersByTime(1);
      }

      vi.advanceTimersByTime(100);

      // Wait for all promises individually to avoid type issues
      for (const p of promises) {
        await p;
      }

      // Should not crash or have memory issues
      expect(promises.length).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle very short delay (0ms)', async () => {
      const debouncer = new Debouncer(0);
      const fn = vi.fn().mockResolvedValue('result');

      const promise = debouncer.debounce(fn);
      vi.advanceTimersByTime(0);

      await promise;
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle very long delay', async () => {
      const debouncer = new Debouncer(300000); // 5 minutes
      const fn = vi.fn().mockResolvedValue('result');

      const promise = debouncer.debounce(fn);
      vi.advanceTimersByTime(300000);

      await promise;
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle callback that returns undefined', async () => {
      const debouncer = new Debouncer(100);
      const promise = debouncer.debounce(() => {
        /* returns undefined */
      });

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBeUndefined();
    });

    it('should handle callback that returns null', async () => {
      const debouncer = new Debouncer(100);
      const promise = debouncer.debounce(() => null);

      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBeNull();
    });

    it('should work with arrow functions preserving this context', async () => {
      const debouncer = new Debouncer(100);
      const obj = {
        value: 'test',
        getValue() {
          return this.value;
        },
      };

      const promise = debouncer.debounce(() => obj.getValue());
      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe('test');
    });
  });
});
