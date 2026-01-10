/**
 * Predicte Extension - Main Entry Point
 *
 * AI-powered code autocomplete extension using Mistral's Codestral model.
 * Maintains a lightweight philosophy with focus on autocomplete only.
 */

import * as vscode from 'vscode';
import { PredicteConfig } from './managers/configManager';
import { PredicteSecretStorage } from './services/secretStorage';
import { PredicteCompletionProvider } from './providers/completionProvider';
import { PerformanceMonitor } from './managers/performanceMetrics';
import { StatusBarController } from './providers/statusBarController';
import { Logger, LogLevel } from './utils/logger';
import {
  findNextWordBoundary,
  findNextLineBoundary,
  applyPartialCompletion,
} from './utils/partialCompletion';

/**
 * Module-level instances
 */
let config: PredicteConfig;
let secretStorage: PredicteSecretStorage;
let completionProvider: PredicteCompletionProvider;
let performanceMonitor: PerformanceMonitor | undefined;
let statusBarController: StatusBarController | undefined;
let logger: Logger;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Extension is now active

  // Initialize configuration manager, secret storage, and logger
  config = new PredicteConfig();
  secretStorage = new PredicteSecretStorage(context);

  // Set log level based on debug mode configuration
  const logLevel = config.debugMode ? LogLevel.DEBUG : LogLevel.INFO;
  logger = new Logger('Predicte', logLevel);

  // Initialize performance monitor if enabled
  if (config.enablePerformanceMonitoring) {
    performanceMonitor = new PerformanceMonitor(logger);
  }

  // Initialize status bar controller if enabled
  if (config.enableStatusBar) {
    statusBarController = new StatusBarController(config);
    statusBarController.activate(context);
  }

  // Initialize completion provider
  completionProvider = new PredicteCompletionProvider(
    config,
    secretStorage,
    logger,
    performanceMonitor,
    statusBarController,
  );

  // Watch for debug mode changes
  const debugModeWatcher = config.watchChanges(() => {
    const newLogLevel = config.debugMode ? LogLevel.DEBUG : LogLevel.INFO;
    logger.setMinLevel(newLogLevel);
  });
  context.subscriptions.push(debugModeWatcher);

  // Register the inline completion provider for all languages
  const providerDisposable =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      completionProvider,
    );
  context.subscriptions.push(providerDisposable);

  // Register toggle command
  const toggleCommand = vscode.commands.registerCommand(
    'predicte.toggle',
    async () => {
      const current = config.enabled;
      await config.update(
        'enabled',
        !current,
        vscode.ConfigurationTarget.Global,
      );

      const message = `Predicte autocomplete ${!current ? 'enabled' : 'disabled'}`;
      vscode.window.showInformationMessage(message);
    },
  );

  // Register set API key command
  const setApiKeyCommand = vscode.commands.registerCommand(
    'predicte.setApiKey',
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Codestral API key',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'Enter your API key',
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return 'API key is required';
          }
          return null;
        },
      });

      if (apiKey?.trim()) {
        try {
          await secretStorage.setApiKey(apiKey.trim());
          vscode.window.showInformationMessage('API key saved securely');
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to save API key';
          vscode.window.showErrorMessage(`Error: ${message}`);
        }
      }
    },
  );

  // Register clear cache command
  const clearCacheCommand = vscode.commands.registerCommand(
    'predicte.clearCache',
    async () => {
      completionProvider.clearCache();
      vscode.window.showInformationMessage('Cache cleared');
    },
  );

  // Register show status command
  const showStatusCommand = vscode.commands.registerCommand(
    'predicte.showStatus',
    async () => {
      const enabled = config.enabled;
      const model = config.model;
      const hasKey = await secretStorage.hasApiKey();

      const message = `
Predicte Status:
- Enabled: ${enabled ? 'Yes' : 'No'}
- Model: ${model}
- API Key: ${hasKey ? 'Set' : 'Not set'}
    `.trim();

      vscode.window.showInformationMessage(message);
    },
  );

  // Register multi-granularity acceptance commands
  const acceptWordCommand = vscode.commands.registerCommand(
    'predicte.acceptWord',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // For demonstration purposes, simulate a completion
      const simulatedCompletion = 'completionText = "example";';
      const boundaryIndex = findNextWordBoundary(simulatedCompletion);
      const remainingText = applyPartialCompletion(
        editor,
        simulatedCompletion,
        boundaryIndex,
      );

      logger.debug(`Accepted word completion: ${boundaryIndex} chars`);

      // Clear active completion state
      completionProvider.clearActiveCompletion();

      if (remainingText.length > 0) {
        vscode.window.showInformationMessage(
          `Predicte: Accepted ${boundaryIndex} characters (word), ${remainingText.length} characters remaining`,
        );
      }
    },
  );

  const acceptLineCommand = vscode.commands.registerCommand(
    'predicte.acceptLine',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // For demonstration purposes, simulate a completion
      const simulatedCompletion =
        'completionText = "example";\n// Next line comment';
      const boundaryIndex = findNextLineBoundary(simulatedCompletion);
      const remainingText = applyPartialCompletion(
        editor,
        simulatedCompletion,
        boundaryIndex,
      );

      logger.debug(`Accepted line completion: ${boundaryIndex} chars`);

      // Clear active completion state
      completionProvider.clearActiveCompletion();

      if (remainingText.length > 0) {
        vscode.window.showInformationMessage(
          `Predicte: Accepted ${boundaryIndex} characters (line), ${remainingText.length} characters remaining`,
        );
      }
    },
  );

  const acceptFullCommand = vscode.commands.registerCommand(
    'predicte.acceptFull',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // For demonstration purposes, simulate a completion
      const simulatedCompletion = 'completionText = "example";';
      const boundaryIndex = simulatedCompletion.length;
      applyPartialCompletion(editor, simulatedCompletion, boundaryIndex);

      logger.debug(`Accepted full completion: ${boundaryIndex} chars`);

      // Clear active completion state
      completionProvider.clearActiveCompletion();
    },
  );

  // Register show metrics command
  const showMetricsCommand = vscode.commands.registerCommand(
    'predicte.showMetrics',
    async () => {
      if (!performanceMonitor) {
        vscode.window.showInformationMessage(
          'Performance monitoring is disabled. Enable it in settings.',
        );
        return;
      }

      const summary = performanceMonitor.getSummary();
      const message = `
Predicte Performance Metrics

Latency (ms):
  - P50: ${summary.p50.toFixed(1)}
  - P90: ${summary.p90.toFixed(1)}
  - P95: ${summary.p95.toFixed(1)}
  - P99: ${summary.p99.toFixed(1)}
  - Average: ${summary.avg.toFixed(1)}

Success Rate: ${(summary.successRate * 100).toFixed(1)}%

Cache Performance:
  - Hit Rate: ${(summary.cacheHitRate * 100).toFixed(1)}%
  - Hits: ${summary.cacheHitCount}
  - Misses: ${summary.cacheMissCount}

Total Requests: ${summary.totalRequests}
      `.trim();

      vscode.window.showInformationMessage(message);
    },
  );

  // Add disposables to context
  context.subscriptions.push(
    toggleCommand,
    setApiKeyCommand,
    clearCacheCommand,
    showStatusCommand,
    acceptWordCommand,
    acceptLineCommand,
    acceptFullCommand,
    showMetricsCommand,
  );

  // Show welcome message after a short delay
  setTimeout(() => {
    void (async () => {
      const hasApiKey = await secretStorage.hasApiKey();
      if (!hasApiKey) {
        vscode.window
          .showInformationMessage(
            'Predicte: Please set your Codestral API key to get started',
            'Set API Key',
            'Later',
          )
          .then((selection) => {
            if (selection === 'Set API Key') {
              void vscode.commands.executeCommand('predicte.setApiKey');
            }
          });
      }
    })();
  }, 2000);
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
  // Extension deactivated

  // Dispose of completion provider
  if (completionProvider) {
    completionProvider.dispose();
  }
}
