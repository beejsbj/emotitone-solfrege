# Handoff — 2026-05-18 (night, post-Wave-1)

For the next session that picks up Phase 8.

## What's done — Wave 1 (committed at `cb4cebe`)

All TOKEN cards rewritten per the user's `my-notes.md` audit. Doctrine locked in `.planning/PHASE-8-BRIEF.md` — read that first.

| Card | State |
|---|---|
| `tokens-ui-colors.html` | high-contrast usage rule added; over-content layers section purged |
| `tokens-brand-colors.html` | untouched |
| `tokens-music-colors.html` | one segmented donut wheel; labels stay at chromatic positions, only colors rotate with root; 11px letters |
| `tokens-typography.html` | NEW · destroyed-and-reconstructed; standard design-system typography page (typefaces, type ramp, tracking, rules) |
| `spacing-scale.html` | flat brass-bar swatch list |
| `spacing-radius.html` | flat ivory tile row |
| `tokens-geometry.html` | unchanged — already token-style |
| `tokens-motion.html` | NEW · collapses motion-beat + durations + easings + keyframes into one card with four named-cell-grid blocks |

**Token-layer cards collapsed: 14 → 8.** Sidebar buckets: Color · Typography · Geometry · Motion.

12 `@keyframes` hoisted into `colors_and_type.css` from the soon-to-be-deleted `mot-primitives-*` cards. The motion-applied source cards still exist on disk and still render in the sink under `PRIMITIVE/motion-applied` — they're scheduled to die in Wave 2j.

## Doctrine corrections that became permanent

These are now in `PHASE-8-BRIEF.md`. Any agent dispatched for Wave 2+ must read it.

1. **Specimen-card-grammar is NOT for TOKEN cards.** Tokens use standard design-system displays (swatches, ramps, named-cell grids). Specimen grammar (Anatomy → Variants) is for PRIMITIVE / PART / COMPOSITION only.
2. **Lets Jazz is the primary typeface across the board.** Mono is the exception — captions, and body that runs past ~5 words. Labels are Lets Jazz, not mono (currently the `--t-label` token still uses `--font-text` which is mono; the typography card demonstrates Jazz via local override).
3. **High-contrast color discipline.** `--ink` and `--ivory` are the workhorses; the grays (`--ink-2…5`, `--ivory-2…4`) are surface and meta, used surgically.
4. **Lift, don't rewrite.** When refactoring motion or pattern code, copy existing CSS/keyframes verbatim. Don't paraphrase.

## Known issues to be aware of

### sink.js had an over-greedy regex (FIXED in this session, but server needs restart)

`sink.js:53-58` previously had `/\bbody\s*\{[^}]*\}/gi` which silently stripped any class selector ending in `body` (e.g. `.s-body`). Fixed with a `(?<=[}\n])` lookbehind so it only matches body declarations at line/rule boundaries. **The running `bun sink.js` process still has the old code in memory** — restart it before relying on the fix. (Workaround in the typography card: class was renamed `.s-body` → `.s-body-jazz`.)

### Reference assets bloat the sink page (deferred to Wave 5)

`composition-app-reference-index.html` inlines ~3 MB of PNG into the sink HTML. Wave 5 will thin this card to thumbnails or remove it from the sink schema.

### `--t-label` token still uses `--font-text` (mono)

The typography card demonstrates Jazz labels via local override. Cascading the rule into the actual token (and every primitive that uses `--t-label`) is a Wave 2 prerequisite — see brief.

## What's next — Wave 2 dispatch plan

