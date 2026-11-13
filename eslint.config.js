import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const storageMessage = 'Acesso a armazenamento apenas em src/lib/storage.';
const networkMessage = 'Sem rede em tempo de execução.';

const restrictedGlobals = [
  { name: 'localStorage', message: storageMessage },
  { name: 'sessionStorage', message: storageMessage },
  { name: 'indexedDB', message: storageMessage },
  { name: 'fetch', message: networkMessage },
  { name: 'XMLHttpRequest', message: networkMessage },
  { name: 'WebSocket', message: networkMessage },
  { name: 'EventSource', message: networkMessage },
];

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
  },
  {
    // ESM workers run under Node and use Node globals such as setImmediate.
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', ...restrictedGlobals],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: storageMessage },
        { object: 'window', property: 'fetch', message: networkMessage },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Conteúdo HTML vem do harness sandbox, não do React.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@codemirror/autocomplete',
              message: 'Editor mínimo: sem autocomplete/basicSetup',
            },
            {
              name: 'codemirror',
              message: 'Editor mínimo: sem autocomplete/basicSetup',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/storage/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['src/features/runner/harness.js'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['scripts/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
);
