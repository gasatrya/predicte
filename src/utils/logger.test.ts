/**
 * Logger Unit Tests
 *
 * Tests for the Logger utility class that provides logging functionality
 * with different log levels and output channel management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { Logger, LogLevel, logger } from './logger';

// Mock VS Code API
vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('Logger', () => {
  let loggerInstance: Logger;
  let mockOutputChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock output channel
    mockOutputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    mockVscode.window.createOutputChannel = vi
      .fn()
      .mockReturnValue(mockOutputChannel);

    // Create logger instance for testing
    loggerInstance = new Logger('TestLogger', LogLevel.DEBUG);
  });

  afterEach(() => {
    loggerInstance.dispose();
  });

  describe('constructor', () => {
    it('should create output channel with given name', () => {
      expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith(
        'TestLogger',
      );
    });

    it('should set minimum log level', () => {
      const debugLogger = new Logger('Test', LogLevel.DEBUG);
      expect(debugLogger['minLevel']).toBe(LogLevel.DEBUG);

      const errorLogger = new Logger('Test', LogLevel.ERROR);
      expect(errorLogger['minLevel']).toBe(LogLevel.ERROR);
    });

    it('should use default name when not provided', () => {
      new Logger();
      expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith(
        'Predicte',
      );
    });
  });

  describe('log levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      loggerInstance.debug('Debug message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      loggerInstance.info('Info message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should log warn messages when level is WARN', () => {
      loggerInstance.warn('Warning message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should log error messages when level is ERROR', () => {
      loggerInstance.error('Error message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should not log debug messages when min level is ERROR', () => {
      const errorOnlyLogger = new Logger('Test', LogLevel.ERROR);
      errorOnlyLogger.debug('Debug message');
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('should log error messages when min level is ERROR', () => {
      const errorOnlyLogger = new Logger('Test', LogLevel.ERROR);
      errorOnlyLogger.error('Error message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });
  });

  describe('shouldLog method', () => {
    it('should allow DEBUG when min level is DEBUG', () => {
      const debugLogger = new Logger('Test', LogLevel.DEBUG);
      expect(debugLogger['shouldLog'](LogLevel.DEBUG)).toBe(true);
      expect(debugLogger['shouldLog'](LogLevel.INFO)).toBe(true);
      expect(debugLogger['shouldLog'](LogLevel.WARN)).toBe(true);
      expect(debugLogger['shouldLog'](LogLevel.ERROR)).toBe(true);
    });

    it('should allow INFO and above when min level is INFO', () => {
      const infoLogger = new Logger('Test', LogLevel.INFO);
      expect(infoLogger['shouldLog'](LogLevel.DEBUG)).toBe(false);
      expect(infoLogger['shouldLog'](LogLevel.INFO)).toBe(true);
      expect(infoLogger['shouldLog'](LogLevel.WARN)).toBe(true);
      expect(infoLogger['shouldLog'](LogLevel.ERROR)).toBe(true);
    });

    it('should allow WARN and above when min level is WARN', () => {
      const warnLogger = new Logger('Test', LogLevel.WARN);
      expect(warnLogger['shouldLog'](LogLevel.DEBUG)).toBe(false);
      expect(warnLogger['shouldLog'](LogLevel.INFO)).toBe(false);
      expect(warnLogger['shouldLog'](LogLevel.WARN)).toBe(true);
      expect(warnLogger['shouldLog'](LogLevel.ERROR)).toBe(true);
    });

    it('should allow only ERROR when min level is ERROR', () => {
      const errorLogger = new Logger('Test', LogLevel.ERROR);
      expect(errorLogger['shouldLog'](LogLevel.DEBUG)).toBe(false);
      expect(errorLogger['shouldLog'](LogLevel.INFO)).toBe(false);
      expect(errorLogger['shouldLog'](LogLevel.WARN)).toBe(false);
      expect(errorLogger['shouldLog'](LogLevel.ERROR)).toBe(true);
    });
  });

  describe('log method', () => {
    it('should include timestamp and log level in message', () => {
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      loggerInstance.info('Test message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining(
          '[2024-01-01T00:00:00.000Z] [INFO] Test message',
        ),
      );

      vi.restoreAllMocks();
    });

    it('should handle additional data arguments', () => {
      const testData = { key: 'value', number: 123 };
      loggerInstance.info('Test with data', testData);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test with data'),
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        JSON.stringify(testData, null, 2),
      );
    });

    it('should handle multiple data arguments', () => {
      loggerInstance.info('Test', 'string', 123, { obj: 'value' });

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(4);
    });

    it('should handle error objects in error method', () => {
      const testError = new Error('Test error');
      loggerInstance.error('Error occurred', testError);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Error occurred'),
      );
    });

    it('should handle circular references in data', () => {
      const circular: any = { ref: null };
      circular.ref = circular;

      expect(() =>
        loggerInstance.debug('Circular test', circular),
      ).not.toThrow();
    });

    it('should handle undefined values in data', () => {
      expect(() =>
        loggerInstance.info('Test', { value: undefined }),
      ).not.toThrow();
    });

    it('should handle functions in data', () => {
      expect(() =>
        loggerInstance.debug('Test', { fn: () => {} }),
      ).not.toThrow();
    });

    it('should convert non-objects to strings', () => {
      loggerInstance.info('Test', 123, true, null, undefined);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(5);
    });
  });

  describe('error method', () => {
    it('should accept error parameter', () => {
      const error = new Error('Test error');
      loggerInstance.error('Operation failed', error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2);
    });

    it('should work without error parameter', () => {
      loggerInstance.error('Simple error message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1);
    });

    it('should handle error with additional data', () => {
      const error = new Error('Test error');
      loggerInstance.error('Operation failed', error, { context: 'test' });

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(3);
    });
  });

  describe('setMinLevel', () => {
    it('should update minimum log level', () => {
      loggerInstance.setMinLevel(LogLevel.ERROR);
      expect(loggerInstance['minLevel']).toBe(LogLevel.ERROR);

      loggerInstance.setMinLevel(LogLevel.DEBUG);
      expect(loggerInstance['minLevel']).toBe(LogLevel.DEBUG);
    });

    it('should affect which messages are logged', () => {
      loggerInstance.setMinLevel(LogLevel.ERROR);
      loggerInstance.debug('Debug message');
      loggerInstance.info('Info message');
      loggerInstance.warn('Warning message');

      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

      loggerInstance.error('Error message');
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });
  });

  describe('show and hide', () => {
    it('should show output channel', () => {
      loggerInstance.show();
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should hide output channel', () => {
      loggerInstance.hide();
      expect(mockOutputChannel.hide).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose output channel', () => {
      loggerInstance.dispose();
      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });

    it('should not throw on multiple dispose calls', () => {
      expect(() => {
        loggerInstance.dispose();
        loggerInstance.dispose();
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should handle many log calls efficiently', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        loggerInstance.debug(`Log ${i}`);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});

describe('global logger instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock output channel for global logger
    const mockOutputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    mockVscode.window.createOutputChannel = vi
      .fn()
      .mockReturnValue(mockOutputChannel);
  });

  it('should export a global logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should have default name "Predicte"', () => {
    expect(mockVscode.window.createOutputChannel).toHaveBeenCalledWith(
      'Predicte',
    );
  });

  it('should have default level INFO', async () => {
    // Test that debug messages are not logged by default
    const mockOutputChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    mockVscode.window.createOutputChannel = vi
      .fn()
      .mockReturnValue(mockOutputChannel);

    // Re-import to get fresh instance with mocked vscode
    vi.resetModules();
    const { logger: freshLogger } = await import('./logger.js');

    // Debug should not be logged with default INFO level
    freshLogger.debug('Debug message');
    expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

    // Info should be logged
    freshLogger.info('Info message');
    expect(mockOutputChannel.appendLine).toHaveBeenCalled();
  });
});
