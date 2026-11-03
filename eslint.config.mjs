import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "src-tauri/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __VERSI_APP__: "readonly",
        __TANGGAL_BUILD__: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      "no-undef": "error",

      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
