/**
 * Completion Sanitizer
 *
 * This module provides utilities for cleaning and formatting completion text.
 * It removes AI-generated artifacts, fixes spacing issues, and ensures
 * completions are properly formatted for insertion.
 */

/**
 * Clean up completion text from common artifacts
 *
 * Removes common AI-generated artifacts like:
 * - Markdown code block markers (```)
 * - FIM (Fill-in-Middle) tokens (<fim_prefix>, <fim_suffix>, <fim_middle>, etc.)
 * - Extra newlines
 * - Trailing/leading whitespace
 * - Common language-specific comment markers
 *
 * @param text The raw completion text
 * @returns Sanitized completion text
 */
export function sanitizeCompletion(text: string): string {
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
      break;
    }
  }

  // Remove FIM (Fill-in-Middle) tokens - these are model artifacts
  // Handle both standard and pipe-delimited token formats
  sanitized = sanitized.replace(/<fim_(prefix|suffix|middle)>/gi, '');
  sanitized = sanitized.replace(/<(PRE|SUF|MID)>/gi, '');
  sanitized = sanitized.replace(/<\|fim_(prefix|suffix|middle)\|>/gi, '');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  // Remove excessive newlines (more than 2 in a row)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized;
}

/**
 * Fix HTML/JSX spacing issues in completions
 *
 * Ensures proper spacing between tag names and attributes.
 * Example: Converts "to='/'>\" to " to='/>\" (adds missing space)
 *
 * @param completion The completion text
 * @param prefix The prefix context before the cursor
 * @returns Fixed completion text
 */
export function fixHtmlJsxSpacing(completion: string, prefix: string): string {
  // Only process if we have both completion and prefix
  if (!completion || !prefix) {
    return completion;
  }

  const trimmedPrefix = prefix.trim();

  // Check if prefix ends with a tag name (like "<Link", "<div", etc.)
  const tagMatch = trimmedPrefix.match(/<([a-zA-Z][a-zA-Z0-9_-]*)$/);
  if (!tagMatch) {
    return completion;
  }

  // Check if completion starts with an attribute (common patterns)
  const attributePatterns = [
    /^[a-zA-Z][a-zA-Z0-9_-]*=/, // Standard attributes: to=, href=, className=
    /^[a-zA-Z][a-zA-Z0-9_-]*\s/, // Attributes with space: to (not followed by = yet)
    /^\{/, // JSX expressions: {variable}
    /^\./, // Class names: .className
    /^#/, // IDs: #id
  ];

  const startsWithAttribute = attributePatterns.some((pattern) =>
    pattern.test(completion),
  );

  if (startsWithAttribute) {
    // Check if first character of completion is already a space
    if (completion[0] !== ' ') {
      // Add a space to make it valid: "<Link to=" instead of "<Linkto="
      return ' ' + completion;
    }
  }

  return completion;
}

/**
 * Check if a completion is valid
 *
 * Validates that the completion is not empty, not just whitespace,
 * and doesn't contain only invalid characters or meaningless patterns.
 *
 * Rejects common "I don't know" patterns like `...`, `..`, `.`, `,`, `;`, `:`
 * while allowing valid short completions like `x`, `1`, `{}`, `[]`, `()`.
 *
 * @param completion The completion text to validate
 * @returns true if the completion is valid
 */
export function isValidCompletion(completion: string): boolean {
  if (!completion || completion.length === 0) {
    return false;
  }

  const trimmed = completion.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Check if completion is only whitespace or special characters
  const meaningfulChars = trimmed.replace(/[\s\r\n\t]/g, '');
  if (meaningfulChars.length === 0) {
    return false;
  }

  // Reject very short completions that are likely not useful
  // Examples: "...", "..", ".", ",", ";", ":", etc.
  // But allow short valid code like "x", "1", "{}", "[]", etc.
  if (meaningfulChars.length <= 2) {
    // Check if it's a common "I don't know" pattern
    const meaninglessPatterns = [/^\.+$/, /^,$/, /^;+$/, /^:+$/];
    for (const pattern of meaninglessPatterns) {
      if (pattern.test(meaningfulChars)) {
        return false;
      }
    }
  }

  return true;
}
