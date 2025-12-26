# Predicte Language-Aware Parameters - Quick Reference

## 1. Language Mappings

| Language       | Temperature | Max Tokens | Key Stop Sequences             | Expert Role    |
| -------------- | ----------- | ---------- | ------------------------------ | -------------- |
| **TypeScript** | 0.1         | 120        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **Java**       | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **Go**         | 0.1         | 100        | `\n\n`, `}`, `\`\`\``          | Strict/Typed   |
| **Rust**       | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **C++**        | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **C**          | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **C#**         | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **Swift**      | 0.1         | 100        | `\n\n`, `}`, `\`\`\``          | Strict/Typed   |
| **Kotlin**     | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **Scala**      | 0.1         | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Strict/Typed   |
| **JavaScript** | 0.15        | 100        | `\n\n`, `}`, `;`, `\`\`\``     | Dynamic        |
| **Python**     | 0.2         | 100        | `\n\n`, `\`\`\``, `'''`, `"""` | Dynamic        |
| **PHP**        | 0.15        | 100        | `\n\n`, `;`, `}`, `\`\`\``     | Dynamic        |
| **Ruby**       | 0.2         | 80         | `\n\n`, `end`, `\`\`\``        | Dynamic        |
| **HTML**       | 0.2         | 50         | `\n\n`, `</`, `\`\`\``         | Markup         |
| **CSS**        | 0.2         | 50         | `\n\n`, `}`, `\`\`\``          | Markup         |
| **XML**        | 0.1         | 50         | `\n\n`, `</`, `\`\`\``         | Markup         |
| **JSON**       | 0.05        | 50         | `\n\n`, `}`, `]`, `\`\`\``     | Data Format    |
| **YAML**       | 0.1         | 50         | `\n\n`, `}`, `]`, `\`\`\``     | Data Format    |
| **Markdown**   | 0.3         | 150        | `\n\n`, `\`\`\``               | Documentation  |
| **Bash**       | 0.15        | 80         | `\n\n`, `\`\`\``               | Shell Script   |
| **Shell**      | 0.15        | 80         | `\n\n`, `\`\`\``               | Shell Script   |
| **SQL**        | 0.1         | 80         | `\n\n`, `;`, `\`\`\``          | Query Language |
| **Default**    | 0.15        | 100        | `\n\n`, `\`\`\``               | Fallback       |

## 2. Configuration Defaults

```json
{
  "predicte.languageAwareParametersEnabled": true
}
```

- **Default**: Enabled
- **Type**: Boolean
- **Description**: Enable language-specific model parameters optimized for each programming language

## 3. Quick Setup Guide

### Enable Language-Aware Parameters

1. Open VS Code Settings
2. Search for "predicte.languageAwareParametersEnabled"
3. Set to `true` (default)

### Disable Language-Aware Parameters

1. Open VS Code Settings
2. Search for "predicte.languageAwareParametersEnabled"
3. Set to `false`

### Verify Settings

```bash
# Check current configuration
cat ~/.config/Code/User/settings.json | grep predicte
```

## Key Features

- **Automatic Detection**: Language ID is automatically detected from the document
- **Backward Compatible**: Falls back to default parameters when disabled
- **Cache Aware**: Cache keys include language ID for proper isolation
- **Stop Sequence Optimization**: Language-specific stop tokens for better completion quality

## Usage Notes

- Works with both streaming and non-streaming completion modes
- Compatible with prompt engineering and context extraction features
- No manual configuration required - just enable the feature
