/**
 * Code Utilities
 *
 * This module provides general utility functions for code manipulation
 * and language-specific model parameter optimization.
 */

/**
 * Language-specific model parameters for completion generation
 *
 * Defines optimal temperature, maxTokens, and stop sequences
 * for different programming languages.
 */
export interface LanguageParameters {
  temperature: number;
  maxTokens: number;
  stopSequences: string[];
}

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
      maxTokens: 120,
      stopSequences: ['\n\n', '}', ';', '```'],
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
      maxTokens: 100,
      stopSequences: ['\n\n', '}', ';', '```'],
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

/**
 * Completion candidate with quality score
 *
 * Represents a completion candidate along with its quality assessment.
 */
export interface CompletionCandidate {
  text: string;
  score: number;
  details: ScoreDetails;
}

/**
 * Detailed scoring breakdown for a completion candidate
 */
export interface ScoreDetails {
  relevanceScore: number;
  codeQualityScore: number;
  lengthScore: number;
  languagePatternScore: number;
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
  console.warn('[DEBUG] Scoring completion...');
  console.warn('[DEBUG] Candidate length:', candidate.length);

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

  console.warn('[DEBUG] Relevance score:', relevanceScore);
  console.warn('[DEBUG] Code quality score:', codeQualityScore);
  console.warn('[DEBUG] Length score:', lengthScore);
  console.warn('[DEBUG] Language pattern score:', languagePatternScore);

  return details;
}

/**
 * Calculate relevance score based on context match
 *
 * @param candidate The completion text
 * @param prefix The prefix context
 * @param suffix The suffix context
 * @returns Relevance score (0-1)
 */
function calculateRelevanceScore(
  candidate: string,
  prefix: string,
  suffix: string,
): number {
  let score = 0;

  // Check if completion starts with expected patterns
  const trimmedPrefix = prefix.trim();
  const lastChar = trimmedPrefix.slice(-1);

  // Higher score if completion follows common patterns
  if (lastChar === '.') {
    // Likely a property/method access
    score = candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/) ? 0.9 : 0.5;
  } else if (lastChar === '(' || lastChar === ',') {
    // Likely a function argument
    score = candidate.match(/^[a-zA-Z_$]/) ? 0.85 : 0.4;
  } else {
    // General code completion
    score = 0.7;
  }

  // Check if completion is relevant to suffix
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
 *
 * Evaluates:
 * - Syntax correctness (basic checks)
 * - Indentation consistency
 * - Naming conventions
 *
 * @param candidate The completion text
 * @param languageId The language identifier
 * @returns Code quality score (0-1)
 */
function calculateCodeQualityScore(
  candidate: string,
  _languageId?: string,
): number {
  let score = 1;
  const lines = candidate.split('\n');

  // Check for syntax issues
  const openBraces = (candidate.match(/\{/g) ?? []).length;
  const closeBraces = (candidate.match(/\}/g) ?? []).length;
  const openParens = (candidate.match(/\(/g) ?? []).length;
  const closeParens = (candidate.match(/\)/g) ?? []).length;
  const openBrackets = (candidate.match(/\[/g) ?? []).length;
  const closeBrackets = (candidate.match(/\]/g) ?? []).length;

  // Deduct for unbalanced brackets (unless it's intentional partial completion)
  if (openBraces > closeBraces + 2) {
    score -= 0.2;
  }
  if (openParens > closeParens + 2) {
    score -= 0.2;
  }
  if (openBrackets > closeBrackets + 2) {
    score -= 0.2;
  }

  // Check indentation consistency
  const indentPattern = lines.map((line) => {
    const match = line.match(/^(\s*)/);
    return match ? match[0].length : 0;
  });

  // Check if indentation is consistent
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

  // Check for common anti-patterns
  if (candidate.includes('TODO') || candidate.includes('FIXME')) {
    score -= 0.1;
  }

  return Math.max(score, 0);
}

/**
 * Calculate length appropriateness score
 *
 * Penalizes completions that are too short or too long.
 * Optimal length depends on context.
 *
 * @param candidate The completion text
 * @param prefix The prefix context
 * @param suffix The suffix context
 * @returns Length score (0-1)
 */
