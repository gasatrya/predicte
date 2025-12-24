# Research Plan: Predicte VS Code Extension

**Document Version:** 1.0
**Date:** 2025-12-24
**Author:** Predicte Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Mistral API Research](#2-mistral-api-research)
3. [VS Code API Research](#3-vs-code-api-research)
4. [Real-World Patterns](#4-real-world-patterns)
5. [Updated Implementation Plan](#5-updated-implementation-plan)
6. [Technical Architecture](#6-technical-architecture)
7. [Security & Privacy Considerations](#7-security--privacy-considerations)
8. [Testing Strategy](#8-testing-strategy)
9. [Timeline & Milestones](#9-timeline--milestones)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Executive Summary

### 1.1 Overview

The Predicte extension aims to provide a lightweight, focused AI-powered code completion solution for VS Code using Mistral's Codestral model. Unlike existing bloated extensions that include chat interfaces, AI agents, and unnecessary features, this project maintains a minimalist philosophy while delivering high-quality autocomplete functionality.

### 1.2 Key Findings

**Mistral API:**

- The original plan's API endpoint (`https://api.mistral.ai/v1/fim/completions`) is **correct**
- Model identifier `codestral-latest` is accurate
- Authentication via Bearer token is properly documented
- FIM (Fill-in-the-Middle) mode supports both prefix and suffix context

**VS Code API:**

- `InlineCompletionItemProvider` is the correct interface for autocomplete
- Proper configuration handling and secret storage patterns exist
- Debouncing and cancellation token handling are essential for performance

**Real-World Extensions:**

- Most popular extensions (CodeWhisperer, Copilot, Tabby) follow similar patterns
- Key differences are in architecture (monolithic vs. modular) and feature bloat
- Tabby provides the closest reference for a lightweight implementation

### 1.3 Key Recommendations

1. **Maintain Lightweight Philosophy:** Avoid chat interfaces, agent features, or unnecessary UI elements
2. **Proper Error Handling:** Implement robust error handling for API failures, rate limits, and network issues
3. **Secret Storage:** Use VS Code's `SecretStorage` API instead of storing API keys in settings
4. **Context Management:** Implement smart context windowing to avoid sending excessive data
5. **Caching Strategy:** Add intelligent caching for repeated completion requests
6. **Performance Optimization:** Use debouncing, request cancellation, and streaming responses

### 1.4 Implementation Approach

**Recommended Approach:** Incremental implementation with four phases:

- Phase 1: Core autocomplete functionality (Week 1)
- Phase 2: Enhanced context and caching (Week 2)
- Phase 3: Security and configuration improvements (Week 3)
- Phase 4: Testing, polish, and distribution (Week 4)

---

## 2. Mistral API Research

### 2.1 API Endpoint Documentation

**Base URL:** `https://api.mistral.ai/v1`

**FIM Completions Endpoint:** `https://api.mistral.ai/v1/fim/completions`

**Using Official SDK (Recommended):**

````typescript
// ✅ Using official @mistralai/mistralai SDK v1.11.0
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({ apiKey });
const response = await client.fim.complete({
    model: 'codestral-latest',
    prompt: prefixContext,
    suffix: suffixContext, // Optional - Fill-in-the-Middle
    maxTokens: 50,
    temperature: 0.1,
    stop: ['\n\n', '```', '"""', "'''"],
});

// Access completion text from response
const completionText = response.choices[0]?.message?.content;
````

### 2.2 Model Information

**Available Models for FIM:**
| Model | Max Tokens | Pricing | Use Case |
|-------|-----------|---------|----------|
| `codestral-latest` | 32,000 | Free tier available | General code completion |
| `codestral-22b` | 32,000 | Free tier available | Smaller, faster model |
| `codestral-2404` | 32,000 | Free tier available | April 2024 version |

**Model Selection Strategy:**

```typescript
// Recommended model selection
const getModelForContext = (contextLength: number): string => {
    // Use codestral-latest for best quality
    // Fall back to codestral-22b for faster responses on shorter contexts
    if (contextLength < 1000) {
        return 'codestral-22b'; // Faster for small contexts
    }
    return 'codestral-latest'; // Better quality for larger contexts
};
```

### 2.3 Authentication

**Authentication Method:** Bearer Token

**API Key Acquisition:**

1. Visit [Mistral Console](https://console.mistral.ai)
2. Create account (free tier available)
3. Generate API key
4. Store securely in extension

**Authentication Code:**

```typescript
// Correct authentication implementation
const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

// Error handling for auth
if (error.response?.status === 401) {
    vscode.window
        .showErrorMessage('Invalid API Key. Please check your Codestral API key.', 'Open Settings')
        .then((selection) => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'predicte.apiKey');
            }
        });
}
```

### 2.4 Request/Response Format

**Request Structure (SDK Types):**

````typescript
import type { FIMCompletionParams } from '@mistralai/mistralai/models/components/fimcompletionparams.js';

// SDK provides types for request parameters
const request: FIMCompletionParams = {
    model: 'codestral-latest',
    prompt: prefixContext, // Prefix context
    suffix: suffixContext, // Optional suffix (for FIM mode)
    maxTokens: 50, // Default: 50
    temperature: 0.1, // Default: 0.1, Range: 0-1
    stop: ['\n\n', '```', '"""', "'''"],
};
````

**Response Structure (SDK Types):**

```typescript
import type { FIMCompletionResponse } from '@mistralai/mistralai/models/components/fimcompletionresponse.js';

// SDK provides types for response
const response: FIMCompletionResponse = await client.fim.complete(request);

// Key fields in response:
// - id: string;
// - object: string;
// - created: number;
// - model: string;
// - choices: Array<{
//     index: number;
//     message: {
//         role: 'assistant';
//         content: string;           // Completion text
//     };
//     finishReason: string;
// }>;
// - usage: {
//     promptTokens: number;
//     completionTokens: number;
//     totalTokens: number;
// };

// Extract completion text
const completionText = response.choices[0]?.message?.content;
```

**Response Structure:**

```typescript
interface CodestralFIMResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        text: string; // Completion text
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
```

### 2.5 Streaming Support

**Streaming Implementation (SDK Built-in Support):**

```typescript
// Streaming provides better UX for longer completions
// Official SDK provides built-in streaming support
import { Mistral } from '@mistralai/mistralai';

async function* streamCompletions(request: FIMCompletionParams): AsyncGenerator<string> {
    const client = new Mistral({ apiKey });
    const stream = client.fim.stream(request);

    for await (const chunk of stream) {
        // SDK provides typed streaming chunks
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
            yield chunk.choices[0].delta.content;
        }
    }
}

// Usage example:
async function getStreamingCompletion(prompt: string, suffix: string) {
    const completionChunks: string[] = [];

    for await (const chunk of streamCompletions({
        model: 'codestral-latest',
        prompt,
        suffix,
        maxTokens: 50,
    })) {
        completionChunks.push(chunk);
        // Optionally yield chunks as they arrive for real-time display
    }

    return completionChunks.join('');
}
```

### 2.6 Rate Limits and Quotas

**Free Tier Limits (as of 2024):**

- Rate limit: ~10 requests per minute
- Token limit: 1M tokens per month
- Concurrent requests: 1-2

**Handling Rate Limits:**

```typescript
interface RateLimiter {
    requestCount: number;
    lastReset: number;
    resetInterval: number;
    maxRequests: number;
}

class RateLimiter implements RateLimiter {
    requestCount = 0;
    lastReset = Date.now();
    resetInterval = 60000; // 1 minute
    maxRequests = 10; // Free tier

    async waitIfNeeded(): Promise<void> {
        const now = Date.now();
        if (now - this.lastReset > this.resetInterval) {
            this.requestCount = 0;
            this.lastReset = now;
        }

        if (this.requestCount >= this.maxRequests) {
            const waitTime = this.resetInterval - (now - this.lastReset);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            this.requestCount = 0;
        }

        this.requestCount++;
    }
}
```

---

## 3. VS Code API Research

### 3.1 Inline Completion API

**Core Interface:**

```typescript
class PredicteCompletionProvider implements vscode.InlineCompletionItemProvider {
    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        // Implementation
    }
}
```

**InlineCompletionItem Properties:**

```typescript
const completion = new vscode.InlineCompletionItem(
    completionText, // The completion text
    new vscode.Range(position, position), // Insertion position
    {
        title: 'Codestral',
        description: 'AI-powered completion', // Range info display
    }
);

// Optional: Set custom behavior
completion.range = new vscode.Range(position, position);
completion.command = {
    command: 'predicte.accept',
    title: 'Accept',
};
```

**InlineCompletionList for Multiple Completions:**

```typescript
// Return multiple completion options
return new vscode.InlineCompletionList([
    new vscode.InlineCompletionItem(suggestion1, range),
    new vscode.InlineCompletionItem(suggestion2, range),
    new vscode.InlineCompletionItem(suggestion3, range),
]);
```

### 3.2 Configuration API

**Reading Configuration:**

```typescript
interface PredicteConfig {
    apiKey?: string;
    enabled: boolean;
    maxTokens: number;
    temperature: number;
    debounceDelay: number;
    model: string;
}

function loadConfig(): PredicteConfig {
    const config = vscode.workspace.getConfiguration('predicte');
    return {
        apiKey: config.get<string>('apiKey'),
        enabled: config.get<boolean>('enabled', true),
        maxTokens: config.get<number>('maxTokens', 50),
        temperature: config.get<number>('temperature', 0.1),
        debounceDelay: config.get<number>('debounceDelay', 300),
        model: config.get<string>('model', 'codestral-latest'),
    };
}
```

**Watching Configuration Changes:**

```typescript
vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('predicte')) {
        // Reload configuration
        config = loadConfig();

        // Show notification for important changes
        if (event.affectsConfiguration('predicte.apiKey')) {
            testApiKeyConnection();
        }
    }
});
```

**package.json Configuration Schema:**

```json
{
    "contributes": {
        "configuration": {
            "title": "Predicte",
            "properties": {
                "predicte.apiKey": {
                    "type": "string",
                    "description": "Your Mistral API key",
                    "markdownDescription": "Get your API key from [Mistral Console](https://console.mistral.ai)",
                    "scope": "application",
                    "order": 1
                },
                "predicte.enabled": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable/disable Predicte autocomplete",
                    "scope": "application",
                    "order": 2
                },
                "predicte.model": {
                    "type": "string",
                    "enum": ["codestral-latest", "codestral-22b", "codestral-2404"],
                    "default": "codestral-latest",
                    "enumDescriptions": [
                        "Latest Codestral model (best quality)",
                        "Smaller, faster Codestral model",
                        "April 2024 version"
                    ],
                    "description": "Codestral model to use",
                    "order": 3
                },
                "predicte.maxTokens": {
                    "type": "number",
                    "default": 50,
                    "minimum": 1,
                    "maximum": 500,
                    "description": "Maximum completion tokens",
                    "order": 4
                },
                "predicte.temperature": {
                    "type": "number",
                    "default": 0.1,
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Sampling temperature (lower = more deterministic)",
                    "order": 5
                },
                "predicte.debounceDelay": {
                    "type": "number",
                    "default": 300,
                    "minimum": 100,
                    "maximum": 2000,
                    "description": "Delay before triggering autocomplete (ms)",
                    "order": 6
                },
                "predicte.contextLines": {
                    "type": "number",
                    "default": 20,
                    "minimum": 5,
                    "maximum": 100,
                    "description": "Number of context lines to include",
                    "order": 7
                },
                "predicte.enableStreaming": {
                    "type": "boolean",
                    "default": true,
                    "description": "Use streaming for completions",
                    "order": 8
                }
            }
        }
    }
}
```

### 3.3 Secret Storage API

**Why Secret Storage?**
API keys should never be stored in plain text in workspace settings. VS Code's `SecretStorage` API provides secure storage.

**Secret Storage Implementation:**

```typescript
export class PredicteSecretStorage {
    private static readonly API_KEY_KEY = 'predicte.apiKey';
    private secretStorage: vscode.SecretStorage;

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    async getApiKey(): Promise<string | undefined> {
        return await this.secretStorage.get(PredicteSecretStorage.API_KEY_KEY);
    }

    async setApiKey(apiKey: string): Promise<void> {
        await this.secretStorage.store(PredicteSecretStorage.API_KEY_KEY, apiKey);
    }

    async deleteApiKey(): Promise<void> {
        await this.secretStorage.delete(PredicteSecretStorage.API_KEY_KEY);
    }

    async hasApiKey(): Promise<boolean> {
        const key = await this.getApiKey();
        return key !== undefined && key.length > 0;
    }
}
```

**Command to Set API Key:**

```typescript
// Register command to securely set API key
const setApiKeyCommand = vscode.commands.registerCommand('predicte.setApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Mistral API key',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'sk-...',
    });

    if (apiKey && apiKey.trim()) {
        await secretStorage.setApiKey(apiKey.trim());
        vscode.window.showInformationMessage('API key saved securely');
    }
});
```

### 3.4 Context Management

**Smart Context Extraction:**

```typescript
interface CodeContext {
    prefix: string;
    suffix: string;
    language: string;
    cursorLine: number;
}

function extractContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    config: PredicteConfig
): CodeContext {
    const linesBefore = config.contextLines;
    const linesAfter = 5; // Always include some suffix context

    // Get prefix context
    const startLine = Math.max(0, position.line - linesBefore);
    const prefixLines: string[] = [];

    for (let i = startLine; i <= position.line; i++) {
        if (i === position.line) {
            prefixLines.push(document.lineAt(i).text.substring(0, position.character));
        } else {
            prefixLines.push(document.lineAt(i).text);
        }
    }

    // Get suffix context (for FIM mode)
    const endLine = Math.min(document.lineCount - 1, position.line + linesAfter);
    const suffixLines: string[] = [];

    for (let i = position.line; i <= endLine; i++) {
        if (i === position.line) {
            suffixLines.push(document.lineAt(i).text.substring(position.character));
        } else {
            suffixLines.push(document.lineAt(i).text);
        }
    }

    return {
        prefix: prefixLines.join('\n'),
        suffix: suffixLines.join('\n'),
        language: document.languageId,
        cursorLine: position.line,
    };
}
```

### 3.5 Debouncing and Cancellation

**Debounced Request Handler:**

```typescript
class DebouncedCompletions {
    private debounceTimer: NodeJS.Timeout | undefined;
    private currentRequest: AbortController | undefined;

    async request(
        callback: (signal: AbortSignal) => Promise<vscode.InlineCompletionItem[]>,
        delay: number
    ): Promise<vscode.InlineCompletionItem[]> {
        // Cancel previous request
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Cancel current API request
        if (this.currentRequest) {
            this.currentRequest.abort();
        }

        this.currentRequest = new AbortController();

        return new Promise((resolve, reject) => {
            this.debounceTimer = setTimeout(async () => {
                try {
                    const result = await callback(this.currentRequest!.signal);
                    resolve(result);
                } catch (error) {
                    if (error.name === 'AbortError') {
                        resolve([]); // Return empty for cancelled requests
                    } else {
                        reject(error);
                    }
                }
            }, delay);
        });
    }

    cancel(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }

        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = undefined;
        }
    }
}
```

---

## 4. Real-World Patterns

### 4.1 Analysis of Popular Extensions

**Reference Extensions:**

1. **Tabby** - Open-source, self-hosted AI autocomplete
2. **Continue** - Open-source AI assistant with autocomplete
3. **Codeium** - AI code completion (commercial)

### 4.2 Tabby Architecture Pattern

**Key Features (Lightweight):**

- Pure inline completion implementation
- No chat interface
- Local or API-based models
- Smart caching
- Minimal UI

**Relevant Code Pattern:**

```typescript
// Based on Tabby's completion provider
class TabbyCompletionProvider implements vscode.InlineCompletionItemProvider {
    private cache: LRUCache<string, InlineCompletion[]>;

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        // Check cache first
        const cacheKey = this.getCacheKey(document, position);
        const cached = this.cache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            return cached;
        }

        // Get context with language hints
        const codeContext = this.buildContext(document, position);

        // Check if should trigger
        if (!this.shouldTrigger(codeContext)) {
            return null;
        }

        // Fetch completions
        const completions = await this.fetchCompletions(codeContext, token);

        // Update cache
        this.cache.set(cacheKey, completions);

        return completions;
    }

    private buildContext(document: vscode.TextDocument, position: vscode.Position): CodeContext {
        return {
            language: document.languageId,
            prefix: this.getPrefix(document, position),
            suffix: this.getSuffix(document, position),
            filename: document.fileName,
            cursorPosition: { line: position.line, character: position.character },
        };
    }
}
```

### 4.3 Common Anti-Patterns to Avoid

**❌ Anti-Pattern 1: Chat Interface Bloat**

```typescript
// DON'T DO THIS - Adds unnecessary complexity
class AIChatPanel {
    // Chat webview, message history, etc.
    // Violates lightweight philosophy
}
```

**❌ Anti-Pattern 2: Agent System**

```typescript
// DON'T DO THIS - Over-engineered
class CodeAgent {
    // Plan generation, task execution, tool calling
    // Completely unnecessary for autocomplete
}
```

**❌ Anti-Pattern 3: Complex UI**

```typescript
// DON'T DO THIS - Overengineered
vscode.window.createWebviewPanel('predicte.settings', 'Predicte Settings', vscode.ViewColumn.One, {
    enableScripts: true,
});
```

**✅ Correct Pattern: Minimal Inline Completion**

```typescript
// DO THIS - Focused on autocomplete only
class PredicteCompletionProvider implements vscode.InlineCompletionItemProvider {
    // Only autocomplete logic
    // Settings via VS Code settings
    // Commands via command palette
}
```

### 4.4 Best Practices from Real Extensions

**1. Context Windowing:**

```typescript
// Best practice: Limit context size for performance
function truncateContext(context: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Rough approximation
    if (context.length <= maxChars) return context;

    // Keep more recent context
    return context.substring(context.length - maxChars);
}
```

**2. Smart Triggering:**

```typescript
// Best practice: Don't trigger on every keystroke
function shouldTrigger(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line);
    const text = line.text.substring(0, position.character);

    // Don't trigger on comments or strings
    const inComment = isInsideComment(document, position);
    if (inComment) return false;

    // Don't trigger at start of line
    if (text.trim().length === 0) return false;

    // Don't trigger after certain keywords
    const afterStopWord = ['import', 'export', 'class', 'interface'].some((keyword) =>
        text.trim().startsWith(keyword)
    );
    if (afterStopWord && text.trim().split(/\s+/).length <= 1) return false;

    return true;
}
```

**3. Caching Strategy:**

```typescript
// Best practice: LRU cache for completions
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }
}
```

**4. Language-Specific Prompts:**

```typescript
// Best practice: Add language context for better completions
function getLanguagePrompt(languageId: string): string {
    const prompts: Record<string, string> = {
        javascript: '// JavaScript code:\n',
        typescript: '// TypeScript code:\n',
        python: '# Python code:\n',
        java: '// Java code:\n',
        go: '// Go code:\n',
        rust: '// Rust code:\n',
        cpp: '// C++ code:\n',
        csharp: '// C# code:\n',
        php: '<?php\n',
        ruby: '# Ruby code:\n',
        swift: '// Swift code:\n',
        kotlin: '// Kotlin code:\n',
        sql: '-- SQL code:\n',
        html: '<!-- HTML code -->\n',
        css: '/* CSS code */\n',
        json: '{\n',
        yaml: '---\n',
        markdown: '# Markdown\n',
        shell: '# Shell script\n',
        powershell: '# PowerShell\n',
        dockerfile: '# Dockerfile\n',
        makefile: '# Makefile\n',
    };

    return prompts[languageId] || `// ${languageId} code:\n`;
}
```

---

## 5. Updated Implementation Plan

### 5.1 Phase 1: Core Autocomplete (Week 1)

**Goals:**

- Basic inline completion provider
- Mistral API integration
- Configuration management
- Basic error handling

**Tasks:**

1. **Project Setup**
    - Initialize VS Code extension project
    - Install dependencies (@mistralai/mistralai, typescript)
    - Configure TypeScript and Webpack
    - Set up development environment

2. **Configuration Implementation**

    ```typescript
    // src/config.ts
    export class PredicteConfig {
        private config: vscode.WorkspaceConfiguration;

        constructor() {
            this.config = vscode.workspace.getConfiguration('predicte');
        }

        get apiKey(): string | undefined {
            return this.config.get('apiKey');
        }

        get enabled(): boolean {
            return this.config.get('enabled', true);
        }

        get model(): string {
            return this.config.get('model', 'codestral-latest');
        }

        get maxTokens(): number {
            return this.config.get('maxTokens', 50);
        }

        get temperature(): number {
            return this.config.get('temperature', 0.1);
        }

        get debounceDelay(): number {
            return this.config.get('debounceDelay', 300);
        }

        get contextLines(): number {
            return this.config.get('contextLines', 20);
        }

        watchChanges(callback: () => void): vscode.Disposable {
            return vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('predicte')) {
                    this.config = vscode.workspace.getConfiguration('predicte');
                    callback();
                }
            });
        }
    }
    ```

3. **Mistral API Client**

    ````typescript
    // src/services/mistralClient.ts
    import { Mistral } from '@mistralai/mistralai';
    import type { MistralError } from '@mistralai/mistralai/models/errors/mistralerror.js';
    import type { FIMCompletionParams } from '@mistralai/mistralai/models/components/fimcompletionparams.js';

    export interface CompletionRequest {
        model: string;
        prompt: string;
        suffix?: string;
        maxTokens?: number;
        temperature?: number;
        stop?: string[];
    }

    export interface CompletionResult {
        text: string;
        finishReason: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }

    export class MistralClient {
        private client: Mistral;

        constructor(apiKey: string) {
            this.client = new Mistral({ apiKey });
        }

        async getCompletion(request: CompletionRequest): Promise<CompletionResult | null> {
            try {
                const fimRequest: FIMCompletionParams = {
                    model: request.model,
                    prompt: request.prompt,
                    suffix: request.suffix || '',
                    maxTokens: request.maxTokens || 50,
                    temperature: request.temperature || 0.1,
                    stop: request.stop || ['\n\n', '```', '"""', "'''"],
                };

                const response = await this.client.fim.complete(fimRequest);

                // SDK returns choices[0].message.content for FIM completions
                const text = response.choices[0]?.message?.content?.trim() || null;

                if (!text) {
                    return null;
                }

                return {
                    text,
                    finishReason: response.choices[0]?.finishReason || 'unknown',
                    promptTokens: response.usage?.promptTokens || 0,
                    completionTokens: response.usage?.completionTokens || 0,
                    totalTokens: response.usage?.totalTokens || 0,
                };
            } catch (error) {
                if (error instanceof MistralError) {
                    // Handle SDK error types
                    if (error.status === 401) {
                        throw new Error('Invalid API key');
                    } else if (error.status === 429) {
                        throw new Error('Rate limit exceeded');
                    } else if (error.status === 400) {
                        throw new Error('Invalid request');
                    }
                }
                throw error;
            }
        }
    }
    ````

4. **Extension Entry Point**

    ```typescript
    // src/extension.ts
    import * as vscode from 'vscode';
    import { PredicteCompletionProvider } from './completion/provider';

    export function activate(context: vscode.ExtensionContext): void {
        console.log('Predicte extension is now active!');

        const provider = new PredicteCompletionProvider();

        const disposable = vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            provider
        );

        const toggleCommand = vscode.commands.registerCommand('predicte.toggle', () => {
            const config = vscode.workspace.getConfiguration('predicte');
            const current = config.get('enabled', true);
            config.update('enabled', !current, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `Predicte autocomplete ${!current ? 'enabled' : 'disabled'}`
            );
        });

        context.subscriptions.push(disposable, toggleCommand);

        // Show welcome message if API key is not set
        setTimeout(() => {
            const config = vscode.workspace.getConfiguration('predicte');
            const apiKey = config.get<string>('apiKey');
            if (!apiKey) {
                vscode.window
                    .showInformationMessage(
                        'Predicte: Please set your API key in settings',
                        'Open Settings'
                    )
                    .then((selection) => {
                        if (selection === 'Open Settings') {
                            vscode.commands.executeCommand(
                                'workbench.action.openSettings',
                                'predicte.apiKey'
                            );
                        }
                    });
            }
        }, 2000);
    }

    export function deactivate(): void {
        console.log('Predicte extension deactivated');
    }
    ```

**Deliverables:**

- ✅ Working autocomplete extension
- ✅ Configuration settings
- ✅ Basic error handling
- ✅ Toggle command

### 5.2 Phase 2: Enhanced Context & Caching (Week 2)

**Goals:**

- Secret storage for API keys
- LRU caching for completions
- Language-specific prompts
- Smart triggering logic

**Tasks:**

1. **Secret Storage Integration**

    ```typescript
    // src/secrets/storage.ts
    export class PredicteSecretStorage {
        private static readonly API_KEY_KEY = 'predicte.apiKey';
        private storage: vscode.SecretStorage;

        constructor(context: vscode.ExtensionContext) {
            this.storage = context.secrets;
        }

        async getApiKey(): Promise<string | undefined> {
            return await this.storage.get(PredicteSecretStorage.API_KEY_KEY);
        }

        async setApiKey(apiKey: string): Promise<void> {
            await this.storage.store(PredicteSecretStorage.API_KEY_KEY, apiKey);
        }

        async deleteApiKey(): Promise<void> {
            await this.storage.delete(PredicteSecretStorage.API_KEY_KEY);
        }

        async hasApiKey(): Promise<boolean> {
            const key = await this.getApiKey();
            return key !== undefined && key.length > 0;
        }
    }
    ```

2. **LRU Cache Implementation**

    ```typescript
    // src/cache/lru.ts
    export interface CacheEntry<T> {
        value: T;
        timestamp: number;
        ttl: number;
    }

    export class LRUCache<K, V> {
        private cache = new Map<K, CacheEntry<V>>();
        private maxSize: number;
        private defaultTTL: number;

        constructor(maxSize: number, defaultTTL: number = 60000) {
            this.maxSize = maxSize;
            this.defaultTTL = defaultTTL;
        }

        get(key: K): V | undefined {
            const entry = this.cache.get(key);

            if (!entry) {
                return undefined;
            }

            // Check TTL
            if (Date.now() - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                return undefined;
            }

            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, entry);

            return entry.value;
        }

        set(key: K, value: V, ttl?: number): void {
            // Remove least recently used if at capacity
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            this.cache.set(key, {
                value,
                timestamp: Date.now(),
                ttl: ttl || this.defaultTTL,
            });
        }

        clear(): void {
            this.cache.clear();
        }

        size(): number {
            return this.cache.size;
        }
    }
    ```

3. **Smart Triggering**

    ```typescript
    // src/completion/trigger.ts
    export class CompletionTrigger {
        private static readonly STOP_WORDS = new Set([
            'import',
            'export',
            'from',
            'class',
            'interface',
            'type',
            'enum',
        ]);

        private static readonly STOP_SEQUENCES = new Set([
            '//',
            '#',
            '/*',
            '*',
            '<!--',
            '"',
            "'",
            '`',
        ]);

        static shouldTrigger(document: vscode.TextDocument, position: vscode.Position): boolean {
            const line = document.lineAt(position.line);
            const text = line.text.substring(0, position.character);

            // Don't trigger at start of line
            if (text.trim().length === 0) {
                return false;
            }

            // Don't trigger on comment-only lines
            if (this.isComment(text)) {
                return false;
            }

            // Don't trigger after import/export keywords (alone)
            const words = text.trim().split(/\s+/);
            if (words.length === 1 && this.STOP_WORDS.has(words[0])) {
                return false;
            }

            // Don't trigger inside strings
            if (this.isInsideString(line.text, position.character)) {
                return false;
            }

            return true;
        }

        private static isComment(text: string): boolean {
            for (const sequence of this.STOP_SEQUENCES) {
                if (text.trim().startsWith(sequence)) {
                    return true;
                }
            }
            return false;
        }

        private static isInsideString(line: string, position: number): boolean {
            let inSingleQuote = false;
            let inDoubleQuote = false;
            let inBacktick = false;
            let escaped = false;

            for (let i = 0; i < position; i++) {
                const char = line[i];

                if (escaped) {
                    escaped = false;
                    continue;
                }

                if (char === '\\') {
                    escaped = true;
                    continue;
                }

                if (char === '"' && !inBacktick && !inSingleQuote) {
                    inDoubleQuote = !inDoubleQuote;
                } else if (char === "'" && !inBacktick && !inDoubleQuote) {
                    inSingleQuote = !inSingleQuote;
                } else if (char === '`' && !inDoubleQuote && !inSingleQuote) {
                    inBacktick = !inBacktick;
                }
            }

            return inSingleQuote || inDoubleQuote || inBacktick;
        }
    }
    ```

4. **Language-Specific Context**

    ````typescript
    // src/context/language.ts
    export class LanguageContext {
        private static readonly LANGUAGE_PROMPTS: Record<string, string> = {
            javascript: '// JavaScript code:\n',
            typescript: '// TypeScript code:\n',
            python: '# Python code:\n',
            java: '// Java code:\n',
            go: '// Go code:\n',
            rust: '// Rust code:\n',
            cpp: '// C++ code:\n',
            csharp: '// C# code:\n',
            php: '<?php\n',
            ruby: '# Ruby code:\n',
            swift: '// Swift code:\n',
            kotlin: '// Kotlin code:\n',
            sql: '-- SQL code:\n',
            shell: '# Shell script\n',
            powershell: '# PowerShell\n',
            dockerfile: '# Dockerfile\n',
        };

        static getLanguagePrompt(languageId: string): string {
            return this.LANGUAGE_PROMPTS[languageId] || `// ${languageId}:\n`;
        }

        static getStopSequences(languageId: string): string[] {
            const sequences: Record<string, string[]> = {
                python: ['\n\n', '"""', "'''", '```'],
                javascript: ['\n\n', '```', '"'],
                typescript: ['\n\n', '```', '"'],
                java: ['\n\n', '```', '*/'],
                go: ['\n\n', '```', '/*'],
                rust: ['\n\n', '```', '/*'],
                cpp: ['\n\n', '```', '/*'],
                html: ['\n\n', '```', '</'],
                css: ['\n\n', '```', '}'],
            };

            return sequences[languageId] || ['\n\n', '```'];
        }
    }
    ````

**Deliverables:**

- ✅ Secret storage for API keys
- ✅ LRU caching for completions
- ✅ Language-specific prompts
- ✅ Smart triggering logic

### 5.3 Phase 3: Security & Polish (Week 3)

**Goals:**

- Streaming support
- Rate limiting
- Telemetry (optional)
- Performance optimizations

**Tasks:**

1. **Streaming API Client**

    ```typescript
    // src/services/mistralClient.ts (streaming support added to MistralClient)
    import { Mistral } from '@mistralai/mistralai';
    import type { FIMCompletionParams } from '@mistralai/mistralai/models/components/fimcompletionparams.js';

    export class MistralClient {
        private client: Mistral;

        constructor(apiKey: string) {
            this.client = new Mistral({ apiKey });
        }

        async *streamCompletions(request: FIMCompletionParams): AsyncGenerator<string> {
            const stream = this.client.fim.stream(request);

            for await (const chunk of stream) {
                // SDK provides typed streaming chunks
                if (chunk.choices && chunk.choices[0]?.delta?.content) {
                    yield chunk.choices[0].delta.content;
                }
            }
        }
    }
    ```

2. **Rate Limiter**

    ```typescript
    // src/api/rateLimiter.ts
    interface RateLimitConfig {
        requestsPerInterval: number;
        intervalMs: number;
    }

    export class RateLimiter {
        private requestCount = 0;
        private lastReset = Date.now();
        private config: RateLimitConfig;

        constructor(config: RateLimitConfig) {
            this.config = config;
        }

        async waitIfNeeded(): Promise<void> {
            const now = Date.now();

            // Reset counter if interval passed
            if (now - this.lastReset > this.config.intervalMs) {
                this.requestCount = 0;
                this.lastReset = now;
            }

            // Wait if at limit
            if (this.requestCount >= this.config.requestsPerInterval) {
                const waitTime = this.config.intervalMs - (now - this.lastReset);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                this.requestCount = 0;
            }

            this.requestCount++;
        }

        reset(): void {
            this.requestCount = 0;
            this.lastReset = Date.now();
        }
    }
    ```

3. **Status Bar Integration**

    ```typescript
    // src/ui/statusBar.ts
    export class StatusBarManager {
        private statusBarItem: vscode.StatusBarItem;
        private status: 'ready' | 'loading' | 'error' = 'ready';

        constructor() {
            this.statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                100
            );
            this.statusBarItem.command = 'predicte.toggle';
            this.statusBarItem.tooltip = 'Toggle Predicte';
            this.updateStatus('ready');
            this.statusBarItem.show();
        }

        updateStatus(status: 'ready' | 'loading' | 'error'): void {
            this.status = status;

            switch (status) {
                case 'ready':
                    this.statusBarItem.text = '$(check) Predicte';
                    this.statusBarItem.color = undefined;
                    break;
                case 'loading':
                    this.statusBarItem.text = '$(loading~spin) Predicte';
                    this.statusBarItem.color = '#FFA500';
                    break;
                case 'error':
                    this.statusBarItem.text = '$(error) Predicte';
                    this.statusBarItem.color = '#FF4444';
                    break;
            }
        }

        dispose(): void {
            this.statusBarItem.dispose();
        }
    }
    ```

**Deliverables:**

- ✅ Streaming support
- ✅ Rate limiting
- ✅ Status bar integration
- ✅ Performance optimizations

### 5.4 Phase 4: Testing & Distribution (Week 4)

**Goals:**

- Unit tests
- Integration tests
- Documentation
- Package for VS Code Marketplace

**Tasks:**

1. **Unit Tests**

    ```typescript
    // test/completion/provider.test.ts
    import { describe, it, expect, vi } from 'vitest';
    import { PredicteCompletionProvider } from '../../src/completion/provider';

    describe('PredicteCompletionProvider', () => {
        it('should return null when disabled', async () => {
            const provider = new PredicteCompletionProvider();
            // Mock config to return enabled: false
            const result = await provider.provideInlineCompletionItems(
                mockDocument,
                mockPosition,
                mockContext,
                mockToken
            );
            expect(result).toBeNull();
        });

        it('should debounce requests', async () => {
            // Test debouncing behavior
        });

        it('should extract context correctly', () => {
            // Test context extraction
        });
    });
    ```

2. **Integration Tests**

    ```typescript
    // test/services/mistralClient.test.ts
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { Mistral } from '@mistralai/mistralai';
    import { MistralClient } from '../../src/services/mistralClient';

    vi.mock('@mistralai/mistralai');

    describe('MistralClient', () => {
        let client: MistralClient;
        let mockMistral: { fim: { complete: ReturnType<typeof vi.fn> } };

        beforeEach(() => {
            mockMistral = {
                fim: {
                    complete: vi.fn(),
                },
            };
            vi.mocked(Mistral).mockImplementation(() => mockMistral as any);
            client = new MistralClient('test-api-key');
        });

        it('should call the correct endpoint', async () => {
            mockMistral.fim.complete.mockResolvedValue({
                id: 'test-id',
                choices: [
                    {
                        message: {
                            content: 'test completion',
                        },
                    },
                ],
            });

            const result = await client.getCompletion({
                model: 'codestral-latest',
                prompt: 'test',
            });

            expect(result?.text).toBe('test completion');
        });

        it('should handle 401 errors', async () => {
            const error = new Error('Unauthorized') as any;
            error.status = 401;
            mockMistral.fim.complete.mockRejectedValue(error);

            await expect(
                client.getCompletion({
                    model: 'codestral-latest',
                    prompt: 'test',
                })
            ).rejects.toThrow('Invalid API key');
        });
    });
    ```

3. **Documentation**
    - README.md with installation and configuration
    - CHANGELOG.md for version history
    - LICENSE file (MIT)

4. **Package for Distribution**

    ```bash
    # Install vsce
    npm install -g @vscode/vsce

    # Package extension
    vsce package

    # Publish to marketplace
    vsce publish
    ```

**Deliverables:**

- ✅ Comprehensive test suite
- ✅ Documentation
- ✅ Published extension

---

## 6. Technical Architecture

### 6.1 Project Structure

```
predicte/
 ├── src/
 │   ├── extension.ts                 # Extension entry point
 │   ├── managers/
 │   │   ├── configManager.ts        # Configuration management
 │   │   └── cacheManager.ts         # LRU cache implementation
 │   ├── providers/
 │   │   └── completionProvider.ts   # Inline completion provider
 │   ├── services/
 │   │   ├── mistralClient.ts        # Mistral SDK client wrapper
 │   │   └── secretStorage.ts        # Secret storage API wrapper
 │   ├── utils/
 │   │   ├── codeUtils.ts            # Code manipulation utilities
 │   │   ├── contextUtils.ts         # Context extraction utilities
 │   │   ├── debounce.ts             # Debounce utility
 │   │   └── logger.ts               # Logger
 ├── test/
 │   ├── suite/
 │   │   ├── extension.test.ts
 │   │   ├── mistralClient.test.ts
 │   │   └── completionProvider.test.ts
 │   └── runTest.ts
 ├── package.json
 ├── tsconfig.json
 ├── webpack.config.cjs
 ├── eslint.config.cjs
 ├── .gitignore
 ├── README.md
 ├── AGENTS.md
 └── RESEARCH-PLAN.md
```

### 6.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌──────────────────────────┐   │
│  │  Extension.ts   │────────>│ PredicteConfig          │   │
│  │  (activate)     │         │ - Load/Watch config      │   │
│  └────────┬────────┘         └────────────┬─────────────┘   │
│           │                              │                   │
│           v                              v                   │
│  ┌─────────────────┐         ┌──────────────────────────┐   │
│  │ StatusBarManager│         │ PredicteSecretStorage   │   │
│  │ - Show status    │         │ - Store/get API key     │   │
│  └─────────────────┘         └──────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        PredicteCompletionProvider                  │    │
│  │  ┌─────────────────────────────────────────────┐   │    │
│  │  │ provideInlineCompletionItems()              │   │    │
│  │  │  ├─> shouldTrigger()                        │   │    │
│  │  │  ├─> extractContext()                       │   │    │
│  │  │  ├─> checkCache()                           │   │    │
│  │  │  ├─> rateLimiter.waitIfNeeded()             │   │    │
│  │  │  └─> apiClient.getCompletions()             │   │    │
│  │  └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                                                  │
 │           v                                                  │
 │  ┌─────────────────┐         ┌──────────────────────────┐   │
 │  │  LRUCache       │         │  MistralClient           │   │
 │  │  - get/set      │         │  - getCompletion()       │   │
 │  │  - clear        │         │  - streamCompletions()   │   │
 │  └─────────────────┘         └────────────┬─────────────┘   │
 │                                           │                   │
 └───────────────────────────────────────────┼───────────────────┘
                                             │
                                             v
                             ┌───────────────────────────┐
                             │   Mistral API             │
                             │   (@mistralai/mistralai)  │
                             │   https://api.mistral.ai  │
                             │   /v1/fim/completions     │
                            └───────────────────────────┘
```

### 6.3 Data Flow

```
User Typing
    │
    v
VS Code InlineCompletionItemProvider invoked
    │
    ├─> Check: Is extension enabled?
    │   └─> No: Return null
    │   └─> Yes: Continue
    │
    ├─> Check: Should trigger?
    │   └─> No: Return null
    │   └─> Yes: Continue
    │
    ├─> Extract context (prefix + suffix)
    │   └─> Add language-specific prompt
    │   └─> Truncate to max context size
    │
    ├─> Check cache
    │   └─> Cache hit: Return cached result
    │   └─> Cache miss: Continue
    │
    ├─> Wait for rate limiter (if needed)
    │
    ├─> Call Mistral API
    │   ├─> Non-streaming: Wait for full response
    │   └─> Streaming: Yield tokens as they arrive
    │
    ├─> Parse response
    │   └─> Extract completion text
    │   └─> Clean up (trim whitespace, etc.)
    │
    ├─> Cache result
    │
    └─> Return InlineCompletionItem[]
        └─> VS Code displays suggestion
```

### 6.4 Package.json (Complete)

```json
{
    "name": "predicte",
    "displayName": "Predicte",
    "description": "Lightweight AI-powered autocomplete using Mistral's Codestral model",
    "version": "0.1.0",
    "publisher": "your-publisher",
    "engines": {
        "vscode": "^1.85.0"
    },
    "categories": ["Machine Learning", "Other"],
    "keywords": ["autocomplete", "codestral", "mistral", "ai", "code completion", "lightweight"],
    "activationEvents": ["onStartupFinished"],
    "main": "./dist/extension.js",
    "contributes": {
        "configuration": {
            "title": "Predicte",
            "properties": {
                "predicte.enabled": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable/disable Predicte autocomplete",
                    "order": 1
                },
                "predicte.model": {
                    "type": "string",
                    "enum": ["codestral-latest", "codestral-22b", "codestral-2404"],
                    "default": "codestral-latest",
                    "enumDescriptions": [
                        "Latest Codestral model (best quality)",
                        "Smaller, faster Codestral model",
                        "April 2024 version"
                    ],
                    "description": "Codestral model to use",
                    "order": 2
                },
                "predicte.maxTokens": {
                    "type": "number",
                    "default": 50,
                    "minimum": 1,
                    "maximum": 500,
                    "description": "Maximum completion tokens",
                    "order": 3
                },
                "predicte.temperature": {
                    "type": "number",
                    "default": 0.1,
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Sampling temperature (lower = more deterministic)",
                    "order": 4
                },
                "predicte.debounceDelay": {
                    "type": "number",
                    "default": 300,
                    "minimum": 100,
                    "maximum": 2000,
                    "description": "Delay before triggering autocomplete (ms)",
                    "order": 5
                },
                "predicte.contextLines": {
                    "type": "number",
                    "default": 20,
                    "minimum": 5,
                    "maximum": 100,
                    "description": "Number of context lines to include",
                    "order": 6
                },
                "predicte.enableStreaming": {
                    "type": "boolean",
                    "default": true,
                    "description": "Use streaming for completions",
                    "order": 7
                },
                "predicte.cacheEnabled": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable completion caching",
                    "order": 8
                },
                "predicte.cacheTTL": {
                    "type": "number",
                    "default": 60000,
                    "minimum": 1000,
                    "maximum": 600000,
                    "description": "Cache TTL in milliseconds",
                    "order": 9
                }
            }
        },
        "commands": [
            {
                "command": "predicte.toggle",
                "title": "Toggle Predicte"
            },
            {
                "command": "predicte.setApiKey",
                "title": "Set Predicte API Key"
            },
            {
                "command": "predicte.clearCache",
                "title": "Clear Predicte Cache"
            }
        ],
        "keybindings": [
            {
                "command": "predicte.toggle",
                "key": "ctrl+alt+c",
                "mac": "cmd+alt+c"
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
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest --coverage"
    },
    "devDependencies": {
        "@types/vscode": "^1.85.0",
        "@types/node": "20.x",
        "@typescript-eslint/eslint-plugin": "^6.7.0",
        "@typescript-eslint/parser": "^6.7.0",
        "@vitest/ui": "^1.0.0",
        "eslint": "^8.47.0",
        "typescript": "^5.2.2",
        "ts-loader": "^9.4.4",
        "webpack": "^5.88.2",
        "webpack-cli": "^5.1.4",
        "@vitest/coverage-v8": "^1.0.0",
        "vitest": "^1.0.0"
    },
    "dependencies": {
        "@mistralai/mistralai": "^1.11.0"
    }
}
```

### 6.5 Webpack Configuration

```javascript
const path = require('path');

module.exports = {
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    devtool: 'source-map',
};
```

### 6.6 TypeScript Configuration

```json
{
    "compilerOptions": {
        "module": "commonjs",
        "target": "ES2020",
        "lib": ["ES2020"],
        "outDir": "out",
        "rootDir": "src",
        "sourceMap": true,
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "moduleResolution": "node",
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        },
        "types": ["node", "vitest/globals"]
    },
    "include": ["src/**/*", "test/**/*"],
    "exclude": ["node_modules", ".vscode-test"]
}
```

### 6.7 ESLint Configuration

```json
{
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module"
    },
    "plugins": ["@typescript-eslint"],
    "rules": {
        "@typescript-eslint/naming-convention": [
            "warn",
            {
                "selector": "class",
                "format": ["PascalCase"]
            }
        ],
        "@typescript-eslint/semi": "warn",
        "curly": "warn",
        "eqeqeq": "warn",
        "no-throw-literal": "warn",
        "semi": "off"
    },
    "ignorePatterns": ["out", "dist", "**/*.d.ts"]
}
```

---

## 7. Security & Privacy Considerations

### 7.1 API Key Management

**Secret Storage (Recommended):**

```typescript
// Always use VS Code's SecretStorage API for API keys
export class PredicteSecretStorage {
    async setApiKey(apiKey: string): Promise<void> {
        await this.storage.store('predicte.apiKey', apiKey);
    }

