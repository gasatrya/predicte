# Mocha Migration Plan

**Date:** January 2, 2026
**Branch:** `code-review-qa-2025-01-01`
**Author:** Doc Writer / Migration Specialist

## Executive Summary

This document provides a comprehensive, step-by-step plan to migrate the test suite from Vitest to Mocha for VS Code extension testing. The migration is necessary because Vitest 4.0.16 is incompatible with CommonJS modules, which are required for VS Code extensions.

**Current State:**

- 6 test files in Vitest format (3,830 lines total)
- Vitest 4.0.16 installed
- Comprehensive test coverage with mocks for VS Code API

**Target State:**

- Mocha test framework with ts-node
- All tests preserved and converted
- Compatible with VS Code extension CommonJS output

---

## 1. Pre-Migration Backup Strategy

### 1.1 Backup Steps

Before starting any migration work, create a complete backup of the current test state.

**Micro-Task 1.1.1: Create Backup Directory**

```bash
# Create backup directory
mkdir -p backup/vitest-tests-$(date +%Y%m%d)

# Copy all test files
cp src/utils/*.test.ts backup/vitest-tests-$(date +%Y%m%d)/

# Copy test configuration
cp vitest.config.ts backup/vitest-tests-$(date +%Y%m%d)/

# Copy VS Code mock
cp src/__mocks__/vscode.ts backup/vitest-tests-$(date +%Y%m%d)/

# Copy package.json for reference
cp package.json backup/vitest-tests-$(date +%Y%m%d)/
```

**Estimated Time:** 2 minutes

**Verification:**

- [ ] Backup directory exists
- [ ] All 6 test files are copied
- [ ] vitest.config.ts is copied
- [ ] vscode.ts mock is copied
- [ ] package.json is copied

**Revert Command:**

```bash
rm -rf src/utils/*.test.ts
cp backup/vitest-tests-*/src/utils/*.test.ts src/utils/
cp backup/vitest-tests-*/vitest.config.ts ./
cp backup/vitest-tests-*/src/__mocks__/vscode.ts src/__mocks__/
```

### 1.2 Create Git Commit Before Migration

**Micro-Task 1.2.1: Create Safe Point Commit**

```bash
git add -A
git commit -m "chore: backup state before Mocha migration

- Backup of all 6 Vitest test files
- Backup of vitest.config.ts
- Backup of VS Code mock
- Ready point for rollback if needed"
```

**Estimated Time:** 1 minute

**Verification:**

- [ ] Commit created successfully
- [ ] `git log` shows the backup commit
- [ ] Working tree is clean after commit

**Revert Command:**

```bash
git revert HEAD
```

---

## 2. Micro-Task Breakdown

The migration is divided into atomic, verifiable tasks. Each task can be completed independently and has a clear verification step.

### Phase 1: Dependency Management

| Task ID | Task Description           | Estimated Time | Revertible          |
| ------- | -------------------------- | -------------- | ------------------- |
| 2.1.1   | Remove Vitest dependencies | 2 min          | Yes (npm install)   |
| 2.1.2   | Install Mocha and ts-node  | 3 min          | Yes (npm uninstall) |
| 2.1.3   | Install @types/mocha       | 1 min          | Yes (npm uninstall) |

**Micro-Task 2.1.1: Remove Vitest Dependencies**

```bash
# Remove Vitest and related packages
npm uninstall vitest @vitest/coverage-v8

# Verify removal
cat package.json | grep -E "vitest|@vitest" || echo "Vitest removed successfully"
```

**Verification:**

- [ ] `vitest` not in package.json devDependencies
- [ ] `@vitest/coverage-v8` not in package.json devDependencies
- [ ] npm install completes without errors

**Revert Command:**

```bash
npm install vitest@4.0.16 @vitest/coverage-v8@4.0.16
```

---

**Micro-Task 2.1.2: Install Mocha and ts-node**

```bash
# Install Mocha and ts-node for running TypeScript tests
npm install --save-dev mocha ts-node @types/node

# Verify installation
npm list mocha ts-node
```

**Verification:**

