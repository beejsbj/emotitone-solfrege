# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript `~5.3.0` - Main application logic lives in `src/**/*.ts`, and Vue SFC scripts are typed in files such as `src/App.vue`, `src/components/LoadingSplash.vue`, and `src/components/patterns/LiveStrip.vue`.
- Vue Single-File Components on `vue@^3.4.0` - UI is implemented in `src/**/*.vue`, bootstrapped from `src/main.ts` into `index.html`.

**Secondary:**
- JavaScript ESM - Tooling config lives in `eslint.config.js`, `tailwind.config.js`, and `postcss.config.js`; one runtime utility remains in `src/utils/musicNotationConverter.js`.
- HTML and CSS - The document shell is `index.html`; global styles and font setup are in `src/style.css`; component-scoped styles live alongside Vue components such as `src/components/LoadingSplash.vue`.

## Runtime

**Environment:**
- Browser-first SPA runtime - `index.html` loads `src/main.ts`, and no server entrypoint such as `src/server.*` or API backend was detected.
- Tooling/install runtime - `package.json` pins `bun@1.2.17`; `vercel.json` builds with `bun install && bun run build`.
- Runtime feature assumptions - Full UX expects `AudioContext` via `src/services/superdoughAudio.ts`, optional Web MIDI via `src/composables/useMidiControls.ts`, service worker and Cache Storage via `src/main.ts`, and clipboard access in `src/components/ConfigPanel.vue` plus `src/components/patterns/PatternCard.vue`.

**Package Manager:**
- Bun `1.2.17`
- Lockfile: present in `bun.lock`

## Frameworks

**Core:**
- Vue `^3.4.0` - Application framework bootstrapped in `src/main.ts` and composed through `src/App.vue`.
- Pinia `^2.1.7` - Client-side state management in `src/stores/music.ts`, `src/stores/patterns.ts`, `src/stores/keyboardDrawer.ts`, `src/stores/instrument.ts`, and `src/stores/visualConfig.ts`.
- `pinia-plugin-persistedstate` `^4.4.0` - Store persistence registered in `src/main.ts` and used by `src/stores/music.ts`, `src/stores/patterns.ts`, and `src/stores/keyboardDrawer.ts`.
- Strudel stack `^1.3.0` - Live coding and browser sequencing run through `src/services/superdoughAudio.ts` and `src/components/patterns/LiveStrip.vue` using `@strudel/web`, `@strudel/codemirror`, `@strudel/soundfonts`, and direct `@strudel/*` imports typed in `src/types/strudel.d.ts`.
- `superdough` `^1.3.0` - Browser audio engine wrapped in `src/services/superdoughAudio.ts` and consumed by `src/stores/music.ts` plus `src/stores/instrument.ts`.
- `@tonaljs/tonal` `^4.10.0` - Music theory helpers used in `src/services/music.ts`, `src/services/superdoughAudio.ts`, `src/stores/music.ts`, `src/composables/useMidiControls.ts`, and `src/components/FloatingPopup.vue`.

**Testing:**
- Vitest `^3.2.4` - Test runner configured in `vitest.config.ts` and used across `src/__tests__/`.
- `@vue/test-utils` `^2.4.6` - Vue component testing helpers used in files such as `src/__tests__/components/core/AudioInitializer.test.ts`.
- `happy-dom` `^18.0.1` with `jsdom` `^26.1.0` types - Browser-like test environment configured in `vitest.config.ts` and `src/test-setup.ts`.

**Build/Dev:**
- Vite `^4.5.0` - Dev server and bundler configured in `vite.config.ts`.
- `@vitejs/plugin-vue` `^4.5.0` - Vue compilation plugin in `vite.config.ts` and `vitest.config.ts`.
- `vite-plugin-pwa` `^1.0.2` - PWA manifest and Workbox runtime caching configured in `vite.config.ts`.
- Type checking via `vue-tsc` `^1.8.25` - Build and `type-check` scripts in `package.json`.
- Tailwind CSS `^3.4.1`, PostCSS `^8.4.32`, Autoprefixer `^10.4.16` - Styling pipeline in `tailwind.config.js`, `postcss.config.js`, and `src/style.css`.
- ESLint `^8.57.0` with `@typescript-eslint/*` and `eslint-plugin-vue` - Lint rules in `eslint.config.js`.

