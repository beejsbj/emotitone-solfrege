# EmotiTone Repository Router

Read [CLAUDE.md](CLAUDE.md) for the architecture as it is. When the two disagree with the code, trust the code and fix the doc.

## What this instrument is

EmotiTone is **an instrument that teaches through its moats and cues** (Burooj, 2026-10-09). It teaches through what only it does and through the signals it gives. It does not teach through lessons or quizzes; structured practice is deferred, not ruled out.

The four moats:

1. **Feeling first.** Every interval has an emotional voice: the written interval descriptions and Music Color.
2. **Sketch speed.** Everything played is kept, there is no record button and no DAW, and humming is a sketch too.
3. **Loops as play.** Play is the loop.
4. **A pocket instrument.** One-handed on a phone, with a deep sound library behind it and its code one tap away.

Every name, syllable, interval, chord symbol and colour the instrument shows is a cue, and a cue is a promise: it must be true in every key and mode.

**Origin.** It began as a feeling- and intuition-building app, using solfège and LLM-written text describing each interval. It then absorbed Burooj's own melody-sketching tool, because every other tool was a bloated DAW. Strudel arrived to simplify patterns, playback and samples, and brought its own headaches; the app is now moving to its own AudioWorklet engine. The Looper is the natural extension. Throughout: keep the UX simple while allowing more, and stay very mobile-focused.

The record of decisions is `docs/retrospective-spec.md` (PR #143; until it merges, `git show origin/docs/retrospective-spec:docs/retrospective-spec.md`).

## Where work goes

- **Design** (`implementing-design-system`: review, define, tighten, promote, adopt or verify a visual unit): invoke `$emotitone-design-system` and follow it before asking questions or editing. Records: `src/style-guide/WIP-bible.md` (direction), `src/style-guide/DESIGN_SYSTEM_TRACKER.md` (current truth and next gate), and `src/style-guide/DESIGN_LOG.md` (frozen 2026-10-09, do not append; PR bodies are the receipt). Do not use `design-lab` for this pass. Keep standalone functionality and bug fixes outside the visual-system slice. Respect the dirty tree and coordinate with adjacent unit sessions before touching shared lineage or files.
- **Product** (stance, Looper, phrase book, Code Strip, persistence, licence): `docs/retrospective-spec.md`, `docs/looper.md` (open PR #138), `docs/pattern-system-reimagined.md`. A change that works against a moat needs Burooj's decision first.
- **Audio** (worklet engine, Strudel/superdough, transport, voices, latency): `src/audio/live/`, `docs/research/audio-*.md`, `audio-lab/README.md`. The engine is moving off Strudel and superdough to the worklet; do not deepen the old dependency. Measure with the audio lab, not by ear alone.
- **Music theory** (scales, modes, solfège, chords, names, colour): `src/domain/HARMONY.md`, `src/domain/harmony.ts`, `src/data/`, `src/services/music.ts`, `src/services/musicColorCore.ts`. Correctness in every key and mode is the bar; add a test for the case that was wrong.

## Verification

- Use only the package scripts: `bun run type-check`, `bun run test:run <files>`, `bun run build`, `bun run lint`. Never invoke `vue-tsc`, `vitest` or `vite build` directly.
- `type-check`, `test:run` and `build` take a shared lock across this repository's worktrees (`scripts/verify.mjs`), so they may wait for another job; that is normal. `lint` does not take the lock. Run focused tests while editing and one full verification at a coherent checkpoint. A build already includes its typecheck. Use watch/UI mode only when requested, and close it before another verification job.
- The host is memory-constrained: do not leave dev servers or browsers running.
- GitHub CI (`.github/workflows/ci.yml`) runs `type-check`, `test` and `lint` on every PR and on pushes to `main`. A change is done when those checks on its PR are green, not when it is green locally.
- `EMOTITONE_VERIFY_BYPASS_LOCK=1` skips the verify lock and is for CI and Vercel only (isolated machines; CI and `vercel.json` set it). Never set it on bjslab or another shared host.
- Write tests that observe behaviour at the highest seam and fail when the behaviour breaks. See [testing.md](docs/testing.md) for commands, limits and test-quality guidance.

## Historical Documentation & Plans Archive

Archived design evidence, historical research, early audit notes, and completed plans (e.g. modes expansion, Tone.js-era refactor PRP, stack review triage, and original notes) are preserved on the `archive/docs-and-plans` branch.