Cadence: wave-by-wave with review (user's earlier preference). Use haiku where possible per user's token-saving direction; reach for sonnet for heavier rewrites.

### Wave 2 — Primitive color discipline + new variants (9 parallel tasks)

All driven by sections of `my-notes.md`. Color discipline rules per `PHASE-8-BRIEF.md` color cheat sheet.

| # | Task | Model | Brief |
|---|---|---|---|
| 2a | `components-buttons.html` | sonnet | strip 8 brand-color refs · icon-only · apply geometry recipes from `tokens-geometry` |
| 2b | knobs split → `components-knobs-digital.html` (arc family) + `components-knobs-analog.html` (ring family) | sonnet | UI tokens only · 4 functional variants each (range/boolean/options/button) · delete original `components-knobs.html` (16 brand-color refs to strip) |
| 2c | `components-tabs.html` | sonnet | strip 6 brand-color refs · restore interactivity · lift Persona-5 chip-slide block from `mot-primitives-tab-slide.html` as a CUT variant |
| 2d | `components-keys.html` | sonnet | strip 6 brand-color refs · music colors only on the playable face · clip-paths for "cuts" decomposed as geometry-token references · keep wide-angular + tall-long structure |
| 2e | `components-kicker.html` | haiku | add vertical + horizontal rectangle variants (see screenshot in audit) · ±1-3° random tilt · dedupe label echo in spec rows |
| 2f | `components-marks.html` + delete `composition-music-marks.html` | haiku | merge music-marks (notational family) into marks card · delete the composition |
| 2g | `components-badge.html` | sonnet | new variants from screenshots (audit refs `media_I0pRIGB32A`, `media_flMTP2GtlV`, `media_XBmEyrkFlg` — solfege tag, file-foundations badge, piano sticker variants) |
| 2h | `components-card.html` | haiku | add no-border + inverted-ivory-on-black variants |
| 2i | brand→logo unification: `brand-logo.html` (consolidate tagline as variant) · DELETE `brand-pattern.html`, `brand-stickers.html`, `brand-tagline.html` | sonnet | per audit: "call this logo instead and only have logo, use specimen skill on the logo. incorporate the tagline into the logo as variant. purge 3/5, 4/5" |
| 2j | **Motion-applied purge** | me | salvage `mot-primitives-beat-pulse.html:51-76` (the `.beats` indicator + `beat-cell`/`beat-down` keyframes) as new `components-beat-indicator.html` PRIMITIVE · then delete all 9 motion-applied cards (`mot-primitives-*` + `composition-motion-overview` + 2 `mot-compositions-*`) · also delete `principles.html`, `components-section-anchor.html`, `components-solfege-tile.html` |

### After Wave 2

- Commit Wave 2 as one snapshot
- User reviews on sink
- Then Wave 3 (parts rework: strips→primitive, code-strip→primitive, pattern-card consolidate, preset-card→spine-card variant, panel-header purge, hardware-bar purge, NEW drawer primitive)
- Then Wave 4 (compositions: loading-screen, top-drawer, bottom-drawer rebuilds)
- Then Wave 5 (final schema v4 pass + sink bloat fix + token alignment for `--t-label` etc.)

## Dispatch template (for next session orchestrator)

Each Wave 2 task agent should be briefed with:

1. Required reading: `.planning/PHASE-8-BRIEF.md`, `my-notes.md` (relevant section), `.claude/skills/specimen-card-grammar/SKILL.md`
2. Current state of the card (paths + line numbers if relevant)
3. **Lift, don't rewrite** — pointer to the source file when relevant (e.g. for 2c, lift from `mot-primitives-tab-slide.html`)
4. Hard rules block (no brand colors in UI primitives, no new tokens, no emoji, 700px width, `_card.css` first in head)
5. Concrete output expectations + grep verification (e.g. `grep -c "tomato\\|--saffron\\|--pine\\|--plum\\|--mustard\\|--bone" project/preview/components-buttons.html` must be 0)

## Files modified between commit and now

These were added after `cb4cebe`:

- `.gitignore` — `.agents/` added
- `project/preview/tokens-typography.html` — body ramp rows now actually render Lets Jazz; second body-s row added; 5-word rule shown inline; class renamed to dodge sink.js bug
- `sink.js` — regex fix for body-stripping (needs bun restart to take effect)
- `.planning/HANDOFF-2026-05-18-NIGHT.md` — this file

The next session should commit these before dispatching Wave 2.

## Workspace state on handoff

- Sink: http://localhost:3000 (running, but on pre-fix sink.js — restart for the regex fix to land)
- Branch: `main`
- Last commit: `cb4cebe Phase 8 Wave 1: token cards rewritten per audit doctrine`
- Pending uncommitted: gitignore, tokens-typography, sink.js, this handoff
- Untracked but intentionally NOT being committed by me: `.agents/` (empty skill-runtime dir, now in gitignore), `AGENTS.md` (your Codex-targeted CLAUDE mirror — handle separately)
