# Emotitone Design System — Unification Plan

Source of truth for the unification pass. Updated as we go. Read this on session-resume to recover full context without re-deriving.

---

## Context (one paragraph)

The design system is a Frankenstein of two iterations: the **current** cards in `project/preview/*.html` + a **v2** monolith we extracted into `composition-*` cards. The system is **descriptive**, not **referential** — every card hand-codes its own version of the atom it's showing (tile, knob, card-shell, paper-rip, mode-rip…). Tokens cascade only for raw values (colors, spacing); geometry and motion atoms are hardcoded per file. Unification = make this a real cascade: TOKEN → PRIMITIVE → PART → SURFACE → COMPOSITION, each layer consuming the one above.

## Decisions locked in (no re-litigation)

### Token architecture (top-level)
```
TOKENS (layer)
├── color (family)
│   ├── ui_colors       ink-{1..5}, ivory-{1..4}, brass + sheen, glass, scrim, hairline
│   ├── brand_colors    tomato, pine, plum, bone           (kill: saffron, grape, coral, paper)
│   └── music_colors    oklch recipe, see below
├── geometry            spacing, radius, stroke, tile-aspect, knob-ring-scale, …
└── motion              beat, durations, easings + named keyframe atoms
                        (paper-rip, bob, mode-rip, played-flash, downbeat-strobe, tab-slide)
```

### Music-color recipe (spec)
```css
:root {
  --music-count:  12;     /* 12 chromatic | N scale-length */
  --music-rotate: 0;      /* root key offset, 0..11 */
  --music-c:      0.18;   /* chroma in oklch */
}
.note {
  --note-degree:  0;      /* 0..11 */
  --note-octave:  4;      /* 0..8 */
  --note-l:       calc(20% + (var(--note-octave) * 7.5%));  /* 20..80 across 8 octaves */
  --note-hue:     calc((var(--note-degree) + var(--music-rotate)) * (360 / var(--music-count)));
  background:     oklch(var(--note-l) var(--music-c) var(--note-hue));
}
```
- **Fixed mode**: `--music-count: 12` → always chromatic 360/12, each degree gets a 30° slice
- **Rooted mode**: `--music-count: N` (scale length) + `--music-rotate: root-degree` → root key sits at hue 0
- Octave drives lightness 20%→80%
- Recipe lives in `colors_and_type.css`. Every tile/key/note glyph just sets `--note-degree` and `--note-octave`.

### Hierarchy (replaces unification-data.json shape)
- **Layer** is top-level group: TOKENS, PRIMITIVES, PARTS, SURFACES, COMPOSITIONS
- **Family** is subgroup within TOKENS & PRIMITIVES only
  - TOKENS families: color / geometry / motion
  - PRIMITIVES families: marks (cut-marks, music-marks) / tiles / knobs / cards / inputs / type-elements
- **Compositions** = final slices of actual app screens; paired with reference images in `project/assets/`

---

## Removals & clutter pass (Phase 0 actions, locked)

### Sink
- Remove `MOBILE UI KIT` section and its iframe styles from `sink.js`

### File deletes (after extracting any textual notes worth keeping)
- `composition-components-overview.html` (G16-2) — the site IS the kit now
- `components-drawer.html` (G12-1) — extract drawer mechanic text
- `composition-drawer-visual-config.html` (G12-3) — extract any notes
- `composition-top-drawer.html` (G12-4) — extract "No modals. The ceiling drops." headline + open/edge/dismiss notes

