/**
 * Predicte Configuration Manager
 *
 * Manages the extension's configuration settings.
 * Provides a convenient interface for accessing and watching configuration changes.
 */

import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import type { ApiBaseUrl, PredicteConfigValues } from '../types/config';

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

  get debugMode(): boolean {
    return this.config.get<boolean>('debugMode', false);
  }

  get enableKeybindings(): boolean {
    return this.config.get<boolean>('enableKeybindings', true);
  }

  get enableStatusBar(): boolean {
    return this.config.get<boolean>('enableStatusBar', true);
  }

  getAll(): PredicteConfigValues {
    return {
      enabled: this.enabled,
      apiBaseUrl: this.apiBaseUrl,
      debugMode: this.debugMode,
      enableKeybindings: this.enableKeybindings,
      enableStatusBar: this.enableStatusBar,
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
