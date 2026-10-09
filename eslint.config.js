import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    // vue-tsc already checks undefined names in TypeScript and Vue files,
    // except the tests and setup that tsconfig.json excludes (handled below).
    files: ["**/*.{ts,vue}"],
    ignores: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.spec.ts", "src/test-setup.ts"],
    rules: { "no-undef": "off" },
  },
  {
    // Excluded from vue-tsc and only transpiled by Vitest, so nothing else checks names
    // here. Keep no-undef as a warning (not error): it cannot tell DOM *type* names from
    // values, hence the listed type globals, and it flags one real undefined `gain`
    // in useHilbertScopeLiveAudio.test.ts (BJS-481 to fix and promote to "error").
    files: ["src/**/__tests__/**/*.ts", "src/**/*.test.ts", "src/**/*.spec.ts", "src/test-setup.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
        EventListener: "readonly",
        FrameRequestCallback: "readonly",
        IntersectionObserverCallback: "readonly",
        ResizeObserverCallback: "readonly",
        MutationCallback: "readonly",
        AudioContextState: "readonly",
        RecordingState: "readonly",
      },
    },
    rules: { "no-undef": "warn" },
  },
  {
    // Plain JS/MJS (scripts/, audio-lab/) is outside tsconfig, so keep no-undef there.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2021 },
    },
  },
  {
    // AudioWorkletGlobalScope globals.
    files: ["audio-lab/processors.js"],
    languageOptions: { globals: { sampleRate: "readonly", currentFrame: "readonly", currentTime: "readonly" } },
  },
  {
    // Pre-existing violations found when lint first ran in CI (BJS-477). They are
    // warnings so CI can gate on new breakage without a repo-wide cleanup;
    // BJS-481 (design-law lint) decides which of these return to "error".
    rules: {
      "no-unused-vars": "warn",
      "no-useless-escape": "warn",
      "no-empty": "warn",
      "no-constant-condition": "warn",
      "prefer-const": "warn",
      "no-redeclare": "off", // false positive on TypeScript overloads; vue-tsc checks redeclaration
    },
  },
  {
    files: ["**/*.{js,ts,vue}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      vue: vue,
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": "warn", // pre-existing violations; see BJS-481
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-var-requires": "error",

      // Vue rules
      "vue/multi-word-component-names": "off",
      "vue/no-unused-vars": "error",
      "vue/no-unused-components": "error",
      "vue/valid-template-root": "error",
      "vue/no-parsing-error": "error",

      // General rules
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-vars": "off", // Use TypeScript version instead
      "no-var": "error",
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "*.config.js",
      "*.config.ts",
      "vite.config.ts",
      "vitest.config.ts",
      "tailwind.config.js",
      "postcss.config.js",
    ],
  },
];
