# [1.1.0](https://github.com/gasatrya/predicte/compare/v1.0.1...v1.1.0) (2026-01-14)

### Bug Fixes

- revert accidental package-lock.json changes ([b136704](https://github.com/gasatrya/predicte/commit/b136704b7ce5e3accec9a8155d6e6830a210028b))

### Features

- Add lint-staged to pre-commit hook ([f0ac98f](https://github.com/gasatrya/predicte/commit/f0ac98fcc7c72c432a79f734366119983dbb9a7e))
- prevent auto-complete in source control input box ([f6d0ddc](https://github.com/gasatrya/predicte/commit/f6d0ddc5df084c1f06b5f5959b628b1a6d406c20))

## [1.0.0] - 2026-01-10

### Added

- **Inline Completions**: Real-time logic for multi-line and single-line completions.
- **Smart Caching**: LRU cache with configurable TTL to minimize API usage.
- **Streaming Support**: Low-latency responses using Mistral's streaming API.
- **Context Awareness**: Extracts imports, function definitions, and type signatures for better suggestions.
- **Keybindings**:
  - `Tab` / `Cmd+Right`: Accept next word
  - `Cmd+Down`: Accept next line
  - `Tab`: Accept full completion
- **Secrets Management**: Securely stores API keys using VS Code's `SecretStorage`.
- **Status Bar**: Shows current status and loading state.

### Changed

- Refined default debounce settings to 150ms for better responsiveness.
- Improved prompt engineering for Typescript and Python.

### Fixed

- Resolved conflicts with native VS Code IntelliSense.
