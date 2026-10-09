# CLAUDE.md

Guidance for agents working in this repository. Routing and verification rules live in [AGENTS.md](AGENTS.md); read it first. When this file and the code disagree, trust the code and fix this file.

## What this is

EmotiTone is a mobile-first instrument that teaches solfège through feeling. Vue 3 + TypeScript + Pinia, built with Vite, run with Bun. Stance and the four moats (feeling first, sketch speed, loops as play, a pocket instrument) are in AGENTS.md and `src/style-guide/WIP-bible.md`. The full decision record is `docs/retrospective-spec.md` (PR #143, until merged: `git show origin/docs/retrospective-spec:docs/retrospective-spec.md`).

```bash
bun run dev          # port 5175
bun run type-check   # via scripts/verify.mjs
bun run test:run <files>
bun run build        # includes the type-check
```

Use only the package scripts for checks (shared lock across worktrees; see AGENTS.md and `docs/testing.md`). GitHub CI runs `type-check`, `test` and `lint` on every PR and all three must be green before merge.

## Architecture as it is

**Audio is mid-migration.** The decision (spec, Decision 3) is to move off Strudel and superdough to the app's own AudioWorklet engine. Today both exist:

- `src/audio/live/` is the worklet engine: `processor.ts` (render thread), `core.ts` (voices, scheduling, envelopes, band-limited oscillators), `bridge.ts` (main-thread commands and responses), `resampler.ts`. It plays live notes and play-style repeats/arpeggios from prepared sample banks.
- Superdough still provides the AudioContext, master output and orbit effects (`src/services/audioRuntime.ts`, `superdoughAudio.ts`), and Strudel (`@strudel/*`, `useStrudel.ts`) still renders authored and recorded patterns. Patched dependencies live in `patches/`. Do not deepen the Strudel/superdough dependency; new audio work targets the worklet.
- `src/audio/voicePolicy.ts` and `liveShaping.ts` hold voice budgets and Shape-to-sound mapping. `src/services/live*.ts` is the live-play path; `playStyles.ts` is the main-thread play-style engine slated to move into the worklet.
- Audio measurements run in `audio-lab/` (`bun run test:audio-browser`). Research and decisions: `docs/research/`.

**Music theory.** `src/domain/harmony.ts` owns chord generation (see `src/domain/HARMONY.md`). `src/services/music.ts`, `src/data/` (scales, modes, solfège, instruments, default patterns) and Tonal.js supply theory. Names, syllables and intervals shown to the player must be correct in every key and mode; borrowed notes take chromatic solfège.

**Phrase book.** `src/domain/phraseBook.ts` and `src/stores/phrases.ts`: one noun (Phrase) on four shelves with one open take. Everything played is kept; there is no record button. Rules: `docs/pattern-system-reimagined.md`. UI: `PhraseShelf`, `PatternReel`, `PatternStrip`.

**Code Strip.** `src/components/uniques/CodeStrip/` is still a Strudel CodeMirror editor. The decision is to replace it with a read-only HighlightStrip plus "Open in Strudel"; `StrudelNotation.ts` writes the code text.

**Looper ("Play is the loop").** In flight, not on `main`: brief in `docs/looper.md` (PR #138), domain #139, transport #140, Stage part #141, Play wiring #142. #137 and #140's Strudel transport are research under Decision 3; their receipts become the acceptance tests for a worklet transport. Check the open PRs before touching playback or phrase timing.

**Stage.** The canvas behind the instrument: `UnifiedVisualEffects.vue` with renderers in `src/composables/canvas/` (strings, blobs, harmonic geometry, Hilbert scope, ambient), driven by `stageRuntime.ts`. Music Color comes only from the numeric OKLCH core `src/services/musicColorCore.ts` and its gamut-mapped adapter `musicColor.ts`; never add a parallel colour calculation.

**State and input.** Pinia stores in `src/stores/` (`music`, `instrument`, `phrases`, `visualConfig`, `keyboardDrawer`), persisted with pinia-plugin-persistedstate. Saved formats currently have no schema version: changing a persisted shape needs a migration. Input: touch/pointer keys and chords, QWERTY, Web MIDI (`useMidiControls.ts`), and humming (`useHummingCapture.ts`; audio goes to the external pitch-analysis service proxied in `vercel.json`). Every input contact owns its own voice group (`inputVoiceGroups.ts`).

**Design system.** `src/style-guide/` is the design system and its `/style-guide/` routes: tokens, primitives, compounds, compositions, uniques. Read `src/style-guide/WIP-bible.md` (the short direction) and `src/style-guide/DESIGN_SYSTEM_TRACKER.md` (current state) before visual work. Production components live in `src/components/{primatives,compounds,compositions,uniques}`. Two zones: a jazz-poster brand zone, and a chrome-hardware playing zone where the only colour is Music Color. Interface colour uses design-system tokens. `src/style-guide/DESIGN_LOG.md` is frozen; PR bodies are the receipt.

**Verification launcher.** `scripts/verify.mjs` wraps type-check, build and Vitest behind a lock in the git common directory so concurrent worktrees queue instead of exhausting memory. Never run `vue-tsc`, `vitest` or `vite build` directly. `EMOTITONE_VERIFY_BYPASS_LOCK=1` skips the lock; it is for CI and Vercel only (isolated machines), never for local or shared-host runs.

## Conventions

- Vue 3 Composition API, `<script setup lang="ts">`, then `<template>`, then `<style scoped>` only when Tailwind cannot do it.
- Mobile first; design for touch and one hand. Ignore desktop-only affordances.
- Tailwind for styling. Shared types go in `src/types/`. Path alias `@/` is `src/`.
- Prefer composables and stores for shared state over prop/emit chains.
- Keep reactive state minimal; derive with `computed`.
- Primitives and compounds must not import stores (the design law; some existing violations are known and will be allowlisted, new ones are not acceptable).
- Audio starts only after a user gesture. Track polyphony by note id and owner so a release cannot silence another contact.
- Tests observe behaviour at the highest seam (rendered PCM, real stores, DOM events). Do not assert source text or a mock's canned answer. See `docs/testing.md`.

## Where the history is

Archived plans, old research and the Tone.js-era refactor plans are on the `archive/docs-and-plans` branch. `docs/` holds current decisions; the audit and evidence directories under `docs/` and `src/style-guide/evidence/` are records, not instructions.
