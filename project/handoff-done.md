# EmotiTone Design System — Handoff Brief

## What this project is

The **Claude Design System** for EmotiTone (a solfège music-sketchpad app). The deliverable is the set of asset cards in `preview/` — each is a single self-contained HTML file registered into the design-review pane via `register_assets`, grouped into **Type / Colors / Spacing / Components / Brand**.

This is NOT a doc site. It is a kit of one-concept-per-file specimens, like a brand book with one page per token.

## Source of truth (what to read first)

| File | What's in it |
|---|---|
| `colors_and_type.css` | The actual tokens. Use these vars; don't invent new ones. |
| `preview/_card.css` | The card chrome — `.card`, `.label`, `.caption`, `.brass` utility. |
| `preview/components-knobs.html` | Aesthetic anchor — butt strokes, hand-wobble, ivory default brass rarely, per-tile rotation, mono captions. |
| `preview/components-chip.html` | Production-feeling reference — hardware bar with LEDs, 7-seg, VU, scrubber. |
| `EmotiTone Design System v2.html` | **Mine for ideas and visual moves.** Another model's full design doc. Pull forward its **shape language** — sharp corners, angular badge-style headings, kicker dots, section anchors, off-cut tabs, three-color cards, tilted poster strips. **Keep our palette** (ivory on ink, brass as the single signal). Do NOT adopt v2's cream/paper background — we stay on dark stage. |

## Design philosophy (one paragraph)

EmotiTone reads as **lit musical hardware on a dark stage**. The chrome is ink/ivory; brass is the *single* lit accent (one per panel, max). Chromatic colour belongs to music data only — note tiles, scrubbers, beat tape. Type is a duet: **Lets Jazz** display CAPS for anything voiced, **JetBrains Mono** tracked CAPS for anything measured. Edges are sharp; tiny per-element rotation keeps things hand-cut, not stamped. No gradients except brass.

## Visual moves to lift from v2

- **Angular badge headings** — display type sitting in a thin wire box, sometimes off-cut/skewed (Persona-5 swap). Use for component card labels and section anchors.
- **Kicker dot** — colored square + ALLCAPS mono kicker as the first line of a card or section.
- **Cut-paper marks** — flat poster shapes (triangle, disk, zigzag, blade) used as section anchors. Already in `components-marks.html`; reuse the vocabulary.
- **Three-color cards** — small card with a primary fill, a secondary stripe, and a tertiary corner mark. Good for category tiles, palette callouts, brand stickers.
- **Tilted poster strips** — a sub-line tilted 1–3° above a heading, like a sticker peeling off.
- **Bar-tape chromatic strip** — the only place chrome and chromatic touch (under a panel header).

## What's already shipped (in `preview/`)

- **Type**: type-display, type-text, type-mono
- **Colors**: colors-chromatic, colors-jazz-accents, colors-neutrals, colors-stage-palette
- **Spacing**: spacing-radius, spacing-scale
- **Components — primitives**: components-buttons, components-chip, components-keys, components-knobs, components-marks, components-tabs, components-badge, components-kicker, components-bar-tape, components-solfege-tile, components-pattern-card
- **Components — parts**: components-section-anchor, components-panel-header, components-code-strip, components-preset-card
- **Components — surfaces**: components-drawer, components-pattern-reel
- **Components — compositions**: composition-pattern-reel-populated, composition-drawer-instrument-picker, composition-drawer-visual-config
- **Brand**: brand-logo, brand-pattern, brand-stickers, brand-tagline, brand-loading-screen
- **Motion — primitives**: easings (horn section), durations, beating-ui, beat-pulse, tile-bob, played-flash, downbeat-strobe, mode-rip, tab-slide
- **Motion — compositions**: beat-room (four motions in sync), state-cascade (chained user flow)
- **Misc**: principles, principles-antipatterns

## Token additions

The previously-dangling `--saffron` / `--tomato` references in `colors_and_type.css` are now defined. The poster-accent block (`--saffron`, `--tomato`, `--plum`, `--grape`, `--pine`, `--coral`, `--cream`) is the canonical set for cut-paper fills, kicker dots, and pattern-card spines.

The ease tokens were aligned to v2 §06's horn-section vocabulary: `--ease-swing` / `--ease-stab` / `--ease-brush` / `--ease-sustain` / `--ease-bend`. Old names (`--ease-cut`, `--ease-paper`, `--ease-stand`) kept as aliases so earlier components don't break. Durations gained named aliases too: `--dur-tap` / `--dur-ui` / `--dur-panel` / `--dur-scene` mirror the old flick/snap/slide/bloom.

## Atomic decomposition — the modularity rule

We follow a four-tier grain. **Every card is exactly one tier**. If a card is doing two things, it's two cards.

