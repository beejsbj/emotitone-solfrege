# Phase 8 — Audit Response Brief

Required reading for any agent working on Phase 8. Read this top-to-bottom before touching a card.

Source: `my-notes.md` (user's visual audit, 2026-05-18).

## North-star principles

1. **Two-layer palette is law.** UI chrome = ink/ivory + brass only. Music feedback = `--note-*` only. Brand colors (`--tomato`, `--pine`, `--plum`, `--mustard`, `--bone`) are **decoration-only** — never on functional UI primitives (buttons, knobs, tabs, keys-as-UI, card-shell, panel-header).
2. **Decompose, don't redemonstrate.** If a card re-shows tokens that already live elsewhere, that card is drift. Delete or fold.
3. **Don't rewrite — hoist.** If a primitive's behavior already lives in a motion-applied card, **lift the existing CSS/keyframes verbatim** into `colors_and_type.css` or the destination primitive. Do not paraphrase.
4. **Specimen-card-grammar is the contract.** Anatomy → Variants → Caption. Read `.claude/skills/specimen-card-grammar/SKILL.md` before refactoring a card.
5. **No new tokens.** Closed palette in `colors_and_type.css`. Adding one needs explicit user sign-off.

## Color discipline cheat sheet

| Card / family | Allowed colors |
|---|---|
| Buttons, knobs, tabs, card-shell, panel-header, hardware-bar, drawer | ink/ivory + **one** brass-lit signal |
| Keys (chromatic feedback) | `--note-*` for the playable face; ink/ivory for chrome |
| Decoration (kicker, marks, badge, section-anchor) | brand colors **allowed** — main app has no decor space, so the decoration cards earn the brand color |
| Brand (logo) | full brand palette + ivory/ink |
| Code-strip | `--note-*` for note glyphs; ivory/mono for code |
| Music colors token card | OKLCH music recipe only |

## TOKEN cards vs PRIMITIVE+ cards — different contracts

**TOKEN cards do NOT use specimen-card-grammar.** Specimen-grammar (Anatomy → Variants → Caption) is for PRIMITIVE / PART / COMPOSITION only — those layers have anatomies and variants. Tokens are below that layer.

Token cards use **standard design-system token displays**:

- **Color tokens** → swatch grids (one tile per token, with name + hex/recipe). Music colors are a special interactive recipe card — that pattern is OK.
- **Typography tokens** → type ramp (each size shown rendered at that size) + typeface samples + usage rules. No anatomy row, no variants section.
- **Spacing / radius tokens** → swatch bars or boxes (one per token, label + px value). Tight, no ceremony.
- **Motion tokens** → named-cell grid (the `tokens-motion-keyframes.html` pattern). Each cell renders the actual animation/easing/duration with a token name + tiny caption.

If you find yourself adding `section-head` "Anatomy" or `anatomy-wrap` to a TOKEN card, **stop**. Tokens are atomic — they don't decompose further on a card.

## Specimen-card-grammar quick reference

```html
<div class="card">
  <div class="label">{NAME} · {ROLE DESCRIPTOR}</div>

  <div class="section-head">Anatomy</div>
  <div class="anatomy-wrap">
    <div class="hero">{ONE LARGE CANONICAL INSTANCE}</div>
    <div class="anatomy">
      <div class="row"><b>TOKEN</b><div>recipe / rule</div></div>
      ...
    </div>
  </div>

  <div class="section-head">Variants</div>
  <div class="variants-full" style="grid-template-columns:repeat(N,1fr)">
    {variants}
  </div>

  <div class="caption">{the one-line rule}</div>
</div>
```

Shared CSS is in the SKILL.md — copy verbatim, don't paraphrase.

## Sources of truth (canonical refs)

- **Grammar canonical examples**: `project/preview/components-spine-card.html`, `components-card.html`.
- **Motion grammar gold standard**: `tokens-motion-keyframes.html` (the "4/4" the user wants 1/4–3/4 to match).
- **Keys grammar exemplar**: `components-keys.html` — Anatomy + States + Cuts + Treatments. Strip its brand-color treatments per audit.

## Where existing code lives (DON'T rewrite — HOIST)

| Concept | Lives in | Hoist to |
|---|---|---|
| `@keyframes bob` | `mot-primitives-tile-bob.html:bob`, `mot-compositions-beat-room.html:bob` | `colors_and_type.css` |
| `@keyframes lift`, `rip`, `ring` | `mot-primitives-played-flash.html` (lift+rip+ring) | `colors_and_type.css` |
| `@keyframes rip-mode`, `rip-key` | `mot-primitives-mode-rip.html` | `colors_and_type.css` (only `rip-mode`; `rip-key` is local) |
| `@keyframes strobe`, `bar-cell`, `bar-down` | `mot-primitives-downbeat-strobe.html` | `colors_and_type.css` |
| `@keyframes pulse`, `ring-flash`, `beat-cell`, `beat-down` | `mot-primitives-beat-pulse.html` | `colors_and_type.css` |
| `@keyframes tab-slide` (P5 chip + streak + curve) | `mot-primitives-tab-slide.html` | merge into `components-tabs.html` as a CUT variant |
| **Beat indicator** (4-cell row, downbeat brass-lit) | `mot-primitives-beat-pulse.html:51-76` (`.beats`, `.beats b`, `beat-cell`, `beat-down`) | new `components-beat-indicator.html` PRIMITIVE |
| `@keyframes brass-sheen` | already in `colors_and_type.css:334` | — |
| `@keyframes beat` | already in `colors_and_type.css:288` | — |
| `@keyframes cut-slide-in` | already in `colors_and_type.css:297` | — |

For TODOs in `tokens-motion-keyframes.html` (smear, flash, glow, paper-rip-flash, cross-fade-rip): these were mentioned by name but never coded. If you can find a real implementation in any motion-applied card, lift it. Otherwise leave the TODO label.

## Asset bloat note (Wave 5)

`composition-app-reference-index.html` inlines ~3 MB of reference PNGs into the sink page. Wave 5 will either thin this card to thumbnails-only or remove it from the sink schema entirely. **Do not delete `project/assets/`** — those are reference material the user keeps locally.

## Drift carry-over

The following are still on disk from Phase 7 drift audit but not yet deleted. Wave 2/3 sweeps will purge them:

- `composition-motion-overview.html`, `composition-music-marks.html`, `composition-spacing-overview.html`
- `mot-compositions-beat-room.html`, `mot-compositions-state-cascade.html`
- `composition-pattern-reel.html`, `composition-brand-cover.html`
- `principles.html`, `components-section-anchor.html`, `components-solfege-tile.html`
- All 6 `mot-primitives-*.html` (after Wave 1e keyframe hoist completes)
- `components-pattern-reel.html`, `components-preset-card.html`, `components-panel-header.html`, `components-chip.html` (hardware bar)
- `brand-pattern.html`, `brand-stickers.html`, `brand-tagline.html` (tagline folds into logo)

## Hard rules every agent must follow

- `<link rel="stylesheet" href="_card.css">` first in `<head>`.
- Card width fixed at 700px by `_card.css` — don't override.
- Ivory default text; brass only when lit; never cream/paper.
- Butt caps on SVG strokes.
- `@media (prefers-reduced-motion: reduce)` guards on all keyframe usage.
- No emoji anywhere.
- Don't invent tokens. Don't paraphrase implementations that already exist — lift them.
- Don't claim work is done without running it past `_card.css` import order, grammar markers (`section-head`, `anatomy-wrap`, `variants-full`), and color discipline.
