/**
 * Context Utilities
 *
 * This module provides utility functions for extracting and managing
 * code context from documents.
 */

import * as vscode from 'vscode';

export interface CodeContext {
  prefix: string;
  suffix: string;
  language: string;
  cursorLine: number;
  filename?: string;
  imports?: string;
  definitions?: string;
  types?: string;
}

/**
 * Formatted context with system prompt and FIM markers
 */
export interface FormattedCompletionContext {
  systemPrompt: string;
  prefix: string;
  suffix: string;
}

/**
 * Extract context from a document at a given position
 *
 * Gets the prefix (text before cursor) and suffix (text after cursor)
 * up to the specified number of lines. Supports enhanced context extraction.
 *
 * @param document The VS Code document
 * @param position The cursor position
 * @param contextLines Number of lines to include in context (default: 50)
 * @param enhancedMode Enable enhanced context extraction with imports, definitions, and types
 * @returns Extracted code context
 */
export function extractContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  contextLines: number = 50,
  enhancedMode: boolean = true,
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

  const context: CodeContext = {
    prefix,
    suffix,
    language: document.languageId,
    cursorLine: currentLine,
  };

  // Add file metadata
  context.filename = document.fileName.split('/').pop();

  // Extract enhanced context if enabled
  if (enhancedMode) {
    const totalLinesRead = Math.min(totalLines, 200); // Limit lines read for performance

    // Extract imports (from top of file)
    context.imports = extractImports(document, currentLine, totalLinesRead);

    // Extract function/class definitions in current scope
    context.definitions = extractDefinitions(
      document,
      position,
      currentLine,
      totalLinesRead,
    );

    // Extract type definitions for TypeScript
    if (
      document.languageId === 'typescript' ||
      document.languageId === 'typescriptreact'
    ) {
      context.types = extractTypeDefinitions(
        document,
        currentLine,
        totalLinesRead,
      );
    }
  }

  return context;
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
 * Get language-specific expert role description
 *
 * Returns a role definition for the specified programming language.
 *
 * @param languageId The language identifier
 * @returns Expert role description
 */
export function getExpertRole(languageId: string): string {
  const roles: Record<string, string> = {
    javascript: 'JavaScript expert',
    typescript: 'TypeScript expert',
    javascriptreact: 'React and JavaScript expert',
    typescriptreact: 'React and TypeScript expert',
    python: 'Python expert',
    java: 'Java expert',
    go: 'Go expert',
    rust: 'Rust expert',
    cpp: 'C++ expert',
    csharp: 'C# expert',
    php: 'PHP expert',
    ruby: 'Ruby expert',
    swift: 'Swift expert',
    kotlin: 'Kotlin expert',
    html: 'HTML expert',
    css: 'CSS expert',
    json: 'JSON expert',
    markdown: 'Markdown expert',
    yaml: 'YAML expert',
    xml: 'XML expert',
  };

  return roles[languageId] || `${languageId} expert`;
}

/**
 * Get language-specific system prompt for code completion
 *
 * Generates a system prompt that instructs the model on how to behave
 * for code completion tasks in the specified language.
 *
 * @param languageId The language identifier
 * @param filename Optional filename for context
 * @returns System prompt string
 */
export function getSystemPrompt(languageId: string, filename?: string): string {
  const expertRole = getExpertRole(languageId);
  const languageName = languageId.replace(
    /^(java|type)scriptreact?$/,
    (match) =>
      match === 'typescriptreact'
        ? 'TypeScript (React)'
        : match === 'javascriptreact'
          ? 'JavaScript (React)'
          : match,
  );

  let prompt = `You are a ${expertRole} providing code completions.\n`;
  prompt += `Language: ${languageName}\n`;
  if (filename) {
    prompt += `File: ${filename}\n`;
  }
  prompt += `\n`;
  prompt += `Complete the code between <fim_prefix> and <fim_suffix> markers.\n`;
  prompt += `Provide only the completion text that should go between the markers.\n`;
  prompt += `Be concise and relevant to the context.\n`;
  prompt += `Follow the existing code style, indentation, and naming conventions.\n`;
  prompt += `Ensure type safety and error handling where appropriate.\n`;
  prompt += `Do not include explanations, comments, or additional text beyond the code.\n`;

  return prompt;
}

