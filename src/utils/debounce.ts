/**
 * Debounce Utility
 *
 * This module provides a debounce utility for delaying function calls
 * until a specified time has passed without any new calls.
 *
 * Features:
 * - Debounces function calls with configurable delay
 * - Supports cancellation of pending debounced calls
 * - Supports custom delay configuration
 */

export class Debouncer<T> {
  private timer: NodeJS.Timeout | undefined = undefined;
  private delay: number;

  constructor(delay: number) {
    this.delay = delay;
  }

  debounce(callback: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        void Promise.resolve()
          .then(() => callback())
          .then((result) => resolve(result))
          .catch((error) => reject(error));
      }, this.delay);
    });
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  setDelay(delay: number): void {
    this.delay = delay;
  }

  dispose(): void {
    this.cancel();
  }
}
