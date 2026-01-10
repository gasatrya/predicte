/**
 * Predicte Configuration Manager
 *
 * Manages the extension's configuration settings.
 * Provides a convenient interface for accessing and watching configuration changes.
 */

import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import type {
  CodestralModel,
  ApiBaseUrl,
  PredicteConfigValues,
} from '../types/config';

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
   * @deprecated Use PredicteSecretStorage.getApiKey() instead.
   */
  get apiKey(): string | undefined {
    return this.config.get<string>('apiKey');
  }

  get enabled(): boolean {
    return this.config.get<boolean>('enabled', true);
  }

  get apiBaseUrl(): ApiBaseUrl {
    return this.config.get<ApiBaseUrl>(
      'apiBaseUrl',
      'https://codestral.mistral.ai',
    );
  }

  get model(): CodestralModel {
    return this.config.get<CodestralModel>('model', 'codestral-latest');
  }

  get maxTokens(): number {
    return this.config.get<number>('maxTokens', 100);
  }

  get temperature(): number {
    return this.config.get<number>('temperature', 0.1);
  }

  get debounceDelay(): number {
    return this.config.get<number>('debounceDelay', 150);
  }

  get contextLines(): number {
    return this.config.get<number>('contextLines', 50);
  }

  get enhancedContextEnabled(): boolean {
    return this.config.get<boolean>('enhancedContextEnabled', true);
  }

  get enableStreaming(): boolean {
    return this.config.get<boolean>('enableStreaming', true);
  }

  get cacheEnabled(): boolean {
    return this.config.get<boolean>('cacheEnabled', true);
  }

  get cacheTTL(): number {
    return this.config.get<number>('cacheTTL', 60000);
  }

  get requestTimeout(): number {
    return this.config.get<number>('requestTimeout', 30000);
  }

  get promptEngineeringEnabled(): boolean {
    return this.config.get<boolean>('promptEngineeringEnabled', true);
  }

  get languageAwareParametersEnabled(): boolean {
    return this.config.get<boolean>('languageAwareParametersEnabled', true);
  }

  get qualityFilteringEnabled(): boolean {
    return this.config.get<boolean>('qualityFilteringEnabled', true);
  }

  get numCandidates(): number {
    return this.config.get<number>('numCandidates', 3);
  }

  get debugMode(): boolean {
    return this.config.get<boolean>('debugMode', false);
  }

  get enableKeybindings(): boolean {
    return this.config.get<boolean>('enableKeybindings', true);
  }

  get enablePerformanceMonitoring(): boolean {
    return this.config.get<boolean>('enablePerformanceMonitoring', true);
  }

  get enableStatusBar(): boolean {
    return this.config.get<boolean>('enableStatusBar', true);
  }

  get enableConflictResolution(): boolean {
    return this.config.get<boolean>('enableConflictResolution', true);
  }

  get hideWhenLSPActive(): boolean {
    return this.config.get<boolean>('hideWhenLSPActive', true);
  }

  get modifierKeyForPreview(): 'alt' | 'ctrl' | 'none' {
    return this.config.get<'alt' | 'ctrl' | 'none'>(
      'modifierKeyForPreview',
      'alt',
    );
  }

  get enableContinuationDetection(): boolean {
    return this.config.get<boolean>('enableContinuationDetection', true);
  }

  get continuationDelay(): number {
    return this.config.get<number>('continuationDelay', 100);
  }

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

  async update(
    key: keyof PredicteConfigValues,
    value: PredicteConfigValues[keyof PredicteConfigValues],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
  ): Promise<void> {
    await this.config.update(key, value, target);
    this.reloadConfig();
  }
}
