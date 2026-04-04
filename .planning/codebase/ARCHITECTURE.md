# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Client-only single-screen Vue 3 application with layered Pinia stores, composition-based interaction modules, and service modules joined by browser `CustomEvent` traffic.

**Key Characteristics:**
- Bootstrap is centralized in `src/main.ts` and `src/App.vue`; there is no router or server-side layer under this repository.
- Durable app state lives in Pinia stores in `src/stores/`, while reusable UI/runtime behavior lives in composables in `src/composables/`.
- Audio, MIDI, Strudel, and theory logic are pushed into service modules under `src/services/`, with static musical/config metadata under `src/data/` and shared contracts under `src/types/`.
- Cross-feature fan-out uses window events such as `note-played`, `note-released`, `app-loading-progress`, and `app-loading-complete` from `src/stores/music.ts`, `src/services/superdoughAudio.ts`, and `src/composables/useAppLoading.ts`.
- Persistence is browser-local: `pinia-plugin-persistedstate` is installed in `src/main.ts`, store persistence is enabled in `src/stores/music.ts`, `src/stores/patterns.ts`, and `src/stores/keyboardDrawer.ts`, and visual config uses manual `localStorage` sync in `src/stores/visualConfig.ts`.

## Layers

**Bootstrap and Shell:**
- Purpose: Start the app, register global plugins, hydrate persisted state, and render the single-screen shell.
- Location: `index.html`, `src/main.ts`, `src/App.vue`
- Contains: Vue app creation, Pinia setup, persisted-state plugin setup, tooltip plugin registration, PWA service worker registration, and root layout composition.
- Depends on: `pinia`, `pinia-plugin-persistedstate`, `virtual:pwa-register`, and root components/composables.
- Used by: Browser entry through `index.html`.

**Presentation Layer:**
- Purpose: Render the learning surface, overlays, selectors, configuration controls, and visual canvas container.
- Location: `src/components/`, especially `src/components/DrawerKeyboard.vue`, `src/components/UnifiedVisualEffects.vue`, `src/components/ConfigPanel.vue`, `src/components/InstrumentSelector.vue`, `src/components/LoadingSplash.vue`, `src/components/patterns/`, `src/components/keyboard/`, and `src/components/ui/`
- Contains: Vue SFCs, feature subdirectories for `keyboard`, `patterns`, `knobs`, and `ui`, plus overlay shells such as `src/components/TopDrawer.vue` and `src/components/TabbedOverlayPanel.vue`.
- Depends on: Pinia stores, composables, service read APIs, and Tailwind/CSS.
- Used by: `src/App.vue` and nested components.

**Interaction Composables:**
- Purpose: Encapsulate reusable browser-facing behavior so components stay thin.
- Location: `src/composables/`, especially `src/composables/useMidiControls.ts`, `src/composables/useSolfegeInteraction.ts`, `src/composables/useKeyboardControls.ts`, `src/composables/useAppLoading.ts`, `src/composables/useVisualConfig.ts`, `src/composables/useLiveStrudelMirror.ts`, and `src/composables/canvas/`
- Contains: MIDI bridge logic, keyboard bindings, loading orchestration, color/config projections, drawer animation, Strudel mirror controller, and canvas renderers.
- Depends on: Stores from `src/stores/`, services from `src/services/`, DOM APIs, and third-party libs such as GSAP and Strudel.
- Used by: Components and, in the case of `src/composables/canvas/useUnifiedCanvas.ts`, `src/components/UnifiedVisualEffects.vue`.

**State Layer:**
- Purpose: Hold user-controlled and session-controlled application state and expose high-level actions.
- Location: `src/stores/music.ts`, `src/stores/patterns.ts`, `src/stores/instrument.ts`, `src/stores/visualConfig.ts`, `src/stores/keyboardDrawer.ts`
- Contains: Current key/mode and active notes, pattern recording and sketch assembly, instrument selection/loading, visual configuration and saved presets, and keyboard drawer/touch/MIDI state.
- Depends on: Vue refs/computed/watch, service modules, static data, localStorage, and the persist plugin.
- Used by: Nearly every component/composable, especially `src/App.vue`, `src/components/keyboard/KeyboardKey.vue`, `src/components/keyboard/KeyboardActionBar.vue`, `src/components/ConfigPanel.vue`, and `src/components/patterns/LiveStrip.vue`.