- [ ] `mocha` appears in devDependencies
- [ ] `ts-node` appears in devDependencies
- [ ] `npm list` shows packages installed

**Revert Command:**

```bash
npm uninstall mocha ts-node
```

---

**Micro-Task 2.1.3: Install Chai Assertions**

```bash
# Install Chai for assertions (similar to Vitest's expect)
npm install --save-dev chai @types/chai

# Verify installation
npm list chai @types/chai
```

**Verification:**

- [ ] `chai` appears in devDependencies
- [ ] `@types/chai` appears in devDependencies

**Revert Command:**

```bash
npm uninstall chai @types/chai
```

---

### Phase 2: Configuration Setup

| Task ID | Task Description            | Estimated Time | Revertible                |
| ------- | --------------------------- | -------------- | ------------------------- |
| 2.2.1   | Delete vitest.config.ts     | 1 min          | Yes (restore from backup) |
| 2.2.2   | Create Mocha configuration  | 5 min          | Yes (delete file)         |
| 2.2.3   | Update package.json scripts | 3 min          | Yes (restore from backup) |

**Micro-Task 2.2.1: Delete Vitest Configuration**

```bash
# Remove vitest.config.ts
rm vitest.config.ts

# Verify removal
ls -la vitest.config.ts || echo "File deleted successfully"
```

**Verification:**

- [ ] File does not exist in working directory

**Revert Command:**

```bash
cp backup/vitest-tests-*/vitest.config.ts .
```

---

**Micro-Task 2.2.2: Create Mocha Configuration**

Create `.mocharc.json` in the project root:

```json
{
  "extension": ["ts"],
  "spec": "src/**/*.test.ts",
  "exclude": ["node_modules", "dist", "out", "backup/**"],
  "timeout": 10000,
  "require": "ts-node/register",
  "reporter": "spec",
  "slow": 75,
  "ui": "bdd"
}
```

**Alternative: Create test/mocha.opts for older Mocha versions**

```
--require ts-node/register
--timeout 10000
--reporter spec
src/**/*.test.ts
```

**Verification:**

- [ ] File `.mocharc.json` created
- [ ] File is valid JSON
- [ ] Mocha can parse the configuration (run `npx mocha --version`)

**Revert Command:**

```bash
rm .mocharc.json
```

---

**Micro-Task 2.2.3: Update package.json Scripts**

Update the test-related scripts in package.json:

```json
{
  "scripts": {
    "test": "npm run test:unit",
    "test:unit": "mocha",
    "test:unit:run": "mocha --no-exit",
    "test:unit:coverage": "nyc mocha",
    "test:unit:watch": "mocha --watch",
    "compile-tests": "tsc -p . --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint"
  }
}
```

**Also add nyc for coverage:**

```bash
npm install --save-dev nyc @istanbuljs/nyc-config-typescript
```

**Verification:**

- [ ] Scripts updated in package.json
- [ ] `npm run test:unit -- --version` shows Mocha version
- [ ] `npm run test:unit` doesn't throw errors (even if tests fail)

**Revert Command:**

```bash
# Restore from git
git checkout package.json
```

---

### Phase 3: VS Code Mock Update

| Task ID | Task Description              | Estimated Time | Revertible                |
| ------- | ----------------------------- | -------------- | ------------------------- |
| 2.3.1   | Update VS Code mock for Mocha | 5 min          | Yes (restore from backup) |

**Micro-Task 2.3.1: Update VS Code Mock**

Update `src/__mocks__/vscode.ts` to work with Mocha instead of Vitest:

```typescript
import { stub } from 'chai';

// Mock VS Code API globally using Chai stubs
const mockVSCode = {
  workspace: {
    getConfiguration: stub(),
    onDidChangeConfiguration: stub(),
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: stub(),
    showWarningMessage: stub(),
    showInformationMessage: stub(),
    createStatusBarItem: stub(),
    createOutputChannel: stub(),
  },
  commands: {
    registerCommand: stub(),
    executeCommand: stub(),
  },
  SecretStorage: stub(),
  EventEmitter: stub(),
  Disposable: {
    from: stub(),
  },
  Uri: {
    file: stub(),
    joinPath: stub(),
  },
  Range: stub().callsFake((startLine, startChar, endLine, endChar) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
    contains: function (position: any) {
      /* implementation */
    },
    isBefore: function (other: any) {
      /* implementation */
    },
    isAfter: function (other: any) {
      /* implementation */
    },
  })),
  Position: stub().callsFake((line, character) => ({ line, character })),
  CompletionItem: stub(),
  InlineCompletionItem: stub(),
  InlineCompletionTriggerKind: {
    Automatic: 0,
    Invoke: 1,
  },
};

export default mockVSCode;

// Helper function to create stubbed methods
export function createStub() {
  return stub();
}
```

