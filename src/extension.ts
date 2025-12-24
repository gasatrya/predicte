/**
 * Predicte Extension - Main Entry Point
 *
 * AI-powered code autocomplete extension using Mistral's Codestral model.
 * Maintains a lightweight philosophy with focus on autocomplete only.
 */

import * as vscode from 'vscode';
import { PredicteConfig } from './managers/configManager';
import { PredicteSecretStorage } from './services/secretStorage';

/**
 * Module-level instances
 */
let config: PredicteConfig;
let secretStorage: PredicteSecretStorage;

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 *
 * @param {vscode.ExtensionContext} context - The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Predicte extension is now active!');

    // Initialize configuration manager and secret storage
    config = new PredicteConfig();
    secretStorage = new PredicteSecretStorage(context);

    // TODO: Initialize completion provider
    // TODO: Initialize status bar

    // Register toggle command
    const toggleCommand = vscode.commands.registerCommand('predicte.toggle', async () => {
        const current = config.enabled;
        await config.update('enabled', !current, vscode.ConfigurationTarget.Global);

        const message = `Predicte autocomplete ${!current ? 'enabled' : 'disabled'}`;
        vscode.window.showInformationMessage(message);
    });

    // Register set API key command
    const setApiKeyCommand = vscode.commands.registerCommand('predicte.setApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Mistral API key',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'sk-...',
            validateInput: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'API key is required';
                }
                if (!value.startsWith('sk-')) {
                    return 'API key should start with "sk-"';
                }
                return null;
            },
        });

        if (apiKey && apiKey.trim()) {
            try {
                await secretStorage.setApiKey(apiKey.trim());
                vscode.window.showInformationMessage('API key saved securely');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to save API key';
                vscode.window.showErrorMessage(`Error: ${message}`);
            }
        }
    });

    // Register clear cache command
    const clearCacheCommand = vscode.commands.registerCommand('predicte.clearCache', async () => {
        // TODO: Clear LRU cache
        vscode.window.showInformationMessage('Cache cleared');
    });

    // Register show status command
    const showStatusCommand = vscode.commands.registerCommand('predicte.showStatus', async () => {
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
    });

    // Add disposables to context
    context.subscriptions.push(
        toggleCommand,
        setApiKeyCommand,
        clearCacheCommand,
        showStatusCommand
    );

    // Show welcome message after a short delay
    setTimeout(async () => {
        const hasApiKey = await secretStorage.hasApiKey();
        if (!hasApiKey) {
            vscode.window
                .showInformationMessage(
                    'Predicte: Please set your Mistral API key to get started',
                    'Set API Key',
                    'Later'
                )
                .then((selection) => {
                    if (selection === 'Set API Key') {
                        vscode.commands.executeCommand('predicte.setApiKey');
                    }
                });
        }
    }, 2000);
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate(): void {
    console.log('Predicte extension deactivated');
    // TODO: Cleanup resources, dispose timers, etc.
}
