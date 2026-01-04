# Predicte

![CI](https://github.com/predicte/predicte/actions/workflows/ci.yml/badge.svg)
![Release](https://img.shields.io/github/release/predicte/predicte.svg)

Lightweight AI-powered code autocomplete extension for VS Code using Mistral's Codestral model.

## Features

- **Inline completions** - Fast, non-intrusive suggestions as you type
- **Multiple models** - Support for codestral-latest, codestral-22b, and codestral-2404
- **Smart caching** - LRU cache with configurable TTL to reduce API calls
- **Streaming support** - Faster completions with streaming responses
- **Secure storage** - API keys stored using VS Code's SecretStorage API
- **10 configurable settings** - Fine-tuned control over behavior

## Installation

1. Clone and install:

   ```bash
   git clone https://github.com/predicte/predicte.git
   cd predicte
   npm install
   ```

2. Build and run:

   ```bash
   npm run compile
   # Press F5 to launch VS Code Extension Development Host
   ```

3. Set your Mistral API key:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run `Predicte: Set API Key`

## Configuration

Key settings (search "Predicte" in VS Code settings):

| Setting                  | Default            | Description                   |
| ------------------------ | ------------------ | ----------------------------- |
| `predicte.model`         | `codestral-latest` | Codestral model to use        |
| `predicte.maxTokens`     | `50`               | Max completion tokens (1-500) |
| `predicte.debounceDelay` | `300`              | Delay before triggering (ms)  |
| `predicte.cacheEnabled`  | `true`             | Enable caching                |

Full configuration list available in settings.

## Development

| Command           | Description          |
| ----------------- | -------------------- |
| `npm run compile` | Compile TypeScript   |
| `npm run watch`   | Watch and recompile  |
| `npm run package` | Build for production |
| `npm run lint`    | Run ESLint           |
| `npm run format`  | Format code          |

## License

MIT

## Contributing

Contributions welcome! Please read contributing guidelines before submitting PRs.
