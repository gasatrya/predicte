/**
 * Central type exports for Predicte extension
 *
 * This barrel file provides a single entry point for all exported types,
 * making imports cleaner and providing a clear overview of available types.
 */

// Configuration types
export type {
  CodestralModel,
  ApiBaseUrl,
  PredicteConfigValues,
} from './config';

// Completion types
export type {
  CompletionState,
  CodeContext,
  FormattedCompletionContext,
} from './completion';

// Metrics types
export type { MetricsSummary, CacheEntry } from './metrics';

// Code utility types
export type {
  LanguageParameters,
  CompletionCandidate,
  ScoreDetails,
} from './code';
