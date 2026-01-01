/**
 * Completion Utilities Unit Tests
 *
 * Tests for the completionUtils module that provides utility functions
 * for completion manipulation, position/offset conversion, and range operations.
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getOffsetFromPosition,
  getPositionFromOffset,
  rangesOverlap,
  adjustRangeByOffset,
  calculateTextDiff,
  getCommonPrefix,
  matchesCompletionPrefix,
  getRemainingCompletion,
  isCursorInCompletionRange,
  getCompletionRange,
} from './completionUtils';

// Mock VS Code API
vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('completionUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock vscode.Position constructor
    mockVscode.Position = vi.fn().mockImplementation((line, character) => ({
      line,
      character,
    })) as any;

    // Mock vscode.Range constructor
    mockVscode.Range = vi.fn().mockImplementation((start, end) => ({
      start,
      end,
      contains: vi.fn((position) => {
        // Simple contains logic for testing
        const startLine = start.line;
        const startChar = start.character;
        const endLine = end.line;
        const endChar = end.character;
        const posLine = position.line;
        const posChar = position.character;

        if (posLine < startLine || posLine > endLine) {
          return false;
        }
        if (posLine === startLine && posChar < startChar) {
          return false;
        }
        if (posLine === endLine && posChar > endChar) {
          return false;
        }
        return true;
      }),
      isBefore: vi.fn((other) => {
        // Simple isBefore logic
        const endLine = (this as any).end.line;
        const endChar = (this as any).end.character;
        const otherStartLine = other.start.line;
        const otherStartChar = other.start.character;

        if (endLine < otherStartLine) {
          return true;
        }
        if (endLine === otherStartLine && endChar < otherStartChar) {
          return true;
        }
        return false;
      }),
      isAfter: vi.fn((other) => {
        // Simple isAfter logic
        const startLine = (this as any).start.line;
        const startChar = (this as any).start.character;
        const otherEndLine = other.end.line;
        const otherEndChar = other.end.character;

        if (startLine > otherEndLine) {
          return true;
        }
        if (startLine === otherEndLine && startChar > otherEndChar) {
          return true;
        }
        return false;
      }),
    })) as any;
  });

  describe('getOffsetFromPosition', () => {
    it('should calculate offset for single line', () => {
      const text = 'Hello World';
      const offset = getOffsetFromPosition(text, 0, 5); // Position at ' ' (space)

      expect(offset).toBe(5);
    });

    it('should calculate offset for multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const offset = getOffsetFromPosition(text, 1, 3); // Position at 'Line 2', character 3 ('n')

      // Line 1 (6 chars) + newline (1) + 3 = 10
      expect(offset).toBe(10);
    });

    it('should handle position at beginning of line', () => {
      const text = 'Line 1\nLine 2';
      const offset = getOffsetFromPosition(text, 1, 0); // Beginning of Line 2

      expect(offset).toBe(7); // Line 1 (6) + newline (1)
    });

    it('should handle position at end of line', () => {
      const text = 'Line 1\nLine 2';
      const offset = getOffsetFromPosition(text, 0, 6); // End of Line 1 (after '1')

      expect(offset).toBe(6);
    });

    it('should handle empty lines', () => {
      const text = 'Line 1\n\nLine 3';
      const offset = getOffsetFromPosition(text, 2, 3); // Line 3, character 3

      // Line 1 (6) + newline (1) + empty line (0) + newline (1) + 3 = 11
      expect(offset).toBe(11);
    });

    it('should handle line beyond text length', () => {
      const text = 'Short';
      const offset = getOffsetFromPosition(text, 10, 0); // Line doesn't exist

      // Should return offset for last line
      expect(offset).toBe(5); // End of text
    });

    it('should handle character beyond line length', () => {
      const text = 'Short';
      const offset = getOffsetFromPosition(text, 0, 10); // Character beyond line

      // Should clamp to line length
      expect(offset).toBe(5); // End of line
    });

    it('should handle empty string', () => {
      const offset = getOffsetFromPosition('', 0, 0);

      expect(offset).toBe(0);
    });

    it('should handle negative line number', () => {
      const text = 'Test';
      const offset = getOffsetFromPosition(text, -1, 0);

      // Should handle gracefully
      expect(offset).toBe(0);
    });

    it('should handle negative character position', () => {
      const text = 'Test';
      const offset = getOffsetFromPosition(text, 0, -1);

      // Should handle gracefully
      expect(offset).toBe(0);
    });
  });

  describe('getPositionFromOffset', () => {
    it('should calculate position for offset in single line', () => {
      const text = 'Hello World';
      const position = getPositionFromOffset(text, 5); // Offset at ' ' (space)

      expect(position.line).toBe(0);
      expect(position.character).toBe(5);
    });

    it('should calculate position for offset in multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const position = getPositionFromOffset(text, 10); // Offset at 'Line 2', character 3 ('n')

      expect(position.line).toBe(1);
      expect(position.character).toBe(3);
    });

    it('should handle offset at newline character', () => {
      const text = 'Line 1\nLine 2';
      const position = getPositionFromOffset(text, 6); // Offset at newline

      // Newline is considered part of Line 1
      expect(position.line).toBe(0);
      expect(position.character).toBe(6); // Position after '1'
    });

    it('should handle offset at beginning of text', () => {
      const text = 'Hello World';
      const position = getPositionFromOffset(text, 0);

      expect(position.line).toBe(0);
      expect(position.character).toBe(0);
    });

    it('should handle offset at end of text', () => {
      const text = 'Hello World';
      const position = getPositionFromOffset(text, 11); // End of text

      expect(position.line).toBe(0);
      expect(position.character).toBe(11);
    });

    it('should handle offset beyond text length', () => {
      const text = 'Short';
      const position = getPositionFromOffset(text, 100);

      // Should return position at end of text
      expect(position.line).toBe(0);
      expect(position.character).toBe(5);
    });

    it('should handle negative offset', () => {
      const text = 'Test';
      const position = getPositionFromOffset(text, -1);

      // Should handle gracefully
      expect(position.line).toBe(0);
      expect(position.character).toBe(0);
    });

    it('should handle empty string', () => {
      const position = getPositionFromOffset('', 0);

      expect(position.line).toBe(0);
      expect(position.character).toBe(0);
    });

    it('should handle text with empty lines', () => {
      const text = 'Line 1\n\nLine 3';
      const position = getPositionFromOffset(text, 7); // Offset in empty line

      expect(position.line).toBe(1);
      expect(position.character).toBe(0);
    });

    it('should handle very large offset efficiently', () => {
      const text = 'A'.repeat(100000) + '\n' + 'B'.repeat(100000);
      const start = Date.now();

      const position = getPositionFromOffset(text, 150000);
      const duration = Date.now() - start;

      expect(position).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('rangesOverlap', () => {
    it('should detect overlapping ranges', () => {
      const range1 = new vscode.Range(0, 0, 0, 10);
      const range2 = new vscode.Range(0, 5, 0, 15);

      expect(rangesOverlap(range1, range2)).toBe(true);
    });

    it('should detect touching ranges', () => {
      const range1 = new vscode.Range(0, 0, 0, 10);
      const range2 = new vscode.Range(0, 10, 0, 20);

      expect(rangesOverlap(range1, range2)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const range1 = new vscode.Range(0, 0, 0, 5);
      const range2 = new vscode.Range(0, 10, 0, 15);

      expect(rangesOverlap(range1, range2)).toBe(false);
    });

    it('should handle ranges on different lines', () => {
      const range1 = new vscode.Range(0, 0, 0, 10);
      const range2 = new vscode.Range(1, 0, 1, 10);

      expect(rangesOverlap(range1, range2)).toBe(false);
    });

    it('should handle range completely containing another', () => {
      const range1 = new vscode.Range(0, 0, 0, 20);
      const range2 = new vscode.Range(0, 5, 0, 15);

      expect(rangesOverlap(range1, range2)).toBe(true);
    });

    it('should handle range completely inside another', () => {
      const range1 = new vscode.Range(0, 5, 0, 15);
      const range2 = new vscode.Range(0, 0, 0, 20);

      expect(rangesOverlap(range1, range2)).toBe(true);
    });

    it('should handle empty ranges', () => {
      const range1 = new vscode.Range(0, 0, 0, 0);
      const range2 = new vscode.Range(0, 0, 0, 10);

      expect(rangesOverlap(range1, range2)).toBe(true);
    });

    it('should be commutative', () => {
      const range1 = new vscode.Range(0, 0, 0, 10);
      const range2 = new vscode.Range(0, 5, 0, 15);

      expect(rangesOverlap(range1, range2)).toBe(rangesOverlap(range2, range1));
    });
  });

  describe('adjustRangeByOffset', () => {
    it('should shift range right by positive offset', () => {
      const range = new vscode.Range(0, 5, 0, 15);
      const adjusted = adjustRangeByOffset(range, 3);

      expect(adjusted.start.character).toBe(8);
      expect(adjusted.end.character).toBe(18);
    });

    it('should shift range left by negative offset', () => {
      const range = new vscode.Range(0, 5, 0, 15);
      const adjusted = adjustRangeByOffset(range, -2);

      expect(adjusted.start.character).toBe(3);
      expect(adjusted.end.character).toBe(13);
    });

    it('should not change line numbers', () => {
      const range = new vscode.Range(1, 5, 2, 15);
      const adjusted = adjustRangeByOffset(range, 3);

      expect(adjusted.start.line).toBe(1);
      expect(adjusted.end.line).toBe(2);
    });

    it('should handle zero offset', () => {
      const range = new vscode.Range(0, 5, 0, 15);
      const adjusted = adjustRangeByOffset(range, 0);

      expect(adjusted).toBe(range); // Should return same range
    });

    it('should handle multi-line range', () => {
      const range = new vscode.Range(0, 5, 2, 15);
      const adjusted = adjustRangeByOffset(range, 3);

      expect(adjusted.start.character).toBe(8);
      expect(adjusted.end.character).toBe(18);
    });

    it('should handle negative character positions (clamp to 0)', () => {
      const range = new vscode.Range(0, 2, 0, 5);
      const adjusted = adjustRangeByOffset(range, -5); // Would make start.character negative

      expect(adjusted.start.character).toBe(0); // Should clamp to 0
      expect(adjusted.end.character).toBe(0); // End would also be 0 (5-5=0)
    });
  });

  describe('calculateTextDiff', () => {
    it('should return 0 for identical strings', () => {
      expect(calculateTextDiff('test', 'test')).toBe(0);
    });

    it('should return positive for longer new text', () => {
      expect(calculateTextDiff('test', 'testing')).toBe(3); // +3 characters
    });

    it('should return negative for shorter new text', () => {
      expect(calculateTextDiff('testing', 'test')).toBe(-3); // -3 characters
    });

    it('should handle empty old text', () => {
      expect(calculateTextDiff('', 'test')).toBe(4);
    });

    it('should handle empty new text', () => {
      expect(calculateTextDiff('test', '')).toBe(-4);
    });

    it('should handle both empty', () => {
      expect(calculateTextDiff('', '')).toBe(0);
    });

    it('should handle unicode characters', () => {
      expect(calculateTextDiff('café', 'cafe')).toBe(-1); // é is 2 bytes, e is 1 byte
    });

    it('should be efficient for long strings', () => {
      const long1 = 'A'.repeat(100000);
      const long2 = 'A'.repeat(100001);

      const start = Date.now();
      const diff = calculateTextDiff(long1, long2);
      const duration = Date.now() - start;

      expect(diff).toBe(1);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('getCommonPrefix', () => {
    it('should find common prefix', () => {
      expect(getCommonPrefix('testing', 'test')).toBe('test');
    });

    it('should return empty string for no common prefix', () => {
      expect(getCommonPrefix('apple', 'banana')).toBe('');
    });

    it('should handle identical strings', () => {
      expect(getCommonPrefix('test', 'test')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(getCommonPrefix('', 'test')).toBe('');
      expect(getCommonPrefix('test', '')).toBe('');
      expect(getCommonPrefix('', '')).toBe('');
    });

    it('should handle case sensitivity', () => {
      expect(getCommonPrefix('Test', 'test')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(getCommonPrefix('  test', '  testing')).toBe('  test');
    });

    it('should handle unicode characters', () => {
      expect(getCommonPrefix('café', 'cafeteria')).toBe('caf');
    });
  });

  describe('matchesCompletionPrefix', () => {
    it('should match when typed text is prefix of completion', () => {
      expect(matchesCompletionPrefix('func', 'function')).toBe(true);
    });

    it('should not match when typed text is not prefix', () => {
      expect(matchesCompletionPrefix('unction', 'function')).toBe(false);
    });

    it('should match empty typed text', () => {
      expect(matchesCompletionPrefix('', 'function')).toBe(true);
    });

    it('should not match when completion is empty', () => {
      expect(matchesCompletionPrefix('func', '')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(matchesCompletionPrefix('Func', 'function')).toBe(false);
    });

    it('should handle exact match', () => {
      expect(matchesCompletionPrefix('function', 'function')).toBe(true);
    });

    it('should handle whitespace in typed text', () => {
      expect(matchesCompletionPrefix('  func', '  function')).toBe(true);
    });
  });

  describe('getRemainingCompletion', () => {
    it('should return remaining text when typed matches prefix', () => {
      expect(getRemainingCompletion('func', 'function')).toBe('tion');
    });

    it('should return full completion when typed is empty', () => {
      expect(getRemainingCompletion('', 'function')).toBe('function');
    });

    it('should return full completion when typed does not match', () => {
      expect(getRemainingCompletion('xyz', 'function')).toBe('function');
    });

    it('should return empty string when typed equals completion', () => {
      expect(getRemainingCompletion('function', 'function')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(getRemainingCompletion('  func', '  function')).toBe('tion');
    });

    it('should handle unicode characters', () => {
      expect(getRemainingCompletion('caf', 'café')).toBe('é');
    });
  });

  describe('isCursorInCompletionRange', () => {
    it('should return true when cursor is within range', () => {
      const cursorPosition = new vscode.Position(0, 5);
      const completionRange = new vscode.Range(0, 0, 0, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        true,
      );
    });

    it('should return false when cursor is before range', () => {
      const cursorPosition = new vscode.Position(0, 0);
      const completionRange = new vscode.Range(0, 5, 0, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        false,
      );
    });

    it('should return false when cursor is after range', () => {
      const cursorPosition = new vscode.Position(0, 15);
      const completionRange = new vscode.Range(0, 5, 0, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        false,
      );
    });

    it('should return true when cursor is at range start', () => {
      const cursorPosition = new vscode.Position(0, 5);
      const completionRange = new vscode.Range(0, 5, 0, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        true,
      );
    });

    it('should return true when cursor is at range end', () => {
      const cursorPosition = new vscode.Position(0, 10);
      const completionRange = new vscode.Range(0, 5, 0, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        true,
      );
    });

    it('should handle multi-line ranges', () => {
      const cursorPosition = new vscode.Position(1, 5);
      const completionRange = new vscode.Range(0, 0, 2, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        true,
      );
    });

    it('should handle cursor on different line', () => {
      const cursorPosition = new vscode.Position(3, 5);
      const completionRange = new vscode.Range(0, 0, 2, 10);

      expect(isCursorInCompletionRange(cursorPosition, completionRange)).toBe(
        false,
      );
    });
  });

  describe('getCompletionRange', () => {
    it('should create range for single-line completion', () => {
      const position = new vscode.Position(0, 5);
      const completionText = 'function()';
      const range = getCompletionRange(position, completionText);

      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(5);
      expect(range.end.line).toBe(0);
      expect(range.end.character).toBe(15); // 5 + 10
    });

    it('should create range for multi-line completion', () => {
      const position = new vscode.Position(0, 5);
      const completionText = 'function() {\n  return true;\n}';
      const range = getCompletionRange(position, completionText);

      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(5);
      expect(range.end.line).toBe(2); // 3 lines total (0, 1, 2)
      expect(range.end.character).toBe(1); // Length of '}'
    });

    it('should handle empty completion', () => {
      const position = new vscode.Position(0, 5);
      const completionText = '';
      const range = getCompletionRange(position, completionText);

      expect(range.start.line).toBe(0);
      expect(range.start.character).toBe(5);
      expect(range.end.line).toBe(0);
      expect(range.end.character).toBe(5); // Same as start
    });

    it('should handle completion with trailing newline', () => {
      const position = new vscode.Position(0, 5);
      const completionText = 'test\n';
      const range = getCompletionRange(position, completionText);

      expect(range.end.line).toBe(1);
      expect(range.end.character).toBe(0); // Empty line after newline
    });

    it('should handle completion starting with newline', () => {
      const position = new vscode.Position(0, 5);
      const completionText = '\ntest';
      const range = getCompletionRange(position, completionText);

      expect(range.end.line).toBe(1);
      expect(range.end.character).toBe(4); // Length of 'test'
    });

    it('should handle position at line start', () => {
      const position = new vscode.Position(0, 0);
      const completionText = 'function()';
      const range = getCompletionRange(position, completionText);

      expect(range.start.character).toBe(0);
      expect(range.end.character).toBe(10);
    });

    it('should be efficient for long completions', () => {
      const position = new vscode.Position(0, 0);
      const completionText = 'A'.repeat(100000) + '\n' + 'B'.repeat(100000);

      const start = Date.now();
      const range = getCompletionRange(position, completionText);
      const duration = Date.now() - start;

      expect(range).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('error handling (M-048)', () => {
    describe('getPositionFromOffset error cases', () => {
      it('should handle negative offset gracefully', () => {
        expect(() => getPositionFromOffset('test', -1)).not.toThrow();
      });

      it('should handle offset beyond string length gracefully', () => {
        expect(() => getPositionFromOffset('test', 100)).not.toThrow();
      });

      it('should handle empty string with any offset', () => {
        expect(() => getPositionFromOffset('', 0)).not.toThrow();
        expect(() => getPositionFromOffset('', 10)).not.toThrow();
      });

      it('should handle null or undefined text', () => {
        // TypeScript would catch these, but runtime should handle gracefully
        expect(() => getPositionFromOffset(null as any, 0)).toThrow();
        expect(() => getPositionFromOffset(undefined as any, 0)).toThrow();
      });
    });

    describe('calculateTextDiff logic (M-047)', () => {
      it('should return 0 for identical strings', () => {
        expect(calculateTextDiff('test', 'test')).toBe(0);
      });

      it('should detect additions correctly', () => {
        const diff = calculateTextDiff('test', 'testing');
        expect(diff).toBeGreaterThan(0);
        expect(diff).toBe(3);
      });

      it('should detect deletions correctly', () => {
        const diff = calculateTextDiff('testing', 'test');
        expect(diff).toBeLessThan(0);
        expect(diff).toBe(-3);
      });

      it('should handle complete replacement', () => {
        const diff = calculateTextDiff('apple', 'banana');
        expect(diff).toBe(1); // banana (6) - apple (5) = 1
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings efficiently', () => {
      const long = 'x'.repeat(100000);
      const start = Date.now();

      const position = getPositionFromOffset(long, 50000);
      const duration = Date.now() - start;

      expect(position).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle special characters', () => {
      const special = '!@#$%^&*(){}[]|\\:";\'<>?,./';
      const offset = getOffsetFromPosition(special, 0, 10);
      const position = getPositionFromOffset(special, 10);

      expect(offset).toBe(10);
      expect(position.character).toBe(10);
    });

    it('should handle unicode characters correctly', () => {
      const unicode = 'Hello 世界 🌍';
      // '世' is at position 6, but takes multiple bytes
      const offset = getOffsetFromPosition(unicode, 0, 6);
      const position = getPositionFromOffset(unicode, offset);

      expect(position.character).toBe(6);
    });

    it('should handle mixed line endings', () => {
      const text = 'Line 1\r\nLine 2\nLine 3\rLine 4';
      const offset = getOffsetFromPosition(text, 2, 3); // Line 3, character 3

      // Line 1 (6) + \r\n (2) + Line 2 (6) + \n (1) + 3 = 18
      expect(offset).toBe(18);

      const position = getPositionFromOffset(text, 18);
      expect(position.line).toBe(2);
      expect(position.character).toBe(3);
    });

    it('should handle tabs and other whitespace', () => {
      const text = '\tIndented\n    Spaces';
      const offset = getOffsetFromPosition(text, 1, 4); // After 'Spac'

      // \tIndented (9) + \n (1) + 4 = 14
      expect(offset).toBe(14);
    });
  });
});
