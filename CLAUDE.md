# CLAUDE.md

This file provides guidance for coding agents working in this repository.

## Project Overview

EmotiTone Solfege is a browser-based pocket instrument for quick note play, fast pattern sketching, and intuitive musical exploration. It is built for immediacy first, then uses solfege, color, and reactive visuals to help musical understanding emerge through play instead of requiring theory up front.

The codebase is brownfield and close to feature complete for its intended purpose. Current project work is a finishing pass focused on polish, correctness, cohesion, and instrument feel rather than major feature expansion.

## Current Planning Context

Planning artifacts live in `.planning/`.

- `.planning/PROJECT.md`: project context and scope
- `.planning/REQUIREMENTS.md`: current v1/v2 requirements
- `.planning/ROADMAP.md`: four-phase finishing roadmap
- `.planning/STATE.md`: current project state
- `.planning/codebase/`: architecture, stack, conventions, testing, and concerns maps

Current roadmap:

1. `Phase 1: Instrument Trust & Flow`
2. `Phase 2: Color System Correctness`
3. `Phase 3: Visual Config & Theme Cohesion`
4. `Phase 4: Pattern Workflow Cohesion`

Keep unresolved harmonic-teaching surface work, including any `FloatingPopup` redesign, out of v1 unless requirements are explicitly updated.

## Common Development Commands

```bash
# Dev server
bun run dev

# Production build
bun run build

# Preview built app
bun run preview

# Type checking
bun run type-check

# Tests
bun run test:run
bun run test:e2e
```

Notes:

- Package manager/runtime is Bun, pinned in `package.json`.
- The current lint script is known to be broken and should not be treated as a trustworthy guardrail until fixed.
- The current test suite is not fully green; treat test results carefully and verify behavior manually for UI/audio work.

## Stack

- Vue 3 with `<script setup>` and TypeScript
- Pinia for app state
- Vite for development/build
- Tailwind CSS for styling
- Strudel + Superdough for sequencing/audio runtime
- Tonal.js for music theory helpers
- GSAP for selected animation work
- PWA support via `vite-plugin-pwa`

## Architecture Overview

This is a client-only single-screen app. There is no backend in this repository.

Key layers:

- `src/main.ts`, `src/App.vue`: bootstrap and root shell
- `src/components/`: UI surfaces, especially keyboard, patterns, config, overlays, and visuals
- `src/composables/`: reusable interaction/runtime logic
- `src/composables/canvas/`: unified visual rendering system
- `src/stores/`: Pinia stores for music, patterns, instrument state, keyboard drawer, and visual config
- `src/services/`: music theory, audio runtime, Strudel notation, ROLI sync, color helpers
- `src/data/`: musical reference data and visual config metadata/presets
- `src/types/`, `src/utils/`: shared contracts and helpers

Cross-cutting note playback currently fans out through browser `CustomEvent`s such as `note-played` and `note-released`. Be careful when changing note payloads or listeners because audio, visuals, pattern capture, and MIDI sync all depend on them.

## Product Priorities

Optimize for the instrument feeling:

- immediate
- smooth
- trustworthy
- visually coherent
- musically intentional

Do not accidentally turn the app into a mini-DAW or a generic web dashboard.

For shell UI:

- calmer neutral chrome is preferred
- vivid chromatic color should stay focused on musical surfaces and music-linked indicators

For scope:

- finishing and polish beat novelty
- bug fixes and misleading behavior beat adding features
- pattern workflow is important, but only after the base instrument is stable and visually coherent

## File and Editing Guidance

- Preserve existing Vue 3 + Pinia patterns unless there is a clear reason to simplify them.
- Prefer small, local changes over sweeping architecture rewrites during polish phases.
- Keep file names and component names aligned with the existing conventions in `src/components/`, `src/composables/`, and `src/stores/`.
- When changing visual config shape, update metadata, store behavior, and any dependent UI together.
- When changing audio or note-event behavior, audit downstream consumers in patterns, visuals, and MIDI integration.

## Known Risks

- `src/services/superdoughAudio.ts` and startup/loading flows are central and somewhat fragile.
- Visual config is metadata-driven and can drift if schema, controls, and behavior get out of sync.
- The repo has stale tests and a broken lint path, so manual verification is still important.
- There may be unrelated local work in the tree; do not overwrite user changes outside your task.

## Verification Expectations

For UI or interaction work, prefer:

1. targeted reading of affected stores/composables/components
2. local type-check/build/test commands when relevant
3. manual reasoning through user-visible flows
4. explicit notes about what was and was not verified

If you touch roadmap-scoped work, keep the implementation aligned with `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` rather than improvising scope.
