/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  extends: ["eslint:recommended"],
  rules: {
    // Warn on unused variables but allow underscore-prefixed parameters
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    // Console is intentional in Node.js services (logger is the real guard)
    "no-console": "off",
    // Prefer const
    "prefer-const": "warn",
    // No var
    "no-var": "error",
    // Strict equality
    eqeqeq: ["error", "always", { null: "ignore" }],
  },
  ignorePatterns: ["node_modules/", "coverage/", "dist/"],
};