| Tier | What it is | How to recognise it | Card shows |
|---|---|---|---|
| **Primitive** | One element, no composition. Cannot be broken down further without losing meaning. | A badge, a kicker, a dot, a single tile, a single LED, a 7-seg readout, a pull-tab, a single pattern card, a single tab. | The element alone + its state matrix (rest / hover / active / disabled / other relevant states). No surrounding chrome. |
| **Part** | A small assembly of primitives that always travels together. Removing any piece breaks the unit. | A panel header (badge + meta + icon row), a code strip (play button + sequence), a solfège tile (corner + syllable + pitch). | The part alone, sometimes with one variant row. |
| **Surface** | A full chrome container shown empty or with placeholder content — the *mechanic*, not a specific filled state. | The drawer chrome, the reel's stacking mechanic, an empty panel, a settings shell. | Container with greyed/dashed placeholders so the reader sees the affordance, not specific data. |
| **Composition** | A surface filled with specific parts — a real screen-fragment. | "Drawer with instrument picker", "Reel with six patterns", "Panel showing code strip + bar-tape". | The fully-populated state. Prefix the filename `composition-`. |

**The progression is stateless → stateful:** primitives and parts are pure (drop them anywhere), surfaces define an empty mechanic, compositions stamp specific content into a surface.

**The decomposition recipe** (use this on any v2 section to find the cards):

1. **Read the section.** Note every visual element you can name.
2. **For each element, ask: would this still mean something if I removed everything else around it?** If yes → it's a candidate primitive or part. If no (e.g. "the active resting pattern") → it's a state of a primitive, not its own card.
3. **Group by always-together.** If two primitives never appear apart and one would feel incomplete without the other, they're a part. Otherwise keep them as separate primitives.
4. **Find the container.** What's the empty shell that holds these? That's a surface. Make a card for it with placeholders.
5. **Find the interesting fills.** Each notable filled state of the surface is its own `composition-*` card.

**Worked example — v2 §08 "Pattern reel":**

- Primitives: `components-pattern-card` (single tile, state matrix), `components-kicker` (the section's kicker line), `components-pull-tab` (if the reel uses one).
- Surface: `components-pattern-reel` (the stacking/list chrome with greyed placeholders — shows the mechanic).
- Composition: `composition-pattern-reel-populated` (the reel filled with six real cards + an active one resting at the bottom).

**Worked example — v2 §05 "Panel header":**

- Primitives: `components-badge`, `components-bar-tape`, `components-icon-button`.
- Part: `components-panel-header` (badge + meta line + icon row + bar-tape underneath — they always ship together).
- Composition: `composition-panel-piano-locrian` if a specific filled example is worth showing.

When in doubt, **make the smaller card**. It's cheap to add a composition later; it's expensive to retroactively split a card that conflated two primitives.

## Cards to build next (ordered)

All 14 cards from the original list are now shipped. Next directions when the brief opens up:

- **Atom states deeper** — most primitives ship with a 4-state matrix; expand to include focus-visible, pressed, and disabled-on-disabled where it earns its keep.
- **Motion specimens** — `motion-beat` is alone in the motion group. Add cards for each named easing (Swing/Stab/Brush/Sustain/Bend), the panel-header recording strobe, and the tile played-flash.
- **Empty states** — "no patterns yet," "no MIDI device," "offline." Use the cut-paper confetti rule from v2 §07.
- **Tokens-as-cards** — easing variables, duration scale, z-stack. Currently undercovered.

Wait for the next direction before building.

## How to make a new preview card

1. Copy the closest existing card from `preview/` as scaffold.
2. Keep structure: `<link rel="stylesheet" href="_card.css">` → inline `<style>` for component-specific bits → `.card > .label + body + .caption`.
3. Use existing CSS vars only. New tokens go in `colors_and_type.css` first.
4. Aesthetic checks: ivory default, brass for one lit signal max, butt stroke caps, tiny per-tile rotation, mono captions, sharp corners (radius 0–4px on poster/badge elements, 6–14px only on hardware panels).
5. Register it: `register_assets` with `group: "Components"` (or `"Brand"` for loading, `"Type"`/`"Colors"`/`"Spacing"` as appropriate), `subtitle` describing the version, `viewport: {width: 760, height: ~600}`.

## What NOT to do

- Don't put two unrelated concepts on one card. If you're tempted, you've found two cards.
- Don't switch our palette to v2's cream/paper. Stay on dark stage with ivory.
- Don't add a long-form design doc page. Preview cards only.
- Don't invent new colours. Palette is fixed in `colors_and_type.css`.

## First message for a fresh chat

> I'm working on the EmotiTone design system (Claude Design System format, asset cards in `preview/`). Read `HANDOFF.md` first, then `preview/_card.css`, `colors_and_type.css`, and `preview/components-knobs.html` + `preview/components-chip.html` to lock in the aesthetic. Treat `EmotiTone Design System v2.html` as a quarry — mine its shape language and section ideas, but keep our ivory-on-ink palette. Then start at the top of the "Cards to build next" list: propose `components-badge` with 3–4 variants (rest, off-cut, tilted, brass-lit) before building. Wait for my OK before each card.
