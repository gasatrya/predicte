import * as assert from 'assert';
import * as vscode from 'vscode';
import { extractContext, shouldTrigger } from '../utils/contextUtils';

suite('ContextUtils Test Suite', () => {
  // Mock document helper
  function createMockDocument(
    content: string,
    languageId: string = 'typescript',
  ): vscode.TextDocument {
    const lines = content.split('\n');
    return {
      languageId,
      lineCount: lines.length,
      fileName: '/test/file.ts',
      getText: () => content,
      lineAt: (line: number) => {
        if (line < 0 || line >= lines.length) {
          throw new Error('Invalid line number');
        }
        return {
          text: lines[line],
          lineNumber: line,
          range: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, lines[line].length),
          ),
          rangeIncludingLineBreak: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, lines[line].length + 1),
          ),
          firstNonWhitespaceCharacterIndex: lines[line].search(/\S|$/),
          isEmptyOrWhitespace: lines[line].trim().length === 0,
        } as vscode.TextLine;
      },
      positionAt: (offset: number) => new vscode.Position(0, offset), // Simplified
      offsetAt: (_position: vscode.Position) => 0, // Simplified
      validateRange: (range: vscode.Range) => range,
      // ... minimal implementation for extractContext
    } as unknown as vscode.TextDocument;
  }

  test('extractContext should split prefix and suffix correctly', () => {
    const code = 'function test() {\n  return true;\n}';
    const doc = createMockDocument(code);
    // Cursor at end of 'return true' (line 1, char 13)
    const pos = new vscode.Position(1, 13);

    const context = extractContext(doc, pos, 50, false); // Disable enhanced mode for simple test

    assert.strictEqual(
      context.prefix.trim(),
      'function test() {\n  return true',
    );
    assert.strictEqual(context.suffix.trim(), ';\n}');
  });

  test('shouldTrigger should return false for empty lines', () => {
    const doc = createMockDocument('\n   \n');
    const pos = new vscode.Position(1, 3);
    assert.strictEqual(shouldTrigger(doc, pos), false);
  });

  test('shouldTrigger should return false inside strings', () => {
    const doc = createMockDocument('const s = "hello world";');
    // Cursor inside "hello world"
    const pos = new vscode.Position(0, 15);
    assert.strictEqual(shouldTrigger(doc, pos), false);
  });

  test('shouldTrigger should return true for normal code', () => {
    const code = 'const x = ';
    const doc = createMockDocument(code);
    const pos = new vscode.Position(0, 10);
    assert.strictEqual(shouldTrigger(doc, pos), true);
  });
});
