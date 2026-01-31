// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
            },
        },
        rules: {
            /* =====================
               Code Quality
            ===================== */
            'no-console': 'off', // backend needs logs
            'no-debugger': 'error',
            'no-unused-vars': 'off',

            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',

            /* =====================
               Safety & Correctness
            ===================== */
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

            /* =====================
               Style (handled mostly by Prettier)
            ===================== */
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
        },
    },

    {
        ignores: ['node_modules/', 'dist/', 'build/', '*.js', '*.cjs', '*.mjs', 'migrations/'],
    },
];
