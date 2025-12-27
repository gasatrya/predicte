/**
 * Predicte Configuration Manager
 *
 * This module manages the extension's configuration settings.
 * It provides a convenient interface for accessing and watching
 * configuration changes.
 *
 * Configuration properties:
 * - enabled (boolean): Enable/disable Predicte autocomplete
 * - apiBaseUrl (string): API base URL to use (api.mistral.ai or codestral.mistral.ai) - do NOT include /v1
 * - model (string): Codestral model to use (codestral-latest, codestral-22b, codestral-2404)
 * - maxTokens (number): Maximum completion tokens (1-500)
 * - temperature (number): Sampling temperature (0-1)
 * - debounceDelay (number): Delay before triggering autocomplete (ms, default: 150 based on Zed's Codestral timing research)
 * - contextLines (number): Number of context lines to include (5-100)
 * - enhancedContextEnabled (boolean): Enable enhanced context extraction
 * - enableStreaming (boolean): Use streaming for completions
 * - cacheEnabled (boolean): Enable completion caching
 * - cacheTTL (number): Cache TTL in milliseconds (1000-600000)
 * - languageAwareParametersEnabled (boolean): Enable language-specific model parameters
 * - debugMode (boolean): Enable debug logging for troubleshooting
 * - enableKeybindings (boolean): Enable keyboard shortcuts for multi-granularity completion acceptance
 */

import * as vscode from 'vscode';
import { logger } from '../utils/logger';

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

/**
 * Predicte configuration manager class
 */
export class PredicteConfig {
  private config: vscode.WorkspaceConfiguration;
  private sectionId = 'predicte';

  constructor() {
    this.config = vscode.workspace.getConfiguration(this.sectionId);
  }

  /**
   * Reload configuration from workspace
   */
  private reloadConfig(): void {
    this.config = vscode.workspace.getConfiguration(this.sectionId);
  }

  /**
   * Get the API key from configuration
   * @deprecated API keys should be stored in SecretStorage for security.
   *             Use PredicteSecretStorage.getApiKey() instead.
   * @returns The API key, or undefined if not set
   */
  get apiKey(): string | undefined {
    return this.config.get<string>('apiKey');
  }

  /**
   * Get enabled status
   * @returns true if Predicte is enabled
   */
  get enabled(): boolean {
    return this.config.get<boolean>('enabled', true);
  }

  /**
   * Get the API base URL
   * @returns The API base URL to use
   */
  get apiBaseUrl(): ApiBaseUrl {
    return this.config.get<ApiBaseUrl>(
      'apiBaseUrl',
      'https://codestral.mistral.ai',
    );
  }

  /**
   * Get the selected Codestral model
   * @returns The model identifier
   */
  get model(): CodestralModel {
    return this.config.get<CodestralModel>('model', 'codestral-latest');
  }

  /**
   * Get maximum completion tokens
   * @returns Maximum tokens to generate
   */
  get maxTokens(): number {
    return this.config.get<number>('maxTokens', 100);
  }

  /**
   * Get sampling temperature
   * @returns Temperature value (0-1)
   */
  get temperature(): number {
    return this.config.get<number>('temperature', 0.1);
  }

  /**
   * Get debounce delay
   * @returns Delay in milliseconds before triggering autocomplete
   */
  get debounceDelay(): number {
    return this.config.get<number>('debounceDelay', 150);
  }

  /**
   * Get number of context lines
   * @returns Number of context lines to include
   */
  get contextLines(): number {
    return this.config.get<number>('contextLines', 50);
  }

  /**
   * Get enhanced context enabled status
   * @returns true if enhanced context extraction is enabled
   */
  get enhancedContextEnabled(): boolean {
    return this.config.get<boolean>('enhancedContextEnabled', true);
  }

  /**
   * Get streaming enabled status
   * @returns true if streaming is enabled
   */
  get enableStreaming(): boolean {
    return this.config.get<boolean>('enableStreaming', true);
  }

  /**
   * Get cache enabled status
   * @returns true if caching is enabled
   */
  get cacheEnabled(): boolean {
    return this.config.get<boolean>('cacheEnabled', true);
  }

  /**
   * Get cache TTL
   * @returns Cache TTL in milliseconds
   */
  get cacheTTL(): number {
    return this.config.get<number>('cacheTTL', 60000);
  }

  /**
   * Get request timeout
   * @returns Request timeout in milliseconds
   */
  get requestTimeout(): number {
    return this.config.get<number>('requestTimeout', 30000);
  }

  /**
   * Get prompt engineering enabled status
   * @returns true if prompt engineering with system messages is enabled
   */
  get promptEngineeringEnabled(): boolean {
    return this.config.get<boolean>('promptEngineeringEnabled', true);
  }

