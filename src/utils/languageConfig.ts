/**
 * Language Configuration
 *
 * This module provides language-specific model parameters for code completion.
 * Each language has optimized temperature, token limits, and stop sequences
 * based on its syntax and typical usage patterns.
 */

import type { LanguageParameters } from '../types/code';

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
