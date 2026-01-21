# Predicte

<div align="center">
  <img src="https://raw.githubusercontent.com/gasatrya/predicte/main/images/icon.png" alt="Predicte Icon" width="128" height="128" />
  <h1>Predicte: AI Code Completion</h1>
  <p>
    <b>Lightweight, Fast, and Free AI Autocomplete for VS Code</b><br>
    Powered by Mistral's Codestral Model
  </p>
</div>

<div align="center">

![CI](https://github.com/gasatrya/predicte/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/visual-studio-marketplace/v/predicte.predicte)
![Installs](https://img.shields.io/visual-studio-marketplace/i/predicte.predicte)
![License](https://img.shields.io/github/license/gasatrya/predicte)

</div>

**Predicte** brings the power of state-of-the-art AI to your editor without the bloat. Built on Mistral's **Codestral** model, it provides fast, context-aware code completion that runs efficiently on your machine.

_This extension is for developers who don't need an AI chat interface but still want the magic of AI autocomplete._

## Features

- **Blazing Fast**: Streaming responses for instant feedback.
- **Context Aware**: Understands your imports, functions, and types for smarter suggestions.
- **Efficient**: Intelligent LRU caching and debouncing to save API credits.
- **Secure**: Your API keys are stored safely using VS Code's native SecretStorage.
- **Configurable**: Fine-tune everything from model selection to debounce delay.

## Installation

1. Open **Extensions** sidebar (Ctrl+Shift+X).
2. Search for `Predicte`.
3. Click **Install**.

## Getting Started

1.  **Get an API Key**: Sign up at [Mistral AI](https://console.mistral.ai/) and get your API key (Codestral is currently free/beta).
2.  **Set Key**: Open Command Palette (`Ctrl+Shift+P`) and run **Predicte: Set API Key**.
3.  **Start Coding**: Open any supported file (JS, TS, Python, Go, etc.) and start typing!

## Shortcuts

| Key   | Action                     |
| ----- | -------------------------- |
| `Tab` | Accept **Full** Completion |

## Configuration

| Setting                      | Default                | Description                           |
| :--------------------------- | :--------------------- | :------------------------------------ |
| `predicte.enabled`           | `true`                 | Enable/disable Predicte autocomplete  |
| `predicte.apiBaseUrl`        | `codestral.mistral.ai` | API base URL                          |
| `predicte.enableKeybindings` | `true`                 | Enable keyboard shortcuts (Tab, etc.) |
| `predicte.enableStatusBar`   | `true`                 | Show status bar item                  |
| `predicte.debugMode`         | `false`                | Enable detailed logging               |

## Contributing

We love contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## License

MIT © [Ga Satrya](https://github.com/gasatrya)
