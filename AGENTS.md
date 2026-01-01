# Agent Guidelines for predicte

## Project Overview

Predicte is a lightweight AI-powered autocomplete extension for VS Code using Mistral's Codestral model. The project follows TypeScript best practices with a focus on clean, maintainable code.

---

## The 80/20 Rule

Spend "20%" effort on creating a perfectly broken-down roadmap. If do this right, the "80%" (the actual coding) will be trivial and error-free. Never rush the plan.

---

## Specialist Agent Usage

### When to Invoke Specialists

- **explore**: For exploring codebase and understanding its structure
- **researcher**: For gathering documentation, examples, or best practices
- **builder**: For implementing features, fixing bugs, or making code changes
- **code-reviewer**: To review code and provide feedback.
- **qa-specialist**: Audit code, verifies file structures, and runs tests
- **git-flow**: creating branches for new features or bug fixes, making commits with clear and concise messages, opening pull requests for code review, and merging changes after approval.
- **doc-manager**: For adding, updating, or fixing documentation

### Workflow Guidelines

1. **Plan:** Create the detailed roadmap and micro-tasks. **(Wait for Human Approval)**.
2. **Build:** Implement one micro-task.
3. **Review:** Agent checks code quality.
  * *If bad:* Send back to **Build** with specific feedback.
  * *If good:* Move to **Test**.
4. **Test:** Agent checks functionality.
  * *If fails:* Send back to **Build**.
  * *If passes:* Move to next micro-task. **(Wait for Human Approval)**
5. **Commit:** Once all tasks are done, package it up and commit.

### Tool Usage Guidelines

- **gh_grep**: Search real-world code examples from GitHub
- **context7**: Fetch up-to-date documentation for libraries
- **playwright**: UI testing (when applicable)

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

## Quality Gates

Each feature must pass through these checkpoints before merging:

### Gate 1: Requirements Ready ☐
- [ ] Clear user requirements documented
- [ ] Definition of Done specified
- [ ] Tech constraints identified
- [ ] Branch created via `@git-flow`

### Gate 2: Design Complete ☐
- [ ] Implementation plan created
- [ ] Relevant files explored
- [ ] Research documented (if needed)
- [ ] Dependencies identified

### Gate 3: Implementation Ready ☐
- [ ] Context files provided to `@builder`
- [ ] Technical specifications clear
- [ ] Testing approach defined

### Gate 4: Code Complete ☐
- [ ] Code written
- [ ] Passes linting (`npm run check`)
- [ ] Follows project patterns
- [ ] Self-reviewed

### Gate 5: Review Complete ☐
- [ ] `@code-reviewer` approved
- [ ] Issues addressed
- [ ] Changes committed

### Gate 6: Testing Complete ☐
- [ ] `@qa-specialist` verified
- [ ] Tests pass (`npm run test`)
- [ ] No critical bugs

### Gate 7: Ready for Merge ☐
- [ ] PR created with clear description
- [ ] Documentation updated (if needed)
- [ ] Approved for merge

---

## Testing Strategy

### QA Involvement Points

1. **Before Implementation**: Test plan creation
2. **During Implementation**: Component-level testing
3. **After Implementation**: Integration testing
4. **Before PR**: Full regression testing

### Test Coverage Requirements

| Scenario | Coverage |
|----------|----------|
| Critical paths (authentication, data loading) | 100% |
| New features | 80%+ |
| Bug fixes | Specific scenario tests |
| Refactoring | Existing tests still pass |

---

## Documentation Requirements

### When Documentation is Required

Document must concise and clear.

| Change | Documentation Needed |
|--------|---------------------|
| New feature | Feature doc + API changes |
| Bug fix | Issue resolution doc |
| Breaking change | Migration guide |
| New component | Component usage doc |
| Complex logic | In-code comments + architecture doc |

---

## Development Environment

- Node.js 20.x or later required
- VS Code 1.90.0 or later for extension development
- TypeScript 5.9.3
- Webpack for bundling

---

## Quality Standards

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must not produce errors
- Async operations must have proper error handling
- Public APIs must have JSDoc documentation
- Error messages must be user-friendly and actionable
