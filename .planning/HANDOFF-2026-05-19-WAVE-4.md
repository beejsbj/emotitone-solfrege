# Handoff — Wave 3 done · Wave 4 prep (2026-05-19)

For the next session that picks up Phase 8 Wave 4.

## What just shipped — Wave 3 (commit `88bd7af`)

User audit-driven compound rework, then a fixup pass per user review.

| Change | File |
|---|---|
| **strips → PRIMITIVE** | `components-bar-tape.html` rewritten to grammar (9 variants) |
| **code-strip → UNIQUE** | `components-code-strip.html` rewritten to grammar (9 variants — display modes / duration / layout); schema entry under `UNIQUE/code-strip` |
| **drawer NEW PRIMITIVE** | `components-drawer.html` extracted from `composition-drawer.html`; 8 variants × top/bottom × closed/peek/partial/open; **interactive** (Option B — minimal JS delegated click handlers, ESC closes); slide via `transform`; reduced-motion fallback |
| **pattern-card consolidated** | bars-charts removed, replaced by `bar-tape` strip footer placed UNDER content; expanded shape adds embedded `code-strip` row between header and footer; play/rec buttons use `.ico.sm.geo-sharp` icon-only chips from `components-buttons.html` |
| **preset-card folded** | new "Preset row" variant section appended to `components-spine-card.html` — rest / applied (brass-lit) / expiring rows with right-aligned apply pill |
| **purged** | `components-panel-header.html`, `components-chip.html`, `components-pattern-reel.html` (redundant 2/3), `components-preset-card.html` |

Schema v4 layer counts after Wave 3: **TOKEN 8 · PRIMITIVE 13 · COMPOUND 2 · UNIQUE 3 · COMPOSITION 2**.

## Wave 3 review feedback (already incorporated)

User pass-2 feedback that landed in the same commit:

- **Drawer wasn't interactive** → now is (click handle / scrim / ESC)
- **Pattern-card bar-charts didn't belong** → replaced by bar-tape primitive embedded as footer strip under content
- **Expanded pattern-card needed code-strip** → embedded between header and bar-tape footer
- **Play button needed to respect icon-only style** → now uses `.ico.sm.geo-sharp` chip pattern
- **Code-strip is a unique specimen, not a primitive** → moved in schema

## Current PRIMITIVE inventory

| Family | Cards |
|---|---|
| decoration | Kicker · Marks · Badge |
| keys | Keyboard Keys |
| buttons | Icon Buttons |
| knobs | Knobs · Digital · Analog |
| tabs | Off-cut Tabs |
| card-shell | Card · Spine Card (incl. preset-row variants) |
| beat-indicator | Beat Indicator |
| strips | Bar Tape |
| drawer | Drawer |

## Current COMPOUND inventory

| Family | Cards |
|---|---|
| pattern-card | Pattern Card (sleek + expanded) · Pattern Reel (live composition reference) |

That's it. Wave 3 collapsed the compound layer to just one real family.

## Current COMPOSITION inventory

| Family | Cards |
|---|---|
| loading-screen | `brand-loading-screen.html` (existing) |
| top-drawer | `composition-drawer.html` (existing) |

## Current UNIQUE inventory

| Family | Cards |
|---|---|
| brand | Brand Logo |
| hero | Brand Cover |
| code-strip | Code Strip |

## What's next — Wave 4 (compositions build)

Per `my-notes.md:175-180`, the three real compositions the app needs:

> ## compositions
> - loading screen (this ought to combine with the two sections i said above were meant to be compositions)
> - top drawer (used by instrument picker and visual config)
> - bottom drawer (used by the pattern reel, the keys)

### 4.1 — Loading screen rebuild

Current `brand-loading-screen.html` exists but predates Wave 2/3 doctrine. Audit task:
- Read it; confirm it uses the current PRIMITIVE inventory correctly
- Confirm it follows the COMPOSITION grammar contract (right column = PARTS used; every entry points at a real card)
- Apply the "combine with the two sections I said above were meant to be compositions" note — the user previously discussed two sections that should fold into loading-screen. Search `my-notes.md` for context before refactoring.

### 4.2 — Top drawer composition

`composition-drawer.html` exists. Now that `components-drawer.html` is a PRIMITIVE, this composition should:
- Reference the drawer primitive in its parts list
- Stay focused on the **top-drawer** use case (instrument picker + visual config)
- Drop any per-card chrome that the new drawer primitive already encodes
- Use specimen-card-grammar COMPOSITION contract

### 4.3 — Bottom drawer composition (NEW)

No file exists yet. Build `composition-bottom-drawer.html`:
- Uses the drawer primitive in bottom-anchored variant
- Houses the pattern-reel and the keys
- Parts list: `components-drawer.html`, `components-pattern-card.html`, `components-keys.html`, and any transport buttons / kicker
- Specimen-card-grammar COMPOSITION contract

## Dispatch template for Wave 4 agents

Each agent should be briefed with:

1. Required reading:
   - `.planning/PHASE-8-BRIEF.md`
   - This handoff
   - `.claude/skills/specimen-card-grammar/SKILL.md` (COMPOSITION contract)
   - Existing `composition-drawer.html` for mechanics
   - `composition-pattern-reel.html` for mechanics
   - Every primitive cited in the composition's parts list (lift, don't paraphrase)
2. Current state of the card(s) being modified, with paths + line numbers
3. **Lift pointers** — most mechanics live in the existing compositions. Don't re-author primitives.
4. Hard rules block — same as Waves 2/3:
   - `<link rel="stylesheet" href="_card.css">` first
   - 700px card width
   - UI chrome: ink/ivory + ONE brass-lit signal; `--note-*` allowed for music-feedback content; brand colors only on categorical markers if lifted from source
   - `@media (prefers-reduced-motion: reduce)` guards
   - Reuse hoisted tokens; no new ones
   - No emoji, no paraphrasing existing implementations
   - **COMPOSITION right column = parts used, every entry references a real file in `project/preview/`**
5. Concrete output expectation + grep verification
6. **Don't commit** — orchestrator commits the wave as one snapshot
7. **Don't modify `.planning/unification-data.json`** — orchestrator handles schema

## Known carry-over

### `composition-app-reference-index.html` still inlines ~3 MB of PNG

Filtered out of the sink already. Wave 5 should either thin to thumbnails or delete.

### Dead `.stage.todo` / `.kf-stage.todo` CSS in `tokens-motion.html`

Harmless but dead. Safe to remove anytime.

### `composition-pattern-reel.html` nested under COMPOUND/pattern-card

The filename is `composition-*` but it lives under the COMPOUND group as the live reference for the pattern card primitives. If Wave 4 decides this is awkward, move it to COMPOSITION/pattern-reel — but the user has not directed this.

## Workspace state on handoff

- Sink: http://localhost:3000 (running on schema-v4 sink.js)
- Branch: `main`
- Last commit: `88bd7af` — Phase 8 Wave 3
- Pending uncommitted: none
