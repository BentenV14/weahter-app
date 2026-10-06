import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'artifacts/**',
    'public/maplibre/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      hooks.configs.flat.recommended,
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.mjs', 'public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        location: 'readonly',
        document: 'readonly',
        innerWidth: 'readonly',
      },
    },
  },
]);
