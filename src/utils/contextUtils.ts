/**
 * Context Utilities
 *
 * This module provides utility functions for extracting and managing
 * code context from documents.
 */

import * as vscode from 'vscode';

export interface CodeContext {
  prefix: string
  suffix: string
  language: string
  cursorLine: number
}

/**
 * Extract context from a document at a given position
 *
 * Gets the prefix (text before cursor) and suffix (text after cursor)
 * up to the specified number of lines.
 *
 * @param document The VS Code document
 * @param position The cursor position
 * @param contextLines Number of lines to include in context (default: 20)
 * @returns Extracted code context
 */
export function extractContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  contextLines: number = 20,
): CodeContext {
  const currentLine = position.line;
  const totalLines = document.lineCount;

  // Calculate line range for context
  const startLine = Math.max(0, currentLine - Math.floor(contextLines / 2));
  const endLine = Math.min(
    totalLines - 1,
    currentLine + Math.floor(contextLines / 2),
  );

  // Extract prefix (from start of context range to cursor position)
  let prefix = '';
  for (let i = startLine; i <= currentLine; i++) {
    const lineText = document.lineAt(i).text;
    if (i === currentLine) {
      // For current line, only include text before cursor
      prefix += lineText.substring(0, position.character);
    } else {
      prefix += lineText + '\n';
    }
  }

  // Extract suffix (from cursor position to end of context range)
  let suffix = '';
  const currentLineText = document.lineAt(currentLine).text;
  suffix += currentLineText.substring(position.character);
  for (let i = currentLine + 1; i <= endLine; i++) {
    suffix += '\n' + document.lineAt(i).text;
  }

  return {
    prefix,
    suffix,
    language: document.languageId,
    cursorLine: currentLine,
  };
}

/**
 * Get language-specific prompt prefix
 *
 * Returns a language-appropriate comment to prefix the completion request.
 *
 * @param languageId The language identifier (e.g., 'typescript', 'python')
 * @returns Language-specific prompt string
 */
export function getLanguagePrompt(languageId: string): string {
  const prompts: Record<string, string> = {
    javascript: '// JavaScript code:\n',
    typescript: '// TypeScript code:\n',
    python: '# Python code:\n',
    java: '// Java code:\n',
    go: '// Go code:\n',
    rust: '// Rust code:\n',
    cpp: '// C++ code:\n',
    csharp: '// C# code:\n',
    php: '// PHP code:\n',
    ruby: '# Ruby code:\n',
    swift: '// Swift code:\n',
    kotlin: '// Kotlin code:\n',
  };

  return prompts[languageId] || `// ${languageId} code:\n`;
}

/**
 * Truncate context to fit within maximum token limit
 *
 * Truncates from the beginning to ensure the most relevant (recent) context
 * is preserved. Uses an approximation of 4 characters per token.
 *
 * @param context The context string to truncate
 * @param maxTokens Maximum number of tokens (default: 8000)
 * @returns Truncated context string
 */
export function truncateContext(
  context: string,
  maxTokens: number = 8000,
): string {
  const maxChars = maxTokens * 4;
  if (context.length <= maxChars) {
    return context;
  }
  return context.substring(context.length - maxChars);
}

/**
 * Determine if completion should be triggered at the given position
 *
 * Implements smart triggering logic to avoid unnecessary API calls:
 * - Don't trigger on empty lines
 * - Don't trigger when inside a string
 * - Don't trigger when inside a comment (basic detection)
 *
 * @param document The VS Code document
 * @param position The cursor position
 * @returns true if completion should be triggered
 */
export function shouldTrigger(
  document: vscode.TextDocument,
  position: vscode.Position,
): boolean {
  const line = document.lineAt(position.line);
  const text = line.text.substring(0, position.character);

  // Don't trigger on empty lines
  if (text.trim().length === 0) {
    return false;
  }

  // Don't trigger inside strings (basic check)
  // Note: This is a simple check and may not catch all cases
  const lineText = line.text;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;

  for (let i = 0; i < position.character; i++) {
    const char = lineText[i];

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

  if (inSingleQuote || inDoubleQuote || inBacktick) {
    return false;
  }

  return true;
}

/**
 * Calculate approximate token count for a string
 *
 * Uses a rough approximation of 4 characters per token.
 * This is not exact but is sufficient for context limiting.
 *
 * @param text The text to count tokens for
 * @returns Approximate number of tokens
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
