# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Audio sample delivery:**
- GitHub raw content (`raw.githubusercontent.com`) - Sample-pack JSON and referenced audio assets are loaded from `https://raw.githubusercontent.com/felixroos/dough-samples/main/` inside `src/services/superdoughAudio.ts`.
  - SDK/Client: `superdough` sample loading via `samples()` and buffer prewarming in `src/services/superdoughAudio.ts`
  - Auth: None detected
- Strudel soundfont delivery - `registerSoundfonts()` is invoked during audio bootstrap in `src/services/superdoughAudio.ts`; this is dependency-managed remote asset loading rather than a repo-defined HTTP client.
  - SDK/Client: `@strudel/soundfonts` with playback orchestration through `@strudel/web` in `src/services/superdoughAudio.ts`
  - Auth: None detected

**Remote font delivery:**
- Google Fonts - The loading screen imports the Bebas Neue font from `https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap` in `src/components/LoadingSplash.vue`.
  - SDK/Client: CSS `@import` in `src/components/LoadingSplash.vue`
  - Auth: None

**Hardware and browser capability integrations:**
- Web MIDI devices, including ROLI/LUMI keyboards - Browser MIDI access is requested in `src/composables/useMidiControls.ts`, with device-specific sync helpers in `src/services/roliLiveSync.ts` and script generation in `src/services/roliPianoExport.ts`.
  - SDK/Client: Native `navigator.requestMIDIAccess()` plus app helpers in `src/composables/useMidiControls.ts`, `src/services/roliLiveSync.ts`, and `src/services/roliPianoExport.ts`
  - Auth: Browser permission prompt, not an application auth flow
- PWA service worker registration - The app registers a generated service worker in `src/main.ts` using Vite’s virtual module and Workbox config from `vite.config.ts`.
  - SDK/Client: `virtual:pwa-register` from `src/main.ts`
  - Auth: None

## Data Storage

**Databases:**
- Not detected. No server database client, ORM, or hosted database integration was found in `package.json` or `src/`.
  - Connection: Not applicable
  - Client: Not applicable

**File Storage:**
- Local filesystem and compiled static assets only - App icons and manifest assets live in `public/`, while source assets such as `src/assets/fonts/lets-jazz-regular.woff2` live under `src/assets/`.
- Client-generated files are downloaded locally, not uploaded remotely; see Blob-based export in `src/components/ConfigPanel.vue`.

**Caching:**
- Browser Cache Storage via Workbox - Runtime cache targets are configured in `vite.config.ts` for `fonts.googleapis.com`, `fonts.gstatic.com`, `raw.githubusercontent.com`, and `cdn.jsdelivr.net`.
- Browser `localStorage` - Persisted client state is stored locally by `pinia-plugin-persistedstate` in `src/stores/music.ts`, `src/stores/patterns.ts`, and `src/stores/keyboardDrawer.ts`, plus custom keys in `src/stores/visualConfig.ts`.

## Authentication & Identity

**Auth Provider:**
- None
  - Implementation: No user account, session, OAuth, JWT, or token exchange code was detected. Permission prompts are browser-native only, such as MIDI access in `src/composables/useMidiControls.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, PostHog, Bugsnag, Datadog, or similar client appears in `package.json` or `src/`.

**Logs:**
- Console-based diagnostics only - Errors and debug output are emitted with `console.error`, `console.debug`, `console.info`, or `console.warn` in files such as `src/services/superdoughAudio.ts`, `src/composables/useMidiControls.ts`, `src/composables/useAppLoading.ts`, `src/stores/visualConfig.ts`, and `src/components/ConfigPanel.vue`.
- Local performance instrumentation exists in `src/utils/performanceMonitor.ts`, but no external telemetry sink was detected.

## CI/CD & Deployment

**Hosting:**
- Vercel - Static output is built and deployed according to `vercel.json`, which sets `dist` as the output directory and rewrites all routes to `index.html`.

**CI Pipeline:**
- None detected. No `.github/workflows/`, `netlify.toml`, `Dockerfile`, or other CI/CD pipeline config was found beyond `vercel.json`.

## Environment Configuration

**Required env vars:**
- None detected
- `import.meta.env` usage is limited to the built-in `DEV` flag in `src/main.ts`, `src/composables/useGSAP.ts`, `src/composables/useMidiControls.ts`, and `src/components/LoadingSplash.vue`.

**Secrets location:**
- Not detected
- No `.env` files were found in a repo-root `find . -maxdepth 2` scan, and no secret-bearing config files were referenced by the application code that was inspected.

## Webhooks & Callbacks

**Incoming:**
- None. No HTTP webhook endpoints, server handlers, or API route files were detected.

**Outgoing:**
- None for HTTP/webhook traffic.
- Callback-oriented integrations are browser-local: service-worker refresh callbacks in `src/main.ts`, MIDI `onmidimessage` and `onstatechange` handlers in `src/composables/useMidiControls.ts`, and custom DOM events such as `"note-played"` / `"note-released"` dispatched by `src/stores/music.ts` and `src/services/superdoughAudio.ts`.

---

*Integration audit: 2026-03-30*
