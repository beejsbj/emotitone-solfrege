# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Use `PascalCase.vue` for Vue SFCs under `src/components/`, including feature folders such as `src/components/keyboard/KeyboardActionBar.vue`, `src/components/patterns/PatternCard.vue`, and `src/components/ui/IconButton.vue`.
- Use `useX.ts` for composables under `src/composables/`, for example `src/composables/useAppLoading.ts`, `src/composables/useKeyboardControls.ts`, and `src/composables/canvas/useUnifiedCanvas.ts`.
- Use feature-named store files under `src/stores/`; the filename is usually lower camel or domain noun, while the export is `useXStore`, for example `src/stores/music.ts` -> `useMusicStore` and `src/stores/visualConfig.ts` -> `useVisualConfigStore`.
- Use domain noun files for data, services, and utils, for example `src/data/musicData.ts`, `src/services/superdoughAudio.ts`, and `src/utils/deviceDetection.ts`.
- Keep barrel files named `index.ts` where a folder already exposes a public surface, for example `src/components/ui/index.ts`, `src/components/keyboard/index.ts`, `src/composables/index.ts`, and `src/utils/index.ts`.

**Functions:**
- Use `lowerCamelCase` for functions, methods, and store actions, for example `setInstrument`, `initializeAudioContext`, `parseNoteInput`, and `getOptimizationSuggestions`.
- Prefix composables with `use`, and keep the exported function name aligned with the filename, for example `useVisualConfig` in `src/composables/useVisualConfig.ts`.
- Use verb-led names for actions and side-effect helpers: `loadFromStorage`, `saveConfigAs`, `toggleAllVisuals`, `releaseNote`, `enableAudioContext`.

**Variables:**
- Use `lowerCamelCase` for refs, computed values, and locals: `currentInstrumentId`, `overallProgress`, `liveInputMeta`, `pressedKeys`.
- Use boolean prefixes such as `is`, `has`, `can`, and `should`: `isLoading`, `hasSearchQuery`, `canContinueLoadedBase`, `shouldAnimate`.
- Use `UPPER_SNAKE_CASE` for constants and configuration sentinels, for example `DEFAULT_SPLASH_CONFIG`, `SAMPLE_PACKS`, `CATEGORY_ORDER`, and `SAVED_CONFIGS_KEY`.

**Types:**
- Use `PascalCase` for interfaces, type aliases, and exported type contracts: `VisualEffectsConfig`, `LoadingState`, `PatternNote`, `ModeDefinition`.
- Use string-literal unions for domain enums instead of TS enums, for example `MusicalMode`, `ChromaticNote`, and `LoadingPhase` in `src/types/music.ts` and `src/types/loading.ts`.

## Code Style

**Formatting:**
- No formatter config is detected. `.prettierrc*`, `.editorconfig`, and `biome.json` are absent. The repo relies on author discipline plus `eslint.config.js`.
- Preserve the surrounding file style instead of trying to normalize the whole repo in one edit.
- App-facing stores, services, and many SFC scripts commonly use double quotes with semicolons, for example `src/stores/music.ts`, `src/stores/visualConfig.ts`, `src/services/music.ts`, and `src/components/InstrumentSelector.vue`.
- Tests, setup files, and a few runtime modules commonly use single quotes and omit semicolons, for example `src/test-setup.ts`, `src/__tests__/helpers/test-utils.ts`, `src/components/AudioInitializer.vue`, and `src/utils/performanceMonitor.ts`.
- Keep TypeScript annotations explicit on shared APIs and service boundaries. The current codebase uses typed props, return types, and exported interfaces heavily in `src/types/*.ts`, `src/services/music.ts`, and `src/stores/*.ts`.

