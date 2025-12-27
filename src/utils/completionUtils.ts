/**
 * Completion Utilities
 *
 * This module provides utility functions for completion manipulation,
 * position/offset conversion, and range operations needed for
 * edit interpolation based on Zed's research patterns.
 */

import * as vscode from 'vscode';

/**
 * Calculate offset from line and character position
 *
 * Converts a line/character position to an absolute offset
 * in the document text.
 *
 * @param text The document text
 * @param line The line number (0-based)
 * @param character The character position (0-based)
 * @returns The absolute offset (0-based character index)
 */
export function getOffsetFromPosition(
  text: string,
  line: number,
  character: number,
): number {
  const lines = text.split('\n');
  let offset = 0;

  // Add lengths of all lines before the target line
  for (let i = 0; i < line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }

  // Add character offset within the line
  offset += character;

  return offset;
}

/**
 * Get position from offset
 *
 * Converts an absolute offset in the document text to a
 * line/character position.
 *
 * @param text The document text
 * @param offset The absolute offset (0-based character index)
 * @returns The position object with line and character
 */
export function getPositionFromOffset(
  text: string,
  offset: number,
): vscode.Position {
  let line = 0;
  let character = 0;
  let currentOffset = 0;

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;

    // Check if offset is within this line
    if (currentOffset + lineLength >= offset) {
      line = i;
      character = offset - currentOffset;
      break;
    }

    // Move to next line (+1 for newline)
    currentOffset += lineLength + 1;
  }

  return new vscode.Position(line, character);
}

/**
 * Check if two ranges overlap
 *
 * Determines whether two ranges intersect or touch each other.
 *
 * @param range1 The first range
 * @param range2 The second range
 * @returns true if ranges overlap or touch
 */
export function rangesOverlap(
  range1: vscode.Range,
  range2: vscode.Range,
): boolean {
  return !(
    range1.end.isBefore(range2.start) || range1.start.isAfter(range2.end)
  );
}

/**
 * Adjust range by offset
 *
 * Shifts a range horizontally by a specified character offset.
 * Useful for adjusting completion ranges when user types before cursor.
 *
 * @param range The range to adjust
 * @param offset The offset to apply (positive = right, negative = left)
 * @returns The adjusted range
 */
export function adjustRangeByOffset(
  range: vscode.Range,
  offset: number,
): vscode.Range {
  if (offset === 0) {
    return range;
  }

  const start = new vscode.Position(
    range.start.line,
    range.start.character + offset,
  );
  const end = new vscode.Position(range.end.line, range.end.character + offset);

  return new vscode.Range(start, end);
}

/**
 * Calculate text difference between two strings
 *
 * Compares old and new text to determine what was added or removed.
 * Returns the difference as a simple offset change.
 *
 * @param oldText The old text
 * @param newText The new text
 * @returns The offset difference (positive = inserted, negative = deleted)
 */
export function calculateTextDiff(oldText: string, newText: string): number {
  // Simple implementation: compare lengths
  // More sophisticated implementation could use diff algorithms
  // but for edit interpolation, simple length difference often works
  return newText.length - oldText.length;
}

/**
 * Extract common prefix between two strings
 *
 * Finds the longest common prefix between two strings.
 * Useful for determining how much of a completion the user has already typed.
 *
 * @param str1 First string
 * @param str2 Second string
 * @returns The common prefix
 */
export function getCommonPrefix(str1: string, str2: string): string {
  let commonPrefix = '';
  const minLength = Math.min(str1.length, str2.length);

  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      commonPrefix += str1[i];
    } else {
      break;
    }
  }

  return commonPrefix;
}

/**
 * Check if text matches completion prefix
 *
 * Determines whether user-typed text matches the beginning
 * of a predicted completion.
 *
 * @param typedText The text typed by user
 * @param completion The predicted completion
 * @returns true if typed text matches completion prefix
 */
export function matchesCompletionPrefix(
  typedText: string,
  completion: string,
): boolean {
  return completion.startsWith(typedText);
}

/**
 * Get remaining completion after prefix
 *
 * Returns the part of the completion that hasn't been typed yet.
 *
 * @param typedText The text already typed
 * @param completion The full completion
 * @returns The remaining completion text
 */
export function getRemainingCompletion(
  typedText: string,
  completion: string,
): string {
  if (matchesCompletionPrefix(typedText, completion)) {
    return completion.substring(typedText.length);
  }
  return completion;
}

/**
 * Check if cursor is within completion range
 *
 * Verifies that the cursor position is within the expected
 * range for the active completion.
 *
 * @param cursorPosition The current cursor position
 * @param completionRange The completion range
 * @returns true if cursor is within completion range
 */
export function isCursorInCompletionRange(
  cursorPosition: vscode.Position,
  completionRange: vscode.Range,
): boolean {
  return completionRange.contains(cursorPosition);
}

/**
 * Calculate completion range from position and text
 *
 * Creates a range that represents where the completion would be inserted.
 *
 * @param position The insertion position
 * @param completionText The completion text
 * @returns The completion range
 */
export function getCompletionRange(
  position: vscode.Position,
  completionText: string,
): vscode.Range {
  // Count lines in completion text
  const lines = completionText.split('\n');
  const endLine = position.line + lines.length - 1;
  const endCharacter =
    lines.length === 1
      ? position.character + completionText.length
      : lines[lines.length - 1].length;

  const endPosition = new vscode.Position(endLine, endCharacter);
  return new vscode.Range(position, endPosition);
}
