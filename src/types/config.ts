/**
 * Configuration types for Predicte extension
 */

/**
 * Valid Codestral models
 */
export type CodestralModel =
  | 'codestral-latest'
  | 'codestral-22b'
  | 'codestral-2404';

/**
 * Valid API base URLs
 * NOTE: Do NOT include /v1 in the URL as the SDK appends the endpoint path automatically
 */
export type ApiBaseUrl =
  | 'https://api.mistral.ai'
  | 'https://codestral.mistral.ai';

/**
 * Predicte configuration interface
 */
export interface PredicteConfigValues {
  enabled: boolean;
  apiBaseUrl: ApiBaseUrl;
  model: CodestralModel;
  maxTokens: number;
  temperature: number;
  debounceDelay: number;
  contextLines: number;
  enhancedContextEnabled: boolean;
  enableStreaming: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  requestTimeout: number;
  promptEngineeringEnabled: boolean;
  languageAwareParametersEnabled: boolean;
  qualityFilteringEnabled: boolean;
  numCandidates: number;
  debugMode: boolean;
  enableKeybindings: boolean;

  // New: Performance monitoring
  enablePerformanceMonitoring: boolean;

  // New: Status bar
  enableStatusBar: boolean;

  // New: Conflict resolution
  enableConflictResolution: boolean;
  hideWhenLSPActive: boolean;
  modifierKeyForPreview: 'alt' | 'ctrl' | 'none';

  // New: Continuation detection
  enableContinuationDetection: boolean;
  continuationDelay: number;

  apiKey?: string;
}
