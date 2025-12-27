/**
 * Syntax Checker for Continuation Detection
 *
 * Detects incomplete code syntax to trigger follow-up completions.
 * Supports multiple programming languages with language-specific checks.
 *
 * Features:
 * - Unclosed bracket/parenthesis/brace detection
 * - Language-specific syntax checking
 * - Template literal detection for JavaScript/TypeScript
 * - Triple quote detection for Python
 * - Incomplete statement detection
 *
 * Used by continuation detection feature to automatically trigger
 * follow-up completions when code is incomplete.
 */

/**
 * Detect incomplete code syntax
 * @param text The code text to check
 * @param languageId The language identifier (e.g., 'javascript', 'python')
 * @returns true if the code appears incomplete
 */
export function isIncompleteCode(text: string, languageId: string): boolean {
  // Check for unclosed brackets
  if (hasUnclosedBrackets(text)) {
    return true;
  }

  // Check for unclosed parentheses
  if (hasUnclosedParentheses(text)) {
    return true;
  }

  // Check for unclosed braces (square brackets)
  if (hasUnclosedBraces(text)) {
    return true;
  }

  // Language-specific checks
  switch (languageId) {
    case 'javascript':
    case 'typescript':
    case 'javascriptreact':
    case 'typescriptreact':
      return isIncompleteJavaScript(text);
    case 'python':
      return isIncompletePython(text);
    case 'java':
    case 'csharp':
    case 'cpp':
      return isIncompleteCFamily(text);
    default:
      // For other languages, just check basic bracket matching
      return (
        hasUnclosedBrackets(text) ||
        hasUnclosedParentheses(text) ||
        hasUnclosedBraces(text)
      );
  }
}

/**
 * Check for unclosed curly braces
 */
function hasUnclosedBrackets(text: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle string literals
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    // Handle escape sequences
    if (char === '\\' && inString) {
      escaped = !escaped;
    } else {
      escaped = false;
    }

    // Count brackets when not in string
    if (!inString) {
      if (char === '{') {
        depth++;
      }
      if (char === '}') {
        depth--;
      }
    }
  }

  return depth > 0;
}

/**
 * Check for unclosed parentheses
 */
function hasUnclosedParentheses(text: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle string literals
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    // Handle escape sequences
    if (char === '\\' && inString) {
      escaped = !escaped;
    } else {
      escaped = false;
    }

    // Count parentheses when not in string
    if (!inString) {
      if (char === '(') {
        depth++;
      }
      if (char === ')') {
        depth--;
      }
    }
  }

  return depth > 0;
}

/**
 * Check for unclosed square brackets
 */
function hasUnclosedBraces(text: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Handle string literals
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }

    // Handle escape sequences
    if (char === '\\' && inString) {
      escaped = !escaped;
    } else {
      escaped = false;
    }

    // Count braces when not in string
    if (!inString) {
      if (char === '[') {
        depth++;
      }
      if (char === ']') {
        depth--;
      }
    }
  }

  return depth > 0;
}

/**
 * Check for incomplete JavaScript/TypeScript code
 */