**Verification:**

- [ ] File updated with Chai stubs
- [ ] TypeScript compiles without errors
- [ ] No Vitest imports remain in the file

**Revert Command:**

```bash
cp backup/vitest-tests-*/src/__mocks__/vscode.ts src/__mocks__/vscode.ts
```

---

### Phase 4: Test File Conversion

| Task ID | Task Description                | Estimated Time | Revertible                |
| ------- | ------------------------------- | -------------- | ------------------------- |
| 2.4.1   | Convert logger.test.ts          | 10 min         | Yes (restore from backup) |
| 2.4.2   | Convert debounce.test.ts        | 10 min         | Yes (restore from backup) |
| 2.4.3   | Convert contextUtils.test.ts    | 15 min         | Yes (restore from backup) |
| 2.4.4   | Convert completionUtils.test.ts | 12 min         | Yes (restore from backup) |
| 2.4.5   | Convert codeUtils.test.ts       | 12 min         | Yes (restore from backup) |
| 2.4.6   | Convert syntaxChecker.test.ts   | 8 min          | Yes (restore from backup) |

**See Section 3 for detailed conversion guide.**

---

### Phase 5: Verification

| Task ID | Task Description          | Estimated Time | Revertible |
| ------- | ------------------------- | -------------- | ---------- |
| 2.5.1   | Run individual test files | 5 min          | N/A        |
| 2.5.2   | Run full test suite       | 3 min          | N/A        |
| 2.5.3   | Generate coverage report  | 5 min          | N/A        |

---

## 3. Detailed Conversion Guide

### 3.1 Vitest to Mocha Syntax Mapping

| Vitest                                                                     | Mocha                                                         | Notes                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'` | `import { describe, it, before, after, should } from 'mocha'` | Import from mocha, use Chai for assertions |
| `describe('name', () => { ... })`                                          | `describe('name', function() { ... })`                        | Use function instead of arrow function     |
| `it('should do x', () => { ... })`                                         | `it('should do x', function() { ... })`                       | Use function instead of arrow function     |
| `beforeEach(() => { ... })`                                                | `beforeEach(function() { ... })`                              | Use function instead of arrow function     |
| `afterEach(() => { ... })`                                                 | `afterEach(function() { ... })`                               | Use function instead of arrow function     |
| `expect(value).toBe(expected)`                                             | `expect(value).to.equal(expected)`                            | Chai assertion                             |
| `expect(value).toEqual(expected)`                                          | `expect(value).to.deep.equal(expected)`                       | Chai deep equality                         |
| `expect(value).toBeDefined()`                                              | `expect(value).to.beDefined`                                  | Chai assertion                             |
| `expect(value).toContain(item)`                                            | `expect(value).to.include(item)`                              | Chai assertion                             |
| `expect(fn).toThrow()`                                                     | `expect(fn).to.throw()`                                       | Chai assertion                             |
| `expect(value).toBeGreaterThan(n)`                                         | `expect(value).to.be.above(n)`                                | Chai assertion                             |
| `expect(value).toBeLessThanOrEqual(n)`                                     | `expect(value).to.be.at.most(n)`                              | Chai assertion                             |
| `expect(value).toHaveLength(n)`                                            | `expect(value).to.have.lengthOf(n)`                           | Chai assertion                             |
| `expect(value).toHaveProperty('prop')`                                     | `expect(value).to.have.property('prop')`                      | Chai assertion                             |
| `expect(() => fn()).rejects.toThrow()`                                     | `expect(fn).to.throw()`                                       | For sync errors                            |
| `expect(() => fn()).not.toThrow()`                                         | `expect(fn).to.not.throw()`                                   | Negative assertions                        |
| `vi.fn()`                                                                  | `sinon.stub()` or `() => {}`                                  | Use sinon or simple functions              |
| `vi.fn().mockReturnValue(x)`                                               | `sinon.stub().returns(x)`                                     | Requires sinon                             |
| `vi.fn().mockResolvedValue(x)`                                             | `sinon.stub().resolves(x)`                                    | Requires sinon                             |
| `vi.mock('module')`                                                        | Use require() or manual mocking                               | Manual approach needed                     |
| `vi.clearAllMocks()`                                                       | Reset stubs in beforeEach                                     | Manual reset needed                        |
| `vi.useFakeTimers()`                                                       | `useFakeTimers()` from lolex                                  | Requires additional package                |
| `vi.advanceTimersByTime(ms)`                                               | `clock.tick(ms)`                                              | With lolex                                 |
| `vi.restoreAllMocks()`                                                     | `stub.restore()`                                              | With sinon                                 |
| `vi.spyOn(obj, 'method')`                                                  | `sinon.stub(obj, 'method')`                                   | With sinon                                 |

