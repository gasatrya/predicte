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
} from '../utils/completionSanitizer';
import { getBestCompletion } from '../utils/completionScorer';
import { CompletionStateManager } from '../managers/completionStateManager';
import type { PerformanceMonitor } from '../managers/performanceMetrics';
import type { StatusBarController } from './statusBarController';
import { isIncompleteCode } from '../utils/syntaxChecker';

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
  private completionStateManager: CompletionStateManager;
  private statusBarController?: StatusBarController;
  private continuationTimer?: NodeJS.Timeout;
  private disposables: vscode.Disposable[] = [];

  constructor(
    config: PredicteConfig,
    secretStorage: PredicteSecretStorage,
    logger: Logger,
    performanceMonitor?: PerformanceMonitor,
    statusBarController?: StatusBarController,
  ) {
    this.config = config;
    this.logger = logger;
    this.statusBarController = statusBarController;
    this.mistralClient = new MistralClient(
      config,
      secretStorage,
      logger,
      performanceMonitor,
    );
    this.debouncer = new Debouncer<string | null>(config.debounceDelay);
    this.completionStateManager = new CompletionStateManager();

    // Watch for configuration changes
    const configWatcher = config.watchChanges(() => {
      this.handleConfigChange();
    });

    // Watch for secret storage changes (API key changes)
    const secretWatcher = secretStorage.onDidChangeSecrets((_event) => {
      this.handleSecretChange();
    });

    // Track document changes for interpolation
    const documentChangeWatcher = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        this.handleDocumentChange(event);
      },
    );

    this.disposables.push(configWatcher, secretWatcher, documentChangeWatcher);

    this.logger.info('PredicteCompletionProvider initialized');
  }

  /**
   * Provide inline completion items
   *
   * Main method called by VS Code when requesting completions.
   * Implements debouncing, cancellation, and smart triggering logic.
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
    // Check if extension is enabled
    if (!this.config.enabled) {
      this.logger.debug('Completion provider disabled');
      return null;
    }

    // Check for conflict resolution with LSP
    if (this.config.enableConflictResolution) {
      const shouldHideForLSP = this.shouldHideForLSP(context);
      if (shouldHideForLSP) {
        const modifierPressed = this.isModifierPressed();
        if (!modifierPressed) {
          this.logger.debug('Hiding AI completion (LSP active, no modifier)');
          return null;
        }
        this.logger.debug(
          'Showing AI completion (LSP active, modifier pressed)',
        );
      }
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

    // Show loading indicator
    this.statusBarController?.showLoading();

    try {
      // Use debouncing to prevent excessive API calls
      const completion = await this.debouncer.debounce(async () => {
        // Check for cancellation again
        if (token.isCancellationRequested) {
          return null;
        }

        // Extract context from document
        const codeContext = extractContext(
          document,
          position,
          this.config.contextLines,
        );

        // Format context with prompt engineering if enabled
        const formattedContext = formatContextWithPrompt(
          codeContext,
          this.config.promptEngineeringEnabled,
        );

        let prefix = '';
        let suffix = '';
        let systemPrompt: string | undefined;

        if (this.config.enhancedContextEnabled) {
          this.logger.debug('Using enhanced context building');
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
        // Add actual content logging (truncated for readability)
        this.logger.debug(
          `Prefix (first 300 chars): ${prefix.substring(0, 300)}${prefix.length > 300 ? '...' : ''}`,
        );
        this.logger.debug(
          `Suffix (first 300 chars): ${suffix.substring(0, 300)}${suffix.length > 300 ? '...' : ''}`,
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
          this.logger.debug(
            `Using quality filtering with ${this.config.numCandidates} candidates`,
          );
          const candidates = await this.mistralClient.getMultipleCompletions(
            prefix,
            suffix,
            this.config.numCandidates,
            token,
            systemPrompt,
            document.languageId,
          );

          // Filter out null results and get the best completion
          const validCandidates = candidates.filter(
            (candidate): candidate is string => candidate !== null,
          );
          if (validCandidates.length > 0) {
            result = getBestCompletion(validCandidates, prefix, suffix);
            this.logger.debug(
              `Selected best completion from ${validCandidates.length} candidates`,
            );
          }
        }

        // Fix HTML/JSX spacing issues
        if (result) {
          const sanitized = sanitizeCompletion(result);
          result = fixHtmlJsxSpacing(sanitized, prefix);
        }

        return result;
      });

      // Hide loading indicator
      this.statusBarController?.hideLoading();

      // Return null if no completion
      if (!completion) {
        return null;
      }

      // Validate completion
      if (!isValidCompletion(completion)) {
        this.logger.debug('Completion invalid after sanitization');
        return null;
      }

      // Track completion in state manager for interpolation
      this.completionStateManager.setCompletion(completion, document, position);

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

      // Schedule continuation detection if completion was successful
      this.scheduleContinuation(document, position, token);

      return [item];
    } catch (error) {
      // Hide loading indicator even on error
      this.statusBarController?.hideLoading();
      return this.handleError(error);
    }
  }

  /**
   * Get streaming completion from Mistral API
   *
   * Handles streaming completions and aggregates chunks into a single string.
   */
  private async getStreamingCompletion(
    prefix: string,
    suffix?: string,
    token?: vscode.CancellationToken,
    systemPrompt?: string,
    languageId?: string,
  ): Promise<string | null> {
    try {
      const stream = this.mistralClient.getStreamingCompletion(
        prefix,
        suffix,
        token,
        systemPrompt,
        languageId,
      );

      let result = '';
      for await (const chunk of stream) {
        if (token?.isCancellationRequested) {
          break;
        }
        result += chunk;
      }

      return result || null;
    } catch (error) {
      if (error instanceof MistralClientError) {
        throw error;
      }
      throw new MistralClientError(
        `Streaming error: ${error instanceof Error ? error.message : String(error)}`,
        'STREAMING_ERROR',
        error,
      );
    }
  }

  /**
   * Check if completion should be triggered at the given position
   *
   * Uses smart triggering logic to avoid unnecessary API calls.
   */
  private shouldTrigger(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): boolean {
    return shouldTriggerInternal(document, position);
  }

  private handleConfigChange(): void {
    this.logger.debug('Configuration changed, updating completion provider');

    // Update debouncer delay if changed
    this.debouncer.setDelay(this.config.debounceDelay);

    // Update Mistral client configuration
    this.mistralClient.updateConfig(this.config);

    this.logger.debug('Completion provider updated with new configuration');
  }

  private handleSecretChange(): void {
    this.logger.debug('Secret storage changed, resetting Mistral client');
    this.mistralClient.resetClient();
  }

  /**
   * Handle document changes for interpolation
   *
   * Tracks document changes to interpolate completions when user types while a completion is active.
   */
  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    // Skip if no active completion
    if (!this.completionStateManager.hasActiveCompletion()) {
      return;
    }

    // Check for conflicts
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document !== event.document) {
      return;
    }

    // Basic conflict check: if document changed significantly, clear completion
    if (event.contentChanges.length > 3) {
      // Too many changes at once, likely not compatible with interpolation
      this.completionStateManager.clearCompletion();
      this.logger.debug(
        'Completion cleared due to multiple simultaneous changes',
      );
      return;
    }

    // Try to interpolate the completion
    const adjustedCompletion =
      this.completionStateManager.interpolateCompletion(event.document);

    if (adjustedCompletion) {
      // Update inline preview with adjusted completion
      this.updateInlinePreview();
      this.logger.debug('Completion interpolated successfully');
    } else {
      // Interpolation failed, clear completion
      this.completionStateManager.clearCompletion();
      this.logger.debug('Completion interpolation failed, clearing');
    }
  }

  /**
   * Update inline preview with adjusted completion
   *
   * Triggers a refresh of inline completions to show interpolated completion text.
   * Note: VS Code doesn't provide direct API to update inline preview.
   */
  private updateInlinePreview(): void {
    // Trigger a new completion request which will use the interpolated completion
    // This will naturally refresh the inline suggestion
    vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
  }

  /**
   * Handle errors from completion requests
   *
   * Logs errors and returns null. Shows user-friendly error messages for common errors.
   */
  private handleError(error: unknown): null {
    if (error instanceof MistralClientError) {
      switch (error.code) {
        case 'MISSING_API_KEY':
          this.logger.error('API key not found. Please set your API key.');
          vscode.window.showErrorMessage(
            'Predicte: API key not found. Please set your API key in settings.',
          );
          break;

        case 'INVALID_API_KEY':
          this.logger.error(
            'Invalid API key. Please check your API key settings.',
          );
          vscode.window.showErrorMessage(
            'Predicte: Invalid API key. Please check your API key settings.',
          );
          break;

        case 'RATE_LIMIT':
          this.logger.warn('Rate limit exceeded. Please wait a moment.');
          // Don't show error message for rate limits to avoid annoying users
          break;

        case 'NETWORK_ERROR':
          this.logger.error(
            'Network error. Please check your internet connection.',
          );
          // Don't show error message for network errors to avoid annoying users
          break;

        case 'SERVICE_UNAVAILABLE':
          this.logger.error('Mistral API is temporarily unavailable.');
          vscode.window.showWarningMessage(
            'Predicte: Mistral API is temporarily unavailable. Please try again later.',
          );
          break;

        default:
          this.logger.error(`API error: ${error.message}`, error);
          // Only show error message for unexpected errors
          if (!error.code.startsWith('CANCELLED')) {
            vscode.window.showErrorMessage(`Predicte: ${error.message}`);
          }
      }
    } else {
      this.logger.error('Unexpected error in completion provider', error);
    }

    return null;
  }

  clearCache(): void {
    this.mistralClient.clearCache();
    this.logger.info('Completion cache cleared');
  }

  clearActiveCompletion(): void {
    this.completionStateManager.clearCompletion();
    this.logger.debug('Active completion cleared');
  }

  private shouldHideForLSP(context: vscode.InlineCompletionContext): boolean {
    if (!this.config.hideWhenLSPActive) {
      return false;
    }

    // VS Code sets triggerKind to Invoke when user manually triggers suggestions
    // This usually means LSP menu is visible or user explicitly requested completion
    return context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke;
  }

  private isModifierPressed(): boolean {
    // VS Code doesn't provide direct API to check key state
    // We'll use keyboard event tracking or rely on keybinding context

    // For now, return false - user will use Alt+Tab to accept when LSP is active
    // This can be enhanced with keyboard event tracking if needed
    return false;
  }

  private scheduleContinuation(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): void {
    // Clear previous timer
    if (this.continuationTimer) {
      clearTimeout(this.continuationTimer);
    }

    // Don't schedule if continuation detection is disabled
    if (!this.config.enableContinuationDetection) {
      return;
    }

    // Schedule continuation check
    this.continuationTimer = setTimeout(() => {
      void this.checkForContinuation(document, position, token);
    }, this.config.continuationDelay);
  }

  private async checkForContinuation(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (token.isCancellationRequested) {
      return;
    }

    // Get current text at cursor position
    const lineText = document.lineAt(position.line).text;
    const textUpToCursor = lineText.substring(0, position.character);

    // Check if incomplete
    const isIncomplete = isIncompleteCode(textUpToCursor, document.languageId);

    if (isIncomplete) {
      this.logger.debug('Detected incomplete code, triggering continuation');

      // Trigger follow-up completion
      // This will cause provideInlineCompletionItems to be called again
      // with updated cursor position
      vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    }
  }

  dispose(): void {
    this.logger.info('Disposing PredicteCompletionProvider');

    // Clear completion state
    this.completionStateManager.dispose();

    // Cancel any pending debounced requests
    this.debouncer.dispose();

    // Clear continuation timer
    if (this.continuationTimer) {
      clearTimeout(this.continuationTimer);
    }

    // Dispose of watchers
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    this.logger.info('PredicteCompletionProvider disposed');
  }
}
