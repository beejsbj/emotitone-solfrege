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
- **Product** (stance, Looper, phrase book, Code Strip, persistence, licence): `docs/retrospective-spec.md`, `docs/looper.md` (open PR #138; until it merges, `git show origin/docs/looper-brief:docs/looper.md`), `docs/pattern-system-reimagined.md`. A change that works against a moat needs Burooj's decision first.
- **Audio** (worklet engine, transport, voices, latency): `src/audio/live/`, `docs/research/worklet-engine.md`, `audio-lab/README.md`. The worklet is the only renderer; Strudel and superdough left in BJS-495, and only "Open in Strudel" (a URL) remains. Measure with the audio lab, not by ear alone.
- **Music theory** (scales, modes, solfège, chords, names, colour): `src/domain/HARMONY.md`, `src/domain/harmony.ts`, `src/data/`, `src/services/music.ts`, `src/services/musicColorCore.ts`. Correctness in every key and mode is the bar; add a test for the case that was wrong.

## Verification

- Use only the package scripts: `bun run type-check`, `bun run test:run <files>`, `bun run build`, `bun run lint`. Never invoke `vue-tsc`, `vitest` or `vite build` directly.
- `type-check`, `test:run` and `build` take a shared lock across this repository's worktrees (`scripts/verify.mjs`), so they may wait for another job; that is normal. `lint` does not take the lock. Run focused tests while editing and one full verification at a coherent checkpoint. A build already includes its typecheck. Use watch/UI mode only when requested, and close it before another verification job.
- The host is memory-constrained: do not leave dev servers or browsers running.
- GitHub CI (`.github/workflows/ci.yml`) runs `type-check`, `test` and `lint` on every PR and on pushes to `main`. A change is done when those checks on its PR are green, not when it is green locally.
- `EMOTITONE_VERIFY_BYPASS_LOCK=1` skips the verify lock and is for CI and Vercel only (isolated machines; CI and `vercel.json` set it). Never set it on bjslab or another shared host.
- Write tests that observe behaviour at the highest seam and fail when the behaviour breaks. Source assertions may protect meaningful architecture contracts (imports, routing, lineage); avoid incidental text such as comments or variable spelling and a mock's canned answer. See [testing.md](docs/testing.md) for commands, limits and test-quality guidance.

## Design-law lint

`bun run lint` (ESLint, then Stylelint) enforces three rules, the first two from `src/style-guide/WIP-bible.md`. The zone map and the forbidden imports are data in `lint/designZones.mjs`; the rules read it, so that is the file to review.

- **Import boundary.** Files in `src/components/primatives/` and `src/components/compounds/` may not import `@/stores/**`, `@/audio/**` or a production service (every file in `src/services/` except the pure ones listed in `PURE_SERVICES`: colour, music-theory and display derivations). Static imports, re-exports, dynamic `import()` and `require()` are all checked, and relative paths are resolved, so `../../stores/x` counts. Type-only imports (`import type`) are allowed. Take props or use a composable instead. A new service is forbidden there until it is classified.
- **Colour law.** In the playing zone (`src/components/**` and `src/composables/**` plus `App.vue` and `MainApp.vue`, any of `.vue .ts .tsx .js .jsx .mjs .cjs .css`; minus `BRAND_ZONE`: Brand Logo, Loading Screen, Loading Splash, Source Credits; the style guide and the token sources are never checked) there are no brand-paper tokens (`--tomato`, `--mustard`, `--plum`, `--cobalt`, `--pine`, `--bone`, those as tone names, or as bare CSS colour words) and no raw colour: hex, `rgb()`, `hsl()`, `oklch()`, or a CSS named colour such as `white`. Colour is Music Color from the numeric OKLCH adapter (`musicColorCore.ts`) or Ink / Ivory / Brass tokens; `transparent`, `currentColor`, `inherit` and gradient `mask` stops are fine. ESLint checks script and template (`lint/eslintPluginDesignLaw.mjs`), Stylelint with `postcss-html` checks CSS and Vue `<style>` blocks (`lint/stylelintPluginDesignLaw.mjs`).
- **Use the primitives.** Outside `src/components/primatives/` (and minus `BRAND_ZONE`), a playing-zone component has no raw `<button>` and no `<a>` with its own visual styling (a `class`, `style` or `role="button"`); build buttons with the Button primitive (`no-bespoke-button`, in templates and JSX). A plain `<a href>` is fine. Today's cases are baselined. The brand zone is left out on purpose: the Loading Screen has six bespoke buttons of its own.

**Known limits.** The lint guards against accidents, not adversaries. Closed: named colours in SVG paint attributes (`color`, `fill`, `stroke`, `stop-color`, `flood-color`, `lighting-color`), colours in `computed()` callbacks, root-absolute imports (`/src/stores/x`), and an unreadable baseline (a missing, empty or malformed `designLawBaseline.json` stops the lint, and `lint:baseline` refuses to rebuild it without `--allow-growth`). Left out, with the reason:
- *One count per value, not per colour.* The unit of debt is the offending value or declaration; counting every colour inside it would rewrite the recorded baseline (`instrumentControl.css` 2 to 7, `Tabs.vue` 1 to 4) for a hole the next fix in that file closes anyway.
- *Import paths built by concatenation or other obfuscation.* A leading literal or template prefix (`"@/stores/" + name`) is already checked; paths assembled from pieces (`"@/sto" + "res"`) are something nobody writes by accident.
- *A bespoke control that is not a `<button>` or `<a>`* (`<div role="button">`, `h("button")`) is not caught; the rule checks native controls written in templates and JSX.
- *Aliased or namespace Vue helpers* (`computed as derive`, `Vue.computed`) are not resolved; this repository uses direct `computed` calls, and import-binding resolution is a separate lint follow-up.
- *Anchor roles wrapped in TypeScript assertions or template literals* are not unwrapped; no such anchors exist in the playing zone today, and extending expression evaluation is a separate lint follow-up.

`ivory` is a token name in tone props and Sticker's `computed<StickerPaperColor>` derivation; in CSS colour contexts (styles, SVG paint and other colour derivations), it is a forbidden named colour. Use `var(--ivory)` there.

**The baseline.** Violations that predate the lint are counted per file and per rule in `lint/designLawBaseline.json`. A listed file may have at most its recorded count: one more fails CI, and fewer also fails until the baseline is lowered, so counts only go down. Any other file has a budget of zero.

**Shrinking the baseline.** Fix the violations in a file (Phase 2 and 4 of the retrospective spec), run `bun run lint:baseline` to record the lower count (it deletes an entry that reaches zero, and refuses to raise any count or add a file), and commit the JSON with the fix. `DESIGN_LAW_NO_ALLOWLIST=1 bun run lint` ignores the baseline and reports everything that remains. `src/__tests__/lint/designLaw.test.ts` fails if the committed baseline is not exactly today's debt. Do not raise the baseline for new work: fix the code, or ask for a design decision. To add a surface to the brand zone, change `BRAND_ZONE` deliberately and say why in the PR. `bun run lint:baseline --allow-growth` exists for a reviewed exception, such as a surface moved into the playing zone; justify it in the PR.

## Historical Documentation & Plans Archive

Archived design evidence, historical research, early audit notes, and completed plans (e.g. modes expansion, Tone.js-era refactor PRP, stack review triage, and original notes) are preserved on the `archive/docs-and-plans` branch.
