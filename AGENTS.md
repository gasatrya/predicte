# Agent Guidelines for predicte

## Project Overview

Predicte is a lightweight AI-powered autocomplete extension for VS Code using Mistral's Codestral model. The project follows TypeScript best practices with a focus on clean, maintainable code.

---

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

---

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2020
- Module: CommonJS (VS Code extension requirement)
- Strict mode: Enabled
- No unused locals/parameters: Enabled
- No implicit returns: Enabled
- Source maps: Enabled for debugging

### Naming Conventions

- **Classes**: PascalCase (e.g., `CodestralAPIClient`, `CacheManager`)
- **Interfaces**: PascalCase (e.g., `CompletionRequest`, `CompletionResult`)
- **Types**: PascalCase (e.g., `APIClientError`)
- **Variables/Functions**: camelCase (e.g., `getCompletion`, `cacheKey`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Private members**: camelCase with underscore prefix NOT used (e.g., `private cache: CacheManager`)
- **File names**: camelCase for implementation files (e.g., `apiClient.ts`)

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

---

## Development Environment

- Node.js 20.x or later required
- VS Code 1.90.0 or later for extension development
- TypeScript 5
- esbuild for bundling

---

## Quality Standards

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must not produce errors
- Async operations must have proper error handling
- Public APIs must have JSDoc documentation
- Error messages must be user-friendly and actionable
