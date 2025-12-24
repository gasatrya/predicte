# IDEAS

I’m looking for a lightweight AI autocomplete extension for VS Code. I want to use the free Codestral model by Mistral, but most existing extensions are bloated with extra features like chat and AI agents. So I think I am going to build my own lightweight extension.

# RAW EXTENSION PLAN

```markdown
I'll guide you through creating a lightweight Codestral autocomplete extension for VS Code. Let's build this step by step.

## Step 1: Project Setup

### 1.1 Install prerequisites
```bash
# Install Node.js and npm if not already installed
# Then install Yeoman and VS Code Extension Generator
npm install -g yo generator-code
```

### 1.2 Create the extension project
```bash
# Create extension directory
mkdir codestral-autocomplete
cd codestral-autocomplete

# Generate TypeScript extension
yo code
# Choose: "New Extension (TypeScript)"
# Name: codestral-autocomplete
# Identifier: codestral-autocomplete
# Description: Lightweight Codestral autocomplete
# Initialize git repo: Yes
# Package manager: npm
```

## Step 2: Basic Structure

Your project structure should look like:
```
codestral-autocomplete/
├── src/
│   └── extension.ts
├── package.json
├── tsconfig.json
├── .vscode/
└── .gitignore
```

## Step 3: Install Dependencies

```bash
npm install axios
```

## Step 4: Core Implementation

### 4.1 Update `package.json` with necessary configuration

Replace the contents of `package.json`:

```json
{
  "name": "codestral-autocomplete",
  "displayName": "Codestral Autocomplete",
  "description": "Lightweight autocomplete using Mistral's Codestral model",
  "version": "0.1.0",
  "publisher": "your-name",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "configuration": {
      "title": "Codestral Autocomplete",
      "properties": {
        "codestralAutocomplete.apiKey": {
          "type": "string",
          "description": "Your Mistral API key (get from https://console.mistral.ai)",
          "scope": "application"
        },
        "codestralAutocomplete.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable/disable Codestral autocomplete"
        },
        "codestralAutocomplete.maxTokens": {
          "type": "number",
          "default": 50,
          "description": "Maximum tokens for completions"
        },
        "codestralAutocomplete.temperature": {
          "type": "number",
          "default": 0.1,
          "description": "Temperature for generation (0.0 to 1.0)"
        },
        "codestralAutocomplete.debounceDelay": {
          "type": "number",
          "default": 300,
          "description": "Delay before triggering autocomplete (ms)"
        }
      }
    },
    "commands": [
      {
        "command": "codestralAutocomplete.toggle",
        "title": "Toggle Codestral Autocomplete"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "16.x",
    "eslint": "^8.47.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "typescript": "^5.2.2",
    "ts-loader": "^9.4.4",
    "webpack": "^5.88.2",
    "webpack-cli": "^5.1.4",
    "@types/axios": "^0.14.0"
  },
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

### 4.2 Create the main extension code

Replace `src/extension.ts`:

```typescript
import * as vscode from 'vscode';
import axios from 'axios';

interface CodestralConfig {
    apiKey: string;
    enabled: boolean;
    maxTokens: number;
    temperature: number;
    debounceDelay: number;
}

class CodestralAutocompleteProvider implements vscode.InlineCompletionItemProvider {
    private config: CodestralConfig;
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor() {
        this.config = this.loadConfig();
        this.setupConfigListener();
    }

    private loadConfig(): CodestralConfig {
        const config = vscode.workspace.getConfiguration('codestralAutocomplete');
        return {
            apiKey: config.get<string>('apiKey') || '',
            enabled: config.get<boolean>('enabled') || true,
            maxTokens: config.get<number>('maxTokens') || 50,
            temperature: config.get<number>('temperature') || 0.1,
            debounceDelay: config.get<number>('debounceDelay') || 300
        };
    }

    private setupConfigListener() {
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('codestralAutocomplete')) {
                this.config = this.loadConfig();
            }
        });
    }

    public async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        // Check if enabled
        if (!this.config.enabled || !this.config.apiKey) {
            return null;
        }

        // Cancel previous request
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        return new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                try {
                    const completions = await this.getCodestralCompletions(document, position);
                    resolve(completions);
                } catch (error) {
                    console.error('Codestral autocomplete error:', error);
                    resolve(null);
                }
            }, this.config.debounceDelay);
        });
    }

    private async getCodestralCompletions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.InlineCompletionItem[] | null> {
        // Get context around cursor
        const context = this.getContext(document, position);
        
        if (!context.trim()) {
            return null;
        }

        try {
            const response = await axios.post(
                'https://api.mistral.ai/v1/fim/completions',
                {
                    model: 'codestral-latest',
                    prompt: context,
                    suffix: '', // We're only using prefix for now
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stop: ['\n\n', '```'] // Stop sequences
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            const completionText = response.data.choices[0]?.text?.trim();
            if (!completionText) {
                return null;
            }

            // Create inline completion item
            const item = new vscode.InlineCompletionItem(
                completionText,
                new vscode.Range(position, position)
            );

            // Add some tracking info (optional)
            (item as any).providerId = 'codestral';

            return [item];

        } catch (error: any) {
            if (error.response?.status === 401) {
                vscode.window.showErrorMessage('Invalid Codestral API key. Please check your settings.');
            } else if (error.response?.status === 429) {
                vscode.window.showWarningMessage('Codestral API rate limit exceeded.');
            }
            throw error;
        }
    }

    private getContext(document: vscode.TextDocument, position: vscode.Position): string {
        // Get current line and previous lines for context
        const line = position.line;
        const startLine = Math.max(0, line - 20); // Get up to 20 lines before
        const endLine = line;
        
        let context = '';
        for (let i = startLine; i <= endLine; i++) {
            context += document.lineAt(i).text;
            if (i < endLine) {
                context += '\n';
            }
        }

        // Add the part of the current line up to cursor
        const currentLine = document.lineAt(line);
        const linePrefix = currentLine.text.substring(0, position.character);
        
        return context.substring(0, context.length - currentLine.text.length) + linePrefix;
    }

    public updateConfig(config: Partial<CodestralConfig>) {
        this.config = { ...this.config, ...config };
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Codestral Autocomplete extension is now active!');

    const provider = new CodestralAutocompleteProvider();
    
    // Register inline completion provider for all languages
    const disposable = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        provider
    );

    // Register toggle command
    const toggleCommand = vscode.commands.registerCommand('codestralAutocomplete.toggle', () => {
        const config = vscode.workspace.getConfiguration('codestralAutocomplete');
        const current = config.get('enabled');
        config.update('enabled', !current, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Codestral autocomplete ${!current ? 'enabled' : 'disabled'}`);
    });

    context.subscriptions.push(disposable, toggleCommand);

    // Show welcome message if API key is not set
    setTimeout(() => {
        const config = vscode.workspace.getConfiguration('codestralAutocomplete');
        const apiKey = config.get<string>('apiKey');
        if (!apiKey) {
            vscode.window.showInformationMessage(
                'Codestral Autocomplete: Please set your API key in settings',
                'Open Settings'
            ).then(selection => {
                if (selection) {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'codestralAutocomplete.apiKey');
                }
            });
        }
    }, 2000);
}

export function deactivate() {
    console.log('Codestral Autocomplete extension deactivated');
}
```

### 4.3 Create webpack config

Create `webpack.config.js`:

```javascript
const path = require('path');

module.exports = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map'
};
```

### 4.4 Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "out",
    "sourceMap": true,
    "strict": true,
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

## Step 5: Build and Test

### 5.1 Build the extension:

```bash
npm run compile
```

### 5.2 Run in development:

1. Press `F5` in VS Code (opens a new Extension Development Host window)
2. Or use the debug panel in VS Code

### 5.3 Package for distribution:

```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file you can share or install.

## Step 6: Configuration

Once installed:
1. Get an API key from [Mistral Console](https://console.mistral.ai)
2. Open VS Code Settings (Ctrl+,)
3. Search for "Codestral"
4. Set your API key and adjust settings as needed

## Additional Features to Add Later:

You can enhance the extension with:

### 1. **Better Context Management**:
```typescript
private getContextWithLanguage(document: vscode.TextDocument, position: vscode.Position): string {
    const languageId = document.languageId;
    const context = this.getContext(document, position);
    
    // Add language-specific prompts
    const languagePrompts: Record<string, string> = {
        'python': '# Python code\n',
        'javascript': '// JavaScript code\n',
        'typescript': '// TypeScript code\n',
        'java': '// Java code\n',
    };
    
    const prompt = languagePrompts[languageId] || '';
    return prompt + context;
}
```

### 2. **Caching System**:
```typescript
class CompletionCache {
    private cache = new Map<string, string>();
    private maxSize = 100;

    get(key: string): string | undefined {
        return this.cache.get(key);
    }

    set(key: string, value: string): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
```

### 3. **Multi-line Completions**:
```typescript
// Adjust the completion parsing to handle multi-line suggestions
private parseCompletion(completionText: string, document: vscode.TextDocument, position: vscode.Position): vscode.InlineCompletionItem[] {
    const lines = completionText.split('\n');
    const items: vscode.InlineCompletionItem[] = [];
    
    // First line completion
    items.push(new vscode.InlineCompletionItem(
        lines[0],
        new vscode.Range(position, position)
    ));
    
    // Additional lines as separate completions
    for (let i = 1; i < lines.length; i++) {
        const linePos = new vscode.Position(position.line + i, 0);
        items.push(new vscode.InlineCompletionItem(
            lines[i],
            new vscode.Range(linePos, linePos)
        ));
    }
    
    return items;
}
```

## Testing the Extension:

1. Open a code file in the development window
2. Start typing - you should see Codestral suggestions after 300ms (configurable)
3. Press `Tab` to accept suggestions
4. Use the command palette (Ctrl+Shift+P) and search for "Toggle Codestral Autocomplete" to enable/disable

## Troubleshooting:

- **No suggestions appearing?** Check your API key in settings
- **Slow responses?** Adjust the `debounceDelay` setting
- **Wrong suggestions?** Adjust the `temperature` setting (lower = more deterministic)

This creates a minimal, focused autocomplete extension that only uses the Codestral model. You can extend it further based on your needs!
```
