module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '*.js',
      '*.mjs',
      '**/dist/**',
      '**/dist-test/**',
      '**/build/**',
      '**/main.js',
      '**/version-bump.mjs',
      '**/esbuild.config.mjs'
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-empty-function': 'off'
    }
  }
];
