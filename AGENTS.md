# Agent Guidelines for predicte

## Project Overview

Predicte is a lightweight AI-powered autocomplete extension for VS Code using Mistral's Codestral model. The project follows TypeScript best practices with a focus on clean, maintainable code.

IMPORTANT 1: Use `bd` command for task tracking. Check `beads` skill for more details.
IMPORTANT 2: Use built-in tools and skills to enhance productivity and efficiency.

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

## Quality Standards

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must not produce errors
- Async operations must have proper error handling
- Public APIs must have JSDoc documentation
- Error messages must be user-friendly and actionable

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