function calculateLengthScore(
  candidate: string,
  prefix: string,
  _suffix: string,
): number {
  const length = candidate.trim().length;
  const trimmedPrefix = prefix.trim();
  const lastChar = trimmedPrefix.slice(-1);

  // Determine optimal length based on context
  let optimalMin = 2;
  let optimalMax = 50;

  if (lastChar === '.') {
    // Property/method access - typically short
    optimalMin = 1;
    optimalMax = 30;
  } else if (lastChar === '(' || lastChar === ',') {
    // Function argument - typically short to medium
    optimalMin = 1;
    optimalMax = 50;
  } else if (
    trimmedPrefix.endsWith('const ') ||
    trimmedPrefix.endsWith('let ')
  ) {
    // Variable declaration - typically medium
    optimalMin = 5;
    optimalMax = 100;
  } else if (
    trimmedPrefix.endsWith('function ') ||
    trimmedPrefix.endsWith('=>')
  ) {
    // Function definition - typically longer
    optimalMin = 5;
    optimalMax = 150;
  }

  // Calculate score based on optimal range
  if (length < optimalMin) {
    return length / optimalMin;
  } else if (length <= optimalMax) {
    return 1;
  } else {
    // Gradual penalty for too-long completions
    const excess = length - optimalMax;
    return Math.max(0, 1 - excess / optimalMax);
  }
}

/**
 * Calculate language pattern score
 *
 * Rewards completions that match language-specific patterns.
 *
 * @param candidate The completion text
 * @param languageId The language identifier
 * @returns Language pattern score (0-1)
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

  // TypeScript/JavaScript patterns
  if (
    normalizedLanguageId === 'typescript' ||
    normalizedLanguageId === 'javascript'
  ) {
    // Check for common patterns
    if (candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
      score = 0.9; // Simple identifier
    } else if (candidate.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/)) {
      score = 0.95; // Function call
    } else if (candidate.match(/^:\s*[a-zA-Z]/)) {
      score = 0.85; // Type annotation
    } else if (candidate.match(/^\s*=>\s*/)) {
      score = 0.9; // Arrow function
    }
  }

  // Python patterns
  if (normalizedLanguageId === 'python') {
    if (candidate.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      score = 0.9; // Simple identifier
    } else if (candidate.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/)) {
      score = 0.95; // Function call
    } else if (candidate.match(/^\s+.*:\s*$/)) {
      score = 0.85; // Block with colon
    }
  }

  // Java/C# patterns
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
  console.warn('[DEBUG] Filtering candidates...');
  console.warn('[DEBUG] Input candidates:', candidates.length);

  const filtered = candidates.filter((candidate) => {
    // Check minimum meaningful length
    const meaningfulChars = candidate.text.replace(/[\s\r\n\t]/g, '');
    if (meaningfulChars.length < 3) {
      console.warn('[DEBUG] Filtered: Too short');
      return false;
    }

    // Check for obvious syntax issues
    const details = candidate.details;
    if (
      details.codeQualityScore < 0.3 ||
      details.relevanceScore < 0.2 ||
      details.languagePatternScore < 0.2
    ) {
      console.warn('[DEBUG] Filtered: Low quality score');
      return false;
    }

    // Check for duplicate code
    if (
      prefix.includes(candidate.text.trim()) ||
      suffix.includes(candidate.text.trim())
    ) {
      console.warn('[DEBUG] Filtered: Duplicate existing code');
      return false;
    }

    return true;
  });

  console.warn('[DEBUG] Filtered candidates:', filtered.length);
  return filtered;
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
  console.warn('[DEBUG] Ranking candidates...');
  console.warn('[DEBUG] Input candidates:', candidates.length);

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

  console.warn('[DEBUG] Ranked candidates:', ranked.length);
  if (ranked.length > 0) {
    console.warn('[DEBUG] Top candidate score:', ranked[0].score);
    if (ranked.length > 1) {
      console.warn('[DEBUG] Second candidate score:', ranked[1].score);
    }
  }

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
  console.warn('[DEBUG] Getting best completion from candidates...');
  console.warn('[DEBUG] Number of candidates:', candidates.length);

  if (candidates.length === 0) {
    console.warn('[DEBUG] No candidates provided');
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
    console.warn('[DEBUG] No candidates passed filtering');
    return null;
  }

  // Rank candidates
  const ranked = rankCandidates(filtered);

  // Return the best candidate
  const best = ranked[0];
  console.warn('[DEBUG] Best completion selected with score:', best.score);
  console.warn('[DEBUG] Best completion text:', best.text.substring(0, 100));

  return best.text;
}
