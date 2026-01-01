# VS Code Extension Testing Strategy

**Project:** Predicte VS Code Extension
**Test Framework:** Vitest
**Target Coverage:** 80%+ for utility and manager classes

---

## Table of Contents

1. [Overview](#overview)
2. [Project Setup](#project-setup)
3. [VS Code API Mocking Strategy](#vscode-api-mocking-strategy)
4. [Testing Patterns by Module Type](#testing-patterns-by-module-type)
5. [Test Organization & Structure](#test-organization--structure)
6. [Testing Singleton Managers](#testing-singleton-managers)
7. [Testing Async Operations](#testing-async-operations)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Achieving High Coverage](#achieving-high-coverage)
10. [Recommended VS Code Testing Utilities](#recommended-vscode-testing-utilities)
11. [Example Test Files](#example-test-files)

---

## Overview

### Testing Philosophy

- **Unit tests first**: Test individual functions and classes in isolation
- **Fast feedback**: Tests should complete in milliseconds, not seconds
- **Clear intent**: Test names should describe what behavior is being tested
- **Test one thing**: Each test should verify a single behavior or scenario

### Why Vitest?

Based on research from real-world VS Code extensions and best practices:

1. **Speed**: V8-based coverage collection is faster than Istanbul
2. **Native TypeScript**: Full TypeScript support with no transpilation needed
3. **Watch mode**: Instant feedback during development
4. **Jest-compatible**: Easy migration from Jest if needed
5. **Mocking utilities**: Built-in `vi` helper for comprehensive mocking

---

## Project Setup

### 1. Install Vitest and Coverage Dependencies

```bash
npm install -D vitest @vitest/coverage-v8
```

### 2. Create Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'out'],

    // Global configuration
    globals: true,
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8', // Recommended for speed and accuracy
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'out/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**', // Type definition files
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Setup files
    setupFiles: ['./test/setup.ts'],

    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  // TypeScript configuration
  esbuild: {
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui"
  }
}
```

### 4. Create Test Setup File

Create `test/setup.ts`:

```typescript
import { vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Mock VS Code API globally
vi.mock('vscode', () => ({
  default: {},
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createStatusBarItem: vi.fn(),
    createOutputChannel: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  SecretStorage: vi.fn(),
  EventEmitter: vi.fn(),
  Disposable: {
    from: vi.fn(),
  },
  Uri: {
    file: vi.fn(),
    joinPath: vi.fn(),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  CompletionItem: vi.fn(),
  InlineCompletionItem: vi.fn(),
}));
```

---

## VS Code API Mocking Strategy

### Key Principles

1. **Mock at module level**: Mock `vscode` module at the top of test files
2. **Use `vi.mocked()`**: Type-safe access to mocked VS Code API
3. **Provide realistic defaults**: Mock should return sensible default values
4. **Allow test-specific overrides**: Each test can configure mock behavior

### Mocking Patterns

#### Pattern 1: Basic VS Code Mock

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('ConfigManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock workspace.getConfiguration
    mockVscode.workspace.getConfiguration = vi.fn((section?: string) => {
      const mockConfig: Record<string, any> = {
        get: vi.fn((key: string) => {
          if (section === 'predicte') {
            const defaults: Record<string, any> = {
              enabled: true,
              apiBaseUrl: 'https://codestral.mistral.ai',
              model: 'codestral-latest',
              maxTokens: 100,
              temperature: 0.1,
              debounceDelay: 150,
            };
            return defaults[key];
          }
          return undefined;
        }),
        update: vi.fn(),
        inspect: vi.fn(),
      };
      return mockConfig as any;
    });
  });
});
```

#### Pattern 2: Mocking SecretStorage

```typescript
describe('SecretStorage tests', () => {
  beforeEach(() => {
    const mockSecretStorage = {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn(),
      onDidChange: vi.fn(),
    };
    mockVscode.SecretStorage = vi
      .fn()
      .mockImplementation(() => mockSecretStorage);
  });

  it('should store API key', async () => {
    const secretStorage = new mockVscode.SecretStorage();
    await secretStorage.store('predicte.apiKey', 'test-key-123');

    expect(secretStorage.store).toHaveBeenCalledWith(
      'predicte.apiKey',
      'test-key-123',
    );
  });
});
```

#### Pattern 3: Mocking Event Emitters

```typescript
describe('Event handling tests', () => {
  beforeEach(() => {
    // Mock EventEmitter
    const mockEvent = {
      fire: vi.fn(),
      event: vi.fn(),
    };
    mockVscode.EventEmitter = vi.fn().mockImplementation(() => ({
      event: vi.fn(() => mockEvent.event),
    }));

    // Mock onDidChangeConfiguration
    mockVscode.workspace.onDidChangeConfiguration = vi.fn((callback) => {
      return { dispose: vi.fn() } as vscode.Disposable;
    });
  });

  it('should listen to configuration changes', () => {
    const dispose = mockVscode.workspace.onDidChangeConfiguration(() => {});
    expect(dispose).toBeDefined();
    expect(mockVscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
  });
});
```

---

## Testing Patterns by Module Type

### 1. Utility Functions (Pure Functions)

**File:** `src/utils/*.ts`

**Characteristics:**

- Pure functions with no side effects
- Simple input/output
- Easy to test with many edge cases

**Test Pattern:**

```typescript
// src/utils/completionUtils.test.ts
import { describe, it, expect } from 'vitest';
import { extractCodeContext, buildPrompt } from './completionUtils';

describe('extractCodeContext', () => {
  it('should extract function context', () => {
    const code = `
      function calculateSum(a: number, b: number): number {
        return a + b
      }
    `;

    const context = extractCodeContext(code, 'typescript');

    expect(context).toContain('function calculateSum');
    expect(context).toContain('number');
  });

  it('should handle empty code', () => {
    const context = extractCodeContext('', 'javascript');
    expect(context).toBe('');
  });

  it('should handle languages without context', () => {
    const context = extractCodeContext('<div>test</div>', 'html');
    expect(context).toBeDefined();
  });

  describe('edge cases', () => {
    it('should handle code with syntax errors gracefully', () => {
      const badCode = 'function test(';
      expect(() => extractCodeContext(badCode, 'javascript')).not.toThrow();
    });

    it('should handle very long code snippets', () => {
      const longCode = 'x'.repeat(10000);
      const context = extractCodeContext(longCode, 'javascript');
      expect(context.length).toBeLessThanOrEqual(5000); // Assuming truncation
    });
  });
});
```

### 2. Manager Classes (Stateful Singletons)

**File:** `src/managers/*.ts`

**Characteristics:**

- Maintain internal state
- Often singleton pattern
- Handle VS Code API interactions
- Need proper cleanup between tests

**Test Pattern:**

```typescript
// src/managers/configManager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { ConfigManager } from './configManager';

vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance for each test
    (ConfigManager as any).instance = undefined;

    // Mock VS Code API
    mockVscode.workspace.getConfiguration = vi.fn((section?: string) => ({
      get: vi.fn((key: string, defaultValue: any) => defaultValue),
      update: vi.fn(),
      inspect: vi.fn(),
      has: vi.fn(),
    }));
  });

  afterEach(() => {
    // Clean up manager
    configManager?.dispose?.();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance if disposed', () => {
      const instance1 = ConfigManager.getInstance();
      instance1.dispose?.();

      const instance2 = ConfigManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getConfig', () => {
    it('should get configuration value', () => {
      configManager = ConfigManager.getInstance();

      const value = configManager.getConfig('model');

      expect(value).toBeDefined();
    });

    it('should use default value when config not set', () => {
      configManager = ConfigManager.getInstance();

      const value = configManager.getConfig('unknown', 'default');

      expect(value).toBe('default');
    });

    it('should call workspace.getConfiguration', () => {
      configManager = ConfigManager.getInstance();
      configManager.getConfig('model');

      expect(mockVscode.workspace.getConfiguration).toHaveBeenCalledWith(
        'predicte',
      );
    });
  });

  describe('onDidChangeConfig', () => {
    it('should listen to configuration changes', () => {
      const callback = vi.fn();
      configManager = ConfigManager.getInstance();
      configManager.onDidChangeConfig(callback);

      expect(mockVscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('should invoke callback when configuration changes', async () => {
      const callback = vi.fn();
      configManager = ConfigManager.getInstance();

      configManager.onDidChangeConfig(callback);

      // Simulate configuration change
      const changeEvent = {
        affectsConfiguration: vi.fn(
          (section: string) => section === 'predicte',
        ),
      };
      const disposable =
        mockVscode.workspace.onDidChangeConfiguration.mock.calls[0][0];

      disposable(changeEvent as any);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration value', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      mockVscode.workspace.getConfiguration = vi.fn(() => ({
        get: vi.fn(),
        update: mockUpdate,
      }));

      configManager = ConfigManager.getInstance();
      await configManager.updateConfig('model', 'codestral-22b');

      expect(mockUpdate).toHaveBeenCalledWith('model', 'codestral-22b', false);
    });

    it('should handle update errors', async () => {
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
      mockVscode.workspace.getConfiguration = vi.fn(() => ({
        get: vi.fn(),
        update: mockUpdate,
      }));

      configManager = ConfigManager.getInstance();

      await expect(
        configManager.updateConfig('model', 'codestral-22b'),
      ).rejects.toThrow('Update failed');
    });
  });
});
```

### 3. Service Classes (External API Integration)

**File:** `src/services/*.ts`

**Characteristics:**

- Interact with external APIs
- Handle network requests
- Manage authentication
- Need mock for external dependencies

**Test Pattern:**

```typescript
// src/services/mistralClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MistralClient } from './mistralClient';

// Mock the Mistral SDK
vi.mock('@mistralai/mistralai', () => ({
  Mistral: vi.fn().mockImplementation(() => ({
    chat: {
      complete: vi.fn(),
      stream: vi.fn(),
    },
  })),
}));

describe('MistralClient', () => {
  let mistralClient: MistralClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mistralClient = new MistralClient('test-api-key', {
      apiBaseUrl: 'https://api.mistral.ai',
      model: 'codestral-latest',
    });
  });

  afterEach(() => {
    mistralClient.dispose?.();
  });

  describe('getCompletion', () => {
    it('should call API with correct parameters', async () => {
      const { Mistral } = await import('@mistralai/mistralai');

      const mockComplete = vi.fn().mockResolvedValue({
        choices: [
          {
            message: { content: 'function test() { return "hello"; }' },
          },
        ],
      });

      (Mistral as any).mockImplementation(() => ({
        chat: { complete: mockComplete },
      }));

      const result = await mistralClient.getCompletion({
        prompt: 'function ',
        context: ['const x = 1'],
      });

      expect(mockComplete).toHaveBeenCalledWith({
        model: 'codestral-latest',
        messages: [
          { role: 'user', content: expect.stringContaining('function ') },
        ],
        max_tokens: 100,
        temperature: 0.1,
      });

      expect(result).toBeDefined();
    });

    it('should handle API errors', async () => {
      const { Mistral } = await import('@mistralai/mistralai');

      const mockComplete = vi.fn().mockRejectedValue(new Error('API Error'));

      (Mistral as any).mockImplementation(() => ({
        chat: { complete: mockComplete },
      }));

      await expect(
        mistralClient.getCompletion({
          prompt: 'test',
          context: [],
        }),
      ).rejects.toThrow('API Error');
    });

    it('should implement retry logic', async () => {
      const { Mistral } = await import('@mistralai/mistralai');

      let attempt = 0;
      const mockComplete = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Temporary error');
        }
        return {
          choices: [
            {
              message: { content: 'success' },
            },
          ],
        };
      });

      (Mistral as any).mockImplementation(() => ({
        chat: { complete: mockComplete },
      }));

      const result = await mistralClient.getCompletion({
        prompt: 'test',
        context: [],
      });

      expect(attempt).toBe(3);
      expect(mockComplete).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCompletionStream', () => {
    it('should stream completions', async () => {
      const { Mistral } = await import('@mistralai/mistralai');

      const asyncGenerator = (async function* () {
        yield { choices: [{ delta: { content: 'fun' } }] };
        yield { choices: [{ delta: { content: 'ction' } }] };
      })();

      const mockStream = vi.fn().mockReturnValue(asyncGenerator);

      (Mistral as any).mockImplementation(() => ({
        chat: { stream: mockStream },
      }));

      const chunks: string[] = [];
      for await (const chunk of mistralClient.getCompletionStream({
        prompt: 'test',
        context: [],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['fun', 'ction']);
    });
  });
});
```

### 4. Providers (VS Code Integration)

**File:** `src/providers/*.ts`

**Characteristics:**

- Implement VS Code provider interfaces
- Handle editor events
- Manage completion lifecycle
- Most complex to test

**Test Pattern:**

```typescript
// src/providers/completionProvider.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';

vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('CompletionProvider', () => {
  let provider: CompletionProvider;
  let mockDocument: any;
  let mockPosition: any;
  let mockContext: any;
  let mockToken: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document
    mockDocument = {
      uri: { toString: () => 'file:///test.ts' },
      languageId: 'typescript',
      getText: vi.fn((range?: any) => {
        if (range) return 'function ';
        return 'function test() {\n  return "hello"\n}';
      }),
      lineAt: vi.fn((line: number) => ({
        text: '  return "hello"',
        range: new (mockVscode.Range as any)(0, 0, 0, 16),
      })),
      offsetAt: vi.fn(),
      positionAt: vi.fn(),
    };

    // Mock position
    mockPosition = new (mockVscode.Position as any)(1, 0);

    // Mock context
    mockContext = {
      triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
      selectedCompletionInfo: undefined,
    };

    // Mock cancellation token
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: vi.fn(() => ({ dispose: vi.fn() })),
    };

    // Create provider with mock services
    provider = new CompletionProvider();
  });

  afterEach(() => {
    provider.dispose?.();
  });

  describe('provideInlineCompletionItems', () => {
    it('should return completions when enabled', async () => {
      const completions = await provider.provideInlineCompletionItems(
        mockDocument,
        mockPosition,
        mockContext,
        mockToken,
      );

      expect(completions).toBeDefined();
    });

    it('should return empty when disabled', async () => {
      // Mock disabled configuration
      mockVscode.workspace.getConfiguration = vi.fn((section?: string) => ({
        get: vi.fn((key: string) => {
          if (key === 'enabled') return false;
          return true;
        }),
      }));

      const completions = await provider.provideInlineCompletionItems(
        mockDocument,
        mockPosition,
        mockContext,
        mockToken,
      );

      expect(completions?.items).toHaveLength(0);
    });

    it('should handle cancellation', async () => {
      mockToken.isCancellationRequested = true;

      const completions = await provider.provideInlineCompletionItems(
        mockDocument,
        mockPosition,
        mockContext,
        mockToken,
      );

      expect(completions?.items).toHaveLength(0);
    });

    it('should respect debounce delay', async () => {
      const startTime = Date.now();

      await provider.provideInlineCompletionItems(
        mockDocument,
        mockPosition,
        mockContext,
        mockToken,
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(150); // Default debounce delay
    });
  });

  describe('completion acceptance', () => {
    it('should track acceptance metrics', () => {
      provider.handleCompletionAccepted('word');

      // Verify metrics were updated
      expect(provider['metrics']).toBeDefined();
    });
  });
});
```

---

## Test Organization & Structure

### File Naming Conventions

```
src/
├── utils/
│   ├── codeUtils.ts
│   └── codeUtils.test.ts           # Co-located with source
├── managers/
│   ├── configManager.ts
│   └── configManager.test.ts
├── services/
│   ├── mistralClient.ts
│   └── mistralClient.test.ts
└── test/
    ├── setup.ts                     # Global test setup
    ├── mocks/
    │   └── vscode.mock.ts          # Reusable VS Code mocks
    └── helpers/
        └── testHelpers.ts          # Test utility functions
```

### Test Structure Pattern

Each test file should follow this structure:

```typescript
// 1. Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { YourClass } from './yourClass';

// 2. Mocks
vi.mock('vscode');
vi.mock('./dependency');

// 3. Describe block (test suite)
describe('YourClass', () => {
  // 4. Instance variables
  let instance: YourClass;

  // 5. Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton if applicable
    (YourClass as any).instance = undefined;
    // Initialize instance
    instance = new YourClass();
  });

  // 6. Teardown after each test
  afterEach(() => {
    instance?.dispose?.();
  });

  // 7. Test groups (describe blocks for related functionality)
  describe('constructor', () => {
    it('should initialize correctly', () => {
      expect(instance).toBeDefined();
    });
  });

  describe('methodGroup', () => {
    // 8. Happy path tests first
    it('should do something successfully', () => {});

    // 9. Then edge cases
    it('should handle empty input', () => {});

    // 10. Finally error cases
    it('should throw error on invalid input', () => {});
  });
});
```

---

## Testing Singleton Managers

### Challenge

Singletons maintain state across tests, causing test pollution.

### Solution 1: Reset Instance Pattern

```typescript
// configManager.ts
export class ConfigManager {
  private static instance: ConfigManager;

  private constructor() {
    // Private constructor
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  static resetInstance(): void {
    ConfigManager.instance = undefined as any;
  }

  dispose(): void {
    ConfigManager.instance = undefined as any;
  }
}
```

### Solution 2: Test Helper Pattern

```typescript
// test/helpers/singletons.ts
export function resetSingleton<T extends { resetInstance?: () => void }>(
  SingletonClass: new () => T,
): void {
  if ((SingletonClass as any).instance) {
    if ((SingletonClass as any).instance?.resetInstance) {
      (SingletonClass as any).instance.resetInstance();
    } else {
      (SingletonClass as any).instance = undefined;
    }
  }
}

// Usage in test
import { resetSingleton } from './helpers/singletons';
import { ConfigManager } from '../managers/configManager';

beforeEach(() => {
  resetSingleton(ConfigManager);
});
```

### Solution 3: Testable Pattern

Make singletons testable by allowing dependency injection:

```typescript
// configManager.ts
export class ConfigManager {
  private static instance: ConfigManager;
  private _workspace?: typeof vscode.workspace;

  private constructor(workspace?: typeof vscode.workspace) {
    this._workspace = workspace;
  }

  static getInstance(workspace?: typeof vscode.workspace): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(workspace);
    }
    return ConfigManager.instance;
  }

  // For testing
  setWorkspace(workspace: typeof vscode.workspace): void {
    this._workspace = workspace;
  }
}
```

---

## Testing Async Operations

### Pattern 1: Basic Async Tests

```typescript
describe('Async operations', () => {
  it('should resolve promise', async () => {
    const result = await asyncFunction();
    expect(result).toBe('success');
  });

  it('should reject promise', async () => {
    await expect(asyncFunction()).rejects.toThrow('error message');
  });
});
```

### Pattern 2: Promise Assertions

```typescript
describe('Promise assertions', () => {
  it('should use resolves matcher', async () => {
    await expect(Promise.resolve('value')).resolves.toBe('value');
  });

  it('should use rejects matcher', async () => {
    await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail');
  });
});
```

### Pattern 3: Async Generators

```typescript
describe('Async generators', () => {
  it('should yield values', async () => {
    const asyncGen = asyncGenerator();

    const values: string[] = [];
    for await (const value of asyncGen) {
      values.push(value);
    }

    expect(values).toEqual(['value1', 'value2']);
  });
});
```

### Pattern 4: Timers and Delays

```typescript
import { vi, useFakeTimers } from 'vitest';

describe('Timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle setTimeout', async () => {
    const callback = vi.fn();
    setTimeout(callback, 1000);

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalled();
  });

  it('should handle debounced functions', async () => {
    const debouncedFn = debounce(() => {}, 150);

    debouncedFn();
    vi.advanceTimersByTime(100);

    debouncedFn();
    vi.advanceTimersByTime(150);

    // Function should only be called once
  });
});
```

### Pattern 5: Race Conditions

```typescript
describe('Race conditions', () => {
  it('should handle multiple concurrent requests', async () => {
    const promises = [fetchData(1), fetchData(2), fetchData(3)];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
  });

  it('should handle Promise.race correctly', async () => {
    const result = await Promise.race([slowOperation(), fastOperation()]);

    expect(result).toBe('fast');
  });
});
```

---

## Error Handling & Edge Cases

### Pattern 1: Error Throwing

```typescript
describe('Error handling', () => {
  it('should throw on invalid input', () => {
    expect(() => {
      functionUnderTest(null);
    }).toThrow('Invalid input');
  });

  it('should throw custom error type', () => {
    expect(() => {
      functionUnderTest('invalid');
    }).toThrow(CustomError);
  });

  it('should throw error with specific message', () => {
    expect(() => {
      functionUnderTest('invalid');
    }).toThrow(/specific message/);
  });
});
```

### Pattern 2: Error Recovery

```typescript
describe('Error recovery', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    const result = await retryOperation(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should fallback gracefully', async () => {
    const result = await operationWithFallback({
      primary: () => Promise.reject(new Error('Failed')),
      fallback: () => Promise.resolve('fallback value'),
    });

    expect(result).toBe('fallback value');
  });
});
```

### Pattern 3: Edge Cases

```typescript
describe('Edge cases', () => {
  it('should handle empty arrays', () => {
    const result = processArray([]);
    expect(result).toEqual([]);
  });

  it('should handle null/undefined', () => {
    const result = processValue(null);
    expect(result).toBe('');
  });

  it('should handle very large inputs', () => {
    const largeInput = 'x'.repeat(100000);
    expect(() => processLargeInput(largeInput)).not.toThrow();
  });

  it('should handle special characters', () => {
    const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./';
    const result = processString(specialChars);
    expect(result).toBeDefined();
  });

  it('should handle Unicode', () => {
    const unicode = '你好世界 🌍 Ñoño';
    const result = processString(unicode);
    expect(result).toContain('你好');
  });
});
```

---

## Achieving High Coverage

### 1. Test Coverage Targets

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    lines: 80,      // Line coverage
    functions: 80,  // Function coverage
    branches: 75,   // Branch coverage (if/else)
    statements: 80, // Statement coverage
  }
}
```

### 2. Coverage Strategies

#### Strategy 1: Test Matrix Approach

```typescript
// Define test cases matrix
const testCases = [
  {
    input: 'string',
    expected: 'processed-string',
    description: 'normal string',
  },
  { input: '', expected: '', description: 'empty string' },
  { input: '   ', expected: '', description: 'whitespace only' },
  { input: '123', expected: '123', description: 'numeric string' },
  { input: '!@#$', expected: '!@#$', description: 'special characters' },
];

describe.each(testCases)('$description', ({ input, expected }) => {
  it('should process correctly', () => {
    expect(processString(input)).toBe(expected);
  });
});
```

#### Strategy 2: Branch Coverage

```typescript
describe('Branch coverage', () => {
  describe('if/else branches', () => {
    it('should handle true condition', () => {
      expect(conditionalFunction(true)).toBe('true-path');
    });

    it('should handle false condition', () => {
      expect(conditionalFunction(false)).toBe('false-path');
    });
  });

  describe('switch cases', () => {
    it.each(['case1', 'case2', 'case3', 'default'])(
      'should handle %s',
      (value) => {
        expect(() => switchFunction(value)).not.toThrow();
      },
    );
  });

  describe('loop coverage', () => {
    it('should handle zero iterations', () => {
      expect(loopFunction([])).toEqual([]);
    });

    it('should handle single iteration', () => {
      expect(loopFunction([1])).toEqual([2]);
    });

    it('should handle multiple iterations', () => {
      expect(loopFunction([1, 2, 3])).toEqual([2, 4, 6]);
    });
  });
});
```

#### Strategy 3: Error Path Coverage

```typescript
describe('Error path coverage', () => {
  it('should handle network errors', async () => {
    mockNetworkRequest.mockRejectedValueOnce(new Error('Network error'));
    await expect(fetchData()).rejects.toThrow('Network error');
  });

  it('should handle timeout errors', async () => {
    mockNetworkRequest.mockRejectedValueOnce(new Error('Timeout'));
    await expect(fetchData()).rejects.toThrow('Timeout');
  });

  it('should handle validation errors', () => {
    expect(() => validateData({})).toThrow('Validation failed');
  });

  it('should handle permission errors', async () => {
    mockAccessControl.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(performAction()).rejects.toThrow('Permission denied');
  });
});
```

### 3. Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage report (HTML)
npm run test:coverage

# Open HTML report
open coverage/index.html

# Watch mode with coverage
npx vitest watch --coverage
```

### 4. Excluding Code from Coverage

```typescript
// Use @preserve to keep comments in production
/* v8 ignore next -- @preserve */
if (process.env.NODE_ENV === 'development') {
  console.debug('Debug info');
}

/* v8 ignore file -- @preserve */
export function debuggingOnly() {
  // Entire file excluded
}
```

---

## Recommended VS Code Testing Utilities

### 1. Create Mock Helpers

```typescript
// test/mocks/vscode.mock.ts
import { vi } from 'vitest';
import * as vscode from 'vscode';

export function createMockWorkspaceFolder(
  name: string,
): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(`/path/to/${name}`),
    name,
    index: 0,
  };
}

export function createMockTextDocument(
  content: string,
  languageId: string = 'typescript',
): vscode.TextDocument {
  const lines = content.split('\n');
  return {
    uri: vscode.Uri.file('/test.ts'),
    languageId,
    getText: vi.fn((range?: vscode.Range) => {
      if (range) return content.substring(0, 10);
      return content;
    }),
    lineAt: vi.fn((line: number) => ({
      text: lines[line] || '',
      range: new vscode.Range(0, 0, 0, 0),
    })),
    offsetAt: vi.fn(() => 0),
    positionAt: vi.fn(() => new vscode.Position(0, 0)),
    getText: vi.fn(() => content),
    getWordRangeAtPosition: vi.fn(() => new vscode.Range(0, 0, 0, 0)),
  } as any;
}

export function createMockCompletionItem(
  text: string,
): vscode.InlineCompletionItem {
  return {
    insertText: text,
    range: new vscode.Range(0, 0, 0, 0),
  };
}

export function createMockSecretStorage(): vscode.SecretStorage {
  const storage = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => storage.get(key)),
    store: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    onDidChange: vi.fn(() => ({
      dispose: vi.fn(),
    })),
  } as any;
}
```

### 2. Test Helper Functions

```typescript
// test/helpers/testHelpers.ts
import { vi } from 'vitest';

export function waitFor(
  condition: () => boolean,
  timeout = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 50);
  });
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

export function createMockDisposable() {
  return {
    dispose: vi.fn(),
  };
}

export function resetAllSingletons(): void {
  // Reset all singleton instances
  const singletons = ['ConfigManager', 'CacheManager', 'Logger'] as const;
  singletons.forEach((name) => {
    if ((global as any)[name]?.instance) {
      (global as any)[name].instance = undefined;
    }
  });
}
```

---

## Example Test Files

### Example 1: Utility Test

```typescript
// src/utils/codeUtils.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractImports,
  extractFunctionDefinitions,
  extractTypeDefinitions,
  stripComments,
} from './codeUtils';

describe('codeUtils', () => {
  describe('extractImports', () => {
    it('should extract ES6 imports', () => {
      const code = `
        import { useState } from 'react'
        import axios from 'axios'
        const x = 1
      `;
      const imports = extractImports(code);
      expect(imports).toContain('useState');
      expect(imports).toContain('axios');
    });

    it('should handle empty code', () => {
      expect(extractImports('')).toEqual([]);
    });

    it('should handle code without imports', () => {
      expect(extractImports('const x = 1')).toEqual([]);
    });
  });

  describe('extractFunctionDefinitions', () => {
    it('should extract named functions', () => {
      const code = `
        function calculateSum(a, b) {
          return a + b
        }
      `;
      const functions = extractFunctionDefinitions(code, 'javascript');
      expect(functions).toContain('calculateSum');
    });

    it('should extract arrow functions', () => {
      const code = 'const add = (a, b) => a + b';
      const functions = extractFunctionDefinitions(code, 'javascript');
      expect(functions).toContain('add');
    });

    it('should extract class methods', () => {
      const code = `
        class Calculator {
          add(a, b) { return a + b }
        }
      `;
      const functions = extractFunctionDefinitions(code, 'javascript');
      expect(functions).toContain('add');
    });
  });

  describe('stripComments', () => {
    it('should remove single-line comments', () => {
      const code = 'const x = 1 // comment';
      expect(stripComments(code)).toBe('const x = 1');
    });

    it('should remove multi-line comments', () => {
      const code = `/*
        Multi-line comment
      */
      const x = 1`;
      expect(stripComments(code)).toContain('const x = 1');
    });

    it('should preserve code after comments', () => {
      const code = '// comment\nconst x = 1\n// another comment';
      expect(stripComments(code)).toContain('const x = 1');
    });
  });
});
```

### Example 2: Cache Manager Test

```typescript
// src/managers/cacheManager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from './cacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset singleton
    (CacheManager as any).instance = undefined;
    cacheManager = CacheManager.getInstance({
      maxSize: 100,
      ttl: 60000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cacheManager?.dispose?.();
  });

  describe('get', () => {
    it('should return cached value', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent key', () => {
      expect(cacheManager.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      cacheManager.set('key1', 'value1');
      vi.advanceTimersByTime(61000); // Past TTL

      expect(cacheManager.get('key1')).toBeUndefined();
    });

    it('should update access time on get', () => {
      cacheManager.set('key1', 'value1');
      vi.advanceTimersByTime(30000);
      cacheManager.get('key1');
      vi.advanceTimersByTime(30000);

      expect(cacheManager.get('key1')).toBe('value1');
    });
  });

  describe('set', () => {
    it('should store value', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.get('key1')).toBe('value1');
    });

    it('should update existing value', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key1', 'value2');
      expect(cacheManager.get('key1')).toBe('value2');
    });

    it('should evict least recently used when full', () => {
      cacheManager.set('key1', 'value1');
      vi.advanceTimersByTime(100);
      cacheManager.set('key2', 'value2');

      // Assuming maxSize allows only 2 entries
      cacheManager.set('key3', 'value3');

      expect(cacheManager.get('key1')).toBeUndefined();
      expect(cacheManager.get('key2')).toBeDefined();
      expect(cacheManager.get('key3')).toBeDefined();
    });

    it('should handle complex objects', () => {
      const complexObj = {
        nested: { value: 123 },
        array: [1, 2, 3],
      };
      cacheManager.set('key1', complexObj);
      expect(cacheManager.get('key1')).toEqual(complexObj);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.clear();

      expect(cacheManager.get('key1')).toBeUndefined();
      expect(cacheManager.get('key2')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cacheManager.set('key1', 'value1');
      expect(cacheManager.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheManager.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      cacheManager.set('key1', 'value1');
      vi.advanceTimersByTime(61000);

      expect(cacheManager.has('key1')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.get('key1'); // Hit
      cacheManager.get('key2'); // Miss

      const stats = cacheManager.getStats();

      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });
});
```

### Example 3: Debounce Test

```typescript
// src/utils/debounce.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous call if called again', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);

    debouncedFn(); // Cancel previous
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should preserve context', () => {
    const obj = {
      value: 'test',
      method: vi.fn(function () {
        return this.value;
      }),
    };

    const debouncedMethod = debounce(obj.method, 100);
    debouncedMethod.call(obj);
    vi.advanceTimersByTime(100);

    expect(obj.method).toHaveBeenCalled();
  });

  it('should handle immediate option', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100, { leading: true });

    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1); // Immediate call

    vi.advanceTimersByTime(100);
    debouncedFn(); // No immediate call, debounced
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

---

## Next Steps for Implementation

1. **Phase 1: Setup**
   - Install Vitest and coverage dependencies
   - Create `vitest.config.ts`
   - Create `test/setup.ts` with global mocks
   - Update `package.json` scripts

2. **Phase 2: Core Utilities**
   - Test `src/utils/*.ts` files (pure functions)
   - Achieve 100% coverage for utilities
   - Easy win to establish testing pattern

3. **Phase 3: Managers**
   - Test `src/managers/*.ts` files
   - Implement singleton reset pattern
   - Achieve 80%+ coverage

4. **Phase 4: Services**
   - Test `src/services/*.ts` files
   - Mock external APIs (@mistralai/mistralai)
   - Test error handling and retry logic

5. **Phase 5: Providers**
   - Test `src/providers/*.ts` files
   - Most complex, requires comprehensive mocking
   - Focus on critical paths first

6. **Phase 6: Integration**
   - Set up CI/CD for automated testing
   - Add coverage reporting
   - Enforce coverage thresholds

---

## References & Resources

### Official Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html)
- [Vitest Expect API](https://vitest.dev/api/expect.html)
- [VS Code Extension API](https://code.visualstudio.com/api)

### Real-World Examples

- [Roo Code VS Code Extension Tests](https://github.com/RooCodeInc/Roo-Code)
- [Continue VS Code Extension Tests](https://github.com/continuedev/continue)
- [Microsoft VS Code Extensions](https://github.com/microsoft/vscode)

### Best Practices

- [Testing Library Principles](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest Best Practices](https://vitest.dev/guide/)
- [Jest to Vitest Migration](https://vitest.dev/guide/migration#jest)

---

## Summary

This comprehensive testing strategy provides:

1. ✅ **Setup and configuration** for Vitest in a VS Code extension project
2. ✅ **Mocking strategies** for VS Code API (workspace, window, commands, SecretStorage)
3. ✅ **Testing patterns** for each module type (utils, managers, services, providers)
4. ✅ **Singleton testing approach** with proper cleanup
5. ✅ **Async testing patterns** for promises, streams, and timers
6. ✅ **Test organization** with clear naming and structure conventions
7. ✅ **Coverage strategies** to achieve 80%+ target
8. ✅ **Example test files** for each module type
9. ✅ **Mock helpers** to reduce boilerplate
10. ✅ **Implementation roadmap** for phased approach

**Target Audience:**

- **@qa-specialist**: Use this for test planning and coverage verification
- **@builder**: Use this as implementation guide and reference patterns
