/**
 * Debounce Utility
 *
 * This module provides a debounce utility for delaying function calls
 * until a specified time has passed without any new calls.
 *
 * TODO: Implement debounce utility
 * - Create Debouncer class
 * - Support cancellation
 * - Support custom delay
 */

export class Debouncer<T> {
    private timer: NodeJS.Timeout | undefined = undefined;
    private delay: number;

    constructor(delay: number) {
        this.delay = delay;
    }

    debounce(callback: () => T | Promise<T>): Promise<T> {
        // TODO: Implement debounce logic
        return new Promise((resolve) => {
            if (this.timer) {
                clearTimeout(this.timer);
            }

            this.timer = setTimeout(async () => {
                const result = await callback();
                resolve(result);
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
