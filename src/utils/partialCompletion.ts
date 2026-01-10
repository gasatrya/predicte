/**
 * Partial Completion
 *
 * This module provides utilities for partial completion acceptance,
 * allowing users to accept completions word-by-word or line-by-line.
 * Based on Zed's multi-granularity acceptance pattern.
 */

import * as vscode from 'vscode';

/**
 * Find the next word boundary in completion text
 *
 * Based on Zed's multi-granularity acceptance pattern, finds where
 * the next word ends for partial completion acceptance.
 *
 * @param text The completion text
 * @returns Index of the next word boundary, or -1 if no boundary found
 */
export function findNextWordBoundary(text: string): number {
  if (!text || text.length === 0) {
    return -1;
  }

  // Word boundary patterns (end of current word)
  const wordBoundaryPatterns = [
    /\s/, // Space
    /[.,;:!?]/, // Punctuation
    /[\]})]/, // Closing brackets
    /[\n\r]/, // Newlines
  ];

  // Find the first boundary
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    for (const pattern of wordBoundaryPatterns) {
      if (pattern.test(char)) {
        // Include the boundary character in the acceptance
        return i + 1;
      }
    }
  }

  // If no boundary found, return the full text length
  return text.length;
}

/**
 * Find the next line boundary in completion text
 *
 * Based on Zed's multi-granularity acceptance pattern, finds where
 * the next line ends for partial completion acceptance.
 *
 * @param text The completion text
 * @returns Index of the next line boundary, or -1 if no boundary found
 */
export function findNextLineBoundary(text: string): number {
  if (!text || text.length === 0) {
    return -1;
  }

  // Find the first newline
  const newlineIndex = text.indexOf('\n');
  if (newlineIndex !== -1) {
    // Include the newline character
    return newlineIndex + 1;
  }

  // If no newline found, return the full text length
  return text.length;
}

/**
 * Apply partial completion to document
 *
 * Inserts a portion of the completion text up to the specified boundary.
 *
 * @param editor The text editor
 * @param completionText The full completion text
 * @param boundaryIndex The boundary index (how many characters to insert)
 * @returns The remaining completion text after insertion
 */
export function applyPartialCompletion(
  editor: vscode.TextEditor,
  completionText: string,
  boundaryIndex: number,
): string {
  if (!editor || !completionText || boundaryIndex <= 0) {
    return completionText;
  }

  // Ensure boundary is within bounds
  const safeBoundary = Math.min(boundaryIndex, completionText.length);

  // Get the text to insert
  const textToInsert = completionText.substring(0, safeBoundary);

  // Insert the text at the current cursor position
  editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editBuilder.insert(editor.selection.active, textToInsert);
  });

  // Return the remaining text
  return completionText.substring(safeBoundary);
}
