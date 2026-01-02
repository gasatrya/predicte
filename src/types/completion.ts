/**
 * Completion-related types for Predicte extension
 */

import type * as vscode from 'vscode';

/**
 * Completion state interface
 *
 * Tracks all necessary information about an active completion
 * to enable edit interpolation and conflict detection.
 */
export interface CompletionState {
  completion: string | null;
  baseDocumentText: string | null;
  cursorPosition: vscode.Position | null;
  completionRange: vscode.Range | null;
  timestamp: number;
  documentUri: string | null;
}

/**
 * Code context interface
 */
export interface CodeContext {
  prefix: string;
  suffix: string;
  language: string;
  cursorLine: number;
  filename?: string;
  imports?: string;
  definitions?: string;
  types?: string;
}

/**
 * Formatted context with system prompt and FIM markers
 */
export interface FormattedCompletionContext {
  systemPrompt: string;
  prefix: string;
  suffix: string;
}