**Domain and Integration Services:**
- Purpose: Keep domain rules and external runtime integrations outside component code.
- Location: `src/services/music.ts`, `src/services/superdoughAudio.ts`, `src/services/StrudelNotation.ts`, `src/services/roliLiveSync.ts`, `src/services/roliPianoExport.ts`, `src/services/colorGeneration.ts`
- Contains: Music theory singleton/service, audio engine initialization and note playback, Strudel notation conversion, ROLI palette and MIDI message generation, palette export logic, and pure color helpers.
- Depends on: Static metadata in `src/data/`, external libraries such as `@tonaljs/tonal`, `superdough`, `@strudel/web`, and browser Audio/MIDI APIs.
- Used by: Stores and composables, not directly by the browser bootstrap.

**Static Schema and Support Modules:**
- Purpose: Provide immutable reference data and shared contracts that keep runtime code small.
- Location: `src/data/`, `src/types/`, `src/utils/`, `src/directives/tooltip.ts`
- Contains: Notes/scales/modes/pattern defaults, visual config metadata/presets, TypeScript interfaces, utility helpers, and a global tooltip directive/plugin.
- Depends on: Mostly pure TypeScript plus small Vue/browser helpers.
- Used by: Stores, services, composables, and components.

## Data Flow

**Startup and Hydration Flow:**

1. `index.html` exposes the DOM mount node used by `src/main.ts`.
2. `src/main.ts` creates the Vue app, installs Pinia, installs `pinia-plugin-persistedstate`, installs the tooltip plugin from `src/directives/tooltip.ts`, and registers the PWA updater.
3. `src/App.vue` eagerly instantiates `useMusicStore()`, `usePatternsStore()`, `useAppLoading()`, and `useMidiControls()`, so store listeners and MIDI/event listeners are alive before the main UI is shown.
4. `src/components/LoadingSplash.vue` drives `src/composables/useAppLoading.ts`, which initializes visual effects, instrument/sample loading through `src/stores/instrument.ts`, and audio runtime setup through `src/services/superdoughAudio.ts`.
5. When loading is dismissed, `src/App.vue` reveals `src/components/UnifiedVisualEffects.vue`, `src/components/ConfigPanel.vue`, `src/components/InstrumentSelector.vue`, and `src/components/DrawerKeyboard.vue`.

**Manual Note Interaction Flow:**

1. `src/components/keyboard/KeyboardKey.vue` captures touch and mouse interaction and marks touch state in `src/stores/keyboardDrawer.ts`.
2. `src/composables/useSolfegeInteraction.ts` calls `src/stores/music.ts` to attack or release notes for a specific solfege index and octave.
3. `src/stores/music.ts` resolves note identity and frequency through the singleton in `src/services/music.ts` and delegates live audio to `src/services/superdoughAudio.ts`.
4. `src/stores/music.ts` dispatches `note-played` and `note-released` window events with contextual payloads.
5. `src/stores/patterns.ts`, `src/composables/useMidiControls.ts`, `src/components/UnifiedVisualEffects.vue`, and `src/composables/canvas/useStringRenderer.ts` react to the same events, so one action updates logging, external MIDI, and visuals together.

**Pattern Capture and Playback Flow:**

1. `src/stores/patterns.ts` listens to `note-played` and `note-released`, buffers pending notes, and converts completed note events into `loggedNotes`, `dynamicPatterns`, and `currentSketchNotes`.
2. `src/components/patterns/PatternList.vue` and `src/components/patterns/PatternCard.vue` surface default, saved, and dynamic patterns from the same store.
3. `src/components/patterns/LiveStrip.vue` converts `currentSketchNotes` into Strudel code via `src/services/StrudelNotation.ts` and registers a mirror controller through `src/composables/useLiveStrudelMirror.ts`.
4. `src/components/keyboard/KeyboardActionBar.vue` toggles playback by calling `useLiveStrudelMirror().toggle()`.
5. `src/services/superdoughAudio.ts` runs Strudel through a shared audio runtime and emits the same note window events for playback visuals and external sync.

