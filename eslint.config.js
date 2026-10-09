import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import globals from "globals";
import designLaw from "./lint/eslintPluginDesignLaw.mjs";
import {
  ALLOWLIST,
  IMPORT_BOUNDARY_SCOPE,
  playingZoneGlobs,
  PLAYING_ZONE_IGNORE,
  BRAND_ZONE,
  PURE_SERVICES,
} from "./lint/designZones.mjs";

// Design law (BJS-481). Zones, forbidden imports and allowlists are data in
// lint/designZones.mjs; AGENTS.md explains how to shrink the allowlists.
const STORE_IMPORT_PATTERNS = ["@/stores", "@/stores/**", "**/stores", "**/stores/**"];
const SERVICE_IMPORT_PATTERNS = [
  "@/services/**",
  "**/services/**",
  "@/audio/**", // the worklet engine and its shaping/voice policy
  "**/audio/**",
  // Pure services stay importable; gitignore-style negation re-includes them.
  ...PURE_SERVICES.flatMap((name) => [`!@/services/${name}`, `!**/services/${name}`]),
];

/** Patterns for primitives/compounds, minus the kinds a file is allowlisted for. */
function boundaryRule({ stores, services }) {
  const patterns = [];
  if (stores) {
    patterns.push({
      group: STORE_IMPORT_PATTERNS,
      allowTypeImports: true,
      message:
        "Primitives and compounds are presentational: take props or use a composable, do not import a store (lint/designZones.mjs).",
    });
  }
  if (services) {
    patterns.push({
      group: SERVICE_IMPORT_PATTERNS,
      allowTypeImports: true,
      message:
        "Primitives and compounds may not import production services (audio, playback, persistence, microphone, MIDI). Pure services are listed in lint/designZones.mjs.",
    });
  }
  return patterns.length ? ["error", { patterns }] : "off";
}

const boundaryAllowFiles = (rule) => ALLOWLIST[rule] ?? [];
const boundaryExemptions = new Map(); // file -> { stores, services } still enforced
for (const file of [...boundaryAllowFiles("no-store-imports"), ...boundaryAllowFiles("no-production-service-imports")]) {
  boundaryExemptions.set(file, {
    stores: !boundaryAllowFiles("no-store-imports").includes(file),
    services: !boundaryAllowFiles("no-production-service-imports").includes(file),
  });
}
const boundaryGroups = new Map(); // "stores,services" -> files
for (const [file, enforced] of boundaryExemptions) {
  const key = `${enforced.stores},${enforced.services}`;
  boundaryGroups.set(key, [...(boundaryGroups.get(key) ?? []), file]);
}

const designLawConfigs = [
  {
    // Import boundary: primitives and compounds do not import stores or production services.
    files: IMPORT_BOUNDARY_SCOPE,
    rules: { "@typescript-eslint/no-restricted-imports": boundaryRule({ stores: true, services: true }) },
  },
  ...[...boundaryGroups].map(([key, files]) => {
    const [stores, services] = key.split(",").map((v) => v === "true");
    return { files, rules: { "@typescript-eslint/no-restricted-imports": boundaryRule({ stores, services }) } };
  }),
  {
    // Colour law: brand papers and raw colour literals stay out of the playing zone.
    files: playingZoneGlobs("{vue,ts}"),
    ignores: [...PLAYING_ZONE_IGNORE, ...BRAND_ZONE],
    plugins: { "design-law": designLaw },
    rules: { "design-law/no-brand-colour": "error", "design-law/no-raw-colour": "error" },
  },
  ...["no-brand-colour", "no-raw-colour"]
    .filter((rule) => ALLOWLIST[rule].length)
    .map((rule) => ({ files: ALLOWLIST[rule], rules: { [`design-law/${rule}`]: "off" } })),
];

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
  ...designLawConfigs,
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