/**
 * Format context with system prompt and FIM markers
 *
 * Combines system prompt with prefix/suffix in FIM format.
 * Used when prompt engineering is enabled.
 *
 * @param context The code context object
 * @param enablePromptEngineering Whether to include system prompt
 * @returns Formatted context with system prompt and FIM markers
 */
export function formatContextWithPrompt(
  context: CodeContext,
  enablePromptEngineering: boolean = true,
): FormattedCompletionContext {
  const systemPrompt = enablePromptEngineering
    ? getSystemPrompt(context.language, context.filename)
    : '';

  // Format prefix with file metadata (kept simple for FIM)
  let prefix = context.prefix;

  // Add file metadata at the beginning if prompt engineering is enabled
  if (enablePromptEngineering && context.filename) {
    const languageComment = getLanguagePrompt(context.language);
    prefix = `${languageComment}// File: ${context.filename}\n\n${prefix}`;
  }

  return {
    systemPrompt,
    prefix,
    suffix: context.suffix,
  };
}

/**
 * Extract imports/requires from the top of the file
 *
 * Scans the beginning of the file to find import statements, requires,
 * and module declarations relevant to the context.
 *
 * @param document The VS Code document
 * @param _currentLine Current cursor line (for context relevance, unused in current implementation)
 * @param maxLines Maximum lines to scan (default: 200)
 * @returns String containing relevant imports/requires
 */
export function extractImports(
  document: vscode.TextDocument,
  _currentLine: number,
  maxLines: number = 200,
): string {
  const imports: string[] = [];
  const scanLines = Math.min(document.lineCount, maxLines);

  for (let i = 0; i < scanLines; i++) {
    const line = document.lineAt(i).text.trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check for various import/require patterns
    const isImport =
      line.startsWith('import ') ||
      line.startsWith('require(') ||
      line.startsWith('#include') ||
      line.startsWith('from ') ||
      line.startsWith('use ') ||
      line.startsWith('package ') ||
      line.startsWith('module ');

    // Stop scanning if we hit non-import code
    if (!isImport && imports.length > 0) {
      // Allow a few blank lines after imports
      const blankLineCount = getConsecutiveBlankLines(document, i, scanLines);
      if (blankLineCount >= 2) {
        break;
      }
      continue;
    }

    if (isImport) {
      imports.push(line);
    }
  }

  return imports.join('\n');
}

/**
 * Extract function and class definitions near the cursor
 *
 * Finds function and class definitions that are in the current scope
 * or close to the cursor position.
 *
 * @param document The VS Code document
 * @param _position The cursor position (for future context-aware enhancements)
 * @param currentLine Current cursor line
 * @param maxLines Maximum lines to scan (default: 200)
 * @returns String containing relevant function/class definitions
 */
export function extractDefinitions(
  document: vscode.TextDocument,
  _position: vscode.Position,
  currentLine: number,
  maxLines: number = 200,
): string {
  const definitions: string[] = [];
  const scanLines = Math.min(document.lineCount, maxLines);
  const language = document.languageId;

  // Determine definition patterns based on language
  const patterns = getDefinitionPatterns(language);

  // Scan lines around the cursor for definitions
  const searchStart = Math.max(0, currentLine - 50);
  const searchEnd = Math.min(scanLines - 1, currentLine + 50);

  for (let i = searchStart; i <= searchEnd; i++) {
    const line = document.lineAt(i).text.trim();

    // Check for function/class definitions
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        // Extract the full definition (including multi-line)
        const definition = extractFullDefinition(document, i, pattern);
        if (definition) {
          definitions.push(definition);
        }
        break;
      }
    }
  }

  return definitions.join('\n\n');
}

/**
 * Extract type definitions for TypeScript
 *
 * Finds interface, type alias, and enum definitions relevant to the context.
 *
 * @param document The VS Code document
 * @param currentLine Current cursor line
 * @param maxLines Maximum lines to scan (default: 200)
 * @returns String containing relevant type definitions
 */