## Key Dependencies

**Critical:**
- `superdough@^1.3.0` - Core playback engine in `src/services/superdoughAudio.ts`; patched by `patches/superdough@1.3.0.patch` to add managed live voices (`hasVoice`, `stopVoice`, `releaseVoice`, `releaseAllVoices`) used for sustained note control.
- Strudel packages `@strudel/web@^1.3.0`, `@strudel/codemirror@^1.3.0`, `@strudel/soundfonts@^1.3.0` - Drive sequencing, playback, and editor integration in `src/services/superdoughAudio.ts` and `src/components/patterns/LiveStrip.vue`.
- `@tonaljs/tonal@^4.10.0` - Central pitch/note parsing layer across `src/services/music.ts`, `src/services/superdoughAudio.ts`, and `src/composables/useMidiControls.ts`.
- Pinia `^2.1.7` plus persisted-state plugin `^4.4.0` - Keeps musical state, patterns, keyboard UI state, and persisted preferences synchronized in `src/stores/`.

**Infrastructure:**
- `vite-plugin-pwa@^1.0.2` and `workbox-window@^7.3.0` - Enable installable/offline behavior configured in `vite.config.ts` and registered in `src/main.ts`.
- `gsap@^3.12.5` - Motion and animation helper layer wrapped by `src/composables/useGSAP.ts` and used in components such as `src/components/TooltipRenderer.vue` and `src/components/knobs/Knob.vue`.
- `lucide-vue-next@^0.523.0` - Icon library used in components such as `src/components/ConfigPanel.vue`, `src/components/InstrumentSelector.vue`, and `src/components/keyboard/KeyboardActionBar.vue`.
- `vue-sonner@^2.0.1` - Toast notifications used in `src/composables/useAppLoading.ts`; app shell reference exists in `src/App.vue`.

## Configuration

**Environment:**
- No `.env`, `.env.*`, or `*.env` files were detected in a `find . -maxdepth 2` scan of the repo root.
- No `VITE_*` variables or custom `import.meta.env` configuration were detected. Environment branching is limited to `import.meta.env.DEV` in `src/main.ts`, `src/composables/useGSAP.ts`, `src/composables/useMidiControls.ts`, and `src/components/LoadingSplash.vue`.
- Type shims for packages without bundled types live in `src/types/strudel.d.ts` and `src/types/pwa.d.ts`.

**Build:**
- `package.json` - Scripts for `dev`, `build`, `preview`, `lint`, `type-check`, and Vitest workflows.
- `vite.config.ts` - Vue plugin, PWA manifest, runtime caching, path alias, dev server, and build target.
- `tsconfig.json` - Extends `@vue/tsconfig/tsconfig.dom.json` and defines the `@/*` alias.
- `tailwind.config.js` and `postcss.config.js` - Tailwind scan paths, theme extensions, and PostCSS plugins.
- `eslint.config.js` - Flat-config ESLint setup for TypeScript and Vue.
- `vitest.config.ts` - Vue-aware Vitest config with `happy-dom` and `src/test-setup.ts`.
- `vercel.json` - Hosting build command, `dist` output directory, and SPA rewrite.

## Platform Requirements

**Development:**
- Bun `1.2.17` for installs and scripts, as pinned in `package.json`.
- A modern evergreen browser for `vite` local development on port `5175`, configured in `vite.config.ts`.
- Full feature testing requires browser support for Web Audio (`src/services/superdoughAudio.ts`), Service Worker and Cache Storage (`src/main.ts`), optional Web MIDI (`src/composables/useMidiControls.ts`), Clipboard API (`src/components/ConfigPanel.vue`), and vibration feedback (`src/utils/hapticFeedback.ts`).

**Production:**
- Static SPA deployment to Vercel, defined in `vercel.json`, with built assets emitted to `dist/`.
- Offline/installable behavior depends on the service worker and Workbox manifest generated from `vite.config.ts`.

---

*Stack analysis: 2026-03-30*
