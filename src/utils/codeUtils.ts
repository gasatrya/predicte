/**
 * Code Utilities
 *
 * This module provides general utility functions for code manipulation.
 */

/**
 * Clean up completion text from common artifacts
 *
 * Removes common AI-generated artifacts like:
 * - Markdown code block markers (```)
 * - Extra newlines
 * - Trailing/leading whitespace
 * - Common language-specific comment markers
 *
 * @param text The raw completion text
 * @returns Sanitized completion text
 */
export function sanitizeCompletion(text: string): string {
  console.warn('[DEBUG] sanitizeCompletion called, input length:', text.length);
  console.warn(
    '[DEBUG] Input preview (first 200 chars):',
    text.substring(0, 200),
  );

  let sanitized = text;

  // Remove markdown code block markers
  sanitized = sanitized.replace(/```[\w]*\n?/g, '');

  // Remove common language-specific prefixes
  const prefixes = [
    '// JavaScript code:',
    '// TypeScript code:',
    '# Python code:',
    '// Java code:',
    '// Go code:',
    '// Rust code:',
    '// C++ code:',
    '// C# code:',
    '# Ruby code:',
    '// Swift code:',
    '// Kotlin code:',
  ];

  for (const prefix of prefixes) {
    if (sanitized.startsWith(prefix)) {
      sanitized = sanitized.substring(prefix.length);
      console.warn('[DEBUG] Removed prefix:', prefix);
      break;
    }
  }

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  // Remove excessive newlines (more than 2 in a row)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  console.warn('[DEBUG] Sanitized length:', sanitized.length);
  console.warn(
    '[DEBUG] Sanitized preview (first 200 chars):',
    sanitized.substring(0, 200),
  );

  return sanitized;
}

/**
 * Get language-specific stop sequences for completion generation
 *
 * Returns sequences that should stop completion generation to prevent
 * overly long or nonsensical completions.
 *
 * @param languageId The language identifier
 * @returns Array of stop sequences
 */
export function getStopSequences(languageId: string): string[] {
  const sequences: Record<string, string[]> = {
    javascript: ['\n\n', '```', '"', "'"],
    typescript: ['\n\n', '```', '"', "'"],
    python: ['\n\n', '"""', "'''", '```'],
    java: ['\n\n', '```', '*/'],
    go: ['\n\n', '```', '/*'],
    rust: ['\n\n', '```', '/*'],
    cpp: ['\n\n', '```', '/*'],
    csharp: ['\n\n', '```', '/*'],
    html: ['\n\n', '```', '</'],
    css: ['\n\n', '```', '}'],
    json: ['\n\n', '```', '}', ']'],
    yaml: ['\n\n', '```', '}', ']'],
    markdown: ['\n\n', '```'],
  };

  return sequences[languageId] || ['\n\n', '```'];
}

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

  // Python: #
  if (trimmedBefore.includes('#')) {
    return true;
  }

  // Shell/Bash: #
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
 * Check if a completion is valid
 *
 * Validates that the completion is not empty, not just whitespace,
 * and doesn't contain only invalid characters.
 *
 * @param completion The completion text to validate
 * @returns true if the completion is valid
 */
export function isValidCompletion(completion: string): boolean {
  console.warn('[DEBUG] isValidCompletion called, length:', completion.length);
  console.warn(
    '[DEBUG] Completion preview (first 200 chars):',
    completion.substring(0, 200),
  );

  if (!completion || completion.length === 0) {
    console.warn('[DEBUG] Completion is empty or null, returning false');
    return false;
  }

  const trimmed = completion.trim();
  if (trimmed.length === 0) {
    console.warn('[DEBUG] Completion is only whitespace, returning false');
    return false;
  }

  // Check if completion is only whitespace or special characters
  const meaningfulChars = trimmed.replace(/[\s\r\n\t]/g, '');
  if (meaningfulChars.length === 0) {
    console.warn(
      '[DEBUG] Completion has no meaningful characters, returning false',
    );
    return false;
  }

  console.warn('[DEBUG] Completion is valid, returning true');
  console.warn('[DEBUG] Meaningful chars length:', meaningfulChars.length);
  return true;
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