### 3.2 Mocking Imports

**Vitest approach:**

```typescript
import { vi } from 'vitest';
vi.mock('vscode');
const mockVscode = vi.mocked(vscode);
```

**Mocha approach:**

```typescript
// Use proxyquire or manual proxy
import proxyquire from 'proxyquire';

// Or manually stub before import
const vscode = {
  window: {
    createOutputChannel: () => mockChannel,
  },
};
```

### 3.3 Timer Handling

**Vitest approach:**

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});
```

**Mocha approach:**

```bash
npm install --save-dev lolex @types/lolex
```

```typescript
import 'lolex';
let clock: lolex.LolexClock;

beforeEach(() => {
  clock = lolex.install();
});
afterEach(() => {
  clock.uninstall();
});

// Usage: clock.tick(100);
```

### 3.4 Example Conversion: Simple Test

**Vitest (Before):**

```typescript
import { describe, it, expect } from 'vitest';

describe('MathUtils', () => {
  describe('add', () => {
    it('should add two numbers', () => {
      const result = add(2, 3);
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      const result = add(-1, 1);
      expect(result).toBe(0);
    });
  });
});
```

**Mocha (After):**

```typescript
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('MathUtils', () => {
  describe('add', () => {
    it('should add two numbers', () => {
      const result = add(2, 3);
      expect(result).to.equal(5);
    });

    it('should handle negative numbers', () => {
      const result = add(-1, 1);
      expect(result).to.equal(0);
    });
  });
});
```

### 3.5 Example Conversion: Test with Mock

**Vitest (Before):**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode');

describe('Logger', () => {
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel = {
      appendLine: vi.fn(),
      show: vi.fn(),
    };
    (vscode.window.createOutputChannel as any).mockReturnValue(mockChannel);
  });

  it('should log messages', () => {
    const logger = new Logger('Test');
    logger.info('Test message');
    expect(mockChannel.appendLine).toHaveBeenCalled();
  });
});
```

**Mocha (After):**

```typescript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

// Mock vscode module before importing the module under test
const mockChannel = {
  appendLine: sinon.stub(),
  show: sinon.stub(),
};

const mockVscode = {
  window: {
    createOutputChannel: sinon.stub().returns(mockChannel),
  },
};

// Proxyquire for module mocking
import proxyquire from 'proxyquire';
const { Logger } = proxyquire('./logger', {
  vscode: mockVscode,
});

describe('Logger', () => {
  beforeEach(() => {
    sinon.resetHistory();
  });

  it('should log messages', () => {
    const logger = new Logger('Test');
    logger.info('Test message');
    expect(mockChannel.appendLine.calledOnce).to.be.true;
  });
});
```

---

## 4. Test File Conversion Checklist

### 4.1 logger.test.ts (343 lines)

**Changes Required:**