  /**
   * Get language-aware parameters enabled status
   * @returns true if language-specific model parameters are enabled
   */
  get languageAwareParametersEnabled(): boolean {
    return this.config.get<boolean>('languageAwareParametersEnabled', true);
  }

  /**
   * Get quality filtering enabled status
   * @returns true if quality filtering and ranking is enabled
   */
  get qualityFilteringEnabled(): boolean {
    return this.config.get<boolean>('qualityFilteringEnabled', true);
  }

  /**
   * Get number of completion candidates
   * @returns Number of candidates to request (3-5)
   */
  get numCandidates(): number {
    return this.config.get<number>('numCandidates', 3);
  }

  /**
   * Get debug mode status
   * @returns true if debug mode is enabled
   */
  get debugMode(): boolean {
    return this.config.get<boolean>('debugMode', false);
  }

  /**
   * Get keybindings enabled status
   * @returns true if keybindings are enabled
   */
  get enableKeybindings(): boolean {
    return this.config.get<boolean>('enableKeybindings', true);
  }

  /**
   * Get performance monitoring enabled status
   * @returns true if performance monitoring is enabled
   */
  get enablePerformanceMonitoring(): boolean {
    return this.config.get<boolean>('enablePerformanceMonitoring', true);
  }

  /**
   * Get status bar enabled status
   * @returns true if status bar is enabled
   */
  get enableStatusBar(): boolean {
    return this.config.get<boolean>('enableStatusBar', true);
  }

  /**
   * Get conflict resolution enabled status
   * @returns true if conflict resolution is enabled
   */
  get enableConflictResolution(): boolean {
    return this.config.get<boolean>('enableConflictResolution', true);
  }

  /**
   * Get hide when LSP active setting
   * @returns true if AI completions should hide when LSP menu is visible
   */
  get hideWhenLSPActive(): boolean {
    return this.config.get<boolean>('hideWhenLSPActive', true);
  }

  /**
   * Get modifier key for preview setting
   * @returns Modifier key to preview AI completions when LSP menu is visible
   */
  get modifierKeyForPreview(): 'alt' | 'ctrl' | 'none' {
    return this.config.get<'alt' | 'ctrl' | 'none'>(
      'modifierKeyForPreview',
      'alt',
    );
  }

  /**
   * Get continuation detection enabled status
   * @returns true if continuation detection is enabled
   */
  get enableContinuationDetection(): boolean {
    return this.config.get<boolean>('enableContinuationDetection', true);
  }

  /**
   * Get continuation delay
   * @returns Delay in milliseconds before triggering continuation detection
   */
  get continuationDelay(): number {
    return this.config.get<number>('continuationDelay', 100);
  }

  /**
   * Get all configuration values as an object
   * @returns Complete configuration object
   */
  getAll(): PredicteConfigValues {
    return {
      enabled: this.enabled,
      apiBaseUrl: this.apiBaseUrl,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      debounceDelay: this.debounceDelay,
      contextLines: this.contextLines,
      enhancedContextEnabled: this.enhancedContextEnabled,
      enableStreaming: this.enableStreaming,
      cacheEnabled: this.cacheEnabled,
      cacheTTL: this.cacheTTL,
      requestTimeout: this.requestTimeout,
      promptEngineeringEnabled: this.promptEngineeringEnabled,
      languageAwareParametersEnabled: this.languageAwareParametersEnabled,
      qualityFilteringEnabled: this.qualityFilteringEnabled,
      numCandidates: this.numCandidates,
      debugMode: this.debugMode,
      enableKeybindings: this.enableKeybindings,
      enablePerformanceMonitoring: this.enablePerformanceMonitoring,
      enableStatusBar: this.enableStatusBar,
      enableConflictResolution: this.enableConflictResolution,
      hideWhenLSPActive: this.hideWhenLSPActive,
      modifierKeyForPreview: this.modifierKeyForPreview,
      enableContinuationDetection: this.enableContinuationDetection,
      continuationDelay: this.continuationDelay,
      apiKey: this.apiKey,
    };
  }

  /**
   * Watch for configuration changes
   * @param callback Function to call when configuration changes
   * @returns Disposable to stop watching
   */
  watchChanges(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this.sectionId)) {
        this.reloadConfig();
        try {
          callback();
        } catch (error) {
          // Log error but don't throw to prevent breaking the extension
          logger.error('Error in configuration change callback', error);
        }
      }
    });
  }

  /**
   * Update a configuration value
   * @param key Configuration key
   * @param value New value
   * @param target Configuration target (global or workspace)
   * @returns Promise that resolves when the update is complete
   */
  async update(
    key: keyof PredicteConfigValues,
    value: PredicteConfigValues[keyof PredicteConfigValues],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
  ): Promise<void> {
    await this.config.update(key, value, target);
    this.reloadConfig();
  }
}
