# Schema v3 — User-directed unification (2026-05-17 evening)

Source: `my-notes.md` (user's manual review pass). User reviewed v2 sink, found drift, gave direction below. They are showering; we execute on safe pieces and queue judgment work.

## Headline diagnosis

> "Many ideas spread across things in various different ways. I'm trying to unify and standardize."

The current schema (v2 layer × family) still has:
- **Drift compositions** that rehash primitives (motion-overview, music-marks, spacing-overview, beat-room, state-cascade). Compositions should be **final screen slices**, not re-demos.
- **SURFACES section is useless** — every card there should regroup into a real layer.
- **Two strips sections** doing different things.
- **Keys/tiles split** — they are the same thing. Both visual styles, one primitive.
- **Decoration scattered** — kicker, marks, badge are one family ("decoration").
- **Motion split** — only beat in TOKEN, durations/easings/keyframes scattered elsewhere. User wants all motion together.
- **Geometry missing as token family** — clip-path / transform / box-shadow patterns recur across cards but aren't tokens.

## The 4 real compositions (from user notes, with screenshots)

1. **Loading screen** — `project/uploads/current-loading-scren.png`
2. **Top drawer** (3 modes: visual config, instrument picker, settings) — `open-visual-settings.png`, `open-instrument-picker.png`
3. **Bottom drawer / play surface** — `open-pattern-reel.png`, `screen-at-rest.png`, `collaped-pattern-reel-showing-current-pattern-metadata.png`
   - Contains: pattern reels (collapsed + expanded states) + enter/newline button
   - Strudel code strip + backspace/play
   - Hardware knobs row (Key/Mode/BPM/Octave/Rows)
   - Keyboard keys (the actual tiles)

Everything else under COMPOSITION is drift.

## New schema (v3)

```
TOKENS
├── color
│   ├── tokens-ui-colors.html              (existing)
│   ├── tokens-brand-colors.html           (existing)
│   └── tokens-music-colors.html           (REWRITE — see below)
├── typography
│   ├── type-display.html                  (move from TOKEN/general)
│   ├── type-text.html                     (move from SURFACE/general)
│   └── type-mono.html                     (move from TOKEN/general)
├── geometry
│   ├── spacing-scale.html                 (existing)
│   ├── spacing-radius.html                (existing)
│   └── tokens-geometry.html               (NEW — clip-path, transform, box-shadow, butt-cap, tilt)
└── motion
    ├── motion-beat.html                   (existing)
    ├── tokens-motion-durations.html       (rename from mot-primitives-durations.html)
    ├── tokens-motion-easings.html         (rename from mot-primitives-easings.html — drop "primitives" prefix)
    └── tokens-motion-keyframes.html       (NEW — catalogs ALL keyframes: pulse, strobe, rip, flash, smear, glow, slide, bob, swing, stab, brush, sustain, bend, shimmer)

PRIMITIVES (the smallest renderable consumers of tokens)
├── decoration                              (CONSOLIDATED — user said "one section that collects all decorative stuff")
│   ├── components-kicker.html              (kicker dot + label)
│   ├── components-marks.html               (structural cut-paper marks)
│   ├── components-music-marks.html         (NEW — pulled out of composition-music-marks.html)
│   └── components-badge.html               (Lets Jazz wordmark box)
├── keys                                    (MERGED — user said "keys/tiles are the same")
│   └── components-keys.html                (BOTH styles — wide-angular AND tall-long; replaces solfege-tile)
├── knobs
│   └── components-knobs.html
├── buttons
│   └── components-buttons.html             (collect ALL button variants — paper-pill, ghost-instrument, icon, play-toggle)
├── tabs
│   └── components-tabs.html                (off-cut + segmented in one)
├── card-shell
│   └── components-card.html                (the canonical floating-label card)
├── brand                                   (NEW family — moved from SURFACE/general)
│   ├── brand-logo.html
│   ├── brand-tagline.html
│   ├── brand-pattern.html
│   └── brand-stickers.html
└── motion-applied                          (the demos showing keyframes on primitives — stay, but regrouped)
    ├── mot-primitives-beat-pulse.html
    ├── mot-primitives-downbeat-strobe.html
    ├── mot-primitives-mode-rip.html
    ├── mot-primitives-played-flash.html
    ├── mot-primitives-tab-slide.html
    └── mot-primitives-tile-bob.html

PARTS (fixed assemblies of primitives that always travel together)
├── strips
│   ├── components-bar-tape.html            (the chromatic 7-segment tape)
│   └── components-code-strip.html          (Strudel notation strip with transport)
├── pattern-card                            (collapsed AND expanded — "panel" is just expanded pattern card)
│   └── components-pattern-card.html
├── preset-card
│   └── components-preset-card.html
├── panel-header
│   └── components-panel-header.html
└── hardware-bar                            (NEEDS DECOMPOSITION — currently under-listed in consumes)
    └── components-chip.html                (transport row, meters, indicators, LED dots, 7-seg numeric, scrubber)

COMPOSITIONS (only the 4 real ones — actual app screens)
├── composition-loading-screen.html         (rename brand-loading-screen.html; redesign per uploads/current-loading-scren.png)
├── composition-top-drawer.html             (rename composition-drawer.html; consolidates 3 modes)
├── composition-bottom-area.html            (NEW — pattern reels + code strip + knobs + keys per uploads/open-pattern-reel.png)
└── composition-app-reference-index.html    (helper card mapping compositions ↔ screenshots; stays)

DRIFT CARDS (mark as drift candidates; DO NOT delete yet — user approval required)
- composition-motion-overview.html          (rehashes motion primitives)
- composition-music-marks.html              (rehashes marks primitives → extract music-glyph specimen, drop composition)
- composition-spacing-overview.html         (rehashes spacing tokens)
- mot-compositions-beat-room.html           (rehashes motion in a panel)
- mot-compositions-state-cascade.html       (rehashes motion on a timeline)
- composition-brand-cover.html              (not a real app screen)
- composition-pattern-reel.html             (overlap with components-pattern-card → fold into composition-bottom-area)
- principles.html + components-section-anchor.html  (user said anchor section doesn't make sense but has good ideas — decompose into decoration)
```

## Specific user requirements for new/updated cards

### `tokens-music-colors.html` (REWRITE)
- Tied to music concepts — chromatic shows note letters (C, C#, D, …); scale shows solfège/degrees (Do Ra Re Me …).
- Interactive **root selector** — picks a root from 0..11; recipe rotates hue 0 to land there.
- Interactive **scale-count** — `--music-count: N` actually reduces the number of cells (don't just resize hue slices, drop cells).
- Toggle/range to **animate hue through the slice's range** (sweeps the cell's hue band).
- Build on existing music-color OKLCH recipe in `colors_and_type.css`.

### `tokens-geometry.html` (NEW)
- Collect clip-path patterns (off-cut tab, torn paper, mode-rip stencil) as named tokens.
- Collect transform recipes (per-tile tilt range, sticker rotation).
- Collect box-shadow recipes (inset hairline ring, lit brass ring, key fall).
- Document butt-cap rule on SVG strokes.
- Each one a swatch with the token name in mono, the visual sample on a card.

### `tokens-motion-keyframes.html` (NEW)
- Single catalog of every named keyframe in the system.
- Per the user's note: `pulse, strobe, rip, cross-fade-rip, flash, paper rip flash, smear, glow, slide, bob, swing, stab, brush, sustain, bend, shimmer`.
- Each one: name (mono caps) + brief role + small visual sample running on a default surface.

### `components-keys.html` (MERGED REWRITE)
- Replaces `components-solfege-tile.html` AND `components-keys.html`.
- Shows BOTH visual styles (tall-long classic key + wide-angular cut-paper key).
- Both styles consume the same `tile-solfege` and `key-clip-paper` atoms; this card shows the same primitive in two cut styles.

## What to execute now (parallel)

| # | Worker | Task | Risk |
|---|--------|------|------|
| 1 | codex | Rewrite `unification-data.json` to v3 schema. Move existing files only — no deletes. Mark drift cards in `_meta.drift`. | low |
| 2 | sonnet | Design `tokens-geometry.html` from atoms `clip-path`, `transform`, `box-shadow` patterns scraped from existing cards. | medium |
| 3 | sonnet | Design `tokens-motion-keyframes.html` cataloging every named `@keyframes` in `colors_and_type.css` + the motion cards. | medium |
| 4 | sonnet | Rewrite `tokens-music-colors.html` with note labels, root selector, scale-count cell-reduction, hue-range animation toggle. | medium |
| 5 | haiku | Read every drift candidate file, summarize what each contains in 2 lines, flag which content (if any) should be extracted before deletion. | low |

## What to DEFER (needs user)

- Deleting drift compositions (no reverse).
- Decomposing hardware bar (multi-atom split).
- Designing the 3 new composition cards (loading-screen redesign, top-drawer rewrite, bottom-area new). Need user judgment on layout fidelity to screenshots.
- Whether brand-pattern + brand-stickers should be PRIMITIVE or kept aside as "raw assets".