- [ ] Remove Vitest imports
- [ ] Add Mocha imports: `import { describe, it, before, after } from 'mocha'`
- [ ] Add Chai imports: `import { expect } from 'chai'`
- [ ] Add sinon for mocking: `import * as sinon from 'sinon'`
- [ ] Replace `vi.mock('vscode')` with proxyquire mock
- [ ] Replace `vi.clearAllMocks()` with `sinon.resetHistory()`
- [ ] Replace `vi.fn()` with `sinon.stub()`
- [ ] Replace `expect(...).toHaveBeenCalled()` with `expect(stub.calledOnce).to.be.true`
- [ ] Replace `expect(...).toHaveBeenCalledWith(...)` with `expect(stub.calledWith(...)).to.be.true`
- [ ] Replace `expect(...).not.toHaveBeenCalled()` with `expect(stub.called).to.be.false`
- [ ] Replace `vi.spyOn(global, 'Date')` with `sinon.spy(Date, 'constructor')` or mock implementation
- [ ] Replace `vi.restoreAllMocks()` with `sinon.restore()`
- [ ] Replace `vi.mocked(vscode)` with direct mock object
- [ ] Replace `vi.fn().mockReturnValue(value)` with `sinon.stub().returns(value)`
- [ ] Replace `vi.fn().mockResolvedValue(value)` with `sinon.stub().resolves(value)`
- [ ] Replace `describe('name', () => {` with `describe('name', function() {`
- [ ] Replace `it('name', () => {` with `it('name', function() {`
- [ ] Replace `beforeEach(() => {` with `beforeEach(function() {`
- [ ] Replace `afterEach(() => {` with `afterEach(function() {`
- [ ] Add `import './logger';` at the end for global logger tests
- [ ] Replace `vi.resetModules()` with appropriate module reset approach

**Estimated Changes:** ~50+ assertion replacements, 10+ mock replacements

---

### 4.2 debounce.test.ts (486 lines)

**Changes Required:**

- [ ] Remove Vitest imports
- [ ] Add Mocha imports
- [ ] Add Chai imports
- [ ] Add lolex for timer mocking: `import * as lolex from 'lolex'`
- [ ] Add sinon for stubbing: `import * as sinon from 'sinon'`
- [ ] Replace `vi.useFakeTimers()` with `lolex.install()`
- [ ] Replace `vi.useRealTimers()` with `clock.uninstall()`
- [ ] Replace `vi.advanceTimersByTime(ms)` with `clock.tick(ms)`
- [ ] Replace `vi.fn()` with `sinon.stub()`
- [ ] Replace `vi.fn().mockResolvedValue(value)` with `sinon.stub().resolves(value)`
- [ ] Replace `expect(fn).toHaveBeenCalledTimes(n)` with `expect(fn.callCount).to.equal(n)`
- [ ] Replace `expect(fn).toHaveBeenCalledWith(...)` with `expect(fn.calledWith(...)).to.be.true`
- [ ] Replace `expect(result).toBe(value)` with `expect(result).to.equal(value)`
- [ ] Replace `expect(typeof result).toBe('string')` with `expect(typeof result).to.equal('string')`
- [ ] Replace `expect(Array.isArray(result)).toBe(true)` with `expect(Array.isArray(result)).to.be.true`
- [ ] Replace `expect(result).toEqual({...})` with `expect(result).to.deep.equal({...})`
- [ ] Replace `expect(promise).rejects.toThrow(...)` with `expect(promise).to.eventually.throw`
- [ ] Replace `expect(callbackCalled).toBe(true)` with `expect(callbackCalled).to.be.true`
- [ ] All describe/it function wrappers to use `function()` syntax

**Estimated Changes:** ~60+ assertion replacements, 20+ mock replacements

---

### 4.3 contextUtils.test.ts (1037 lines)

**Changes Required:**