**Visual Rendering Flow:**

1. `src/components/UnifiedVisualEffects.vue` hosts the full-screen canvas and starts `src/composables/canvas/useUnifiedCanvas.ts`.
2. `src/composables/canvas/useUnifiedCanvas.ts` composes specialized renderers from `src/composables/canvas/useBlobRenderer.ts`, `src/composables/canvas/useParticleSystem.ts`, `src/composables/canvas/useStringRenderer.ts`, `src/composables/canvas/useAmbientRenderer.ts`, and `src/composables/canvas/useHilbertScopeRenderer.ts`.
3. Visual configuration comes from `src/composables/useVisualConfig.ts`, which projects sections of `src/stores/visualConfig.ts`.
4. Note events feed blob, particle, and string activity, while animation timing is handled by `src/composables/useAnimationLifecycle.ts`.
5. `src/utils/performanceMonitor.ts` tracks frame metrics inside the animation loop.

**State Management:**
- Use Pinia setup stores in `src/stores/` for shared state and actions.
- Use singleton composables when state is global but not a Pinia store, such as `src/composables/useAppLoading.ts` and `src/composables/useLiveStrudelMirror.ts`.
- Use browser `CustomEvent` dispatch/listen for cross-cutting runtime fan-out instead of direct store-to-store coupling when multiple subsystems need the same note lifecycle signal.
- Use `localStorage` and Pinia persistence for user and session continuity; there is no backend state in this repository.

## Key Abstractions

**Music Theory Singleton:**
- Purpose: Canonical source of current key and mode, scale notes, note naming, and frequency math.
- Examples: `src/services/music.ts`, `src/stores/music.ts`
- Pattern: Singleton service (`musicTheory`) wrapped by a Pinia store so reactive UI state and pure theory operations stay separate.

**Visual Configuration System:**
- Purpose: Centralize all visual-effect tunables and expose them as sectioned config slices.
- Examples: `src/data/visual-config-metadata.ts`, `src/data/visual-config-presets.ts`, `src/stores/visualConfig.ts`, `src/composables/useVisualConfig.ts`, `src/components/ConfigPanel.vue`
- Pattern: Metadata-driven configuration store with composable projections and a UI that renders knobs from config fields.

**Unified Note Event Bus:**
- Purpose: Let audio, visuals, pattern logging, and MIDI sync react to the same note lifecycle without direct imports between every subsystem.
- Examples: `src/stores/music.ts`, `src/services/superdoughAudio.ts`, `src/stores/patterns.ts`, `src/composables/useMidiControls.ts`, `src/components/UnifiedVisualEffects.vue`
- Pattern: `window.dispatchEvent(new CustomEvent(...))` producers plus consumer listeners established in stores, composables, and components.

**Pattern Sketch Model:**
- Purpose: Treat live played notes and loaded base patterns as one editable working sketch.
- Examples: `src/stores/patterns.ts`, `src/components/patterns/LiveStrip.vue`, `src/components/patterns/PatternList.vue`
- Pattern: Store-owned derived state (`currentWorkingNotes`, `currentSketchNotes`, `currentSketchMeta`) with UI and editor layers reading computed projections.

**Unified Canvas Renderer:**
- Purpose: Render multiple reactive visual systems onto one canvas instead of mounting separate canvases per effect.
- Examples: `src/composables/canvas/useUnifiedCanvas.ts`, `src/components/UnifiedVisualEffects.vue`, `src/composables/canvas/useBlobRenderer.ts`, `src/composables/canvas/useStringRenderer.ts`
- Pattern: Coordinator composable plus focused renderer modules and a shared animation lifecycle.

