/**
 * Code Utilities
 *
 * This module provides general utility functions for code manipulation
 * and language-specific model parameter optimization.
 */

import * as vscode from 'vscode';
import type {
  LanguageParameters,
  CompletionCandidate,
  ScoreDetails,
} from '../types/code';

/**
 * Get language-specific model parameters for completion generation
 *
 * Returns optimized parameters based on the programming language being used.
 * For strict languages (TypeScript, Java), uses lower temperature for more
 * deterministic completions. For dynamic languages (JavaScript, Python), uses
 * slightly higher temperature for more variety.
 *
 * Language categories:
 * - Strict/Typed languages: temperature 0.1-0.2 (TypeScript, Java, Go, Rust, C++, C#)
 * - Dynamic languages: temperature 0.2-0.3 (JavaScript, Python)
 * - Creative tasks: temperature 0.3-0.4 (documentation, comments)
 *
 * @param languageId The VS Code language identifier
 * @returns Language-specific parameters, or default parameters if language is unknown
 */
export function getLanguageParameters(languageId: string): LanguageParameters {
  // Normalize language ID (handle variants like typescriptreact, javascriptreact)
  const normalizedLanguageId = languageId.toLowerCase().replace('react', '');

  const languageMap: Record<string, LanguageParameters> = {
    // Strict/Typed languages - lower temperature for deterministic completions
    typescript: {
      temperature: 0.1,
      maxTokens: 200,
      stopSequences: ['\n\n', ';', '```'],
    },
    java: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    go: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', '```'],
    },
    rust: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    cpp: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    c: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    csharp: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    swift: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', '```'],
    },
    kotlin: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },
    scala: {
      temperature: 0.1,
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
    },

    // Dynamic languages - slightly higher temperature for variety
    javascript: {
      temperature: 0.15,
      maxTokens: 150,
      stopSequences: ['\n\n', ';', '```'],
    },
    python: {
      temperature: 0.2,
      maxTokens: 100,
      stopSequences: ['\n\n', '```', "'''", '"""'],
    },
    php: {
      temperature: 0.15,
      maxTokens: 100,
      stopSequences: ['\n\n', ';', '}', '```'],
    },
    ruby: {
      temperature: 0.2,
      maxTokens: 80,
      stopSequences: ['\n\n', 'end', '```'],
    },

    // Markup languages - shorter completions, simpler stop sequences
    html: {
      temperature: 0.2,
      maxTokens: 50,
      stopSequences: ['\n\n', '</', '```'],
    },
    css: {
      temperature: 0.2,
      maxTokens: 50,
      stopSequences: ['\n\n', '}', '```'],
    },
    xml: {
      temperature: 0.1,
      maxTokens: 50,
      stopSequences: ['\n\n', '</', '```'],
    },

    // Data formats - very deterministic, short completions
    json: {
      temperature: 0.05,
      maxTokens: 50,
      stopSequences: ['\n\n', '}', ']', '```'],
    },
    yaml: {
      temperature: 0.1,
      maxTokens: 50,
      stopSequences: ['\n\n', '}', ']', '```'],
    },

    // Documentation - higher temperature for creative content
    markdown: {
      temperature: 0.3,
      maxTokens: 150,
      stopSequences: ['\n\n', '```'],
    },

    // Shell scripts
    bash: {
      temperature: 0.15,
      maxTokens: 80,
      stopSequences: ['\n\n', '```'],
    },
    shell: {
      temperature: 0.15,
      maxTokens: 80,
      stopSequences: ['\n\n', '```'],
    },

    // SQL
    sql: {
      temperature: 0.1,
      maxTokens: 80,
      stopSequences: ['\n\n', ';', '```'],
    },
  };

  return languageMap[normalizedLanguageId] || getDefaultLanguageParameters();
}

/**
 * Get default language parameters for unknown languages
 *
 * Returns conservative default parameters that work reasonably well
 * for most programming languages.
 *
 * @returns Default language parameters
 */
