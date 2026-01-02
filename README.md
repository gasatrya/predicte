# Predicte

![CI](https://github.com/predicte/predicte/actions/workflows/ci.yml/badge.svg)
![Release](https://img.shields.io/github/release/predicte/predicte.svg)

Lightweight AI-powered code autocomplete extension for VS Code using Mistral's Codestral model.

## Overview

Predicte is a minimal, focused autocomplete extension that provides intelligent code suggestions without the bloat of chat interfaces or complex AI agent systems. It's designed for developers who want fast, reliable autocomplete powered by state-of-the-art AI models.

## Features

- **Inline Code Completions** - Non-intrusive suggestions as you type
- **Official Mistral SDK** - Uses `@mistralai/mistralai` SDK v1.11.0 for reliable API communication
- **Smart Context Management** - Intelligent context extraction for accurate suggestions
- **Multiple Models** - Support for `codestral-latest`, `codestral-22b`, and `codestral-2404`
- **LRU Caching** - Intelligent caching with configurable TTL to reduce API calls
- **Streaming Support** - Faster completions with streaming responses
- **Secure API Key Storage** - API keys stored securely using VS Code's SecretStorage API
- **Modular Architecture** - Clean separation of concerns with dedicated managers and services
- **Comprehensive Configuration** - 10 configurable settings for fine-tuned control
- **Error Handling** - Robust error handling with retry logic and exponential backoff

## Project Structure

```
predicte/
├── src/
│   ├── extension.ts                 # Extension entry point
│   ├── providers/
│   │   └── completionProvider.ts    # Inline completion provider
│   ├── services/
│   │   ├── mistralClient.ts        # Official Mistral SDK client
│   │   └── secretStorage.ts        # Secure API key storage
│   ├── managers/
│   │   ├── configManager.ts        # Configuration management
│   │   └── cacheManager.ts         # LRU cache implementation
│   └── utils/
│       ├── codeUtils.ts            # Code manipulation utilities
│       ├── contextUtils.ts         # Context extraction utilities
│       ├── debounce.ts             # Debounce utility
│       └── logger.ts               # Logging utility
├── .vscode/
│   ├── extensions.json             # Recommended extensions
│   ├── launch.json                 # Debug configuration
│   └── tasks.json                  # Build tasks
├── package.json                     # Extension manifest
├── tsconfig.json                    # TypeScript configuration
├── webpack.config.cjs               # Webpack configuration
├── eslint.config.cjs                # ESLint configuration
├── .prettierrc                      # Prettier configuration
├── AGENTS.md                        # Agent guidelines
├── FEATURES-TO-IMPLEMENT.md         # Implementation roadmap
├── PREDICTE USER TESTING ISSUES & SOLUTIONS.md  # Testing findings
├── archive/
│   ├── IMPLEMENTATION-REPORT.md    # Historical implementation report
│   ├── LANGUAGE-AWARE-PARAMETERS-SUMMARY.md  # Language parameter reference
│   ├── QUALITY-FILTERING-IMPLEMENTATION.md   # Quality filtering details
│   └── RESEARCH-PLAN.md             # Original research documentation
└── README.md                        # This file
```

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm, yarn, or pnpm
- VS Code 1.90.0 or later
- Mistral API key ([Get one here](https://console.mistral.ai))

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/predicte.git
cd predicte
```

2. Install dependencies:

```bash
npm install
```

This will install the `@mistralai/mistralai` SDK v1.11.0 and other required dependencies.

3. Build the extension:

```bash
npm run compile
```

4. Press F5 to launch a new VS Code Extension Development Host window.

### Configuration

Open VS Code settings and search for "Predicte" to configure:

| Setting                    | Default            | Description                                                                    |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `predicte.enabled`         | `true`             | Enable/disable autocomplete                                                    |
| `predicte.model`           | `codestral-latest` | Codestral model to use (`codestral-latest`, `codestral-22b`, `codestral-2404`) |
| `predicte.maxTokens`       | `50`               | Maximum completion tokens (1-500)                                              |
| `predicte.temperature`     | `0.1`              | Sampling temperature (lower = more deterministic)                              |
| `predicte.debounceDelay`   | `300`              | Delay before triggering autocomplete (ms, 100-2000)                            |
| `predicte.contextLines`    | `20`               | Number of context lines to include (5-100)                                     |
| `predicte.enableStreaming` | `true`             | Use streaming for completions                                                  |
| `predicte.cacheEnabled`    | `true`             | Enable completion caching                                                      |
| `predicte.cacheTTL`        | `60000`            | Cache TTL in milliseconds (1000-600000)                                        |
| `predicte.requestTimeout`  | `30000`            | Request timeout in milliseconds (5000-120000)                                  |

### API Key Setup

1. Get your API key from [Mistral Console](https://console.mistral.ai)
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run `Predicte: Set API Key`
4. Paste your API key

The API key is stored securely using VS Code's SecretStorage API.

## Development

### Available Scripts

| Command                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `npm run vscode:prepublish` | Build for production (alias for package)          |
| `npm run compile`           | Compile TypeScript to JavaScript                  |
| `npm run watch`             | Watch for changes and recompile                   |
| `npm run package`           | Build for production (webpack --mode production)  |
| `npm run compile-tests`     | Compile test files                                |
| `npm run watch-tests`       | Watch test files for changes                      |
| `npm run pretest`           | Run before tests (compile-tests + compile + lint) |
| `npm run lint`              | Run ESLint on src directory                       |
| `npm run lint:fix`          | Fix ESLint issues automatically                   |
| `npm run format`            | Format code with Prettier                         |
| `npm run format:check`      | Check code formatting without fixing              |

### Debugging

Press F5 to launch a new VS Code Extension Development Host window with the extension loaded.

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Acknowledgments

- [Mistral AI](https://mistral.ai) for the Codestral model
- VS Code Extension API
- Inspired by [Tabby](https://github.com/TabbyML/tabby)
