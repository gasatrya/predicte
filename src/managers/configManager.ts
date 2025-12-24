/**
 * Predicte Configuration Manager
 *
 * This module manages the extension's configuration settings.
 * It provides a convenient interface for accessing and watching
 * configuration changes.
 *
 * Configuration properties:
 * - enabled (boolean): Enable/disable Predicte autocomplete
 * - model (string): Codestral model to use (codestral-latest, codestral-22b, codestral-2404)
 * - maxTokens (number): Maximum completion tokens (1-500)
 * - temperature (number): Sampling temperature (0-1)
 * - debounceDelay (number): Delay before triggering autocomplete (ms)
 * - contextLines (number): Number of context lines to include (5-100)
 * - enableStreaming (boolean): Use streaming for completions
 * - cacheEnabled (boolean): Enable completion caching
 * - cacheTTL (number): Cache TTL in milliseconds (1000-600000)
 */

import * as vscode from 'vscode';

/**
 * Valid Codestral models
 */
export type CodestralModel = 'codestral-latest' | 'codestral-22b' | 'codestral-2404';

/**
 * Predicte configuration interface
 */
export interface PredicteConfigValues {
    enabled: boolean;
    model: CodestralModel;
    maxTokens: number;
    temperature: number;
    debounceDelay: number;
    contextLines: number;
    enableStreaming: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
    requestTimeout: number;
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
     * @returns The API key, or undefined if not set
     * @note API keys should be stored in SecretStorage for security.
     *       This getter is provided for backward compatibility only.
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
        return this.config.get<number>('maxTokens', 50);
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
        return this.config.get<number>('debounceDelay', 300);
    }

    /**
     * Get number of context lines
     * @returns Number of context lines to include
     */
    get contextLines(): number {
        return this.config.get<number>('contextLines', 20);
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
     * Get all configuration values as an object
     * @returns Complete configuration object
     */
    getAll(): PredicteConfigValues {
        return {
            enabled: this.enabled,
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            debounceDelay: this.debounceDelay,
            contextLines: this.contextLines,
            enableStreaming: this.enableStreaming,
            cacheEnabled: this.cacheEnabled,
            cacheTTL: this.cacheTTL,
            requestTimeout: this.requestTimeout,
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
                    console.error('Error in configuration change callback:', error);
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
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        await this.config.update(key, value, target);
        this.reloadConfig();
    }
}