export function getDefaultLanguageParameters(): LanguageParameters {
  return {
    temperature: 0.15,
    maxTokens: 100,
    stopSequences: ['\n\n', '```'],
  };
}

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
 * Example: Converts "to='/'>" to " to='/>" (adds missing space)
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
 * Get language-specific stop sequences for completion generation
 *
 * Returns sequences that should stop completion generation to prevent
 * overly long or nonsensical completions. Uses language-aware parameters
 * for more accurate stop sequences based on the programming language.
 *
 * @param languageId The VS Code language identifier
 * @returns Array of stop sequences
 */
export function getStopSequences(languageId: string): string[] {
  const params = getLanguageParameters(languageId);
  return params.stopSequences;
}

/**
 * Get stop sequences for a given language ID (legacy compatibility wrapper)
 *
 * @deprecated Use getStopSequences(languageId) directly for consistency
 * @param languageId The language identifier
 * @returns Array of stop sequences
 */
export function getStopSequencesForLanguage(languageId: string): string[] {
  return getStopSequences(languageId);
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

/**
 * Filter out low-quality completion candidates
 *
 * Removes candidates that:
 * - Are too short (< 3 meaningful characters)
 * - Contain obvious syntax errors
 * - Are irrelevant to context
 * - Duplicate existing code
 *
 * @param candidates Array of completion candidates
 * @param prefix The prefix context
 * @param suffix The suffix context
 * @returns Filtered array of candidates
 */
export function filterCandidates(
  candidates: CompletionCandidate[],
  prefix: string,
  suffix: string,
): CompletionCandidate[] {
  const filtered = candidates.filter((candidate) => {
    // Check minimum meaningful length
    const meaningfulChars = candidate.text.replace(/[\s\r\n\t]/g, '');
    if (meaningfulChars.length < 3) {
      return false;
    }

    // Check for obvious syntax issues
    const details = candidate.details;
    if (
      details.codeQualityScore < 0.3 ||
      details.relevanceScore < 0.2 ||
      details.languagePatternScore < 0.2
    ) {
      return false;
    }

    // Check for duplicate code
    if (
      prefix.includes(candidate.text.trim()) ||
      suffix.includes(candidate.text.trim())
    ) {
      return false;
    }

    return true;
  });

  return filtered;
}

/**
 * Score a completion candidate based on multiple criteria
 *
 * Evaluates the completion on:
 * - Relevance to context (prefix/suffix)
 * - Code quality (syntax, indentation, naming)
 * - Length appropriateness
 * - Language-specific patterns
 *
 * @param candidate The completion text to score
 * @param prefix The prefix context before the cursor
 * @param suffix The suffix context after the cursor
 * @param languageId The language identifier for language-specific patterns
 * @returns Score details with individual component scores
 */
export function scoreCompletion(
  candidate: string,
  prefix: string,
  suffix: string,
  languageId?: string,
): ScoreDetails {
  const relevanceScore = calculateRelevanceScore(candidate, prefix, suffix);
  const codeQualityScore = calculateCodeQualityScore(candidate, languageId);
  const lengthScore = calculateLengthScore(candidate, prefix, suffix);
  const languagePatternScore = calculateLanguagePatternScore(
    candidate,
    languageId,
  );

  const details: ScoreDetails = {
    relevanceScore,
    codeQualityScore,
    lengthScore,
    languagePatternScore,
  };

  return details;
}

/**
 * Calculate relevance score based on context match
 */
function calculateRelevanceScore(
  candidate: string,
  prefix: string,
  suffix: string,
): number {
  let score = 0;

  const trimmedPrefix = prefix.trim();
  const lastChar = trimmedPrefix.slice(-1);

  if (lastChar === '.') {
    score = candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? 0.9 : 0.5;
  } else if (lastChar === '(' || lastChar === ',') {
    score = candidate.match(/^[a-zA-Z_$]/) ? 0.85 : 0.4;
  } else {
    score = 0.7;
  }

  if (suffix.trim().length > 0) {
    const suffixFirstChar = suffix.trim()[0];
    if (candidate.endsWith(suffixFirstChar)) {
      score += 0.1;
    }
  }

  return Math.min(score, 1);
}

/**
 * Calculate code quality score
 */
function calculateCodeQualityScore(
  candidate: string,
  _languageId?: string,
): number {
  let score = 1;
  const lines = candidate.split('\n');

  const openBraces = (candidate.match(/\{/g) ?? []).length;
  const closeBraces = (candidate.match(/\}/g) ?? []).length;
  const openParens = (candidate.match(/\(/g) ?? []).length;
  const closeParens = (candidate.match(/\)/g) ?? []).length;
  const openBrackets = (candidate.match(/\[/g) ?? []).length;
  const closeBrackets = (candidate.match(/\]/g) ?? []).length;

  if (openBraces > closeBraces + 2) {
    score -= 0.2;
  }
  if (openParens > closeParens + 2) {
    score -= 0.2;
  }
  if (openBrackets > closeBrackets + 2) {
    score -= 0.2;
  }

  const indentPattern = lines.map((line) => {
    const match = line.match(/^(\s*)/);
    return match ? match[0].length : 0;
  });

  let consistentIndent = true;
  for (let i = 1; i < indentPattern.length; i++) {
    const diff = indentPattern[i] - indentPattern[i - 1];
    if (diff !== 0 && diff !== 2 && diff !== 4 && diff !== 8 && diff !== -2) {
      consistentIndent = false;
      break;
    }
  }

  if (!consistentIndent && lines.length > 1) {
    score -= 0.15;
  }

  if (candidate.includes('TODO') || candidate.includes('FIXME')) {
    score -= 0.1;
  }

  return Math.max(score, 0);
}

/**
 * Calculate length appropriateness score
 */
function calculateLengthScore(
  candidate: string,
  prefix: string,
  _suffix: string,
): number {
  const length = candidate.trim().length;
  const trimmedPrefix = prefix.trim();
  const lastChar = trimmedPrefix.slice(-1);

  let optimalMin = 2;
  let optimalMax = 50;

  if (lastChar === '.') {
    optimalMin = 1;
    optimalMax = 30;
  } else if (lastChar === '(' || lastChar === ',') {
    optimalMin = 1;
    optimalMax = 50;
  } else if (
    trimmedPrefix.endsWith('const ') ||
    trimmedPrefix.endsWith('let ')
  ) {
    optimalMin = 5;
    optimalMax = 100;
  } else if (
    trimmedPrefix.endsWith('function ') ||
    trimmedPrefix.endsWith('=>')
  ) {
    optimalMin = 5;
    optimalMax = 150;
  }

  if (length < optimalMin) {
    return length / optimalMin;
  } else if (length <= optimalMax) {
    return 1;
  } else {
    const excess = length - optimalMax;
    return Math.max(0, 1 - excess / optimalMax);
  }
}

/**
 * Calculate language pattern score
 */
function calculateLanguagePatternScore(
  candidate: string,
  languageId?: string,
): number {
  if (!languageId) {
    return 0.5;
  }

  const normalizedLanguageId = languageId.toLowerCase().replace('react', '');
  let score = 0.5;

  if (
    normalizedLanguageId === 'typescript' ||
    normalizedLanguageId === 'javascript'
  ) {
    if (candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
      score = 0.9;
    } else if (candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/)) {
      score = 0.95;
    } else if (candidate.match(/^:\s*[a-zA-Z]/)) {
      score = 0.85;
    } else if (candidate.match(/^\s*=>\s*/)) {
      score = 0.9;
    }
  }

  if (normalizedLanguageId === 'python') {
    if (candidate.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      score = 0.9;
    } else if (candidate.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/)) {
      score = 0.95;
    } else if (candidate.match(/^\s+.*:\s*$/)) {
      score = 0.85;
    }
  }

  if (normalizedLanguageId === 'java' || normalizedLanguageId === 'csharp') {
    if (candidate.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      score = 0.9;
    } else if (candidate.match(/^\s*[a-zA-Z]/)) {
      score = 0.85;
    }
  }

  return score;
}

