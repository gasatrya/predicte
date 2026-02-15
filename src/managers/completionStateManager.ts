/**
 * Completion State Manager
 *
 * This module manages the state of active completions and handles
 * edit interpolation based on Zed's research patterns.
 *
 * Key features:
 * - Tracks active completion state
 * - Handles document changes for interpolation
 * - Detects conflicts between user edits and predictions
 * - Adjusts completions as user types before accepting
 */

import * as vscode from 'vscode';
import type { CompletionState } from '../types/completion';

/**
 * Completion State Manager
 *
 * Manages the lifecycle of active completions and implements
 * Zed's edit interpolation pattern to keep predictions valid
 * as the user types before accepting.
 */
export class CompletionStateManager {
  // Current completion state
  private state: CompletionState = {
    completion: null,
    baseOffset: null,
    cursorPosition: null,
    completionRange: null,
    timestamp: 0,
    documentUri: null,
  };

  // Track document change listeners
  private documentChangeDisposable?: vscode.Disposable;

  /**
   * Set a new active completion
   *
   * Stores the completion text, captures document snapshot,
   * and starts tracking document changes for interpolation.
   *
   * @param completion The completion text
   * @param document The document where completion was generated
   * @param position The cursor position when completion was generated
   */
  setCompletion(
    completion: string,
    document: vscode.TextDocument,
    position: vscode.Position,
  ): void {
    // Clear any existing completion
    this.clearCompletion();

    // Store completion state
    this.state = {
      completion,
      baseOffset: document.offsetAt(position),
      cursorPosition: position,
      completionRange: new vscode.Range(position, position),
      timestamp: Date.now(),
      documentUri: document.uri.toString(),
    };

    // Start tracking document changes
    this.startDocumentChangeTracking();
  }

  /**
   * Clear the active completion
   *
   * Resets all state and stops tracking document changes.
   */
  clearCompletion(): void {
    this.state = {
      completion: null,
      baseOffset: null,
      cursorPosition: null,
      completionRange: null,
      timestamp: 0,
      documentUri: null,
    };

    // Stop tracking document changes
    this.stopDocumentChangeTracking();
  }

  /**
   * Get the current completion state
   *
   * @returns The current completion state
   */
  getState(): CompletionState {
    return { ...this.state };
  }

  /**
   * Check if there's an active completion
   *
   * @returns true if there's an active completion
   */
  hasActiveCompletion(): boolean {
    return this.state.completion !== null;
  }

  /**
   * Check if the active completion is valid for a document
   *
   * Verifies that the completion was generated for the given document
   * and hasn't expired.
   *
   * @param document The document to check
   * @returns true if completion is valid for this document
   */
  isValidForDocument(document: vscode.TextDocument): boolean {
    if (!this.hasActiveCompletion()) {
      return false;
    }

    // Check document URI match
    if (this.state.documentUri !== document.uri.toString()) {
      return false;
    }

    // Check if completion is too old (5 seconds timeout)
    const age = Date.now() - this.state.timestamp;
    if (age > 5000) {
      return false;
    }

    return true;
  }

  /**
   * Interpolate completion based on document changes
   *
   * Adjusts the completion text based on user edits since
   * the completion was generated. Returns null if interpolation
   * fails or conflicts are detected.
   *
   * @param document The current document state
   * @returns Adjusted completion text, or null if interpolation failed
   */
  interpolateCompletion(document: vscode.TextDocument): string | null {
    if (!this.hasActiveCompletion() || this.state.baseOffset === null) {
      return null;
    }

    // Check if completion is still valid for this document
    if (!this.isValidForDocument(document)) {
      return null;
    }

    // Get current cursor position
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document !== document) {
      return null;
    }

    const currentCursorPosition = activeEditor.selection.active;

    // Check for conflicts
    if (this.hasConflict(document, currentCursorPosition)) {
      return null;
    }

    // cursorPosition should not be null here since we have active completion
    if (!this.state.cursorPosition) {
      return null;
    }

    // Calculate offset difference between base and current document
    const offsetDiff = this.calculateOffsetDiff(
      document,
      currentCursorPosition,
    );

    // If offset is 0, no adjustment needed
    if (offsetDiff === 0) {
      return this.state.completion;
    }