function isIncompleteJavaScript(text: string): boolean {
  // Check for unclosed brackets/parentheses/braces
  if (hasUnclosedBrackets(text)) {
    return true;
  }
  if (hasUnclosedParentheses(text)) {
    return true;
  }
  if (hasUnclosedBraces(text)) {
    return true;
  }

  // Check for unclosed template literals
  const backtickCount = (text.match(/`/g) ?? []).length;
  if (backtickCount % 2 !== 0) {
    return true;
  }

  // Check for incomplete arrow functions
  const trimmed = text.trim();
  if (trimmed.endsWith('=>')) {
    return true;
  }

  // Check for incomplete ternary operator
  const questionMarkCount = (text.match(/\?/g) ?? []).length;
  const colonCount = (text.match(/:/g) ?? []).length;
  if (questionMarkCount > colonCount) {
    return true;
  }

  // Check for dangling operators
  const endsWithOperator = /[+\-*/%&|^|]=?$/.test(trimmed);
  if (endsWithOperator) {
    return true;
  }

  // Check for incomplete object/array literals
  if (
    trimmed.endsWith(',') &&
    (trimmed.includes('{') || trimmed.includes('['))
  ) {
    return true;
  }

  return false;
}

/**
 * Check for incomplete Python code
 */
function isIncompletePython(text: string): boolean {
  // Check for unclosed parentheses/brackets
  if (hasUnclosedParentheses(text)) {
    return true;
  }
  if (hasUnclosedBrackets(text)) {
    return true;
  }
  if (hasUnclosedBraces(text)) {
    return true;
  }

  // Check for unclosed triple quotes
  const tripleDoubleQuotes = (text.match(/"""/g) ?? []).length;
  const tripleSingleQuotes = (text.match(/'''/g) ?? []).length;
  if (tripleDoubleQuotes % 2 !== 0 || tripleSingleQuotes % 2 !== 0) {
    return true;
  }

  // Check for incomplete statements (e.g., ends with operator)
  const trimmed = text.trim();
  const endsWithOperator = /[+\-*/%&|^|]=?$/.test(trimmed);
  if (endsWithOperator) {
    return true;
  }

  // Check for colon without indented block
  if (trimmed.endsWith(':') && !trimmed.includes('lambda')) {
    return true;
  }

  // Check for incomplete list/dict comprehensions
  const openParens = (text.match(/\(/g) ?? []).length;
  const closeParens = (text.match(/\)/g) ?? []).length;
  const openBrackets = (text.match(/\[/g) ?? []).length;
  const closeBrackets = (text.match(/\]/g) ?? []).length;
  const openBraces = (text.match(/\{/g) ?? []).length;
  const closeBraces = (text.match(/\}/g) ?? []).length;

  if (
    openParens > closeParens ||
    openBrackets > closeBrackets ||
    openBraces > closeBraces
  ) {
    return true;
  }

  // Check for backslash continuation
  if (trimmed.endsWith('\\')) {
    return true;
  }

  return false;
}

/**
 * Check for incomplete C-family code (Java, C#, C++)
 */
function isIncompleteCFamily(text: string): boolean {
  // Check for unclosed brackets/parentheses/braces
  if (hasUnclosedBrackets(text)) {
    return true;
  }
  if (hasUnclosedParentheses(text)) {
    return true;
  }
  if (hasUnclosedBraces(text)) {
    return true;
  }

  // Check for dangling operators
  const trimmed = text.trim();
  const endsWithOperator = /[+\-*/%&|^|]=?$/.test(trimmed);
  if (endsWithOperator) {
    return true;
  }

  // Check for incomplete statements ending with semicolon (usually complete)
  if (trimmed.endsWith(';')) {
    return false;
  }

  // Check for incomplete method/function calls
  if (trimmed.endsWith(',') && trimmed.includes('(')) {
    return true;
  }

  // Check for incomplete ternary operator
  const questionMarkCount = (text.match(/\?/g) ?? []).length;
  const colonCount = (text.match(/:/g) ?? []).length;
  if (questionMarkCount > colonCount) {
    return true;
  }

  // Check for string interpolation (C#)
  if (text.includes('$"') || text.includes("$'")) {
    const openInterpolation = (text.match(/\{/g) ?? []).length;
    const closeInterpolation = (text.match(/\}/g) ?? []).length;
    if (openInterpolation > closeInterpolation) {
      return true;
    }
  }

  return false;
}

/**
 * Get suggestions for what might be missing
 * @param text The code text to analyze
 * @param languageId The language identifier
 * @returns Array of suggestions for what might be missing
 */
export function getMissingSyntaxSuggestions(
  text: string,
  languageId: string,
): string[] {
  const suggestions: string[] = [];

  if (hasUnclosedBrackets(text)) {
    suggestions.push('closing curly brace }');
  }
  if (hasUnclosedParentheses(text)) {
    suggestions.push('closing parenthesis )');
  }
  if (hasUnclosedBraces(text)) {
    suggestions.push('closing square bracket ]');
  }

  switch (languageId) {
    case 'javascript':
    case 'typescript':
      if ((text.match(/`/g) ?? []).length % 2 !== 0) {
        suggestions.push('closing backtick `');
      }
      if (text.trim().endsWith('=>')) {
        suggestions.push('function body');
      }
      break;
    case 'python':
      if ((text.match(/"""/g) ?? []).length % 2 !== 0) {
        suggestions.push('closing triple quotes """');
      }
      if ((text.match(/'''/g) ?? []).length % 2 !== 0) {
        suggestions.push("closing triple quotes '''");
      }
      if (text.trim().endsWith(':')) {
        suggestions.push('indented block');
      }
      break;
  }

  return suggestions;
}