    async getApiKey(): Promise<string | undefined> {
        return await this.storage.get('predicte.apiKey');
    }
}
```

**❌ Avoid Storing in Settings:**

```typescript
// DON'T DO THIS - Settings are stored in plain text
const apiKey = config.get<string>('apiKey');
```

### 7.2 Data Handling

**Data Sent to API:**

- Code context (prefix + suffix)
- Language ID
- File extension (optional)

**Data NOT Sent:**

- File names (by default)
- File paths
- User identifiers
- Personal information

**Configuration for Privacy:**

```json
{
    "predicte.includeFilename": {
        "type": "boolean",
        "default": false,
        "description": "Include filename in context (may affect privacy)"
    }
}
```

### 7.3 Telemetry

**Optional Telemetry (Opt-in Only):**

```typescript
export class Telemetry {
    private enabled: boolean;
    private endpoint?: string;

    async logEvent(eventName: string, properties?: Record<string, any>) {
        if (!this.enabled) return;

        // Anonymize data before sending
        const anonymized = this.anonymize(properties);

        // Send to telemetry endpoint
        // ...
    }

    private anonymize(properties: Record<string, any>): Record<string, any> {
        const anonymized = { ...properties };

        // Remove any identifying information
        if (anonymized.fileName) {
            anonymized.fileName = this.hash(anonymized.fileName);
        }

        return anonymized;
    }
}
```

### 7.4 Error Messages

**Secure Error Handling:**

```typescript
// DON'T expose API keys in error messages
try {
    // API call
} catch (error: any) {
    // Sanitize error messages
    const message = error.message?.replace(/Bearer\s+[^\s]+/g, 'Bearer ***');

    vscode.window.showErrorMessage(message);
}
```

### 7.5 Network Security

**HTTPS Only:**

```typescript
// The official @mistralai/mistralai SDK uses HTTPS by default
// No need to manually configure HTTPS URLs or agents
import { Mistral } from '@mistralai/mistralai';

