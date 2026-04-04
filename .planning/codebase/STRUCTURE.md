# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```text
[project-root]/
├── .planning/              # Generated planning and codebase mapping artifacts
├── PRPs/                   # Committed product and refactor planning documents
├── plans/                  # Committed implementation notes
├── patches/                # Bun dependency patches referenced by `package.json`
├── public/                 # Static public assets copied by Vite as-is
├── src/                    # Application source
│   ├── __tests__/          # Vitest suites grouped by domain
│   ├── assets/             # Bundled assets such as fonts and SVGs
│   ├── components/         # Vue SFC presentation layer
│   ├── composables/        # Reusable interaction and runtime logic
│   ├── data/               # Static musical data and visual config metadata
│   ├── directives/         # Vue directives and plugin registration
│   ├── services/           # Domain and integration services
│   ├── stores/             # Pinia setup stores
│   ├── types/              # Shared TypeScript contracts
│   └── utils/              # Small pure helpers and browser utilities
├── dist/                   # Generated build output
├── index.html              # Browser entry HTML
├── package.json            # Scripts and dependency manifest
├── vite.config.ts          # Vite build and alias configuration
├── vitest.config.ts        # Test runner configuration
├── tailwind.config.js      # Tailwind theme and scan paths
└── tsconfig.json           # TypeScript app configuration
```

## Directory Purposes

**`src/components/`:**
- Purpose: Hold Vue single-file components for the live application surface.
- Contains: Root-level shells such as `src/components/DrawerKeyboard.vue`, `src/components/UnifiedVisualEffects.vue`, `src/components/ConfigPanel.vue`, `src/components/InstrumentSelector.vue`, plus feature folders `src/components/keyboard/`, `src/components/knobs/`, `src/components/patterns/`, and `src/components/ui/`.
- Key files: `src/components/DrawerKeyboard.vue`, `src/components/LoadingSplash.vue`, `src/components/UnifiedVisualEffects.vue`, `src/components/ConfigPanel.vue`

**`src/components/keyboard/`:**
- Purpose: Keep the playable keyboard surface and its controls together.
- Contains: Individual keys, action bar, settings, and a barrel export.
- Key files: `src/components/keyboard/KeyboardKey.vue`, `src/components/keyboard/KeyboardActionBar.vue`, `src/components/keyboard/KeyboardSettings.vue`, `src/components/keyboard/index.ts`

**`src/components/patterns/`:**
- Purpose: Own the live sketch and saved-pattern UI around Strudel playback.
- Contains: Pattern cards, list drawer, live strip editor, and playback highlighting helpers.
- Key files: `src/components/patterns/LiveStrip.vue`, `src/components/patterns/LiveCard.vue`, `src/components/patterns/PatternList.vue`, `src/components/patterns/strudelPlaybackHighlight.ts`

**`src/components/ui/`:**
- Purpose: Provide small reusable shell components that are not domain-specific.
- Contains: Tabs primitives and icon button wrappers.
- Key files: `src/components/ui/Tabs.vue`, `src/components/ui/IconButton.vue`, `src/components/ui/index.ts`

**`src/composables/`:**
- Purpose: Hold reusable composition functions that glue components to stores, services, and browser APIs.
- Contains: Loading, MIDI, keyboard, tooltip, config, color, and playback composables.
- Key files: `src/composables/useMidiControls.ts`, `src/composables/useAppLoading.ts`, `src/composables/useKeyboardControls.ts`, `src/composables/useLiveStrudelMirror.ts`, `src/composables/useVisualConfig.ts`

**`src/composables/canvas/`:**
- Purpose: Isolate the full-screen visual rendering subsystem.
- Contains: One coordinator composable and focused renderers for blobs, particles, strings, ambient background, and Hilbert scope visuals.
- Key files: `src/composables/canvas/useUnifiedCanvas.ts`, `src/composables/canvas/useBlobRenderer.ts`, `src/composables/canvas/useStringRenderer.ts`, `src/composables/canvas/index.ts`

**`src/stores/`:**
- Purpose: Centralize shared state and high-level actions in Pinia setup stores.
- Contains: Music, patterns, instrument, keyboard drawer, and visual config stores.
- Key files: `src/stores/music.ts`, `src/stores/patterns.ts`, `src/stores/instrument.ts`, `src/stores/keyboardDrawer.ts`, `src/stores/visualConfig.ts`

**`src/services/`:**
- Purpose: Wrap domain logic and external runtime integrations behind plain TypeScript modules.
- Contains: Music theory, audio runtime, Strudel notation, ROLI sync, export helpers, and color generation.
- Key files: `src/services/music.ts`, `src/services/superdoughAudio.ts`, `src/services/StrudelNotation.ts`, `src/services/roliLiveSync.ts`, `src/services/roliPianoExport.ts`

**`src/data/`:**
- Purpose: Store immutable reference data and config metadata that should not live inside stores.
- Contains: Notes, scales, modes, instruments, default patterns, visual config metadata, and presets.
- Key files: `src/data/index.ts`, `src/data/musicData.ts`, `src/data/scales.ts`, `src/data/visual-config-metadata.ts`, `src/data/visual-config-presets.ts`

**`src/types/`:**
- Purpose: Collect shared interfaces and type aliases for music, visuals, canvas, loading, patterns, and platform shims.
- Contains: Domain-specific `.ts` contract files and ambient declarations for PWA and Strudel.
- Key files: `src/types/index.ts`, `src/types/music.ts`, `src/types/visual.ts`, `src/types/patterns.ts`, `src/types/pwa.d.ts`

**`src/utils/`:**
- Purpose: Hold small helpers that are neither store state nor full service modules.
- Contains: Device detection, timing conversion, haptics, performance monitoring, and visual helper functions.
- Key files: `src/utils/hapticFeedback.ts`, `src/utils/duration.ts`, `src/utils/performanceMonitor.ts`, `src/utils/deviceDetection.ts`

**`src/directives/`:**
- Purpose: House Vue directives and directive-backed plugins.
- Contains: Tooltip directive definitions and plugin installation logic.
- Key files: `src/directives/tooltip.ts`

**`src/__tests__/`:**
- Purpose: Keep automated tests inside the app source tree, grouped by the area under test.
- Contains: `components/`, `composables/`, `data/`, `e2e/`, `helpers/`, `integration/`, `services/`, `stores/`, and `utils/`.
- Key files: `src/test-setup.ts`, `src/__tests__/integration/audio-visual-integration-fixed.test.ts`, `src/__tests__/services/superdoughAudio.test.ts`, `src/__tests__/stores/patterns.test.ts`

**`public/`:**
- Purpose: Ship static PWA assets without importing them through the bundle.
- Contains: Icons such as `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`.
- Key files: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`

