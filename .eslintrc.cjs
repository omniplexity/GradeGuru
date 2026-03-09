module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    'out/',
    'release/',
    'node_modules/',
    'build/*.tmp',
  ],
  overrides: [
    {
      files: ['src/main/**/*.js', 'src/backend/**/*.js', 'scripts/**/*.js', '*.cjs'],
      env: {
        node: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      },
    },
    {
      files: ['src/renderer/components/*.js'],
      env: {
        browser: true,
        node: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      },
    },
    {
      files: ['src/renderer/**/*.js'],
      excludedFiles: ['src/renderer/components/*.js'],
      env: {
        browser: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      },
    },
    {
      files: ['tests/**/*.js'],
      env: {
        node: true,
        es2022: true,
        jest: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      },
    },
    {
      files: ['plugins/**/*.js'],
      env: {
        node: true,
        browser: true,
        es2022: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      },
    },
  ],
};
