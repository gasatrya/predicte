/**
 * Configuration types for Predicte extension
 */

/**
 * Valid Codestral models
 */
export type CodestralModel = 'codestral-latest';

/**
 * Valid API base URLs
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
  debugMode: boolean;
  enableKeybindings: boolean;
  enableStatusBar: boolean;
  apiKey?: string;
}
