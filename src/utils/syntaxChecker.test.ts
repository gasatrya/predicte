/**
 * Syntax Checker Unit Tests
 *
 * Tests for the syntaxChecker module that detects incomplete code syntax
 * for continuation detection across multiple programming languages.
 */

import { describe, it, expect } from 'vitest';
import { isIncompleteCode, getMissingSyntaxSuggestions } from './syntaxChecker';

describe('syntaxChecker', () => {
  describe('isIncompleteCode', () => {
    describe('basic bracket checking', () => {
      it('should detect unclosed curly braces', () => {
        expect(isIncompleteCode('function test() {', 'javascript')).toBe(true);
        expect(isIncompleteCode('function test() {}', 'javascript')).toBe(
          false,
        );
      });

      it('should detect unclosed parentheses', () => {
        expect(isIncompleteCode('console.log(', 'javascript')).toBe(true);
        expect(isIncompleteCode('console.log()', 'javascript')).toBe(false);
      });

      it('should detect unclosed square brackets', () => {
        expect(isIncompleteCode('const arr = [1, 2,', 'javascript')).toBe(true);
        expect(isIncompleteCode('const arr = [1, 2]', 'javascript')).toBe(
          false,
        );
      });

      it('should ignore brackets inside strings', () => {
        expect(isIncompleteCode('const str = "{test}"', 'javascript')).toBe(
          false,
        );
        expect(isIncompleteCode('const str = "{"', 'javascript')).toBe(false);
      });

      it('should handle escaped quotes in strings', () => {
        expect(isIncompleteCode('const str = "\\"{"', 'javascript')).toBe(
          false,
        );
        expect(isIncompleteCode("const str = '\\'{'", 'javascript')).toBe(
          false,
        );
      });
    });

    describe('JavaScript/TypeScript specific checks', () => {
      it('should detect unclosed template literals', () => {
        expect(isIncompleteCode('const str = `hello', 'javascript')).toBe(true);
        expect(isIncompleteCode('const str = `hello`', 'javascript')).toBe(
          false,
        );
      });

      it('should detect incomplete arrow functions', () => {
        expect(isIncompleteCode('const fn = () =>', 'javascript')).toBe(true);
        expect(isIncompleteCode('const fn = () => {}', 'javascript')).toBe(
          false,
        );
      });

      it('should detect incomplete ternary operator', () => {
        expect(isIncompleteCode('const x = y ?', 'javascript')).toBe(true);
        expect(isIncompleteCode('const x = y ? 1 : 2', 'javascript')).toBe(
          false,
        );
      });

      it('should detect dangling operators', () => {
        expect(isIncompleteCode('const x = y +', 'javascript')).toBe(true);
        expect(isIncompleteCode('const x = y + z', 'javascript')).toBe(false);
      });

      it('should detect incomplete object/array literals', () => {
        expect(isIncompleteCode('const obj = {', 'javascript')).toBe(true);
        expect(isIncompleteCode('const arr = [', 'javascript')).toBe(true);
        expect(
          isIncompleteCode('const obj = { key: value,', 'javascript'),
        ).toBe(true);
        expect(
          isIncompleteCode('const obj = { key: value }', 'javascript'),
        ).toBe(false);
      });

      it('should handle TypeScript specific syntax', () => {
        expect(isIncompleteCode('const x: string =', 'typescript')).toBe(true);
        expect(isIncompleteCode('interface Test {', 'typescript')).toBe(true);
      });

      it('should handle JSX/TSX syntax', () => {
        expect(
          isIncompleteCode('const element = <div', 'javascriptreact'),
        ).toBe(true);
        expect(
          isIncompleteCode('const element = <div>', 'typescriptreact'),
        ).toBe(true);
        expect(
          isIncompleteCode('const element = <div></div>', 'javascriptreact'),
        ).toBe(false);
      });
    });

    describe('Python specific checks', () => {
      it('should detect unclosed triple quotes', () => {
        expect(isIncompleteCode('docstring = """hello', 'python')).toBe(true);
        expect(isIncompleteCode('docstring = """hello"""', 'python')).toBe(
          false,
        );
        expect(isIncompleteCode("docstring = '''hello", 'python')).toBe(true);
        expect(isIncompleteCode("docstring = '''hello'''", 'python')).toBe(
          false,
        );
      });

      it('should detect colon without indented block', () => {
        expect(isIncompleteCode('def test():', 'python')).toBe(true);
        expect(isIncompleteCode('if x:', 'python')).toBe(true);
        expect(isIncompleteCode('for i in range(10):', 'python')).toBe(true);
        expect(isIncompleteCode('lambda x: x + 1', 'python')).toBe(false); // Lambda is complete
      });

      it('should detect backslash continuation', () => {
        expect(isIncompleteCode('long_string = "part1" \\', 'python')).toBe(
          true,
        );
      });

      it('should detect incomplete list/dict comprehensions', () => {
        expect(isIncompleteCode('[x for x in', 'python')).toBe(true);
        expect(isIncompleteCode('{x: x for x in', 'python')).toBe(true);
        expect(isIncompleteCode('[x for x in range(10)]', 'python')).toBe(
          false,
        );
      });

      it('should detect dangling operators', () => {
        expect(isIncompleteCode('result = x +', 'python')).toBe(true);
        expect(isIncompleteCode('result = x + y', 'python')).toBe(false);
      });
    });

    describe('C-family language checks (Java, C#, C++)', () => {
      it('should detect incomplete method/function calls', () => {
        expect(isIncompleteCode('method(arg1,', 'java')).toBe(true);
        expect(isIncompleteCode('method(arg1, arg2)', 'java')).toBe(false);
      });

      it('should detect incomplete ternary operator', () => {
        expect(isIncompleteCode('var x = condition ?', 'csharp')).toBe(true);
        expect(
          isIncompleteCode('var x = condition ? value1 : value2', 'csharp'),
        ).toBe(false);
      });

      it('should detect dangling operators', () => {
        expect(isIncompleteCode('int result = x +', 'cpp')).toBe(true);
        expect(isIncompleteCode('int result = x + y', 'cpp')).toBe(false);
      });

      it('should consider statements ending with semicolon as complete', () => {
        expect(isIncompleteCode('int x = 5;', 'cpp')).toBe(false);
        expect(isIncompleteCode('Console.WriteLine("test");', 'csharp')).toBe(
          false,
        );
      });

      it('should detect C# string interpolation', () => {
        expect(isIncompleteCode('var str = $"Hello {name"', 'csharp')).toBe(
          true,
        );
        expect(isIncompleteCode('var str = $"Hello {name}"', 'csharp')).toBe(
          false,
        );
      });
    });

    describe('other languages', () => {
      it('should use basic bracket checking for unknown languages', () => {
        expect(isIncompleteCode('function {', 'unknown')).toBe(true);
        expect(isIncompleteCode('function {}', 'unknown')).toBe(false);
        expect(isIncompleteCode('function (', 'unknown')).toBe(true);
        expect(isIncompleteCode('function ()', 'unknown')).toBe(false);
        expect(isIncompleteCode('function [', 'unknown')).toBe(true);
        expect(isIncompleteCode('function []', 'unknown')).toBe(false);
      });

      it('should handle HTML markup', () => {
        expect(isIncompleteCode('<div', 'html')).toBe(true);
        expect(isIncompleteCode('<div>', 'html')).toBe(true); // Unclosed tag
        expect(isIncompleteCode('<div></div>', 'html')).toBe(false);
      });

      it('should handle CSS rules', () => {
        expect(isIncompleteCode('.class {', 'css')).toBe(true);
        expect(isIncompleteCode('.class {}', 'css')).toBe(false);
      });
    });

    // Test for M-055: Inefficient string iteration with multiple passes
    describe('performance', () => {
      it('should handle large code efficiently', () => {
        const largeCode =
          'function test() {\n' + '  '.repeat(1000) + 'return x;\n}';
        const start = Date.now();
        const result = isIncompleteCode(largeCode, 'javascript');
        const duration = Date.now() - start;

        expect(result).toBe(true); // Missing closing brace
        expect(duration).toBeLessThan(100); // Should complete quickly
      });

      it('should handle deeply nested brackets efficiently', () => {
        const nestedCode = '('.repeat(1000) + 'x' + ')'.repeat(1000);
        const start = Date.now();
        const result = isIncompleteCode(nestedCode, 'javascript');
        const duration = Date.now() - start;

        expect(result).toBe(false); // All brackets are closed
        expect(duration).toBeLessThan(100); // Should complete quickly
      });

      it('should handle very long strings efficiently', () => {
        const longString = 'const x = "' + 'a'.repeat(10000) + '"';
        const start = Date.now();
        const result = isIncompleteCode(longString, 'javascript');
        const duration = Date.now() - start;

        expect(result).toBe(false); // Complete statement
        expect(duration).toBeLessThan(100); // Should complete quickly
      });
    });

    // Test for M-056: Code duplication in bracket checking functions
    describe('bracket checking consistency', () => {
      it('should handle all bracket types consistently', () => {
        const testCases = [
          { code: '{', expected: true },
          { code: '}', expected: false },
          { code: '{}', expected: false },
          { code: '{{}', expected: true },
          { code: '({)}', expected: false }, // Different bracket types
        ];

        testCases.forEach(({ code, expected }) => {
          expect(isIncompleteCode(code, 'javascript')).toBe(expected);
        });
      });

      it('should handle mixed brackets correctly', () => {
        expect(isIncompleteCode('({[', 'javascript')).toBe(true);
        expect(isIncompleteCode('({[]})', 'javascript')).toBe(false);
        expect(isIncompleteCode('({[}])', 'javascript')).toBe(false); // Mismatched but closed
      });
    });

    // Test for L-053: No error handling for edge cases
    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(isIncompleteCode('', 'javascript')).toBe(false);
        expect(isIncompleteCode('', 'python')).toBe(false);
        expect(isIncompleteCode('', 'java')).toBe(false);
      });

      it('should handle whitespace-only strings', () => {
        expect(isIncompleteCode('   \n\t  ', 'javascript')).toBe(false);
      });

      it('should handle very long lines', () => {
        const longLine = 'x'.repeat(10000);
        expect(() => isIncompleteCode(longLine, 'javascript')).not.toThrow();
      });

      it('should handle Unicode characters', () => {
        const unicodeCode = 'const 你好 = "世界"';
        expect(() => isIncompleteCode(unicodeCode, 'javascript')).not.toThrow();
      });

      it('should handle special characters in strings', () => {
        const specialCode = 'const str = "\\n\\t\\r\\b\\f\\\\"';
        expect(isIncompleteCode(specialCode, 'javascript')).toBe(false);
      });

      it('should handle nested strings', () => {
        const nestedString = 'const str = "outer \'inner\' string"';
        expect(isIncompleteCode(nestedString, 'javascript')).toBe(false);
      });
    });

    // Test for M-057: Magic numbers in language-specific checks
    describe('language-specific threshold consistency', () => {
      it('should use consistent patterns across languages', () => {
        // Test that similar patterns are detected across languages
        const danglingOperatorTests = [
          { code: 'x +', language: 'javascript', expected: true },
          { code: 'x +', language: 'python', expected: true },
          { code: 'x +', language: 'java', expected: true },
          { code: 'x +', language: 'csharp', expected: true },
          { code: 'x +', language: 'cpp', expected: true },
          { code: 'x + y', language: 'javascript', expected: false },
          { code: 'x + y', language: 'python', expected: false },
        ];

        danglingOperatorTests.forEach(({ code, language, expected }) => {
          expect(isIncompleteCode(code, language)).toBe(expected);
        });
      });
    });
  });

  describe('getMissingSyntaxSuggestions', () => {
    it('should suggest closing curly brace for unclosed brace', () => {
      const suggestions = getMissingSyntaxSuggestions(
        'function test() {',
        'javascript',
      );
      expect(suggestions).toContain('closing curly brace }');
    });

    it('should suggest closing parenthesis for unclosed paren', () => {
      const suggestions = getMissingSyntaxSuggestions(
        'console.log(',
        'javascript',
      );
      expect(suggestions).toContain('closing parenthesis )');
    });

    it('should suggest closing square bracket for unclosed bracket', () => {
      const suggestions = getMissingSyntaxSuggestions(
        'const arr = [1, 2,',
        'javascript',
      );
      expect(suggestions).toContain('closing square bracket ]');
    });

    it('should suggest multiple missing elements', () => {
      const suggestions = getMissingSyntaxSuggestions(
        'function test({',
        'javascript',
      );
      expect(suggestions).toContain('closing curly brace }');
      expect(suggestions).toContain('closing parenthesis )');
    });

    describe('JavaScript/TypeScript specific suggestions', () => {
      it('should suggest closing backtick for unclosed template literal', () => {
        const suggestions = getMissingSyntaxSuggestions(
          'const str = `hello',
          'javascript',
        );
        expect(suggestions).toContain('closing backtick `');
      });

      it('should suggest function body for incomplete arrow function', () => {
        const suggestions = getMissingSyntaxSuggestions(
          'const fn = () =>',
          'javascript',
        );
        expect(suggestions).toContain('function body');
      });
    });

    describe('Python specific suggestions', () => {
      it('should suggest closing triple quotes', () => {
        const suggestions1 = getMissingSyntaxSuggestions(
          'docstring = """hello',
          'python',
        );
        expect(suggestions1).toContain('closing triple quotes """');

        const suggestions2 = getMissingSyntaxSuggestions(
          "docstring = '''hello",
          'python',
        );
        expect(suggestions2).toContain("closing triple quotes '''");
      });

      it('should suggest indented block for colon', () => {
        const suggestions = getMissingSyntaxSuggestions(
          'def test():',
          'python',
        );
        expect(suggestions).toContain('indented block');
      });
    });

    it('should return empty array for complete code', () => {
      const suggestions = getMissingSyntaxSuggestions(
        'function test() {}',
        'javascript',
      );
      expect(suggestions).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const suggestions = getMissingSyntaxSuggestions('', 'javascript');
      expect(suggestions).toHaveLength(0);
    });

    it('should handle unknown language', () => {
      const suggestions = getMissingSyntaxSuggestions('function {', 'unknown');
      expect(suggestions).toContain('closing curly brace }');
    });

    // Test for L-054: Missing JSDoc for helper functions
    describe('suggestion accuracy', () => {
      it('should provide accurate suggestions for complex cases', () => {
        const complexCode = `function test() {
  const obj = {
    key: "value",
    nested: {
      x: 1,
      y: 2
    }
  `;

        const suggestions = getMissingSyntaxSuggestions(
          complexCode,
          'javascript',
        );
        expect(suggestions).toContain('closing curly brace }');
        // Should have at least one suggestion for the missing braces
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should not suggest elements that are not missing', () => {
        const completeCode = 'function test(x, y) { return x + y; }';
        const suggestions = getMissingSyntaxSuggestions(
          completeCode,
          'javascript',
        );
        expect(suggestions).toHaveLength(0);
      });
    });

    // Test for L-055: Potential performance issues with large files
    describe('performance with large code', () => {
      it('should generate suggestions efficiently for large code', () => {
        const largeCode =
          'function test() {\n' + '  // ' + 'comment '.repeat(1000) + '\n';
        const start = Date.now();
        const suggestions = getMissingSyntaxSuggestions(
          largeCode,
          'javascript',
        );
        const duration = Date.now() - start;

        expect(suggestions).toContain('closing curly brace }');
        expect(duration).toBeLessThan(100); // Should complete quickly
      });

      it('should handle deeply nested structures efficiently', () => {
        let nestedCode = '';
        for (let i = 0; i < 100; i++) {
          nestedCode += '{\n';
        }
        nestedCode += 'x = 1;\n';

        const start = Date.now();
        const suggestions = getMissingSyntaxSuggestions(
          nestedCode,
          'javascript',
        );
        const duration = Date.now() - start;

        expect(suggestions).toContain('closing curly brace }');
        expect(duration).toBeLessThan(100); // Should complete quickly
      });
    });
  });

  // Test for M-054: Missing explicit return types
  describe('type safety', () => {
    it('should return boolean for isIncompleteCode', () => {
      const result = isIncompleteCode('function test() {', 'javascript');
      expect(typeof result).toBe('boolean');
    });

    it('should return string array for getMissingSyntaxSuggestions', () => {
      const result = getMissingSyntaxSuggestions(
        'function test() {',
        'javascript',
      );
      expect(Array.isArray(result)).toBe(true);
      result.forEach((suggestion) => {
        expect(typeof suggestion).toBe('string');
      });
    });
  });
});