### File renames / regroups
- `composition-drawer-instrument-picker.html` → `composition-drawer.html` (it already shows all 3 modes: instrument / visual / settings)
- `components-card.html` (G15-3) stays as-is but **regrouped** under primitives/cards (it's a card-shell spec, not principles)

### Merges (need design decisions before executing)
- **G15 merge**: `principles.html` + `principles-antipatterns.html` → one canonical `principles.html` (each rule paired with its visual-broken example)
- **G13 merge**: `composition-pattern-reel-populated.html` (has "active at bottom" interaction, but broken visuals) + `composition-pattern-reel-deck.html` (good fixed visuals, no active-at-bottom) → one composition card with both
- Component-level `components-pattern-reel.html` stays separate (empty mechanic)

---

## Phases

| # | Name | Subagent? | Notes |
|---|------|-----------|-------|
| **0** | Clutter pass | Me + codex for merge drafts | Mechanical deletes + 2 merges. Pause before each merge. |
| **1** | Token rebuild | Bash grep + codex for swap sweep | Restructure `colors_and_type.css`; write music-color recipe; build 3 new tokens cards. |
| **2** | Atom inventory | 4× parallel general-purpose agents | Walk surviving cards, register atoms by family. Output: `.planning/atoms.json` (replaces unification-data.json). |
| **3** | Promote atoms | Me, one family per commit | Pick canonical per atom, build primitive card, refactor consumers. Slow phase. |
| **4** | Rewrite sink schema | Codex | Given new `atoms.json`, write the new `unification-data.json`. I do sink.js render edits. |
| **5** | Compositions as app refs | Me + Claude Preview | Pair each composition card with its reference screenshot from `project/assets/`. |

### Phase 0 — detailed steps
1. Sink edit: remove mobile-kit section
2. Codex extract: pull text/headlines from G12 deletes + G16-2 → `.planning/extracted-copy.md`
3. Confirm with user, then delete those files
4. Rename `composition-drawer-instrument-picker.html` → `composition-drawer.html`
5. Codex draft: G15 merge → `principles.html` (review with user, edit, replace)
6. Codex draft: G13 merge → new pattern-reel composition (review with user, edit, replace)
7. Update `unification-data.json` to reflect the new file set (interim — Phase 4 throws this out)
8. Commit: "Phase 0: clutter pass + drawer/principles/pattern-reel merges"

### Phase 1 — detailed steps
1. Bash grep audit: list every file × line using `--saffron|--grape|--coral|--paper`
2. Per-instance decision pass with user (chrome → swap to `--brass`/`--ivory`; brand card → stays + migrates to `brand_colors`)
3. Codex swap sweep: execute the decision list across files
4. Restructure `colors_and_type.css` into UI / BRAND / MUSIC / GEOMETRY / MOTION sections (rewrite, no functional changes yet)
5. Write music-color recipe (with `@property` declarations if browser support allows)
6. Build 3 new tokens cards:
   - `tokens-ui-colors.html`
   - `tokens-brand-colors.html`
   - `tokens-music-colors.html` (with interactive mode/rotate/octave controls)
7. Kill old `colors-neutrals.html`, `colors-stage-palette.html`, `colors-jazz-accents.html`, `colors-chromatic.html` once new cards land
8. Commit: "Phase 1: token rebuild + music-color recipe"

### Phase 2 — detailed steps
1. Dispatch 4 parallel agents (general-purpose, my quota, not codex — judgment-heavy):
   - Agent A → `.planning/atoms/marks.json` — cut-marks, music-marks, glyphs
   - Agent B → `.planning/atoms/inputs.json` — knobs, buttons, tiles, keys
   - Agent C → `.planning/atoms/containers.json` — card shells, panels, tabs, drawers, reels
   - Agent D → `.planning/atoms/motion.json` — paper-rip, bob, mode-rip, played-flash, beat-pulse, tab-slide, downbeat-strobe
2. Each agent registry entry: `{ name, family, files_using, canonical_candidate, variants_found, drift_notes }`
3. I synthesize → master `.planning/atoms.json`
4. Commit: "Phase 2: atom inventory"

### Phase 3 — per atom family
Loop: pick family → pick canonical → build primitive card → refactor consumers → commit. Each family = one commit.

### Phase 4 — sink schema (CODEX)
Delegate the whole phase to codex via `scripts/codex-task.sh`:
1. Codex reads `atoms.json` + current `unification-data.json` + `sink.js`.
2. Codex writes a NEW `unification-data.json` reorganised by LAYER (token/primitive/part/surface/composition) × FAMILY (marks/inputs/containers/motion).
3. Codex rewrites `sink.js`'s group-rendering block to render by layer with "CONSUMES: x, y, z" badges per card.
4. Codex writes draft to its workspace; I (the orchestrator) review the diff before commit.
5. Commit: "Phase 4: sink schema by layer/family"

Decision recorded 2026-05-17: user wants codex to drive this phase end-to-end. Orchestrator's job is to write the goals-style prompt, review the diff, and commit. Do NOT hand-rewrite the sink — write the prompt instead.

### Phase 5 — composition references (CODEX)
Delegate to codex — user explicitly approved it for visual pairing 2026-05-17.
1. Codex walks `project/assets/` and indexes available app screenshots.
2. Codex reads every `project/preview/composition-*.html` to understand what each composition demonstrates.
3. Codex matches screenshots to compositions by name/intent and produces a pairing manifest.
4. Codex either (a) embeds the paired image into each composition card's footer or (b) generates a side-by-side index card — user decides at the kickoff prompt.
5. Commit: "Phase 5: compositions reference app screens"

---

## Codex setup

### Invocation
Use the helper `scripts/codex-task.sh`. It runs `gpt-5.5` with `model_reasoning_effort=high` and workspace-write sandbox.

```bash
scripts/codex-task.sh <output-name> <<'EOF'
<self-contained prompt — see prompt shape below>
EOF
```

Last-message goes to `.planning/codex-runs/<output-name>.md`.

### Prompt shape (goals-style for non-interactive exec)
```
GOAL: <desired end state>
VERIFY BY: <how success is measured>
CONSTRAINTS: <what must remain true>
INPUTS: <file paths to read>
OUTPUT: <where to write>
IF BLOCKED: <what to report instead of guessing>
```

### When to use codex (locked allocation)
| Phase | Task | Why codex fits |
|-------|------|----------------|
| 0 | Text extraction from drawer cards | Tight in/out, no judgment |
| 0 | G15 merge draft | Mechanical merge of two rule lists |
| 0 | G13 merge draft | Combine 2 cards' CSS+HTML |
| 1 | Token swap sweep (after user decisions) | Execute a known mapping list |
| 3.1.1 | Mustard re-integration | Multi-file additive change |
| 4 | atoms.json → unification-data.json + sink rewrite (FULL phase) | Pure transformation + mechanical render rewrite — user delegated entire phase |
| 5 | Composition ↔ screenshot pairing + embed (FULL phase) | User confirmed 2026-05-17 codex is good at visual matching |

### When NOT to use codex
- Atom inventory (Phase 2) — visual/system judgment
- Atom promotion (Phase 3) — per-swap design choices
- Music-color recipe — that IS the design

### Convention for codex-drafted cards
When codex produces a draft HTML card under `.planning/codex-runs/<name>-DRAFT.html`, copy it into `project/preview/<canonical-name>.html` BEFORE presenting for user review, so the user can see it in the running sink (live reload picks it up). Fix the relative `_card.css` path during the copy (drafts use `../../project/preview/_card.css` so they render from their drafts dir; the canonical location uses bare `_card.css`).

---

## Open questions / pending user decisions
- **Phase 0 merges** — draft via codex first, then review together? (Default: yes.)
- **Phase 1 dead-token swaps** — review per file or per token? (Default: per token, with user spot-check on N samples.)
- **Phase 5** — embed reference images inline in composition cards, or sidebar overlay? (Decide when we get there.)

---

## Resume hints (for post-compact recovery)
- This file = source of truth. Read it first.
- Current state file: `.planning/unification-data.json` (interim, gets replaced in Phase 4)
- Atom registry: `.planning/atoms.json` (Phase 2 output, updated through Phase 3.2)
- Live sink: `bun sink.js` → http://localhost:3000 (or use `mcp__Claude_Preview__preview_start` with name `sink`)
- Codex helper: `scripts/codex-task.sh`
- Phase status: see git log + `.planning/codex-runs/` (per-task outputs)

## Where we are (as of 2026-05-17)
Phase 3.2 promotions DONE (5 commits, 4 atoms promoted):
- panel-floating-label canonical (.panel + .panel-label in _card.css)
- labelled-state-frame canonical (.state-frame + .state-pin in _card.css)
- knob-rotary canonical (.knob.knob--{arc|ring}.knob--{range|boolean|options|button})
- preset-row canonical (matches drawer treatment)
Plus: drawer faux-knob purged, sink Tokens-section deleted (single source of truth via specimen cards).

Phase 3.2f deferred (SVG sprite — optimisation, not drift fix).

Next up:
1. **Phase 4** — write codex goals-prompt, dispatch, review diff, commit.
2. **Phase 5** — write codex goals-prompt (ask user inline vs side-by-side first), dispatch, review, commit.
