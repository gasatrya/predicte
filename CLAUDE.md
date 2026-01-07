# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Predicte** is a VS Code extension providing AI-powered code autocomplete using Mistral's Codestral model. It focuses on lightweight, fast inline completions with smart caching, debouncing, and LSP conflict resolution.

**Tech Stack:**
- TypeScript 5.9.3 (strict mode)
- VS Code Extension API (InlineCompletionItemProvider)
- @mistralai/mistralai SDK
- Node.js 20+
- esbuild for bundling

## Build & Development Commands

### Core Development
```bash
npm run compile           # Compile: check-types + lint + esbuild
npm run watch             # Watch mode for development (runs esbuild + tsc in parallel)
npm run package           # Production build
npm run check-types       # Type check without emitting (tsc --noEmit)
```

### Quality Gates
```bash
npm run lint              # Run ESLint on src/
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Format with Prettier
npm run format:check      # Check formatting without fixing
```

### Testing
```bash
npm run compile-tests     # Compile test files to out/
npm run watch-tests       # Watch test files
npm run pretest           # Run before tests: compile-tests + compile + lint
npm run test              # Run VS Code extension tests
```

### Debugging
- Press **F5** to launch Extension Development Host
- Debug config: `.vscode/launch.json`

## Architecture Overview

```
extension.ts (entry point)
    │
    ├── PredicteConfig ────► Configuration manager with 24+ settings
    ├── PredicteSecretStorage ──► Secure API key storage (VSCode SecretStorage)
    ├── PredicteCompletionProvider ──► Main InlineCompletionItemProvider
    │       │
    │       ├── MistralClient ──► API communication (@mistralai/mistralai)
    │       ├── CacheManager ──► LRU cache with TTL
    │       └── ContextUtils ──► Smart context extraction (imports, functions, types)
    │
    ├── PerformanceMonitor ──► Metrics (P50/P90/P95/P99 latency, cache hit rate)
    └── StatusBarController ──► Status bar items (toggle button, loading indicator)
```

### Key Components

**Providers:**
- `src/providers/completionProvider.ts` - Main inline completion logic, debouncing, LSP conflict detection
- `src/providers/statusBarController.ts` - Status bar UI (toggle switch, loading spinner)

**Managers:**
- `src/managers/configManager.ts` - Wraps VS Code workspace configuration, handles change watching via `watchChanges()`
- `src/managers/cacheManager.ts` - LRU cache for completions (configurable TTL)
- `src/managers/performanceMetrics.ts` - Tracks latency percentiles, success rate, cache performance
- `src/managers/completionStateManager.ts` - Tracks active completion state for multi-granularity acceptance

**Services:**
- `src/services/mistralClient.ts` - Mistral/Codestral API client with streaming support
- `src/services/secretStorage.ts` - Secure API key storage wrapper

**Utilities:**
- `src/utils/contextUtils.ts` - Context extraction (imports, function defs, type defs)
- `src/utils/codeUtils.ts` - Completion sanitization, word/line boundary detection
- `src/utils/debounceUtils.ts` - Optimized debouncing (150ms default based on Zed's Codestral research)
- `src/utils/logger.ts` - Structured logging with DEBUG/INFO levels
- `src/utils/syntaxChecker.ts` - Detects incomplete code for continuation triggering

### Activation Flow (extension.ts)

1. Initialize `PredicteConfig`, `PredicteSecretStorage`, `Logger`
2. Optionally initialize `PerformanceMonitor` and `StatusBarController` based on config
3. Create `PredicteCompletionProvider` with all dependencies
4. Register `InlineCompletionItemProvider` for all languages (`{ pattern: '**' }`)
5. Register commands: toggle, setApiKey, clearCache, showStatus, showMetrics
6. Register multi-granularity acceptance commands: acceptWord, acceptLine, acceptFull
7. Show welcome prompt if API key not set

## Configuration System

The extension has 24+ configuration settings under `predicte.*` namespace. Key settings:

| Setting | Default | Purpose |
|---------|---------|---------|
| `predicte.model` | `codestral-latest` | Codestral model selection |
| `predicte.debounceDelay` | `150` | Delay before triggering autocomplete (ms) |
| `predicte.contextLines` | `50` | Context window size |
| `predicte.cacheEnabled` | `true` | LRU cache for completions |
| `predicte.enableStreaming` | `true` | Streaming responses |
| `predicte.qualityFilteringEnabled` | `true` | Request multiple candidates, select best |
| `predicte.debugMode` | `false` | Enable verbose logging |
| `predicte.hideWhenLSPActive` | `true` | Hide AI completions when LSP menu visible |

**Important:** `PredicteConfig.watchChanges()` is used to listen for configuration changes. The `reloadConfig()` method is necessary because `vscode.workspace.getConfiguration()` returns a cached snapshot.

## Key Design Patterns

**Debouncing:** Requests are debounced (default 150ms) to balance responsiveness with API rate limits. The delay is based on Zed editor's Codestral timing research.

**LSP Conflict Resolution:** When `editorHasCompletionSuggestions` is true, AI completions are hidden. User can hold Alt to preview AI suggestions while LSP menu is active.

**Multi-granularity Acceptance:** Users can accept word/line/full completion via keyboard shortcuts. The completion state is tracked in `CompletionStateManager` to enable partial acceptance.

**Quality Filtering:** When enabled, the extension requests 3-5 candidates and selects the best one using heuristics (completion length, bracket balance, etc.).

**Continuation Detection:** Automatically detects incomplete code (unclosed brackets, incomplete statements) and triggers follow-up completions after `continuationDelay`.

## Issue Tracker

This project uses **beads** for issue tracking (not GitHub Issues). Use `beads` skill to understand how it works. Quick commands:

```bash
bd ready --json                                                                 # Find available work
bd create "Issue title" -t bug|feature|task|epic -p 0-4 -d "Description" --json # Create new issue
bd show <id> [<id>...] --json                                                   # Get issue details (supports multiple IDs)
bd update <id> [<id>...] --status in_progress --json                            # Update one or more issues
bd close <id> [<id>...] --reason "Done" --json                                  # Complete work (supports multiple IDs)
bd reopen <id> [<id>...] --reason "Reopening" --json                            # Reopen closed issues (supports multiple IDs)
bd sync                                                                         # Sync with git
```

## Quality Standards

All code must:
- Pass `npm run lint` (ESLint)
- Pass `npm run check-types` (TypeScript strict mode)
- Be formatted with Prettier (`npm run format`)
- Include JSDoc for public APIs
- Have user-friendly error messages

## Worktree Manager

- Use `git-worktree-runner` skill for managing git worktree

## Session Completion Workflow

**MANDATORY:** When ending a work session, you MUST push all changes to remote.

1. File issues for remaining work (via `bd`)
2. Run quality gates: `npm run lint && npm run check-types`
3. Update issue status via `bd`
4. Push to remote:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. Verify: All changes committed AND pushed