**`patches/`:**
- Purpose: Store manual dependency patches consumed by Bun.
- Contains: Patch files referenced from `package.json` under `patchedDependencies`.
- Key files: `patches/superdough@1.3.0.patch`

**`plans/` and `PRPs/`:**
- Purpose: Hold committed planning artifacts outside runtime code.
- Contains: Markdown planning documents.
- Key files: `plans/modes-expansion.md`, `PRPs/codebase-refactor.md`

## Key File Locations

**Entry Points:**
- `index.html`: Browser HTML entry and mount node container.
- `src/main.ts`: Vue bootstrap, Pinia/plugin installation, and PWA wiring.
- `src/App.vue`: Root shell that instantiates global stores and top-level UI surfaces.

**Configuration:**
- `package.json`: Scripts, dependencies, Bun package manager declaration, and patched dependency mapping.
- `vite.config.ts`: Vite plugins, `@` alias, dev server settings, and PWA config.
- `tsconfig.json`: TypeScript include/exclude rules and the `@/*` path alias.
- `vitest.config.ts`: Vitest runner setup, `happy-dom`, and test aliasing.
- `eslint.config.js`: ESLint flat config for Vue and TypeScript.
- `tailwind.config.js`: Tailwind scan paths and theme extensions.
- `vercel.json`: Deployment routing and platform configuration.
- `env.d.ts`: Vite and environment typing glue.

