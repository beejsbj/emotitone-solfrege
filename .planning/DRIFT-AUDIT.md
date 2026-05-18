# Drift Audit — Cards flagged by user notes (2026-05-17)

Source: user's `my-notes.md` review pass + a haiku content audit.
**Nothing has been deleted.** This is the candidate list for user approval.

## Safe deletes — pure rehash, no unique content

These cards re-demo concepts already covered by primitives/tokens. Per user: compositions are meant to be final screen slices, not reiteration. Per haiku audit: no unique copy, atoms, or layout patterns.

| # | File | Why it's drift |
|---|------|----------------|
| 1 | `composition-motion-overview.html` | Re-demos motion easings, durations, and beat-room/tab/note interactions — all live in active motion primitive cards. |
| 2 | `composition-music-marks.html` | Glyph catalog already promoted as a primitive atom (`music-glyph`); this card is a duplicate view. |
| 3 | `composition-spacing-overview.html` | Re-shows spacing tokens + cut-paper marks. Tokens are in `spacing-scale.html`; marks in `components-marks.html`. |

## Light-rehash, candidates for deletion with claudia review

These have small reusable nuggets but are otherwise drift.

| # | File | Nugget worth extracting (per haiku) | Suggested home |
|---|------|--------------------------------------|----------------|
| 4 | `mot-compositions-beat-room.html` | 4-motion phase-lock template (strobe + pulse + bob + glow on one BPM clock). | Fold into `tokens-motion-keyframes.html` as a runtime example, or keep as the BPM-sync demo. |
| 5 | `mot-compositions-state-cascade.html` | Timing recipe (0.0s tab / 1.3s knob / 2.6s note / 4s loop) for chained interactions. | Fold into `tokens-motion-easings.html` as an applied example. |

## Compositions worth rebuilding (NOT delete)

User said the 4 real compositions are loading-screen, top-drawer, bottom-drawer. These two existing cards have content that should be folded into those rebuilds, not deleted outright.

| # | File | Disposition |
|---|------|-------------|
| 6 | `composition-pattern-reel.html` | Fold mechanic (stacked z-order, promotion interaction, roll visualizer) into the new `composition-bottom-area.html`. |
| 7 | `composition-brand-cover.html` | User did not mention. Defer — likely stays as a brand splash composition, or merges with `brand-loading-screen.html`. |

## Re-bucket, don't delete (user said "good ideas")

| # | File | Disposition |
|---|------|-------------|
| 8 | `principles.html` | Stays. Doctrine card. May relocate but not slated for deletion. |
| 9 | `components-section-anchor.html` | User: "doesn't make sense but has good ideas." Decompose its 3° tilted-label idea + chromatic tape edge into decoration primitives or geometry tokens; then card can go. |

## Surfaces section dispositions (user: "the entire surfaces section is useless")

Already covered by schema v3:
- `brand-logo.html`, `brand-tagline.html` → PRIMITIVE/brand (component-level)
- `brand-pattern.html`, `brand-stickers.html` → PRIMITIVE/brand or deferred (raw assets)
- `type-text.html` → TOKEN/typography
- `composition-app-reference-index.html` → keep as helper (not a real composition)

## Recommended action when user returns

1. Approve safe deletes (#1–#3).
2. Decide on #4–#5: fold mechanic into the new motion-keyframes card, or keep as standalone "applied motion" examples.
3. Defer #6–#7 until composition rebuild lands.
4. Confirm #8–#9 disposition.