**Linting:**
- Use the flat ESLint config in `eslint.config.js`.
- Follow the active rules:
1. `@typescript-eslint/no-unused-vars`: `error`
2. `@typescript-eslint/no-explicit-any`: `warn`
3. `@typescript-eslint/prefer-const`: `error`
4. `no-console`: `warn`
5. `no-debugger`: `error`
6. `prefer-const`: `error`
7. `no-var`: `error`
- Vue-specific linting is enabled, but `vue/multi-word-component-names` is explicitly off, so single-word component filenames already present in `src/components/` are acceptable.
- Config files such as `vite.config.ts`, `vitest.config.ts`, `tailwind.config.js`, and `postcss.config.js` are ignored by ESLint according to `eslint.config.js`.

## Import Organization

**Order:**
1. Vue or third-party packages first, for example `vue`, `pinia`, `@tonaljs/tonal`, `gsap`, `lucide-vue-next`.
2. Internal app modules via the `@/` alias next, including stores, services, data, and shared types.
3. Relative imports for sibling SFCs or local helpers last, for example `./TabbedOverlayPanel.vue` in `src/components/InstrumentSelector.vue`.

**Path Aliases:**
- Use `@/*` for everything rooted at `src/`; the alias is defined in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`.
- Keep test imports aligned with runtime imports. Component and store tests usually import the same `@/` path the app uses, for example `src/__tests__/stores/music.test.ts` and `src/__tests__/components/core/App.test.ts`.

## State Management

**Pattern:**
- Use Pinia setup stores with `defineStore("storeId", () => {})` in `src/stores/*.ts`.
- Model mutable store state with `ref` and `reactive`, derive read-only state with `computed`, and synchronize side effects with `watch`.
- Access other stores directly inside the setup closure when cross-store coordination is needed, for example `src/stores/music.ts`, `src/stores/patterns.ts`, and `src/stores/keyboardDrawer.ts`.
- Wrap mutable internals in `readonly(...)` when a composable or store exposes state that callers should observe but not mutate, for example `src/stores/music.ts`, `src/composables/useAnimationLifecycle.ts`, `src/composables/useStrudel.ts`, and `src/composables/useLiveStrudelMirror.ts`.
- Keep singleton UI state in composables when the state is app-global but not a full Pinia domain, for example `globalLoadingState` in `src/composables/useAppLoading.ts` and `globalTooltip` in `src/directives/tooltip.ts`.

**Store Example:**
```ts
export const useVisualConfigStore = defineStore("visualConfig", () => {
  const config = reactive<VisualEffectsConfig>({ ...DEFAULT_CONFIG });
  const visualsEnabled = ref(true);

  watch(
    [config, visualsEnabled],
    () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveToStorage, 500);
    },
    { deep: true }
  );

  return { config, visualsEnabled, updateConfig, resetToDefaults };
});
```

**Component Pattern:**
- Use `<script setup lang="ts">` for Vue components. This is the dominant component authoring style in `src/App.vue`, `src/components/InstrumentSelector.vue`, `src/components/DrawerKeyboard.vue`, `src/components/ConfigPanel.vue`, and `src/components/ui/*.vue`.
- Define props with `defineProps` or `withDefaults(defineProps<Props>(), defaults)` and emits with `defineEmits`, for example `src/components/InstrumentSelector.vue`, `src/components/TabbedOverlayPanel.vue`, `src/components/ui/Tabs.vue`, and `src/components/keyboard/KeyboardKey.vue`.
- Derive most template state through `computed` rather than mutating template-only flags, for example `src/components/InstrumentSelector.vue`, `src/components/FloatingPopup.vue`, and `src/components/keyboard/KeyboardKey.vue`.

## Error Handling

**Patterns:**
- Throw from pure domain services when input is invalid or normalization cannot succeed. `src/services/music.ts` throws on invalid keys and impossible note normalization.
- Catch browser, storage, and async initialization failures near the boundary and log them with `console.error`, then continue with a fallback value or degraded UX. Examples: `src/stores/visualConfig.ts`, `src/stores/instrument.ts`, `src/composables/useAppLoading.ts`, `src/composables/useGSAP.ts`, and `src/services/superdoughAudio.ts`.
- Use `finally` blocks to restore loading flags around async actions, for example `src/stores/instrument.ts` and `src/components/AudioInitializer.vue`.
- Prefer boolean success values or no-op fallbacks over propagating browser-environment errors through the UI. Examples: `importConfig` in `src/stores/visualConfig.ts` and `enableAudioContext` in `src/composables/useAppLoading.ts`.
- Dispatch `CustomEvent`s for cross-cutting browser side effects instead of coupling unrelated modules directly. Current event channels include `note-played`, `note-released`, `keyboard-note-pressed`, `keyboard-note-released`, `app-loading-progress`, and `app-loading-complete`.

## Logging

**Framework:** `console`

**Patterns:**
- Use `console.error` for initialization, persistence, and runtime failures, as in `src/stores/visualConfig.ts`, `src/components/LoadingSplash.vue`, `src/components/AudioInitializer.vue`, and `src/services/superdoughAudio.ts`.
- Use `console.warn`, `console.info`, and `console.debug` sparingly for diagnostics, mostly in MIDI and performance flows such as `src/composables/useMidiControls.ts` and `src/utils/performanceMonitor.ts`.
- Avoid adding new console noise on happy paths. ESLint only warns on `console`, so noisy logs are possible unless edits stay disciplined.

## Comments

**When to Comment:**
- Keep high-value block comments around dense domain logic, initialization flows, and browser workarounds. This style appears in `src/services/superdoughAudio.ts`, `src/composables/useAppLoading.ts`, `src/stores/music.ts`, and `src/composables/useKeyboardControls.ts`.
- Use section comments inside larger stores and services to break up state, getters, actions, and helper blocks.
- Use HTML comments in templates only for major regions, as in `src/App.vue`.

**JSDoc/TSDoc:**
- Use doc comments on exported interfaces and non-obvious functions. `src/types/music.ts`, `src/types/loading.ts`, `src/composables/useGSAP.ts`, and `src/utils/performanceMonitor.ts` are representative.
- Keep comments explanatory, not decorative. The codebase comments are most useful when they explain why a watcher, fallback, or singleton exists.

## Function Design

**Size:** Large feature files are accepted where a domain is tightly coupled, for example `src/stores/music.ts`, `src/stores/patterns.ts`, `src/services/superdoughAudio.ts`, `src/components/ConfigPanel.vue`, and `src/components/InstrumentSelector.vue`.

**Parameters:**
- Prefer typed primitives or small typed objects.
- Use optional callbacks for progress and lifecycle hooks instead of event emitters in service code, for example `initializeInstruments(progressCallback)` in `src/stores/instrument.ts` and `initSuperdoughAudio(progressCallback)` in `src/services/superdoughAudio.ts`.

**Return Values:**
- Return explicit public APIs from composables and stores instead of exposing implementation details implicitly.
- Expose snapshots or readonly wrappers when callers need state access without mutation rights, for example `getConfigSnapshot` in `src/stores/visualConfig.ts` and readonly refs in `src/composables/useStrudel.ts`.

## Module Design

**Exports:**
- Prefer named exports for stores, composables, services, helpers, and types. Examples: `src/stores/music.ts`, `src/composables/useVisualConfig.ts`, `src/services/music.ts`, and `src/utils/index.ts`.
- Use default exports mainly for Vue SFCs and a few standalone utilities like `src/composables/useGSAP.ts`.
- Re-export types for convenience from domain modules when that keeps imports short, for example `src/services/music.ts`, `src/data/index.ts`, and `src/types/index.ts`.

**Barrel Files:**
- Use barrel files where a folder exposes a curated public API: `src/components/ui/index.ts`, `src/components/keyboard/index.ts`, `src/components/knobs/index.ts`, `src/composables/index.ts`, `src/utils/index.ts`, `src/data/index.ts`, and `src/types/index.ts`.
- Do not assume every folder has a barrel. Many feature folders are imported by direct file path instead.

---

*Convention analysis: 2026-03-30*