    // Adjust completion based on offset
    // If user typed before cursor, we need to shift the completion
    // If user typed at cursor, we need to remove matching prefix
    return this.adjustCompletionByOffset(
      offsetDiff,
      document,
      currentCursorPosition,
    );
  }

  /**
   * Check if user edits conflict with predicted completion
   *
   * Detects conflicts based on Zed's research:
   * 1. User typed different text at cursor position
   * 2. User deleted predicted text
   * 3. User moved cursor away from completion range
   *
   * @param document The current document
   * @param cursorPosition The current cursor position
   * @returns true if conflict detected
   */
  hasConflict(
    document: vscode.TextDocument,
    cursorPosition: vscode.Position,
  ): boolean {
    if (
      !this.state.completion ||
      this.state.baseOffset === null ||
      !this.state.completionRange
    ) {
      return true;
    }

    // Check if cursor moved away from completion range
    if (!this.state.completionRange.contains(cursorPosition)) {
      return true; // User moved cursor away
    }

    // Get text at completion position
    const currentText = document.getText(this.state.completionRange);
    const predictedText = this.state.completion;

    // Check if current text matches start of prediction
    if (!predictedText.startsWith(currentText)) {
      return true; // User typed something different
    }

    return false; // No conflict
  }

  /**
   * Dispose of resources
   *
   * Cleans up document change listeners and resets state.
   */
  dispose(): void {
    this.clearCompletion();
  }

  /**
   * Start tracking document changes for interpolation
   *
   * Sets up a listener for document changes to enable
   * real-time interpolation of completions.
   */
  private startDocumentChangeTracking(): void {
    // Dispose of any existing listener
    this.stopDocumentChangeTracking();

    // Create new document change listener
    this.documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
      () => {
        // We'll handle document changes in the completion provider
        // This listener is just to ensure we dispose properly
      },
    );
  }

  /**
   * Stop tracking document changes
   *
   * Disposes of the document change listener.
   */
  private stopDocumentChangeTracking(): void {
    if (this.documentChangeDisposable) {
      this.documentChangeDisposable.dispose();
      this.documentChangeDisposable = undefined;
    }
  }

  /**
   * Calculate offset difference between base and current document state
   *
   * Compares the current cursor position with the base offset
   * to determine how many characters were added/removed.
   *
   * @param document The current document
   * @param currentCursor The current cursor position
   * @returns Offset difference (positive = inserted, negative = deleted, zero = no change)
   */
  private calculateOffsetDiff(
    document: vscode.TextDocument,
    currentCursor: vscode.Position,
  ): number {
    if (this.state.baseOffset === null) {
      return 0;
    }

    // Find current cursor position offset
    const newCursorOffset = document.offsetAt(currentCursor);

    // Calculate difference
    // Positive: user inserted characters before cursor
    // Negative: user deleted characters before cursor
    // Zero: user didn't change position relative to document start
    return newCursorOffset - this.state.baseOffset;
  }

  /**
   * Adjust completion based on offset difference
   *
   * Handles two scenarios:
   * 1. User typed before cursor: shift completion range
   * 2. User typed at cursor: remove matching prefix from completion
   *
   * @param offsetDiff The offset difference
   * @param document The current document
   * @param cursorPosition The current cursor position
   * @returns Adjusted completion text
   */
  private adjustCompletionByOffset(
    offsetDiff: number,
    document: vscode.TextDocument,
    cursorPosition: vscode.Position,
  ): string | null {
    if (!this.state.completion || this.state.baseOffset === null) {
      return null;
    }

    // Get text inserted since completion was generated
    const currentText = document.getText(
      new vscode.Range(
        document.positionAt(this.state.baseOffset),
        cursorPosition,
      ),
    );

    // Check if current text matches start of completion
    if (this.state.completion.startsWith(currentText)) {
      // User typed part of the completion at cursor
      // Return the remaining part of the completion
      return this.state.completion.substring(currentText.length);
    } else if (offsetDiff > 0) {
      // User typed before cursor, but not part of completion
      // Keep the completion as-is (it will appear after the typed text)
      return this.state.completion;
    } else {
      // User deleted text before cursor
      // Keep the completion as-is (cursor moved backward)
      return this.state.completion;
    }
  }
}