**MIDI Bridge and ROLI Sync:**
- Purpose: Translate external MIDI input, playback mirroring, and ROLI/LUMI palette sync into app actions.
- Examples: `src/composables/useMidiControls.ts`, `src/services/roliLiveSync.ts`, `src/services/roliPianoExport.ts`, `src/components/MidiPermissionIcon.vue`
- Pattern: Composable owns browser MIDI session state; pure service functions build outgoing MIDI payloads.

## Entry Points

**Browser Mount:**
- Location: `index.html`
- Triggers: Browser loads the Vite bundle.
- Responsibilities: Provide the DOM mount node for the Vue app.

**Application Bootstrap:**
- Location: `src/main.ts`
- Triggers: Imported by the Vite entry bundle.
- Responsibilities: Create the app, install Pinia and plugins, clear service workers in dev, register service worker update logic in production, and mount `src/App.vue`.

**Root Application Shell:**
- Location: `src/App.vue`
- Triggers: Mounted by `src/main.ts`.
- Responsibilities: Instantiate global stores and composables, keep loading UI in front until initialization completes, and place the three top-level surfaces: visual canvas, config and instrument overlays, and the drawer keyboard.

**Loading Orchestrator:**
- Location: `src/components/LoadingSplash.vue`
- Triggers: Always rendered by `src/App.vue` while `useAppLoading()` reports visible/loading.
- Responsibilities: Coordinate async initialization phases and gate the transition into the live UI.

**Primary Interaction Surface:**
- Location: `src/components/DrawerKeyboard.vue`
- Triggers: Rendered after loading by `src/App.vue`.
- Responsibilities: Assemble the action bar, live strip and pattern stack, and octave-key grid that drives most user interaction.

**Live Pattern Editor and Player:**
- Location: `src/components/patterns/LiveStrip.vue`
- Triggers: Nested inside `src/components/patterns/LiveCard.vue`.
- Responsibilities: Materialize the current sketch as Strudel notation, host the Strudel mirror and editor instance, and manage playback highlighting and scroll following.

## Error Handling

**Strategy:** Local try/catch with soft failure and fallbacks; the app prefers staying interactive over failing fast.

**Patterns:**
- Initialization code catches and reports failures close to the source in `src/composables/useAppLoading.ts`, `src/stores/instrument.ts`, and `src/services/superdoughAudio.ts`, then continues with degraded behavior when possible.
- Parsing and lookup helpers return `null` or early-return on invalid input in `src/services/music.ts`, `src/composables/useMidiControls.ts`, and `src/services/roliLiveSync.ts` rather than throwing through the UI.
- UI and store cleanup is explicit: event listeners and animation loops are removed in `src/components/UnifiedVisualEffects.vue`, `src/composables/useKeyboardControls.ts`, `src/composables/useKeyboardDrawer.ts`, and `src/composables/canvas/useUnifiedCanvas.ts`.
- User-visible failure messaging is limited but present: `src/composables/useAppLoading.ts` uses `vue-sonner`, and many other modules fall back to `console.error` and `console.debug`.

## Cross-Cutting Concerns

**Logging:** Mostly direct browser logging via `console.error` and `console.debug` in `src/composables/useAppLoading.ts`, `src/stores/visualConfig.ts`, `src/stores/instrument.ts`, `src/services/superdoughAudio.ts`, and `src/composables/useMidiControls.ts`.

**Validation:** Runtime guards live close to the platform and domain boundary in `src/services/music.ts`, `src/composables/useMidiControls.ts`, `src/services/roliLiveSync.ts`, and `src/stores/keyboardDrawer.ts`; static shape validation comes from TypeScript types in `src/types/`.

**Authentication:** Not applicable. The repo is a client-only app with no auth provider. The closest gatekeeping is browser permission flow for Web Audio and Web MIDI in `src/composables/useAppLoading.ts`, `src/components/LoadingSplash.vue`, and `src/composables/useMidiControls.ts`.

---

*Architecture analysis: 2026-03-30*
