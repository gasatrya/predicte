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

![Version](https://img.shields.io/visual-studio-marketplace/v/predicte.predicte)
![Installs](https://img.shields.io/visual-studio-marketplace/i/predicte.predicte)
![License](https://img.shields.io/github/license/gasatrya/predicte)

</div>

**Predicte** brings the power of state-of-the-art AI to your editor without the bloat. Built on Mistral's **Codestral** model, it provides fast, context-aware code completion that runs efficiently on your machine.

## ✨ Features

- **🚀 Blazing Fast**: Streaming responses for instant feedback.
- **🧠 Context Aware**: Understands your imports, functions, and types for smarter suggestions.
- **🔋 Efficient**: Intelligent LRU caching and debouncing to save API credits.
- **🛡️ Secure**: Your API keys are stored safely using VS Code's native SecretStorage.
- **⚙️ Configurable**: Fine-tune everything from model selection to debounce delay.

## 📦 Installation

**From VS Code Marketplace:** (Coming Soon)

1. Open **Extensions** sidebar (Ctrl+Shift+X).
2. Search for `Predicte`.
3. Click **Install**.

**From Source:**

1. Clone the repo: `git clone https://github.com/gasatrya/predicte.git`
2. Run `npm install`
3. Press `F5` to debug.

## 🚀 Getting Started

1.  **Get an API Key**: Sign up at [Mistral AI](https://console.mistral.ai/) and get your API key (Codestral is currently free/beta).
2.  **Set Key**: Open Command Palette (`Ctrl+Shift+P`) and run **Predicte: Set API Key**.
3.  **Start Coding**: Open any supported file (JS, TS, Python, Go, etc.) and start typing!

## ⌨️ Shortcuts

| Key          | Action                     |
| ------------ | -------------------------- |
| `Tab`        | Accept **Full** Completion |
| `Ctrl+Right` | Accept **Next Word**       |
| `Ctrl+Down`  | Accept **Next Line**       |

## 🛠️ Configuration

| Setting                           | Default            | Description                               |
| :-------------------------------- | :----------------- | :---------------------------------------- |
| `predicte.model`                  | `codestral-latest` | Choose between speed and power            |
| `predicte.maxTokens`              | `100`              | Length of generated code                  |
| `predicte.debounceDelay`          | `150`              | ms to wait before requesting              |
| `predicte.enhancedContextEnabled` | `true`             | Analyze imports/types for better accuracy |

## 🤝 Contributing

We love contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## 📄 License

MIT © [Predicte Team](https://github.com/gasatrya)
