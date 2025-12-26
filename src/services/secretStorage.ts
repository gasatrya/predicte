/**
 * Secret Storage Service
 *
 * This module provides a secure wrapper around VS Code's SecretStorage API
 * for storing and retrieving sensitive data like API keys.
 *
 * The SecretStorage API uses the operating system's secure credential store:
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: libsecret (gnome-keyring or kwallet)
 *
 * This ensures API keys are never stored in plain text configuration files.
 */

import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Error types for secret storage operations
 */
export class SecretStorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SecretStorageError';
  }
}

/**
 * Predicte Secret Storage Manager
 *
 * Provides secure storage for sensitive data like API keys
 */
export class PredicteSecretStorage {
  private static readonly API_KEY_KEY = 'predicte.apiKey';
  private secretStorage: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * Retrieve the API key from secure storage
   * @returns Promise resolving to the API key, or undefined if not set
   * @throws SecretStorageError if retrieval fails
   */
  async getApiKey(): Promise<string | undefined> {
    try {
      const apiKey = await this.secretStorage.get(
        PredicteSecretStorage.API_KEY_KEY,
      );

      if (!apiKey) {
        return undefined;
      }

      // Validate that the API key is not empty or just whitespace
      const trimmedKey = apiKey.trim();
      if (trimmedKey.length === 0) {
        return undefined;
      }

      return trimmedKey;
    } catch (error) {
      throw new SecretStorageError(
        'Failed to retrieve API key from secret storage',
        error,
      );
    }
  }

  /**
   * Store the API key in secure storage
   * @param apiKey The API key to store
   * @throws SecretStorageError if storage fails
   * @throws Error if API key is invalid
   */
  async setApiKey(apiKey: string): Promise<void> {
    // Validate API key before storing
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key must be a non-empty string');
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length === 0) {
      throw new Error('API key cannot be empty or whitespace only');
    }

    try {
      await this.secretStorage.store(
        PredicteSecretStorage.API_KEY_KEY,
        trimmedKey,
      );
    } catch (error) {
      throw new SecretStorageError(
        'Failed to store API key in secret storage',
        error,
      );
    }
  }

  /**
   * Delete the API key from secure storage
   * @throws SecretStorageError if deletion fails
   */
  async deleteApiKey(): Promise<void> {
    try {
      await this.secretStorage.delete(PredicteSecretStorage.API_KEY_KEY);
    } catch (error) {
      throw new SecretStorageError(
        'Failed to delete API key from secret storage',
        error,
      );
    }
  }

  /**
   * Check if an API key is stored
   * @returns Promise resolving to true if an API key exists
   * @throws SecretStorageError if check fails
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return apiKey !== undefined && apiKey.length > 0;
    } catch (error) {
      // Log error for debugging but return false to not break the UI
      logger.error('Error checking API key existence', error);
      return false;
    }
  }

  /**
   * Watch for changes in secret storage
   * @param callback Function to call when secrets change
   * @returns Disposable to stop watching
   */
  onDidChangeSecrets(
    callback: (event: vscode.SecretStorageChangeEvent) => void,
  ): vscode.Disposable {
    return this.secretStorage.onDidChange(callback);
  }
}
