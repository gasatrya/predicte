# Agent Guidelines for predicte

## Project Overview

Predicte is a lightweight AI-powered autocomplete extension for VS Code using Mistral's Codestral model. The project follows TypeScript best practices with a focus on clean, maintainable code.

## Build & Development Commands

### Core Commands

```bash
npm run compile           # Compile TypeScript to JavaScript
npm run watch             # Watch for changes and recompile
npm run package           # Build for production (webpack --mode production)
npm run vscode:prepublish # Alias for package command
```

### Linting & Formatting

```bash
npm run lint              # Run ESLint on src directory
npm run lint:fix          # Fix ESLint issues automatically
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting without fixing
```

### Testing Commands

```bash
npm run compile-tests     # Compile test files
npm run watch-tests       # Watch test files for changes
npm run pretest           # Run before tests: compile-tests + compile + lint
```

### Debugging

- Press F5 to launch VS Code Extension Development Host
- Debug configuration in `.vscode/launch.json`

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2020
- Module: CommonJS (VS Code extension requirement)
- Strict mode: Enabled
- No unused locals/parameters: Enabled
- No implicit returns: Enabled
- Source maps: Enabled for debugging

### Import Conventions

```typescript
// External dependencies first
import * as vscode from 'vscode';
import { Mistral } from '@mistralai/mistralai';

// Internal modules grouped by type
import { PredicteConfig } from '../managers/configManager';
import { PredicteSecretStorage } from './secretStorage';
import { CacheManager } from '../managers/cacheManager';

// Type imports for type-only dependencies
import type { MistralError } from '@mistralai/mistralai/models/errors/mistralerror.js';
```

### Naming Conventions

- **Classes**: PascalCase (e.g., `CodestralAPIClient`, `CacheManager`)
- **Interfaces**: PascalCase (e.g., `CompletionRequest`, `CompletionResult`)
- **Types**: PascalCase (e.g., `APIClientError`)
- **Variables/Functions**: camelCase (e.g., `getCompletion`, `cacheKey`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Private members**: camelCase with underscore prefix NOT used (e.g., `private cache: CacheManager`)
- **File names**: camelCase for implementation files (e.g., `apiClient.ts`)

### Error Handling

```typescript
// Custom error classes with error codes
export class APIClientError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = 'APIClientError';
    }
}

// Use error codes for different error types
throw new APIClientError('API key not found', 'MISSING_API_KEY');
throw new APIClientError('Rate limit exceeded', 'RATE_LIMIT', error);

// Handle errors with specific error codes
try {
    await client.getCompletion(request);
} catch (error) {
    if (error instanceof APIClientError && error.code === 'RATE_LIMIT') {
        // Handle rate limit specifically
    }
}
```

### Async/Await Patterns

- Always use `async/await` over raw promises
- Mark async functions with explicit return types
- Use `try/catch` for error handling in async functions
- Avoid floating promises - ESLint enforces `@typescript-eslint/no-floating-promises`

### Documentation Standards

```typescript
/**
 * Brief description of the class/function
 *
 * Detailed explanation including:
 * - Purpose and responsibilities
 * - Key features
 * - Usage examples
 *
 * @param request The completion request
 * @returns Promise resolving to the completion result
 * @throws APIClientError if the request fails
 */
async getCompletion(request: CompletionRequest): Promise<CompletionResult> {
    // Implementation
}
```

### File Structure Conventions

```
src/
├── extension.ts                 # Main entry point
├── providers/                   # VS Code providers
│   └── completionProvider.ts    # Inline completion provider
├── services/                    # Business logic services
│   ├── mistralClient.ts            # External API communication
│   └── secretStorage.ts        # Secret management
├── managers/                    # State and resource managers
│   ├── configManager.ts        # Configuration management
│   └── cacheManager.ts         # Caching implementation
└── utils/                       # Utility functions
    ├── codeUtils.ts            # Code manipulation
    ├── contextUtils.ts         # Context extraction
    ├── debounce.ts             # Debounce utility
    └── logger.ts               # Logging utility
```

### ESLint Rules (enforced)

- `@typescript-eslint/no-explicit-any`: warn (avoid `any` type)
- `@typescript-eslint/no-unused-vars`: error (ignore args with `^_` prefix)
- `@typescript-eslint/no-floating-promises`: error (prevent unhandled promises)
- `@typescript-eslint/no-misused-promises`: error (prevent promise misuse)
- `no-console`: warn (allow only `console.warn` and `console.error`)

### Prettier Configuration

- Semi-colons: required
- Trailing commas: ES5 style
- Single quotes: yes
- Print width: 100 characters
- Tab width: 4 spaces
- Use tabs: false
- Arrow parens: always
- End of line: LF

### Type Safety Guidelines

- Use `strict: true` in TypeScript configuration
- Avoid `any` type - use `unknown` or specific types
- Use type guards for runtime type checking
- Prefer interfaces over type aliases for object shapes
- Use `readonly` for immutable properties
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### Project-Specific Patterns

#### API Client Patterns

- Use official `@mistralai/mistralai` SDK
- Implement retry logic with exponential backoff
- Cache completions using LRU cache
- Handle streaming and non-streaming responses
- Provide comprehensive error messages

#### Configuration Management

- Use VS Code's configuration API
- Store secrets in VS Code's SecretStorage
- Validate configuration values
- Provide default values for all settings

#### Caching Strategy

- LRU cache with configurable TTL
- Cache key includes model, parameters, and prompt
- Clear cache on configuration changes
- Provide cache statistics

## Specialist Agent Usage

### When to Invoke Specialists

- **Builder**: For implementing features, fixing bugs, or making code changes
- **Reviewer**: After builder completes work, before moving to QA
- **QA Specialist**: After reviewer approves, to validate implementation
- **Debugger**: When encountering runtime errors or logical bugs
- **Researcher**: For gathering documentation, examples, or best practices
- **Git Committer**: To commit changes with appropriate messages
- **Vitest Specialist**: For writing and maintaining tests (when tests are added)

### Workflow Guidelines

1. **Plan**: Understand requirements and create implementation plan
2. **Build**: Use builder agent to implement changes
3. **Review**: Use reviewer agent to check code quality
4. **Test**: Use QA specialist to validate functionality
5. **Commit**: Use git committer to save changes

### Tool Usage Guidelines

- **gh_grep**: Search real-world code examples from GitHub
- **context7**: Fetch up-to-date documentation for libraries
- **web-search-prime**: General web searches for information
- **playwright**: UI testing (when applicable)

## Development Environment

- Node.js 20.x or later required
- VS Code 1.90.0 or later for extension development
- TypeScript 5.9.3
- Webpack for bundling

## Quality Standards

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must not produce errors
- Async operations must have proper error handling
- Public APIs must have JSDoc documentation
- Error messages must be user-friendly and actionable
