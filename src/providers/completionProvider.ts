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
  buildEnhancedContext,
  formatContextWithPrompt,
} from '../utils/contextUtils';
import {
  sanitizeCompletion,
  fixHtmlJsxSpacing,
  isValidCompletion,
  getBestCompletion,
} from '../utils/codeUtils';

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
    this.mistralClient = new MistralClient(config, secretStorage, logger);
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
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<
    | vscode.InlineCompletionItem[]
    | vscode.InlineCompletionList
    | undefined
    | null
  > {
    // Check if extension is enabled
    if (!this.config.enabled) {
      this.logger.debug('Completion provider disabled');
      return null;
    }

    // Check if should trigger
    const shouldTriggerResult = this.shouldTrigger(document, position);
    if (!shouldTriggerResult) {
      this.logger.debug('Skipping completion (shouldTrigger returned false)');
      return null;
    }

    // Check for cancellation
    if (token.isCancellationRequested) {
      this.logger.debug('Request cancelled before API call');
      return null;
    }

    try {
      // Use debouncing to prevent excessive API calls
      const completion = await this.debouncer.debounce(async () => {
        // Check for cancellation again
        if (token.isCancellationRequested) {
          return null;
        }

        // Extract context
        const codeContext = extractContext(
          document,
          position,
          this.config.contextLines,
          this.config.enhancedContextEnabled,
        );

        // Format context with system prompt if prompt engineering is enabled
        const formattedContext = formatContextWithPrompt(
          codeContext,
          this.config.promptEngineeringEnabled,
        );

        // Truncate context if needed
        let prefix: string;
        let suffix: string;
        let systemPrompt: string | undefined;

        if (this.config.enhancedContextEnabled) {
          // Use enhanced context building
          const enhancedContext = buildEnhancedContext(codeContext);
          prefix = truncateContext(enhancedContext.prefix);
          suffix = truncateContext(enhancedContext.suffix);
        } else {
          // Use basic context
          prefix = truncateContext(formattedContext.prefix);
          suffix = truncateContext(formattedContext.suffix);
        }

        // Set system prompt if prompt engineering is enabled
        if (this.config.promptEngineeringEnabled) {
          systemPrompt = formattedContext.systemPrompt;
        }

        this.logger.debug(
          `Requesting completion for ${document.languageId} at line ${position.line}`,
        );
        this.logger.debug(
          `Prefix length: ${prefix.length}, Suffix length: ${suffix.length}`,
        );

        // Get completion from Mistral API
        let result: string | null = null;

        // Quality filtering doesn't work well with streaming
        // Fall back to single completion if streaming is enabled
        if (
          this.config.enableStreaming ||
          !this.config.qualityFilteringEnabled
        ) {
          // Use single completion (streaming or non-streaming)
          if (this.config.enableStreaming) {
            this.logger.debug('Using streaming completion');
            result = await this.getStreamingCompletion(
              prefix,
              suffix,
              token,
              systemPrompt,
              document.languageId,
            );
          } else {
            this.logger.debug('Using non-streaming completion');
            result = await this.mistralClient.getCompletion(
              prefix,
              suffix,
              token,
              systemPrompt,
              document.languageId,
            );
          }
        } else {
          // Use quality filtering with multiple candidates
          this.logger.debug('Using quality filtering with multiple candidates');
          const numCandidates = this.config.numCandidates;
          this.logger.debug(`Requesting ${numCandidates} candidates`);

          const candidates = await this.mistralClient.getMultipleCompletions(
            prefix,
            suffix,
            numCandidates,
            token,
            systemPrompt,
            document.languageId,
          );

          // Filter out null candidates
          const validCandidates = candidates.filter(
            (c): c is string => c !== null,
          );
          this.logger.debug(`Valid candidates: ${validCandidates.length}`);

          if (validCandidates.length > 0) {
            // Select the best completion using quality filtering
            result = getBestCompletion(
              validCandidates,
              prefix,
              suffix,
              document.languageId,
            );
            this.logger.debug(
              `Best completion selected: ${result ? 'success' : 'null'}`,
            );
          } else {
            this.logger.debug('No valid candidates found');
          }
        }

        if (result) {
          this.logger.debug(
            `Received completion: ${result.substring(0, 100)}...`,
          );
        }

        // Fix HTML/JSX spacing issues
        if (result) {
          const sanitized = sanitizeCompletion(result);
          result = fixHtmlJsxSpacing(sanitized, prefix);
        }

        return result;
      });

      // Return null if no completion
      if (!completion) {
        return null;
      }

      // Validate completion
      if (!isValidCompletion(completion)) {
        this.logger.debug('Completion invalid after sanitization');
        return null;
      }

      // Create inline completion item with explicit range
      const item = new vscode.InlineCompletionItem(
        completion,
        new vscode.Range(position, position),
      );

      // Enable bracket pair completion for function signatures and code blocks
      // Note: completeBracketPairs is a proposed API, using type assertion
      if (
        completion.startsWith('(') ||
        completion.startsWith('{') ||
        completion.startsWith('[')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).completeBracketPairs = true;
      }

      this.logger.debug('Returning completion item');
      return [item];
    } catch (error) {
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
   * @param systemPrompt Optional system prompt for prompt engineering
   * @param languageId The language identifier for language-aware parameters (optional)
   * @returns Promise resolving to the complete completion text
   */
  private async getStreamingCompletion(
    prefix: string,
    suffix: string,
    token: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): Promise<string | null> {
    const chunks: string[] = [];
    let chunkCount = 0;

    try {
      for await (const chunk of this.mistralClient.getStreamingCompletion(
        prefix,
        suffix,
        token,
        systemPrompt,
        languageId,
      )) {
        if (token.isCancellationRequested) {
          this.logger.debug('Streaming request cancelled');
          return null;
        }
        chunkCount++;
        chunks.push(chunk);
        this.logger.debug(
          `Received chunk ${chunkCount}, length: ${chunk.length}`,
        );
      }

      const result = chunks.length > 0 ? chunks.join('') : null;
      this.logger.debug(`Streaming completed, total chunks: ${chunkCount}`);
      return result;
    } catch (error) {
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
   * Note: Due to a VS Code bug, triggerKind is always 'Automatic' even
   * when manually invoked, so we don't rely on it for logic.
   *
   * @param document The document
   * @param position The cursor position
   * @returns true if completion should be triggered
   */
  private shouldTrigger(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): boolean {
    // Check internal trigger logic (strings, empty lines, etc.)
    const internalTrigger = shouldTriggerInternal(document, position);
    if (!internalTrigger) {
      return false;
    }

    // Get the line text up to cursor
    const line = document.lineAt(position.line);
    const text = line.text.substring(0, position.character);
    const trimmedText = text.trim();

    // Don't trigger on completely empty lines (already handled by shouldTriggerInternal,
    // but this is an additional safety check)
    if (trimmedText.length === 0) {
      return false;
    }

    // Get last non-whitespace character
    const lastChar = trimmedText.slice(-1);

    // Don't trigger in obviously bad positions
    // These are typically end of statements or inside strings
    if ([';', '}', ']', ')', '"', "'", '`'].includes(lastChar)) {
      return false;
    }

    // Allow triggers in natural coding positions:
    // After spaces, dot, comma, colon, equals, open brackets/braces
    // These are often followed by more code
    // Example: console.|, const x = |, if (|, function foo(|, etc.
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
    if (error instanceof MistralClientError) {
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
        size: number;
        maxSize: number;
        keys: number;
        utilization: number;
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