export function extractTypeDefinitions(
  document: vscode.TextDocument,
  currentLine: number,
  maxLines: number = 200,
): string {
  const types: string[] = [];
  const scanLines = Math.min(document.lineCount, maxLines);

  // Type definition patterns
  const typePatterns = [
    /^\s*(export\s+)?interface\s+\w+/,
    /^\s*(export\s+)?type\s+\w+/,
    /^\s*(export\s+)?enum\s+\w+/,
  ];

  // Scan lines around the cursor for type definitions
  const searchStart = Math.max(0, currentLine - 50);
  const searchEnd = Math.min(scanLines - 1, currentLine + 50);

  for (let i = searchStart; i <= searchEnd; i++) {
    const line = document.lineAt(i).text.trim();

    // Check for type definitions
    for (const pattern of typePatterns) {
      if (pattern.test(line)) {
        // Extract the full type definition
        const typeDef = extractFullDefinition(document, i, pattern);
        if (typeDef) {
          types.push(typeDef);
        }
        break;
      }
    }
  }

  return types.join('\n\n');
}

/**
 * Get definition patterns for a given language
 *
 * Returns regex patterns that match function and class definitions
 * for the specified programming language.
 *
 * @param language The language identifier
 * @returns Array of regex patterns for matching definitions
 */
