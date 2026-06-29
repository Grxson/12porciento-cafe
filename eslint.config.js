import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const shared = [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.mjs', '**/*.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];

const clientConfig = {
  files: ['client/src/**/*.{ts,tsx}'],
  plugins: {
    'react-hooks': reactHooksPlugin,
  },
  languageOptions: {
    globals: { ...globals.browser, ...globals.es2020 },
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
  rules: {
    ...reactHooksPlugin.configs.recommended.rules,
  },
};

const serverConfig = {
  files: ['server/src/**/*.ts'],
  languageOptions: {
    globals: { ...globals.node, ...globals.es2020 },
  },
};

export default tseslint.config(...shared, clientConfig, serverConfig);
