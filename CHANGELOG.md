# Change Log

All notable changes to the "Predicte" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