- [ ] Remove Vitest imports
- [ ] Add Mocha imports
- [ ] Add Chai imports
- [ ] Add sinon for stubbing
- [ ] Replace `vi.mock('vscode')` with proxyquire mock
- [ ] Replace `vi.clearAllMocks()` with `sinon.resetHistory()`
- [ ] Replace `vi.fn()` with `sinon.stub()`
- [ ] Replace `vi.fn().mockImplementation(...)` with `sinon.stub().callsFake(...)`
- [ ] Replace `expect(...).toBeDefined()` with `expect(...).to.beDefined`
- [ ] Replace `expect(...).toBe('value')` with `expect(...).to.equal('value')`
- [ ] Replace `expect(...).toContain('text')` with `expect(...).to.include('text')`
- [ ] Replace `expect(context).toHaveProperty('prefix')` with `expect(context).to.have.property('prefix')`
- [ ] Replace `expect(typeof prompt).toBe('string')` with `expect(typeof prompt).to.equal('string')`
- [ ] Replace `expect(fn).toHaveBeenCalledWith(expect.any(Number))` with custom assertion
- [ ] Replace `vi.spyOn(...)` with `sinon.spy(...)`
- [ ] Replace `require('./contextUtils')` pattern with proper module isolation
- [ ] All describe/it function wrappers to use `function()` syntax

**Estimated Changes:** ~80+ assertion replacements, 30+ mock replacements

---

### 4.4 completionUtils.test.ts (732 lines)

**Changes Required:**

- [ ] Remove Vitest imports
- [ ] Add Mocha imports
- [ ] Add Chai imports
- [ ] Add sinon for stubbing
- [ ] Replace `vi.mock('vscode')` with proxyquire mock
- [ ] Replace `vi.fn()` with `sinon.stub()`
- [ ] Replace `vi.fn().mockImplementation(...)` with `sinon.stub().callsFake(...)`
- [ ] Replace `expect(...).toBe(n)` with `expect(...).to.equal(n)`
- [ ] Replace `expect(position.line).toBe(0)` with `expect(position.line).to.equal(0)`
- [ ] Replace `expect(range.start.character).toBe(8)` with `expect(range.start.character).to.equal(8)`
- [ ] Replace `expect(result).toBeGreaterThan(0)` with `expect(result).to.be.above(0)`
- [ ] Replace `expect(result).toBeLessThan(100)` with `expect(result).to.be.below(100)`
- [ ] Replace `expect(ranked[0].score).toBeCloseTo(expected, 2)` with `expect(ranked[0].score).to.be.closeTo(expected, 2)`
- [ ] Replace `expect(() => fn()).toThrow()` with `expect(fn).to.throw()`
- [ ] Replace `expect(() => fn()).not.toThrow()` with `expect(fn).to.not.throw()`
- [ ] Custom Range/Position mock needs to work with sinon stubs
- [ ] All describe/it function wrappers to use `function()` syntax

**Estimated Changes:** ~70+ assertion replacements, 25+ mock replacements

---

### 4.5 codeUtils.test.ts (759 lines)

**Changes Required:**

- [ ] Remove Vitest imports
- [ ] Add Mocha imports
- [ ] Add Chai imports
- [ ] Add sinon for stubbing
- [ ] Replace `vi.mock('vscode')` with proxyquire mock
- [ ] Replace `vi.clearAllMocks()` with `sinon.resetHistory()`
- [ ] Replace `vi.fn()` with `sinon.stub()`
- [ ] Replace `expect(...).toBe(0.1)` with `expect(...).to.equal(0.1)`
- [ ] Replace `expect(params.stopSequences).toContain('\n\n')` with `expect(params.stopSequences).to.include('\n\n')`
- [ ] Replace `expect(params.stopSequences).toEqual([...])` with `expect(params.stopSequences).to.deep.equal([...])`
- [ ] Replace `expect(result).toBe('function test() {}')` with `expect(result).to.equal('function test() {}')`
- [ ] Replace `expect(filtered).toHaveLength(2)` with `expect(filtered).to.have.lengthOf(2)`
- [ ] Replace `expect(ranked).toHaveLength(3)` with `expect(ranked).to.have.lengthOf(3)`
- [ ] Replace `expect(duration).toBeLessThan(100)` with `expect(duration).to.be.below(100)`
- [ ] Replace `mockEditBuilder.insert` assertions with sinon assertions
- [ ] All describe/it function wrappers to use `function()` syntax

