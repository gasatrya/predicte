module.exports = [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: require('@typescript-eslint/parser'),
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
        ignores: ['dist', 'node_modules', '*.js'],
    },
];
