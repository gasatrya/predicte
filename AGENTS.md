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

## Quality Standards

- All code must pass ESLint checks
- Code must be formatted with Prettier
- TypeScript strict mode must not produce errors
- Async operations must have proper error handling
- Public APIs must have JSDoc documentation
- Error messages must be user-friendly and actionable
