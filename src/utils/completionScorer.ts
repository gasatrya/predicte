/**
 * Completion Scorer
 *
 * This module provides utilities for scoring, filtering, and ranking
 * completion candidates. It evaluates completions based on relevance,
 * code quality, length appropriateness, and language-specific patterns.
 */

import type { CompletionCandidate, ScoreDetails } from '../types/code';

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