const client = new Mistral({ apiKey });
// SDK automatically uses secure HTTPS endpoint: https://api.mistral.ai/v1
```

**Certificate Validation:**

```typescript
// The SDK handles certificate validation automatically
// All connections use HTTPS with proper certificate validation
// No additional configuration needed
```

**Certificate Validation:**

```typescript
// Ensure certificate validation is enabled
const httpsAgent = new https.Agent({
    rejectUnauthorized: true, // Always validate certificates
});
```

### 7.6 Input Validation

**Validate API Key Format:**

```typescript
function validateApiKey(apiKey: string): boolean {
    // Mistral API keys typically start with 'sk-...'
    const apiKeyPattern = /^sk-[A-Za-z0-9]{20,}$/;
    return apiKeyPattern.test(apiKey);
}
```

**Validate User Input:**

```typescript
// Limit context size to prevent excessive API usage
function validateContext(context: string, maxChars: number): boolean {
    return context.length <= maxChars;
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Frameworks:**

- **Vitest** - Modern test runner with TypeScript support
- **@vitest/ui** - UI for test visualization

**Coverage Goals:**

- Configuration management: 100%
- API client: 90%+
- Cache implementation: 100%
- Trigger logic: 100%

**Example Unit Tests:**

```typescript
// test/completion/trigger.test.ts
import { describe, it, expect } from 'vitest';
import { CompletionTrigger } from '../../src/completion/trigger';
import * as vscode from 'vscode';

describe('CompletionTrigger', () => {
    it('should not trigger at start of line', () => {
        const document = createMockDocument('');
        const position = new vscode.Position(0, 0);

        expect(CompletionTrigger.shouldTrigger(document, position)).toBe(false);
    });

    it('should not trigger on comment lines', () => {
        const document = createMockDocument('// comment');
        const position = new vscode.Position(0, 10);

        expect(CompletionTrigger.shouldTrigger(document, position)).toBe(false);
    });

    it('should not trigger inside strings', () => {
        const document = createMockDocument('const x = "hello"');
        const position = new vscode.Position(0, 12);

        expect(CompletionTrigger.shouldTrigger(document, position)).toBe(false);
    });

    it('should trigger on normal code', () => {
        const document = createMockDocument('const x = ');
        const position = new vscode.Position(0, 10);

        expect(CompletionTrigger.shouldTrigger(document, position)).toBe(true);
    });
});
```

### 8.2 Integration Tests

**Test Scenarios:**

1. API client integration (with mocked API)
2. Configuration changes reload correctly
3. Secret storage persistence
4. End-to-end completion flow

**Example Integration Test:**

```typescript
// test/api/integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Mistral } from '@mistralai/mistralai';
import { MistralClient } from '../../src/services/mistralClient';

vi.mock('@mistralai/mistralai');

describe('MistralClient Integration', () => {
    let client: MistralClient;
    let mockMistral: { fim: { complete: ReturnType<typeof vi.fn> } };

    beforeEach(() => {
        mockMistral = {
            fim: {
                complete: vi.fn().mockResolvedValue({
                    id: 'test-id',
                    choices: [
                        {
                            message: {
                                content: 'console.log("Hello");',
                            },
                        },
                    ],
                }),
            },
        };
        vi.mocked(Mistral).mockImplementation(() => mockMistral as any);
        client = new MistralClient('test-api-key');
    });

    it('should call the correct endpoint with correct parameters', async () => {
        const result = await client.getCompletion({
            model: 'codestral-latest',
            prompt: 'console',
            maxTokens: 50,
        });

        expect(mockMistral.fim.complete).toHaveBeenCalledWith(
            expect.objectContaining({
                model: 'codestral-latest',
                prompt: 'console',
                maxTokens: 50,
            })
        );

        expect(result?.text).toBe('console.log("Hello");');
    });
});
```

### 8.3 Performance Tests

**Metrics to Track:**

- API response time (p50, p95, p99)
- Extension startup time
- Memory usage
- Cache hit rate

**Example Performance Test:**

```typescript
// test/performance/cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/cache/lru';

describe('Cache Performance', () => {
    let cache: LRUCache<string, string>;

    beforeEach(() => {
        cache = new LRUCache<string, string>(1000);
    });

    it('should retrieve from cache in < 1ms', () => {
        cache.set('key', 'value');

        const start = performance.now();
        const result = cache.get('key');
        const duration = performance.now() - start;

        expect(result).toBe('value');
        expect(duration).toBeLessThan(1);
    });

    it('should handle 10k operations without significant degradation', () => {
        const start = performance.now();

        for (let i = 0; i < 10000; i++) {
            cache.set(`key-${i}`, `value-${i}`);
            cache.get(`key-${i}`);
        }

        const duration = performance.now() - start;
        expect(duration).toBeLessThan(100); // < 100ms for 10k ops
    });
});
```

### 8.4 User Testing

**Test Plan:**

1. Install extension in fresh VS Code instance
2. Configure API key
3. Test in multiple languages
4. Verify autocomplete quality
5. Test configuration changes
6. Test toggle command
7. Test error scenarios (invalid API key, no internet)

**Test Checklist:**

- [ ] Autocomplete appears in JavaScript
- [ ] Autocomplete appears in Python
- [ ] Autocomplete appears in TypeScript
- [ ] Debouncing works correctly
- [ ] Caching reduces duplicate requests
- [ ] Toggle command works
- [ ] Status bar updates correctly
- [ ] API key storage is secure
- [ ] Error messages are clear

---

## 9. Timeline & Milestones

### 9.1 Week 1: Foundation

| Day | Task                            | Deliverable                    |
| --- | ------------------------------- | ------------------------------ |
| Mon | Project setup, dependencies     | Initialized project            |
| Tue | Configuration management        | Config class + package.json    |
| Wed | Mistral API client              | API client with error handling |
| Thu | Completion provider             | Basic inline completions       |
| Fri | Extension entry point + testing | Working extension              |

**Milestone 1: Core Autocomplete Working**

### 9.2 Week 2: Enhancement

| Day | Task                      | Deliverable                  |
| --- | ------------------------- | ---------------------------- |
| Mon | Secret storage            | Secure API key storage       |
| Tue | LRU cache                 | Caching implementation       |
| Wed | Language-specific prompts | Better context handling      |
| Thu | Smart triggering          | Trigger logic improvements   |
| Fri | Testing + refinement      | Enhanced completion provider |

**Milestone 2: Enhanced Context & Caching**

### 9.3 Week 3: Polish

| Day | Task                     | Deliverable                 |
| --- | ------------------------ | --------------------------- |
| Mon | Streaming API client     | Streaming completions       |
| Tue | Rate limiting            | Rate limiter implementation |
| Wed | Status bar integration   | Status bar manager          |
| Thu | Performance optimization | Code profiling + fixes      |
| Fri | Error handling + logging | Robust error handling       |

**Milestone 3: Security & Polish Complete**

### 9.4 Week 4: Distribution

| Day | Task                   | Deliverable        |
| --- | ---------------------- | ------------------ |
| Mon | Unit tests             | 80%+ code coverage |
| Tue | Integration tests      | End-to-end tests   |
| Wed | Documentation          | README, CHANGELOG  |
| Thu | Package extension      | .vsix file         |
| Fri | Publish to marketplace | Live extension     |

**Milestone 4: Published Extension**

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk                         | Probability | Impact | Mitigation                           |
| ---------------------------- | ----------- | ------ | ------------------------------------ |
| Mistral API changes          | Medium      | High   | Keep API versioning, monitor updates |
| Rate limiting issues         | High        | Medium | Implement rate limiting, caching     |
| VS Code API breaking changes | Low         | High   | Lock version range, test on updates  |
| Performance issues           | Medium      | Medium | Profiling, caching, debouncing       |
| Memory leaks                 | Low         | Medium | Proper disposal, leak testing        |

### 10.2 Security Risks

| Risk                       | Probability | Impact | Mitigation                         |
| -------------------------- | ----------- | ------ | ---------------------------------- |
| API key exposure           | Low         | High   | Use SecretStorage, never log keys  |
| Code leakage               | Low         | Medium | User awareness, optional telemetry |
| Man-in-the-middle attacks  | Low         | High   | HTTPS only, certificate validation |
| Dependency vulnerabilities | Medium      | Medium | Regular dependency updates         |

### 10.3 User Experience Risks

| Risk                     | Probability | Impact | Mitigation                       |
| ------------------------ | ----------- | ------ | -------------------------------- |
| Poor completion quality  | Medium      | High   | Tune parameters, gather feedback |
| Too slow                 | Medium      | Medium | Debouncing, streaming, caching   |
| Too many false positives | Medium      | Medium | Smart triggering, user controls  |
| Configuration confusion  | Low         | Medium | Clear documentation, defaults    |

### 10.4 Contingency Plans

**If Mistral API is down:**

- Show clear error message to user
- Gracefully degrade (show cached results if available)
- Add retry logic with exponential backoff

**If VS Code API changes:**

- Monitor VS Code release notes
- Test beta versions
- Maintain compatibility with multiple versions

**If extension becomes popular (cost concerns):**

- Implement caching to reduce API calls
- Add user-configurable limits
- Consider local model fallback options

---

## Appendix A: Quick Start Guide

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/predicte.git
cd predicte

# Install dependencies
npm install

# Build extension
npm run compile

# Run in development (F5 in VS Code)
```

### Configuration

1. Get API key from [Mistral Console](https://console.mistral.ai)
2. Run `Set Predicte API Key` command
3. Adjust settings in `settings.json`

### Usage

- Type code, suggestions appear automatically
- Press `Tab` to accept suggestion
- Press `Ctrl+Alt+C` (Mac: `Cmd+Alt+C`) to toggle
- See status bar for current state

---

## Appendix B: References

### Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Mistral API Documentation](https://docs.mistral.ai/)
- [InlineCompletionItemProvider](https://code.visualstudio.com/api/references/vscode-api#InlineCompletionItemProvider)
- [SecretStorage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

### Open Source Extensions

- [Tabby](https://github.com/TabbyML/tabby-vscode)
- [Continue](https://github.com/continuedev/continue)

### Tools

- [Vitest](https://vitest.dev/)
- [vsce](https://github.com/microsoft/vscode-vsce)
- [TypeScript](https://www.typescriptlang.org/)

---

**End of Research Document**

---

STATUS: COMPLETED
FILES MODIFIED: Updated /home/satrya/dev/predicte/RESEARCH-PLAN.md
NEXT ACTION: Review the updated research document and proceed with implementation or request any clarifications
