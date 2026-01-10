/**
 * Context Analyzer
 *
 * This module provides utilities for analyzing code context, including
 * detecting comments, strings, and managing indentation. These utilities
 * help determine when and how to provide completions.
 */

/**
 * Check if a position is inside a comment
 *
 * Supports single-line comments (//, #) and multi-line comments.
 * This is a basic implementation that checks the line content.
 *
 * @param line The line text
 * @param position The character position in the line
 * @returns true if position is inside a comment
 */
export function isInsideComment(line: string, position: number): boolean {
  const textBeforePosition = line.substring(0, position);
  const trimmedBefore = textBeforePosition.trim();

  // Check for single-line comments
  // JavaScript/TypeScript: //
  if (trimmedBefore.includes('//')) {
    return true;
  }

  // Python, Shell/Bash: #
  if (trimmedBefore.includes('#')) {
    return true;
  }

  // SQL: --
  if (trimmedBefore.includes('--')) {
    return true;
  }

  // HTML/XML: <!--
  if (trimmedBefore.includes('<!--')) {
    return true;
  }

  // Check for multi-line comment start (basic check)
  // This is a simplified check and doesn't handle all cases
  if (textBeforePosition.includes('/*') && !textBeforePosition.includes('*/')) {
    return true;
  }

  return false;
}

/**
 * Check if a position is inside a string
 *
 * Detects single-quoted ('), double-quoted ("), and template literal (`) strings.
 * Properly handles escaped quotes.
 *
 * @param line The line text
 * @param position The character position in the line
 * @returns true if position is inside a string
 */
export function isInsideString(line: string, position: number): boolean {
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

/**
 * Extract indentation from a line
 *
 * Returns the leading whitespace characters from a line,
 * which can be used to maintain consistent indentation in completions.
 *
 * @param line The line text
 * @returns The leading whitespace (indentation)
 */
export function getIndentation(line: string): string {
  const match = line.match(/^[\s\t]*/);
  return match ? match[0] : '';
}

/**
 * Apply indentation to text
 *
 * Prepends the specified indentation to each line of the text.
 *
 * @param text The text to indent
 * @param indentation The indentation string
 * @returns Indented text
 */
export function applyIndentation(text: string, indentation: string): string {
  if (!indentation) {
    return text;
  }

  return text
    .split('\n')
    .map((line) => (line.length > 0 ? indentation + line : line))
    .join('\n');
}