**Estimated Changes:** ~60+ assertion replacements, 20+ mock replacements

---

### 4.6 syntaxChecker.test.ts (493 lines)

**Changes Required:**

- [ ] Remove Vitest imports (minimal changes needed)
- [ ] Add Mocha imports: `import { describe, it } from 'mocha'`
- [ ] Add Chai imports: `import { expect } from 'chai'`
- [ ] Replace `import { describe, it, expect } from 'vitest'` with Mocha/Chai imports
- [ ] Replace `expect(...).toBe(true)` with `expect(...).to.equal(true)`
- [ ] Replace `expect(...).toBe(false)` with `expect(...).to.equal(false)`
- [ ] Replace `expect(result).toBe(true)` with `expect(result).to.equal(true)`
- [ ] Replace `expect(duration).toBeLessThan(100)` with `expect(duration).to.be.below(100)`
- [ ] Replace `expect(result).toBe(false)` with `expect(result).to.equal(false)`
- [ ] Replace `expect(suggestions).toContain('text')` with `expect(suggestions).to.include('text')`
- [ ] Replace `expect(suggestions).toHaveLength(0)` with `expect(suggestions).to.have.lengthOf(0)`
- [ ] Replace `expect(suggestions.length).toBeGreaterThan(0)` with `expect(suggestions.length).to.be.above(0)`
- [ ] Replace `expect(typeof result).toBe('boolean')` with `expect(typeof result).to.equal('boolean')`
- [ ] Replace `expect(Array.isArray(result)).toBe(true)` with `expect(Array.isArray(result)).to.be.true`
- [ ] Replace `expect(suggestion).toBe('string')` with `expect(suggestion).to.be.a('string')`
- [ ] All describe/it function wrappers to use `function()` syntax
- [ ] Remove nested describe function wrappers that use arrow functions

**Estimated Changes:** ~50+ assertion replacements (simplest file to convert)

---

## 5. Verification Strategy

### 5.1 Individual Test File Verification

After converting each test file, run it individually to verify:

```bash
# Run a single test file
npx mocha src/utils/logger.test.ts

# Run with verbose output
npx mocha src/utils/logger.test.ts --reporter spec

# Run with debugging
npx mocha src/utils/logger.test.ts --inspect-brk
```

**Success Criteria:**

- [ ] Test file executes without syntax errors
- [ ] All tests in the file pass
- [ ] No "ReferenceError: describe is not defined"
- [ ] No "ReferenceError: expect is not defined"
- [ ] Console output is clean (no Vitest warnings)

### 5.2 Full Test Suite Verification

```bash
# Run all tests
npm run test:unit

# Expected output: All tests passing with summary
```

**Success Criteria:**

- [ ] 6 test files execute successfully
- [ ] No test files are skipped
- [ ] All individual tests pass
- [ ] Total test count matches original (should be ~100+ tests)
- [ ] Test execution completes without hanging

### 5.3 Coverage Report Verification

```bash
# Generate coverage report
npm run test:unit:coverage

# Check coverage directory
open coverage/index.html
```

**Success Criteria:**

- [ ] Coverage report generated
- [ ] All source files are included in coverage
- [ ] Line coverage is >= 80%
- [ ] Function coverage is >= 80%
- [ ] Branch coverage is >= 75%
- [ ] No coverage files are missing

### 5.4 TypeScript Compilation Verification

```bash
# Compile tests
npm run compile-tests

# Check output directory
ls -la out/test/
```

**Success Criteria:**

- [ ] TypeScript compilation succeeds
- [ ] No type errors
- [ ] Output files generated in `out/` directory
- [ ] Compiled tests can run independently

---

## 6. Rollback Plan

### 6.1 Safe Points

| Safe Point               | Commit/State                                 | How to Revert                                                  |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------------- |
| Before migration         | `chore: backup state before Mocha migration` | `git revert HEAD`                                              |
| After dependency removal | State after Task 2.1.1                       | `npm install vitest@4.0.16 @vitest/coverage-v8@4.0.16`         |
| After Mocha install      | State after Task 2.1.2                       | `npm uninstall mocha ts-node`                                  |
| After configuration      | State after Task 2.2.2                       | `rm .mocharc.json`                                             |
| After mock update        | State after Task 2.3.1                       | `git checkout -- src/__mocks__/vscode.ts`                      |
| Per test file            | After each Task 2.4.x                        | `cp backup/vitest-tests-*/src/utils/[file].test.ts src/utils/` |

