/**
 * Context Utilities Unit Tests
 *
 * Tests for the contextUtils module that provides utility functions
 * for extracting and managing code context from documents.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  extractContext,
  getLanguagePrompt,
  getExpertRole,
  getSystemPrompt,
  formatContextWithPrompt,
  extractImports,
  extractDefinitions,
  extractTypeDefinitions,
  truncateContext,
  buildEnhancedContext,
  smartTruncate,
  shouldTrigger,
  estimateTokenCount,
  CodeContext,
} from './contextUtils';

// Mock VS Code API
vi.mock('vscode');

const mockVscode = vi.mocked(vscode);

describe('contextUtils', () => {
  let mockDocument: any;
  let mockPosition: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document
    mockDocument = {
      fileName: '/test/path/file.ts',
      languageId: 'typescript',
      lineCount: 100,
      lineAt: vi.fn((line: number) => ({
        text: `Line ${line} content`,
      })),
    };

    // Mock position
    mockPosition = {
      line: 50,
      character: 10,
    };

    // Mock vscode.Position constructor
    mockVscode.Position = vi.fn().mockImplementation((line, character) => ({
      line,
      character,
    })) as any;
  });

  describe('extractContext', () => {
    it('should extract basic context from document', () => {
      mockDocument.lineAt = vi.fn((line: number) => ({
        text: `Line ${line} content`,
      }));

      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context).toBeDefined();
      expect(context.prefix).toBeDefined();
      expect(context.suffix).toBeDefined();
      expect(context.language).toBe('typescript');
      expect(context.cursorLine).toBe(50);
    });

    it('should handle cursor at beginning of line', () => {
      mockPosition.character = 0;
      mockDocument.lineAt = vi.fn((line: number) => ({
        text: `Line ${line} content`,
      }));

      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context.prefix).toBeDefined();
      expect(context.suffix).toContain('Line 50 content');
    });

    it('should handle cursor at end of line', () => {
      mockPosition.character = 15; // After "Line 50 content"
      mockDocument.lineAt = vi.fn((line: number) => ({
        text: `Line ${line} content`,
      }));

      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context.prefix).toContain('Line 50 content');
      expect(context.suffix).toBeDefined();
    });

    it('should handle document with few lines', () => {
      mockDocument.lineCount = 5;
      mockPosition.line = 2;

      const context = extractContext(mockDocument, mockPosition, 50); // Request more lines than available

      expect(context).toBeDefined();
      // Should not throw when requesting more lines than available
    });

    it('should handle cursor at first line', () => {
      mockPosition.line = 0;

      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context).toBeDefined();
      expect(context.cursorLine).toBe(0);
    });

    it('should handle cursor at last line', () => {
      mockPosition.line = 99; // Last line in 100-line document

      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context).toBeDefined();
      expect(context.cursorLine).toBe(99);
    });

    it('should include filename in context', () => {
      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );

      expect(context.filename).toBe('file.ts');
    });

    it('should extract enhanced context when enabled', () => {
      // Mock enhanced context extraction functions
      vi.spyOn(require('./contextUtils'), 'extractImports').mockReturnValue(
        'import x from "y";',
      );
      vi.spyOn(require('./contextUtils'), 'extractDefinitions').mockReturnValue(
        'function test() {}',
      );
      vi.spyOn(
        require('./contextUtils'),
        'extractTypeDefinitions',
      ).mockReturnValue('interface Test {}');

      const context = extractContext(mockDocument, mockPosition, 10, true);

      expect(context.imports).toBeDefined();
      expect(context.definitions).toBeDefined();
      expect(context.types).toBeDefined();
    });

    it('should not extract enhanced context when disabled', () => {
      const context = extractContext(mockDocument, mockPosition, 10, false);

      expect(context.imports).toBeUndefined();
      expect(context.definitions).toBeUndefined();
      expect(context.types).toBeUndefined();
    });

    it('should handle TypeScript/TypeScriptReact language for type extraction', () => {
      mockDocument.languageId = 'typescriptreact';

      vi.spyOn(
        require('./contextUtils'),
        'extractTypeDefinitions',
      ).mockReturnValue('interface Test {}');

      const context = extractContext(mockDocument, mockPosition, 10, true);

      expect(context.types).toBeDefined();
    });

    it('should not extract types for non-TypeScript languages', () => {
      mockDocument.languageId = 'javascript';

      const context = extractContext(mockDocument, mockPosition, 10, true);

      expect(context.types).toBeUndefined();
    });
  });

  describe('string concatenation performance (H-004)', () => {
    it('should handle large documents efficiently', () => {
      const largeDocument = {
        fileName: '/test/path/large.ts',
        languageId: 'typescript',
        lineCount: 10000,
        lineAt: vi.fn((line: number) => ({
          text: `Line ${line} with some content that is not too short`,
        })),
      };

      const largePosition = { line: 5000, character: 20 };

      const start = Date.now();
      const context = extractContext(
        largeDocument as any,
        largePosition as any,
        100,
      );
      const duration = Date.now() - start;

      expect(context).toBeDefined();
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle empty document', () => {
      const emptyDocument = {
        fileName: '/test/path/empty.ts',
        languageId: 'typescript',
        lineCount: 0,
        lineAt: vi.fn(() => {
          throw new Error('Line out of range');
        }),
      };

      const position = { line: 0, character: 0 };

      expect(() =>
        extractContext(emptyDocument as any, position as any, 10),
      ).not.toThrow();
    });

    it('should handle single line document', () => {
      const singleLineDocument = {
        fileName: '/test/path/single.ts',
        languageId: 'typescript',
        lineCount: 1,
        lineAt: vi.fn((_line: number) => ({
          text: 'Single line content',
        })),
      };

      const position = { line: 0, character: 5 };

      const context = extractContext(
        singleLineDocument as any,
        position as any,
        10,
      );

      expect(context).toBeDefined();
      expect(context.prefix).toBe('Single');
      expect(context.suffix).toBe(' line content');
    });
  });

  describe('getLanguagePrompt', () => {
    it('should return language-specific prompt for known languages', () => {
      expect(getLanguagePrompt('javascript')).toBe('// JavaScript code:\n');
      expect(getLanguagePrompt('typescript')).toBe('// TypeScript code:\n');
      expect(getLanguagePrompt('python')).toBe('# Python code:\n');
      expect(getLanguagePrompt('java')).toBe('// Java code:\n');
    });

    it('should return generic prompt for unknown languages', () => {
      expect(getLanguagePrompt('unknownlang')).toBe('// unknownlang code:\n');
    });

    it('should handle empty language ID', () => {
      expect(getLanguagePrompt('')).toBe('//  code:\n');
    });
  });

  describe('getExpertRole', () => {
    it('should return expert role for known languages', () => {
      expect(getExpertRole('javascript')).toBe('JavaScript expert');
      expect(getExpertRole('typescript')).toBe('TypeScript expert');
      expect(getExpertRole('python')).toBe('Python expert');
      expect(getExpertRole('java')).toBe('Java expert');
    });

    it('should handle JavaScript/TypeScript React variants', () => {
      expect(getExpertRole('javascriptreact')).toBe(
        'React and JavaScript expert',
      );
      expect(getExpertRole('typescriptreact')).toBe(
        'React and TypeScript expert',
      );
    });

    it('should return generic expert for unknown languages', () => {
      expect(getExpertRole('unknownlang')).toBe('unknownlang expert');
    });
  });

  describe('getSystemPrompt', () => {
    it('should generate system prompt with language', () => {
      const prompt = getSystemPrompt('typescript');

      expect(prompt).toContain('TypeScript expert');
      expect(prompt).toContain('Language: TypeScript');
      expect(prompt).toContain('Complete the code between');
    });

    it('should include filename when provided', () => {
      const prompt = getSystemPrompt('typescript', 'test.ts');

      expect(prompt).toContain('File: test.ts');
    });

    it('should handle language name formatting', () => {
      const tsPrompt = getSystemPrompt('typescript');
      const tsxPrompt = getSystemPrompt('typescriptreact');
      const jsPrompt = getSystemPrompt('javascript');
      const jsxPrompt = getSystemPrompt('javascriptreact');

      expect(tsPrompt).toContain('TypeScript');
      expect(tsxPrompt).toContain('TypeScript (React)');
      expect(jsPrompt).toContain('JavaScript');
      expect(jsxPrompt).toContain('JavaScript (React)');
    });
  });

  describe('formatContextWithPrompt', () => {
    it('should format context with system prompt when enabled', () => {
      const context: CodeContext = {
        prefix: 'const x = ',
        suffix: ';',
        language: 'typescript',
        cursorLine: 0,
        filename: 'test.ts',
      };

      const formatted = formatContextWithPrompt(context, true);

      expect(formatted.systemPrompt).toBeDefined();
      expect(formatted.systemPrompt).toContain('TypeScript expert');
      expect(formatted.prefix).toBeDefined();
      expect(formatted.suffix).toBe(';');
    });

    it('should not include system prompt when disabled', () => {
      const context: CodeContext = {
        prefix: 'const x = ',
        suffix: ';',
        language: 'typescript',
        cursorLine: 0,
      };

      const formatted = formatContextWithPrompt(context, false);

      expect(formatted.systemPrompt).toBe('');
      expect(formatted.prefix).toBe('const x = ');
    });

    it('should add file metadata to prefix when prompt engineering enabled', () => {
      const context: CodeContext = {
        prefix: 'const x = ',
        suffix: ';',
        language: 'typescript',
        cursorLine: 0,
        filename: 'test.ts',
      };

      const formatted = formatContextWithPrompt(context, true);

      expect(formatted.prefix).toContain('// TypeScript code:');
      expect(formatted.prefix).toContain('// File: test.ts');
    });

    it('should not add file metadata when no filename', () => {
      const context: CodeContext = {
        prefix: 'const x = ',
        suffix: ';',
        language: 'typescript',
        cursorLine: 0,
      };

      const formatted = formatContextWithPrompt(context, true);

      expect(formatted.prefix).toBe('const x = '); // No file metadata added
    });
  });

  describe('extractImports', () => {
    it('should extract import statements', () => {
      const document = {
        lineCount: 10,
        lineAt: vi.fn((line: number) => ({
          text:
            line === 0
              ? 'import React from "react"'
              : line === 1
                ? 'import { useState } from "react"'
                : line === 2
                  ? '' // Empty line
                  : line === 3
                    ? 'const x = 1' // Non-import code
                    : `Line ${line}`,
        })),
      } as any;

      const imports = extractImports(document, 5, 10);

      expect(imports).toContain('import React from "react"');
      expect(imports).toContain('import { useState } from "react"');
      expect(imports).not.toContain('const x = 1');
    });

    it('should stop scanning after non-import code with blank lines', () => {
      const document = {
        lineCount: 10,
        lineAt: vi.fn((line: number) => ({
          text:
            line === 0
              ? 'import React from "react"'
              : line === 1
                ? '' // Blank line
                : line === 2
                  ? '' // Second blank line - should stop here
                  : line === 3
                    ? 'import { useEffect } from "react"' // This should not be included
                    : `Line ${line}`,
        })),
      } as any;

      const imports = extractImports(document, 5, 10);

      expect(imports).toBe('import React from "react"');
      expect(imports).not.toContain('useEffect');
    });

    it('should handle various import patterns', () => {
      const document = {
        lineCount: 10,
        lineAt: vi.fn((line: number) => ({
          text:
            [
              'import React from "react"',
              'const x = require("module")',
              '#include <iostream>',
              'from datetime import datetime',
              'use std::io;',
              'package main',
              'module Example where',
            ][line] || '',
        })),
      } as any;

      const imports = extractImports(document, 0, 10);

      expect(imports).toContain('import React from "react"');
      expect(imports).toContain('const x = require("module")');
      expect(imports).toContain('#include <iostream>');
    });

    it('should handle empty document', () => {
      const document = {
        lineCount: 0,
        lineAt: vi.fn(() => {
          throw new Error('Line out of range');
        }),
      } as any;

      const imports = extractImports(document, 0, 10);

      expect(imports).toBe('');
    });

    it('should limit scanning to maxLines', () => {
      const document = {
        lineCount: 1000,
        lineAt: vi.fn((line: number) => ({
          text: line < 10 ? `import lib${line} from "module"` : `Line ${line}`,
        })),
      } as any;

      const imports = extractImports(document, 0, 5); // Only scan 5 lines

      // Should only get imports from first 5 lines
      const importCount = imports
        .split('\n')
        .filter((line) => line.trim()).length;
      expect(importCount).toBeLessThanOrEqual(5);
    });
  });

  describe('extractDefinitions', () => {
    it('should extract function definitions', () => {
      const document = {
        lineCount: 100,
        languageId: 'typescript',
        lineAt: vi.fn((line: number) => ({
          text:
            line === 45
              ? 'function test() {'
              : line === 55
                ? 'const arrow = () => {'
                : `Line ${line}`,
        })),
      } as any;

      const position = { line: 50, character: 0 } as any;

      // Mock extractFullDefinition to return simple definition
      vi.spyOn(
        require('./contextUtils'),
        'extractFullDefinition',
      ).mockReturnValue('function test() {}');

      const definitions = extractDefinitions(document, position, 50, 100);

      expect(definitions).toBeDefined();
    });

    it('should search around cursor position', () => {
      const document = {
        lineCount: 100,
        languageId: 'typescript',
        lineAt: vi.fn((line: number) => ({
          text: `Line ${line}`,
        })),
      } as any;

      const position = { line: 50, character: 0 } as any;

      extractDefinitions(document, position, 50, 100);

      // Should search lines 0-100 (50 ± 50)
      expect(document.lineAt).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle different languages', () => {
      const pythonDoc = {
        lineCount: 100,
        languageId: 'python',
        lineAt: vi.fn((line: number) => ({
          text: line === 45 ? 'def test():' : `Line ${line}`,
        })),
      } as any;

      const position = { line: 50, character: 0 } as any;

      vi.spyOn(
        require('./contextUtils'),
        'extractFullDefinition',
      ).mockReturnValue('def test():');

      const definitions = extractDefinitions(pythonDoc, position, 50, 100);

      expect(definitions).toBeDefined();
    });
  });

  describe('extractTypeDefinitions', () => {
    it('should extract TypeScript type definitions', () => {
      const document = {
        lineCount: 100,
        languageId: 'typescript',
        lineAt: vi.fn((line: number) => ({
          text:
            line === 45
              ? 'interface Test {'
              : line === 55
                ? 'type User = {'
                : line === 65
                  ? 'enum Status {'
                  : `Line ${line}`,
        })),
      } as any;

      // Mock extractFullDefinition
      vi.spyOn(
        require('./contextUtils'),
        'extractFullDefinition',
      ).mockReturnValue('interface Test {}');

      const types = extractTypeDefinitions(document, 50, 100);

      expect(types).toBeDefined();
    });

    it('should only extract for TypeScript languages', () => {
      const document = {
        lineCount: 100,
        languageId: 'javascript', // Not TypeScript
        lineAt: vi.fn((line: number) => ({
          text: `Line ${line}`,
        })),
      } as any;

      const types = extractTypeDefinitions(document, 50, 100);

      // Should still work but might not find type patterns
      expect(types).toBeDefined();
    });
  });

  describe('truncateContext', () => {
    it('should not truncate short context', () => {
      const shortContext = 'Short context';
      const truncated = truncateContext(shortContext, 100); // 100 tokens = ~400 chars

      expect(truncated).toBe(shortContext);
    });

    it('should truncate long context from beginning', () => {
      const longContext = 'A'.repeat(5000); // 5000 chars
      const truncated = truncateContext(longContext, 1000); // 1000 tokens = ~4000 chars

      expect(truncated.length).toBe(4000);
      expect(truncated).toBe('A'.repeat(4000));
    });

    it('should preserve end of context when truncating', () => {
      const context = 'Beginning ' + 'Middle '.repeat(100) + 'End';
      const truncated = truncateContext(context, 100); // ~400 chars

      expect(truncated).toContain('End');
      expect(truncated.length).toBeLessThanOrEqual(400);
    });

    it('should handle empty string', () => {
      expect(truncateContext('', 100)).toBe('');
    });

    it('should use default maxTokens when not specified', () => {
      const longContext = 'A'.repeat(10000);
      const truncated = truncateContext(longContext); // Default 8000 tokens = ~32000 chars

      expect(truncated.length).toBeLessThanOrEqual(32000);
    });
  });

  describe('buildEnhancedContext', () => {
    it('should build enhanced context with all elements', () => {
      const context: CodeContext = {
        prefix: 'const result = ',
        suffix: ';',
        language: 'typescript',
        cursorLine: 10,
        filename: 'test.ts',
        imports: 'import React from "react"',
        definitions: 'function calculate() {}',
        types: 'interface Props {}',
      };

      const enhanced = buildEnhancedContext(context, 1000);

      expect(enhanced.prefix).toContain('// File: test.ts (typescript)');
      expect(enhanced.prefix).toContain('// Imports:');
      expect(enhanced.prefix).toContain('import React from "react"');
      expect(enhanced.prefix).toContain('// Types:');
      expect(enhanced.prefix).toContain('interface Props {}');
      expect(enhanced.prefix).toContain('// Definitions:');
      expect(enhanced.prefix).toContain('function calculate() {}');
      expect(enhanced.prefix).toContain('const result = ');
      expect(enhanced.suffix).toBe(';');
    });

    it('should handle missing optional elements', () => {
      const context: CodeContext = {
        prefix: 'const x = ',
        suffix: ';',
        language: 'javascript',
        cursorLine: 0,
      };

      const enhanced = buildEnhancedContext(context, 1000);

      expect(enhanced.prefix).not.toContain('// Imports:');
      expect(enhanced.prefix).not.toContain('// Types:');
      expect(enhanced.prefix).not.toContain('// Definitions:');
      expect(enhanced.prefix).toContain('const x = ');
    });

    it('should truncate prefix and suffix to fit maxTokens', () => {
      const context: CodeContext = {
        prefix: 'A'.repeat(1000),
        suffix: 'B'.repeat(1000),
        language: 'typescript',
        cursorLine: 0,
        imports: 'import x from "y"',
      };

      const enhanced = buildEnhancedContext(context, 100); // ~400 chars total

      expect(
        enhanced.prefix.length + enhanced.suffix.length,
      ).toBeLessThanOrEqual(400);
    });

    it('should use smart truncation for prefix and suffix', () => {
      const context: CodeContext = {
        prefix: 'function test() {\n  return ',
        suffix: '\n}',
        language: 'typescript',
        cursorLine: 0,
      };

      const enhanced = buildEnhancedContext(context, 10); // Very small limit

      expect(enhanced.prefix).toBeDefined();
      expect(enhanced.suffix).toBeDefined();
    });
  });

  describe('smartTruncate', () => {
    it('should not truncate short text', () => {
      const text = 'Short text';
      const truncated = smartTruncate(text, 100);

      expect(truncated).toBe(text);
    });

    it('should truncate at natural breaking points', () => {
      const text = 'Line 1;\nLine 2;\nLine 3;\nLine 4;';
      const truncated = smartTruncate(text, 20); // Need to truncate

      // Should try to truncate at a semicolon+newline
      expect(truncated).not.toBe(text);
      expect(truncated.length).toBeLessThanOrEqual(20);
    });

    it('should fall back to simple truncation if no break point found', () => {
      const text = 'A'.repeat(100);
      const truncated = smartTruncate(text, 50);

      expect(truncated.length).toBe(50);
      expect(truncated).toBe('A'.repeat(50));
    });

    it('should handle empty string', () => {
      expect(smartTruncate('', 100)).toBe('');
    });

    it('should handle various break patterns', () => {
      const tests = [
        { text: 'x;\ny', pattern: ';\n' },
        { text: 'x{\ny', pattern: '{\n' },
        { text: 'x}\ny', pattern: '}\n' },
        { text: 'x\n\ny', pattern: '\n\n' },
      ];

      tests.forEach(({ text, pattern: _pattern }) => {
        const longText = 'A'.repeat(100) + text;
        const truncated = smartTruncate(longText, 50);

        // Should truncate after the pattern
        expect(truncated).not.toContain('A'.repeat(100));
      });
    });
  });

  describe('shouldTrigger', () => {
    it('should not trigger on empty lines', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: '   ', // Whitespace only
        })),
      } as any;

      const position = { line: 0, character: 3 } as any;

      expect(shouldTrigger(document, position)).toBe(false);
    });

    it('should trigger on non-empty lines for markup languages', () => {
      const document = {
        languageId: 'html',
        lineAt: vi.fn(() => ({
          text: '<div>',
        })),
      } as any;

      const position = { line: 0, character: 5 } as any;

      expect(shouldTrigger(document, position)).toBe(true);
    });

    it('should not trigger inside strings for non-markup languages', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: 'const x = "inside string"',
        })),
      } as any;

      const position = { line: 0, character: 20 } as any; // Inside quotes

      expect(shouldTrigger(document, position)).toBe(false);
    });

    it('should trigger outside strings', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: 'const x = 1',
        })),
      } as any;

      const position = { line: 0, character: 10 } as any;

      expect(shouldTrigger(document, position)).toBe(true);
    });

    it('should handle escaped quotes in strings', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: 'const x = "quote: \\""',
        })),
      } as any;

      const position = { line: 0, character: 22 } as any; // After escaped quote

      // Should still be inside string
      expect(shouldTrigger(document, position)).toBe(false);
    });

    it('should handle template literals', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: 'const x = `template`',
        })),
      } as any;

      const position = { line: 0, character: 15 } as any; // Inside backticks

      expect(shouldTrigger(document, position)).toBe(false);
    });

    it('should handle mixed quotes', () => {
      const document = {
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: `const x = "double" + 'single'`,
        })),
      } as any;

      const position1 = { line: 0, character: 15 } as any; // Inside double quotes
      const position2 = { line: 0, character: 25 } as any; // Inside single quotes
      const position3 = { line: 0, character: 30 } as any; // Outside quotes

      expect(shouldTrigger(document, position1)).toBe(false);
      expect(shouldTrigger(document, position2)).toBe(false);
      expect(shouldTrigger(document, position3)).toBe(true);
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens based on character count', () => {
      expect(estimateTokenCount('')).toBe(0);
      expect(estimateTokenCount('1234')).toBe(1); // 4 chars = 1 token
      expect(estimateTokenCount('12345678')).toBe(2); // 8 chars = 2 tokens
      expect(estimateTokenCount('123')).toBe(1); // 3 chars = ceil(0.75) = 1 token
    });

    it('should handle various text lengths', () => {
      const tests = [
        { text: '', expected: 0 },
        { text: 'a', expected: 1 },
        { text: 'ab', expected: 1 },
        { text: 'abc', expected: 1 },
        { text: 'abcd', expected: 1 },
        { text: 'abcde', expected: 2 },
        { text: 'a'.repeat(100), expected: 25 }, // 100/4 = 25
      ];

      tests.forEach(({ text, expected }) => {
        expect(estimateTokenCount(text)).toBe(expected);
      });
    });
  });

  describe('regex patterns security (M-045)', () => {
    it('should not hang on malicious regex input', () => {
      const malicious = '('.repeat(1000); // Many open parentheses

      const start = Date.now();

      // This would trigger regex processing in extractDefinitions
      const document = {
        lineCount: 1,
        languageId: 'typescript',
        lineAt: vi.fn(() => ({
          text: malicious,
        })),
      } as any;

      const position = { line: 0, character: 0 } as any;

      // Call a function that uses regex patterns
      expect(() => extractDefinitions(document, position, 0, 10)).not.toThrow();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle regex compilation efficiently', () => {
      const patterns = Array(100)
        .fill(null)
        .map((_, i) => `test${i}`);

      const start = Date.now();

      // Simulate compiling many patterns
      const document = {
        lineCount: 100,
        languageId: 'typescript',
        lineAt: vi.fn((line: number) => ({
          text: patterns[line] || `Line ${line}`,
        })),
      } as any;

      const position = { line: 50, character: 0 } as any;

      extractDefinitions(document, position, 50, 100);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });

  describe('bounds checking (M-044)', () => {
    it('should handle negative line numbers', () => {
      const document = {
        lineCount: 10,
        lineAt: vi.fn((line: number) => {
          if (line < 0 || line >= 10) {
            throw new Error('Line out of range');
          }
          return { text: `Line ${line}` };
        }),
      } as any;

      const position = { line: -1, character: 0 } as any;

      expect(() => extractContext(document, position, 10)).not.toThrow();
    });

    it('should handle positions beyond document length', () => {
      const document = {
        lineCount: 10,
        lineAt: vi.fn((line: number) => {
          if (line < 0 || line >= 10) {
            throw new Error('Line out of range');
          }
          return { text: `Line ${line}` };
        }),
      } as any;

      const position = { line: 20, character: 0 } as any;

      expect(() => extractContext(document, position, 10)).not.toThrow();
    });

    it('should handle zero-length strings', () => {
      const document = {
        lineCount: 1,
        lineAt: vi.fn(() => ({
          text: '',
        })),
      } as any;

      const position = { line: 0, character: 0 } as any;

      const context = extractContext(document, position, 10);

      expect(context.prefix).toBe('');
      expect(context.suffix).toBe('');
    });
  });

  describe('return types (M-041)', () => {
    it('should return correct types for all functions', () => {
      // Test type inference through usage
      const context = extractContext(
        mockDocument as any,
        mockPosition as any,
        10,
      );
      // Type check: should be CodeContext
      expect(context).toHaveProperty('prefix');
      expect(context).toHaveProperty('suffix');
      expect(context).toHaveProperty('language');
      expect(context).toHaveProperty('cursorLine');

      const prompt = getLanguagePrompt('typescript');
      expect(typeof prompt).toBe('string');

      const role = getExpertRole('typescript');
      expect(typeof role).toBe('string');

      const systemPrompt = getSystemPrompt('typescript');
      expect(typeof systemPrompt).toBe('string');

      const formatted = formatContextWithPrompt(context, true);
      expect(formatted).toHaveProperty('systemPrompt');
      expect(formatted).toHaveProperty('prefix');
      expect(formatted).toHaveProperty('suffix');

      const imports = extractImports(mockDocument as any, 0, 10);
      expect(typeof imports).toBe('string');

      const truncated = truncateContext('test', 100);
      expect(typeof truncated).toBe('string');

      const should = shouldTrigger(mockDocument as any, mockPosition as any);
      expect(typeof should).toBe('boolean');

      const tokens = estimateTokenCount('test');
      expect(typeof tokens).toBe('number');
    });
  });
});