/**
 * Rank completion candidates by quality score
 *
 * Uses a weighted scoring system:
 * - Relevance: 35%
 * - Code quality: 30%
 * - Length appropriateness: 20%
 * - Language patterns: 15%
 *
 * @param candidates Array of completion candidates
 * @returns Ranked array of candidates (highest score first)
 */
export function rankCandidates(
  candidates: CompletionCandidate[],
): CompletionCandidate[] {
  // Calculate final weighted score for each candidate
  const scored = candidates.map((candidate) => {
    const details = candidate.details;
    const weightedScore =
      details.relevanceScore * 0.35 +
      details.codeQualityScore * 0.3 +
      details.lengthScore * 0.2 +
      details.languagePatternScore * 0.15;

    return {
      ...candidate,
      score: weightedScore,
    };
  });

  // Sort by score (highest first)
  const ranked = scored.sort((a, b) => b.score - a.score);

  return ranked;
}

/**
 * Get the best completion from multiple candidates
 *
 * Applies filtering and ranking to select the highest quality completion.
 *
 * @param candidates Array of completion texts
 * @param prefix The prefix context
 * @param suffix The suffix context
 * @param languageId The language identifier
 * @returns Best completion text, or null if no valid candidates
 */
export function getBestCompletion(
  candidates: string[],
  prefix: string,
  suffix: string,
  languageId?: string,
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  // Score all candidates
  const scoredCandidates: CompletionCandidate[] = candidates.map((text) => {
    const details = scoreCompletion(text, prefix, suffix, languageId);
    return { text, score: 0, details };
  });

  // Filter candidates
  const filtered = filterCandidates(scoredCandidates, prefix, suffix);

  if (filtered.length === 0) {
    return null;
  }

  // Rank candidates
  const ranked = rankCandidates(filtered);

  // Return the best candidate
  const best = ranked[0];

  return best.text;
}