function getDefinitionPatterns(language: string): RegExp[] {
  const commonPatterns = [
    /^\s*(export\s+)?(async\s+)?function\s+\w+/,
    /^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^\s*(export\s+)?class\s+\w+/,
  ];

  const languageSpecific: Record<string, RegExp[]> = {
    javascript: commonPatterns,
    typescript: [...commonPatterns, /^\s*(export\s+)?interface\s+\w+/],
    python: [/^\s*def\s+\w+/, /^\s*class\s+\w+/],
    java: [/^\s*(public|private|protected)?\s*(static)?\s*(\w+\s+)+\w+\s*\(/],
    go: [/^\s*func\s+\w+/],
    rust: [
      /^\s*(pub\s+)?(async\s+)?fn\s+\w+/,
      /^\s*(pub\s+)?(struct|enum|trait)\s+\w+/,
    ],
    cpp: [/^\s*(\w+\s+)+\w+\s*::\s*\w+\s*\(/, /^\s*(class|struct)\s+\w+/],
    csharp: [
      /^\s*(public|private|protected|internal)?\s*(static)?\s*(\w+\s+)+\w+\s*\(/,
      /^\s*(class|struct|interface)\s+\w+/,
    ],
  };

  return languageSpecific[language] || commonPatterns;
}

/**
 * Extract full definition including multi-line statements
 *
 * Attempts to capture the complete definition including braces
 * for multi-line function/class definitions.
 *
 * @param document The VS Code document
 * @param startLine The line where the definition starts
 * @param _pattern The regex pattern that matched the definition (for future enhancements)
 * @returns The full definition string, or null if extraction fails
 */
function extractFullDefinition(
  document: vscode.TextDocument,
  startLine: number,
  _pattern: RegExp,
): string | null {
  let definition = document.lineAt(startLine).text;
  let braceCount = 0;

  // Count opening braces in the first line
  braceCount += (definition.match(/{/g) ?? []).length;
  braceCount -= (definition.match(/}/g) ?? []).length;

  // If we have opening braces, continue reading until balanced
  let currentLine = startLine + 1;
  const maxLines = 50; // Limit to prevent reading too much

  while (
    braceCount > 0 &&
    currentLine < document.lineCount &&
    currentLine - startLine < maxLines
  ) {
    const lineText = document.lineAt(currentLine).text;
    definition += '\n' + lineText;
    braceCount += (lineText.match(/{/g) ?? []).length;
    braceCount -= (lineText.match(/}/g) ?? []).length;
    currentLine++;
  }

  return definition;
}

/**
 * Count consecutive blank lines starting from a given line
 *
 * @param document The VS Code document
 * @param startLine The line to start counting from
 * @param maxLines Maximum lines to check
 * @returns Number of consecutive blank lines
 */
function getConsecutiveBlankLines(
  document: vscode.TextDocument,
  startLine: number,
  maxLines: number,
): number {
  let count = 0;
  for (let i = startLine; i < maxLines; i++) {
    const line = document.lineAt(i).text.trim();
    if (line) {
      break;
    }
    count++;
  }
  return count;
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
 * Build enhanced context string from CodeContext
 *
 * Combines all context elements (prefix, suffix, imports, definitions, types)
 * into a single string suitable for sending to the API. Prioritizes relevant code.
 *
 * @param context The code context object
 * @param maxTokens Maximum tokens for the combined context (default: 8000)
 * @returns Combined context string
 */
export function buildEnhancedContext(
  context: CodeContext,
  maxTokens: number = 8000,
): { prefix: string; suffix: string } {
  const maxChars = maxTokens * 4;

  // Start with file metadata
  let prefix = '';
  let suffix = '';

  // Add file header
  if (context.filename && context.language) {
    prefix += `// File: ${context.filename} (${context.language})\n\n`;
  }

  // Add imports first (high priority)
  if (context.imports && context.imports.length > 0) {
    prefix += '// Imports:\n' + context.imports + '\n\n';
  }

  // Add type definitions (for TypeScript)
  if (context.types && context.types.length > 0) {
    prefix += '// Types:\n' + context.types + '\n\n';
  }

  // Add definitions
  if (context.definitions && context.definitions.length > 0) {
    prefix += '// Definitions:\n' + context.definitions + '\n\n';
  }

  // Calculate remaining space for prefix and suffix
  const metaLength = prefix.length;
  const remainingChars = maxChars - metaLength;
  const halfRemaining = Math.floor(remainingChars / 2);

  // Truncate prefix to fit
  let truncatedPrefix = context.prefix;
  if (truncatedPrefix.length > halfRemaining) {
    truncatedPrefix = smartTruncate(context.prefix, halfRemaining);
  }

  // Truncate suffix to fit
  let truncatedSuffix = context.suffix;
  if (truncatedSuffix.length > halfRemaining) {
    truncatedSuffix = smartTruncate(context.suffix, halfRemaining);
  }

  suffix = truncatedSuffix;

  return {
    prefix: prefix + truncatedPrefix,
    suffix,
  };
}

/**
 * Smart truncation that prioritizes relevant code
 *
 * Truncates code while trying to preserve complete statements and
 * avoid cutting in the middle of blocks. Uses a simple heuristic.
 *
 * @param text The text to truncate
 * @param maxLength Maximum length of the result
 * @returns Truncated text
 */
export function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at a natural breaking point
  const breakPatterns = [';\n', '}\n', '{\n', '\n\n'];

  for (const pattern of breakPatterns) {
    const breakIndex = text.indexOf(pattern, text.length - maxLength);
    if (breakIndex > 0) {
      return text.substring(breakIndex + pattern.length);
    }
  }

  // Fall back to simple truncation from the end
  return text.substring(text.length - maxLength);
}

/**
 * Determine if a language is a markup language
 *
 * Markup languages use angle brackets for tags and should not
 * be subject to quote-based string detection which incorrectly
 * interprets angle brackets as being inside quotes.
 *
 * @param languageId The language identifier
 * @returns true if the language is a markup language
 */
function isMarkupLanguage(languageId: string): boolean {
  const markupLanguages = ['html', 'xml', 'svg', 'markdown', 'yaml'];
  return markupLanguages.includes(languageId);
}

/**
 * Determine if completion should be triggered at the given position
 *
 * Implements smart triggering logic to avoid unnecessary API calls:
 * - Don't trigger on empty lines
 * - Don't trigger when inside a string (except for markup languages)
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

  // Skip string detection for markup languages (HTML, XML, SVG, etc.)
  // These languages use angle brackets for tags which can be misinterpreted
  // as being inside quotes by simple quote detection logic
  if (isMarkupLanguage(document.languageId)) {
    return true;
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
