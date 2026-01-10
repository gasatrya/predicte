/**
 * Predicte Extension Constants
 *
 * Hardcoded default values for removed configuration settings.
 * These values aim to provide the best usage experience without requiring user tuning.
 */

export const PREDICTE_CONSTANTS = {
  // Model
  MODEL: 'codestral-latest',

  // Generation
  MAX_TOKENS: 500,
  TEMPERATURE: 0.1,

  // Trigger
  DEBOUNCE_DELAY: 150,
  CONTEXT_LINES: 50,

  // Features
  ENABLE_STREAMING: true,
  CACHE_ENABLED: true,
  CACHE_TTL: 60000,
  REQUEST_TIMEOUT: 30000,
  NUM_CANDIDATES: 3,
  ENABLE_PERFORMANCE_MONITORING: true,
  CONTINUATION_DELAY: 100,
} as const;