/**
 * Find the next word boundary in completion text
 *
 * Based on Zed's multi-granularity acceptance pattern, finds where
 * the next word ends for partial completion acceptance.
 *
 * @param text The completion text
 * @returns Index of the next word boundary, or -1 if no boundary found
 */
export function findNextWordBoundary(text: string): number {
  if (!text || text.length === 0) {
    return -1;
  }

  // Word boundary patterns (end of current word)
  const wordBoundaryPatterns = [
    /\s/, // Space
    /[.,;:!?]/, // Punctuation
    /[\]})]/, // Closing brackets
    /[\n\r]/, // Newlines
  ];

  // Find the first boundary
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    for (const pattern of wordBoundaryPatterns) {
      if (pattern.test(char)) {
        // Include the boundary character in the acceptance
        return i + 1;
      }
    }
  }

  // If no boundary found, return the full text length
  return text.length;
}

/**
 * Find the next line boundary in completion text
 *
 * Based on Zed's multi-granularity acceptance pattern, finds where
 * the next line ends for partial completion acceptance.
 *
 * @param text The completion text
 * @returns Index of the next line boundary, or -1 if no boundary found
 */
export function findNextLineBoundary(text: string): number {
  if (!text || text.length === 0) {
    return -1;
  }

  // Find the first newline
  const newlineIndex = text.indexOf('\n');
  if (newlineIndex !== -1) {
    // Include the newline character
    return newlineIndex + 1;
  }

  // If no newline found, return the full text length
  return text.length;
}

/**
 * Apply partial completion to document
 *
 * Inserts a portion of the completion text up to the specified boundary.
 *
 * @param editor The text editor
 * @param completionText The full completion text
 * @param boundaryIndex The boundary index (how many characters to insert)
 * @returns The remaining completion text after insertion
 */
export function applyPartialCompletion(
  editor: vscode.TextEditor,
  completionText: string,
  boundaryIndex: number,
): string {
  if (!editor || !completionText || boundaryIndex <= 0) {
    return completionText;
  }

  // Ensure boundary is within bounds
  const safeBoundary = Math.min(boundaryIndex, completionText.length);

  // Get the text to insert
  const textToInsert = completionText.substring(0, safeBoundary);

  // Insert the text at the current cursor position
  editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editBuilder.insert(editor.selection.active, textToInsert);
  });

  // Return the remaining text
  return completionText.substring(safeBoundary);
}
