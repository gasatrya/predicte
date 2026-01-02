/**
 * Code utility types for Predicte extension
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
 * Completion candidate with quality score
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
