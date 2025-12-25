import typescriptEslint from 'typescript-eslint';
import js from '@eslint/js';

export default [
  // Ignore patterns - must be at the top level in flat config
  {
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
      '*.js',
      '*.mjs',
      '.vscode/**',
    ],
    noWarnIgnored: false,
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...typescriptEslint.configs.recommended,

  // Apply configs to TypeScript files
  {
    files: ['src/**/*.ts'],

    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
    },

    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },

    rules: {
      // TypeScript-specific rules for type safety
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Import naming convention
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // General JavaScript rules
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
      semi: ['error', 'always'],

      // Console rules - only allow console.warn and console.error
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      // Other useful rules
      'no-var': 'error',
      'prefer-const': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-implied-eval': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'object-shorthand': ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
    },
  },

  // Override for test files if needed in the future
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
