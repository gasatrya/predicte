/**
 * Inline Completion Provider
 *
 * This module contains the main completion provider for Predicte.
 * It implements vscode.InlineCompletionItemProvider to provide
 * AI-powered code suggestions using Mistral's Codestral model.
 */

import * as vscode from 'vscode';
import type { PredicteConfig } from '../managers/configManager';
import type { PredicteSecretStorage } from '../services/secretStorage';
import { MistralClient, MistralClientError } from '../services/mistralClient';
import { Debouncer } from '../utils/debounce';
import { Logger } from '../utils/logger';
import {
  extractContext,
  shouldTrigger as shouldTriggerInternal,
  truncateContext,
} from '../utils/contextUtils';
import { sanitizeCompletion, isValidCompletion } from '../utils/codeUtils';

/**
 * Predicte Completion Provider
 *
 * Provides inline code completions using Mistral's Codestral FIM API.
 */
export class PredicteCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private config: PredicteConfig;
  private logger: Logger;
  private mistralClient: MistralClient;
  private debouncer: Debouncer<string | null>;
  private disposables: vscode.Disposable[] = [];

  constructor(
    config: PredicteConfig,
    secretStorage: PredicteSecretStorage,
    logger: Logger,
  ) {
    this.config = config;
    this.logger = logger;
    this.mistralClient = new MistralClient(config, secretStorage);
    this.debouncer = new Debouncer<string | null>(config.debounceDelay);

    // Watch for configuration changes
    const configWatcher = config.watchChanges(() => {
      this.handleConfigChange();
    });

    // Watch for secret storage changes (API key changes)
    const secretWatcher = secretStorage.onDidChangeSecrets((_event) => {
      this.handleSecretChange();
    });

    this.disposables.push(configWatcher, secretWatcher);

    this.logger.info('PredicteCompletionProvider initialized');
  }

  /**
   * Provide inline completion items
   *
   * This is the main method called by VS Code when requesting completions.
   * It implements debouncing, cancellation, and smart triggering logic.
   *
   * @param document The document in which the completion was requested
   * @param position The position at which the completion was requested
   * @param context Additional context about the completion request
   * @param token Cancellation token to abort the request
   * @returns Promise resolving to inline completion items
   */
  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<
    | vscode.InlineCompletionItem[]
    | vscode.InlineCompletionList
    | undefined
    | null
  > {
    console.warn('[DEBUG] provideInlineCompletionItems called');
    console.warn('[DEBUG] Document:', document.uri.toString());
    console.warn('[DEBUG] Language:', document.languageId);
    console.warn(
      '[DEBUG] Position:',
      `line ${position.line}, char ${position.character}`,
    );
    console.warn('[DEBUG] Trigger kind:', context.triggerKind);
    console.warn('[DEBUG] Is cancelled:', token.isCancellationRequested);

    // Check if extension is enabled
    if (!this.config.enabled) {
      console.warn('[DEBUG] Extension is disabled in configuration');
      this.logger.debug('Completion provider disabled');
      return null;
    }
    console.warn('[DEBUG] Extension is enabled');

    // Check if should trigger
    const shouldTriggerResult = this.shouldTrigger(document, position, context);
    console.warn('[DEBUG] shouldTrigger result:', shouldTriggerResult);
    if (!shouldTriggerResult) {
      console.warn('[DEBUG] Skipping completion (shouldTrigger returned false)');
      this.logger.debug('Skipping completion (shouldTrigger returned false)');
      return null;
    }
    console.warn('[DEBUG] Should trigger check passed');

    // Check for cancellation
    if (token.isCancellationRequested) {
      this.logger.debug('Request cancelled before API call');
      return null;
    }

    try {
      console.warn('[DEBUG] About to start debounced API call');
      // Use debouncing to prevent excessive API calls
      const completion = await this.debouncer.debounce(async () => {
        console.warn('[DEBUG] Debounced callback executing');
        // Check for cancellation again
        if (token.isCancellationRequested) {
          console.warn('[DEBUG] Request cancelled in debounced callback');
          return null;
        }

        // Extract context
        console.warn('[DEBUG] Extracting context...');
        const codeContext = extractContext(
          document,
          position,
          this.config.contextLines,
        );
        console.warn('[DEBUG] Context extracted successfully');
        console.warn('[DEBUG] Prefix length:', codeContext.prefix.length);
        console.warn('[DEBUG] Suffix length:', codeContext.suffix.length);
        console.warn(
          '[DEBUG] Prefix preview (first 100 chars):',
          codeContext.prefix.substring(0, 100),
        );

        // Truncate context if needed
        const prefix = truncateContext(codeContext.prefix);
        const suffix = truncateContext(codeContext.suffix);

        console.warn(
          '[DEBUG] After truncation - Prefix length:',
          prefix.length,
          'Suffix length:',
          suffix.length,
        );

        this.logger.debug(
          `Requesting completion for ${document.languageId} at line ${position.line}`,
        );
        this.logger.debug(
          `Prefix length: ${prefix.length}, Suffix length: ${suffix.length}`,
        );

        console.warn(
          '[DEBUG] Checking if streaming is enabled:',
          this.config.enableStreaming,
        );

        // Get completion from Mistral API
        let result: string | null = null;
        console.warn('[DEBUG] About to make API call to Mistral...');

        if (this.config.enableStreaming) {
          // Use streaming completion
          console.warn('[DEBUG] Using streaming completion');
          result = await this.getStreamingCompletion(prefix, suffix, token);
        } else {
          // Use non-streaming completion
          console.warn('[DEBUG] Using non-streaming completion');
          result = await this.mistralClient.getCompletion(prefix, suffix, token);
        }

        console.warn(
          '[DEBUG] API call completed, result:',
          result ? 'received' : 'null',
        );

        if (result) {
          this.logger.debug(
            `Received completion: ${result.substring(0, 100)}...`,
          );
          console.warn('[DEBUG] Completion length:', result.length);
          console.warn(
            '[DEBUG] Completion preview (first 200 chars):',
            result.substring(0, 200),
          );
        }

        return result;
      });

      // Return null if no completion
      if (!completion) {
        console.warn('[DEBUG] No completion received, returning null');
        return null;
      }
      console.warn('[DEBUG] Completion received successfully');

      // Sanitize completion
      console.warn('[DEBUG] Sanitizing completion...');
      const sanitized = sanitizeCompletion(completion);
      console.warn(
        '[DEBUG] Sanitized completion:',
        sanitized ? 'success' : 'failed',
      );

      // Validate completion
      console.warn('[DEBUG] Validating completion...');
      if (!isValidCompletion(sanitized)) {
        console.warn(
          '[DEBUG] Completion invalid after sanitization, returning null',
        );
        this.logger.debug('Completion invalid after sanitization');
        return null;
      }
      console.warn('[DEBUG] Completion is valid');

      // Create inline completion item
      console.warn('[DEBUG] Creating inline completion item...');
      const item = new vscode.InlineCompletionItem(sanitized);

      console.warn(
        '[DEBUG] Returning completion item:',
        sanitized.substring(0, 100),
      );
      this.logger.debug('Returning completion item');
      return [item];
    } catch (error) {
      console.warn('[DEBUG] Error occurred in provideInlineCompletionItems');
      console.warn('[DEBUG] Error:', error);
      if (error instanceof Error) {
        console.warn('[DEBUG] Error message:', error.message);
        console.warn('[DEBUG] Error name:', error.name);
        console.warn('[DEBUG] Error stack:', error.stack);
      }
      return this.handleError(error);
    }
  }

  /**
   * Get streaming completion from Mistral API
   *
   * Collects all chunks from the streaming response and returns
   * the concatenated result.
   *
   * @param prefix The prefix text before the cursor
   * @param suffix The suffix text after the cursor
   * @param token Cancellation token to abort the request
   * @returns Promise resolving to the complete completion text
   */
  private async getStreamingCompletion(
    prefix: string,
    suffix: string,
    token: vscode.CancellationToken,
  ): Promise<string | null> {
    console.warn('[DEBUG] getStreamingCompletion called');
    const chunks: string[] = [];
    let chunkCount = 0;

    try {
      console.warn('[DEBUG] Starting streaming loop');
      for await (const chunk of this.mistralClient.getStreamingCompletion(
        prefix,
        suffix,
        token,
      )) {
        if (token.isCancellationRequested) {
          console.warn('[DEBUG] Streaming request cancelled');
          this.logger.debug('Streaming request cancelled');
          return null;
        }
        chunkCount++;
        chunks.push(chunk);
        console.warn(
          '[DEBUG] Received chunk',
          chunkCount,
          'length:',
          chunk.length,
        );
      }
      console.warn('[DEBUG] Streaming completed, total chunks:', chunkCount);

      const result = chunks.length > 0 ? chunks.join('') : null;
      console.warn(
        '[DEBUG] Streaming result:',
        result ? 'has content' : 'empty',
      );
      return result;
    } catch (error) {
      console.warn('[DEBUG] Error in getStreamingCompletion:', error);
      if (error instanceof MistralClientError && error.code === 'CANCELLED') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if completion should be triggered
   *
   * Implements smart triggering logic to avoid unnecessary API calls.
   *
   * @param document The document
   * @param position The cursor position
   * @param context The inline completion context
   * @returns true if completion should be triggered
   */
  private shouldTrigger(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
  ): boolean {
    console.warn('[DEBUG] shouldTrigger called');
    console.warn('[DEBUG] context.triggerKind:', context.triggerKind);

    // Check internal trigger logic (strings, empty lines, etc.)
    const internalTrigger = shouldTriggerInternal(document, position);
    console.warn('[DEBUG] shouldTriggerInternal result:', internalTrigger);
    if (!internalTrigger) {
      console.warn('[DEBUG] shouldTriggerInternal returned false');
      return false;
    }

    // Don't trigger if the user is actively typing in a completion
    // that was just accepted (VS Code's trigger kind will be 'Invoke' in that case)
    if (context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke) {
      console.warn('[DEBUG] Trigger kind is Invoke, allowing trigger');
      // Only trigger on explicit invoke if user pressed the shortcut
      return true;
    }

    // For automatic triggering, additional checks
    if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
      console.warn('[DEBUG] Trigger kind is Automatic, doing additional checks');
      const line = document.lineAt(position.line);
      const text = line.text.substring(0, position.character);
      console.warn('[DEBUG] Text before cursor:', JSON.stringify(text));

      // Don't trigger if the line ends with common punctuation
      const lastChar = text.trim().slice(-1);
      console.warn('[DEBUG] Last character:', JSON.stringify(lastChar));
      if (['.', ';', ',', '}', ']', ')'].includes(lastChar)) {
        console.warn('[DEBUG] Line ends with punctuation, skipping');
        return false;
      }
    }

    console.warn('[DEBUG] All trigger checks passed, returning true');
    return true;
  }

  /**
   * Handle API errors gracefully
   *
   * Logs errors and shows user-friendly messages for certain error types.
   *
   * @param error The error to handle
   * @returns null to indicate no completion available
   */
  private handleError(error: unknown): null {
    console.warn('[DEBUG] handleError called with error:', error);
    if (error instanceof MistralClientError) {
      console.warn('[DEBUG] MistralClientError code:', error.code);
      console.warn('[DEBUG] MistralClientError message:', error.message);
      this.logger.error(
        `MistralClientError [${error.code}]: ${error.message}`,
        error.cause,
      );

      // Show user-friendly messages for specific errors
      switch (error.code) {
        case 'MISSING_API_KEY':
          vscode.window
            .showWarningMessage(
              'Predicte: API key not set. Please set your Codestral API key.',
              'Set API Key',
            )
            .then((selection) => {
              if (selection === 'Set API Key') {
                vscode.commands.executeCommand('predicte.setApiKey');
              }
            });
          break;

        case 'INVALID_API_KEY':
          vscode.window
            .showErrorMessage(
              'Predicte: Invalid API key. Please check your Codestral API key.',
              'Set API Key',
            )
            .then((selection) => {
              if (selection === 'Set API Key') {
                vscode.commands.executeCommand('predicte.setApiKey');
              }
            });
          break;

        case 'RATE_LIMIT':
          vscode.window.showWarningMessage(
            'Predicte: Rate limit exceeded. Please wait a moment and try again.',
          );
          break;

        case 'NETWORK_ERROR':
          vscode.window.showWarningMessage(
            'Predicte: Network error. Please check your internet connection.',
          );
          break;

        case 'TIMEOUT_ERROR':
          vscode.window.showWarningMessage(
            'Predicte: Request timeout. Please try again.',
          );
          break;

        case 'CANCELLED':
          // No message for cancellation - this is normal
          break;

        default:
          vscode.window.showErrorMessage(`Predicte: ${error.message}`);
      }
    } else {
      this.logger.error('Unexpected error:', error);
    }

    return null;
  }

  /**
   * Handle configuration changes
   *
   * Updates the Mistral client and debouncer when configuration changes.
   */
  private handleConfigChange(): void {
    this.logger.info('Configuration changed, updating client');

    // Update debouncer delay
    this.debouncer.setDelay(this.config.debounceDelay);

    // Update Mistral client configuration
    this.mistralClient.updateConfig(this.config);
  }

  /**
   * Handle secret storage changes
   *
   * Resets the Mistral client when API key changes.
   */
  private handleSecretChange(): void {
    this.logger.info('API key changed, resetting client');
    this.mistralClient.resetClient();
  }

  /**
   * Clear the completion cache
   */
  clearCache(): void {
    this.mistralClient.clearCache();
    this.logger.info('Completion cache cleared');
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object, or undefined if cache is disabled
   */
  getCacheStats():
    | {
        size: number
        maxSize: number
        keys: number
        utilization: number
      }
    | undefined {
    return this.mistralClient.getCacheStats();
  }

  /**
   * Dispose of resources
   *
   * Cleans up timers, watchers, and other resources.
   */
  dispose(): void {
    this.logger.info('Disposing PredicteCompletionProvider');

    // Cancel any pending debounced requests
    this.debouncer.dispose();

    // Dispose of watchers
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    this.logger.info('PredicteCompletionProvider disposed');
  }
}