**Core Logic:**
- `src/stores/music.ts`: Reactive music state, active note lifecycle, and note event dispatch.
- `src/stores/patterns.ts`: Pattern logging, sketch assembly, persistence, and event listeners.
- `src/composables/useMidiControls.ts`: Web MIDI input, playback mirroring, and ROLI sync wiring.
- `src/composables/canvas/useUnifiedCanvas.ts`: Full-screen visual coordinator.
- `src/services/superdoughAudio.ts`: Audio engine initialization, live note playback, and Strudel output.
- `src/services/music.ts`: Theory calculations and scale-note naming.
- `src/components/patterns/LiveStrip.vue`: Strudel mirror surface for the current sketch.
- `src/components/ConfigPanel.vue`: Metadata-driven visual configuration UI.

**Testing:**
- `src/test-setup.ts`: Shared DOM, audio, and browser mock setup.
- `src/__tests__/helpers/`: Shared test utilities and mocks.
- `src/__tests__/stores/`: Pinia store behavior coverage.
- `src/__tests__/services/`: Pure service and integration-helper coverage.
- `src/__tests__/integration/`: Cross-module interaction tests.
- `src/__tests__/e2e/`: Workflow-style app tests using Vitest rather than a separate browser runner.

## Naming Conventions

**Files:**
- Vue components use `PascalCase.vue`, for example `src/components/LoadingSplash.vue` and `src/components/keyboard/KeyboardKey.vue`.
- Composables use `useX.ts`, for example `src/composables/useMidiControls.ts` and `src/composables/useVisualConfig.ts`.
- Stores use domain nouns in lowercase or lower camelCase, for example `src/stores/music.ts`, `src/stores/patterns.ts`, `src/stores/visualConfig.ts`.
- Data and utility modules use descriptive lowercase, camelCase, or kebab-case names that match nearby files. Follow the local pattern when adding siblings, for example `src/data/visual-config-metadata.ts`, `src/services/superdoughAudio.ts`, `src/services/StrudelNotation.ts`.
- Barrel exports use `index.ts`, for example `src/data/index.ts`, `src/components/ui/index.ts`, `src/composables/canvas/index.ts`.
- Tests use `*.test.ts` in mirrored subdirectories under `src/__tests__/`.

**Directories:**
- Use lowercase feature or domain folders, for example `src/components/keyboard/`, `src/components/patterns/`, `src/components/ui/`, and `src/composables/canvas/`.
- Group tests by area under `src/__tests__/` rather than colocating them beside runtime files.
- Keep static schemas in `src/data/` and shared contracts in `src/types/` instead of embedding large literals inside stores or components.

## Where to Add New Code

**New Feature:**
- Primary code: Put new UI surfaces in `src/components/<feature>/` if the feature has multiple files, or `src/components/` if it is a standalone shell component. Put shared state in `src/stores/` when multiple components need it. Put reusable interaction logic in `src/composables/`. Put browser or third-party integration code in `src/services/`.
- Tests: Mirror the target area inside `src/__tests__/`, for example `src/__tests__/components/<feature>/`, `src/__tests__/stores/`, or `src/__tests__/services/`.

**New Component or Module:**
- Implementation: Add shared primitives to `src/components/ui/`, keyboard-specific UI to `src/components/keyboard/`, pattern and Strudel UI to `src/components/patterns/`, and visual renderers to `src/composables/canvas/`.

**Utilities:**
- Shared helpers: Put pure math, formatting, browser capability checks, or performance helpers in `src/utils/`. Put immutable reference data in `src/data/`. Put type-only additions in `src/types/`.

## Special Directories

**`dist/`:**
- Purpose: Vite production build output.
- Generated: Yes
- Committed: No

**`patches/`:**
- Purpose: Bun patch files applied to installed dependencies.
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static public assets served without bundler imports.
- Generated: No
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Generated architecture, stack, convention, and concern mapping documents.
- Generated: Yes
- Committed: No

**`plans/`:**
- Purpose: Human-authored implementation notes outside runtime code.
- Generated: No
- Committed: Yes

**`PRPs/`:**
- Purpose: Human-authored product and refactor planning references.
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-30*
