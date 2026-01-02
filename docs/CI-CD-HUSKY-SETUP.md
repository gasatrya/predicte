# Implementation Plan: CI/CD and Husky Setup

## Feature Context

**Goal:** Set up automated CI/CD pipeline with GitHub Actions and configure Husky pre-commit hooks for quality gates (linting, formatting, and testing)

**Architecture:**

- **CI/CD:** GitHub Actions workflows for automated testing, linting, and VS Code extension packaging
- **Pre-commit Hooks:** Husky + lint-staged for running quality checks before commits
- **Project Stack:** TypeScript, ESLint, Prettier, Mocha, esbuild

## Execution Steps

### Phase 1: Core CI/CD Pipeline

- [x] **Task 1:** Create GitHub Actions directory structure
  - _Context:_ Create `.github/workflows/` directory
- [x] **Task 2:** Create CI workflow (ci.yml)
  - _Context:_ Trigger on push to main/develop and all PRs
  - _Steps:_ Checkout → Setup Node.js → Install deps → Run lint → Run format check → Run type check → Run tests
- [x] **Task 3:** Create CD workflow (cd.yml)
  - _Context:_ Trigger on tags (v\*); Build and package VSIX; Create release
  - _Steps:_ Checkout → Setup Node.js → Install deps → Build → Package → Create GitHub Release
- [x] **Task 4:** Add Node.js version matrix strategy
  - _Context:_ Test on Node.js 20.x and 22.x (VS Code extension requirements)
- [x] **Task 5:** Add cache configuration for dependencies
  - _Context:_ Use GitHub Actions cache for npm/node_modules

### Phase 2: Husky Pre-commit Hooks

- [x] **Task 6:** Install Husky and lint-staged
  - _Context:_ Add to devDependencies: `npm install --save-dev husky lint-staged`
- [x] **Task 7:** Configure package.json scripts
  - _Context:_ Add `"prepare": "husky"` script (automatically added by husky init)
- [x] **Task 8:** Initialize Husky
  - _Context:_ Run `npx husky init` to create `.husky/` directory and pre-commit hook
- [x] **Task 9:** Configure lint-staged in package.json
  - _Context:_ Add `lint-staged` configuration section for staged TypeScript files
  - _Tasks:_
    - Run ESLint on staged `.ts` files
    - Run Prettier format check on staged files
    - Run type checking on staged files
- [x] **Task 10:** Create commit-msg hook
  - _Context:_ Enforce Conventional Commit message format

### Phase 3: Workflow Refinements

- [x] **Task 11:** Add VSIX artifact upload to CI
  - _Context:_ Upload packaged extension as workflow artifact
- [x] **Task 12:** Add dependency caching
  - _Context:_ Configure npm cache in GitHub Actions
- [x] **Task 13:** Add badge to README.md
  - _Context:_ Add CI/CD status badges

## Research Notes

- VS Code extensions require Node.js 20.x or later per AGENTS.md
- Using `npm pack` for VSIX packaging (esbuild bundles to dist/)
- Husky v9+ uses different initialization - recommend v9 for modern Git hook support
- lint-staged v15+ uses ESM configuration - will configure via package.json for simplicity
- GitHub Actions cache key based on package-lock.json hash

## Configuration Details

### GitHub Actions CI Workflow (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: ['20.x', '22.x']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run check-types
      - run: npm run test:unit
```

### lint-staged Configuration (package.json)

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

### Conventional Commit Pattern

- `feat: Add new feature`
- `fix: Bug fix`
- `docs: Documentation changes`
- `style: Code style changes`
- `refactor: Code refactoring`
- `test: Add tests`
- `chore: Maintenance`

## Changelog

- [2026-01-02] - Implemented CI/CD pipeline and Husky pre-commit hooks
