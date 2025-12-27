/**
 * Status Bar Controller
 *
 * Manages Predicte's status bar items for user control and feedback.
 * Provides simple, non-intrusive status indicators:
 * - Toggle button to enable/disable Predicte
 * - Loading indicator during API requests
 *
 * Features:
 * - Clean, simple UI (not cluttered)
 * - Respects enableStatusBar configuration
 * - Uses VS Code status bar icons
 * - Non-intrusive (only shows when needed)
 */

import * as vscode from 'vscode';
import type { PredicteConfig } from '../managers/configManager';

/**
 * Status Bar Controller for Predicte
 */
export class StatusBarController {
  private config: PredicteConfig;
  private statusBarItem: vscode.StatusBarItem;
  private loadingBarItem: vscode.StatusBarItem;
  private isEnabled: boolean = true;
  private isLoading: boolean = false;

  constructor(config: PredicteConfig) {
    this.config = config;

    // Create main status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      'predicte.status',
      vscode.StatusBarAlignment.Right,
      100, // Priority
    );

    this.statusBarItem.command = 'predicte.toggle';
    this.statusBarItem.text = '$(check) Predicte';
    this.statusBarItem.tooltip = 'Click to enable/disable Predicte';

    // Create loading indicator
    this.loadingBarItem = vscode.window.createStatusBarItem(
      'predicte.loading',
      vscode.StatusBarAlignment.Right,
      99, // Priority (lower than status item)
    );
    this.loadingBarItem.text = '$(loading~spin) AI typing...';
    this.loadingBarItem.tooltip = 'Generating completion...';

    // Initialize based on config
    this.updateStatusBar();
  }

  /**
   * Activate the status bar controller
   * @param context Extension context for disposables
   */
  activate(context: vscode.ExtensionContext): void {
    // Show status bar if enabled
    if (this.config.enableStatusBar) {
      this.statusBarItem.show();
    }

    // Register disposables
    context.subscriptions.push(this.statusBarItem, this.loadingBarItem);

    // Watch for configuration changes
    const configWatcher = this.config.watchChanges(() => {
      this.updateStatusBar();
    });
    context.subscriptions.push(configWatcher);
  }

  /**
   * Update status bar based on configuration
   */
  private updateStatusBar(): void {
    const enabled = this.config.enabled;
    this.isEnabled = enabled;

    // Update status bar visibility
    if (this.config.enableStatusBar) {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
      this.loadingBarItem.hide();
      return;
    }

    // Update status bar appearance
    if (enabled) {
      this.statusBarItem.text = '$(check) Predicte';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Predicte enabled - Click to disable';
    } else {
      this.statusBarItem.text = '$(x) Predicte';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground',
      );
      this.statusBarItem.tooltip = 'Predicte disabled - Click to enable';
    }

    // Hide loading indicator if extension is disabled
    if (!enabled && this.isLoading) {
      this.hideLoading();
    }
  }

  /**
   * Show loading indicator
   */
  showLoading(): void {
    if (!this.config.enableStatusBar || !this.isEnabled) {
      return;
    }

    this.isLoading = true;
    this.loadingBarItem.show();
  }

  /**
   * Hide loading indicator
   */
  hideLoading(): void {
    this.isLoading = false;
    this.loadingBarItem.hide();
  }

  /**
   * Update loading indicator text
   * @param text New text for loading indicator
   */
  updateLoadingText(text: string): void {
    this.loadingBarItem.text = `$(loading~spin) ${text}`;
  }

  /**
   * Toggle Predicte enabled state
   */
  async toggle(): Promise<void> {
    const enabled = this.config.enabled;
    await this.config.update(
      'enabled',
      !enabled,
      vscode.ConfigurationTarget.Global,
    );

    // Show feedback message
    if (!enabled) {
      vscode.window.showInformationMessage('Predicte enabled');
    } else {
      vscode.window.showInformationMessage('Predicte disabled');
    }
  }

  /**
   * Dispose of status bar items
   */
  dispose(): void {
    this.statusBarItem.dispose();
    this.loadingBarItem.dispose();
  }
}