### 6.2 Full Rollback Procedure

If the migration needs to be completely aborted:

```bash
# 1. Reset all test files
cp backup/vitest-tests-*/src/utils/*.test.ts src/utils/

# 2. Restore vitest.config.ts
cp backup/vitest-tests-*/vitest.config.ts ./

# 3. Restore VS Code mock
cp backup/vitest-tests-*/src/__mocks__/vscode.ts src/__mocks__/

# 4. Restore package.json
git checkout package.json

# 5. Reinstall Vitest
npm install vitest@4.0.16 @vitest/coverage-v8@4.0.16

# 6. Verify restoration
npm run test:unit
```

### 6.3 Partial Rollback (Single File)

If only one test file has issues:

```bash
# Restore specific file
cp backup/vitest-tests-*/src/utils/[problematic-file].test.ts src/utils/[problematic-file].test.ts

# Run the restored file to verify
npx mocha src/utils/[problematic-file].test.ts
```

---

## 7. Timeline Estimate

| Phase         | Tasks                 | Estimated Time                 |
| ------------- | --------------------- | ------------------------------ |
| Pre-migration | Backup + Commit       | 5 minutes                      |
| Phase 1       | Dependency Management | 10 minutes                     |
| Phase 2       | Configuration         | 10 minutes                     |
| Phase 3       | Mock Update           | 5 minutes                      |
| Phase 4       | Test Conversion       | ~60 minutes                    |
| Phase 5       | Verification          | 15 minutes                     |
| **Total**     |                       | **~105 minutes (~1.75 hours)** |

### Recommended Schedule

1. **Pre-migration backup** (5 min)
2. **Dependency & Config phases** (20 min)
3. **VS Code mock update** (5 min)
4. **Test file conversion** (60 min) - Break into 6 sessions
5. **Verification** (15 min)

---

## 8. Additional Dependencies

For a complete migration, install these additional packages:

```bash
# For module mocking
npm install --save-dev proxyquire

# For timers in debounce tests
npm install --save-dev lolex @types/lolex

# For stubs and spies
npm install --save-dev sinon @types/sinon

# For coverage
npm install --save-dev nyc @istanbuljs/nyc-config-typescript
```

---

## 9. Post-Migration Cleanup

After successful migration:

1. **Remove backup directory:**

   ```bash
   rm -rf backup/
   ```

2. **Update documentation:**
   - Update README.md with Mocha test instructions
   - Update any references to Vitest in docs

3. **Create a clean commit:**

   ```bash
   git add -A
   git commit -m "chore: migrate from Vitest to Mocha

   - Replaced Vitest with Mocha for VS Code extension compatibility
   - Converted 6 test files (~3,830 lines)
   - Added proxyquire, lolex, sinon for mocking
   - Updated package.json scripts
   - All tests passing with 80%+ coverage"
   ```

---

## 10. Troubleshooting Guide

### Issue: "describe is not defined"

**Cause:** Missing Mocha import or running file directly
**Solution:** Run via `npx mocha` which loads the Mocha CLI

### Issue: "expect is not defined"

**Cause:** Missing Chai import
**Solution:** Add `import { expect } from 'chai'` to test file

### Issue: Tests hang/timeout

**Cause:** Timer issues or infinite loops in tests
**Solution:** Check `beforeEach`/`afterEach` properly clean up timers

### Issue: VS Code mock not working

**Cause:** Mock implementation not matching actual API usage
**Solution:** Use proxyquire to inject mock at import time

### Issue: Coverage not generating

**Cause:** Missing nyc configuration
**Solution:** Create `.nycrc` or add coverage config to package.json

---

## Document Version

- **Version:** 1.0
- **Created:** January 2, 2026
- **Last Updated:** January 2, 2026
- **Status:** Ready for execution by @builder
