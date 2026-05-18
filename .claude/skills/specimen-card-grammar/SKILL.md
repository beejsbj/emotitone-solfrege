---
name: specimen-card-grammar
description: Use when designing or refactoring a specimen card in project/preview/ for Emotitone. Establishes the shared hero + anatomy + variants grammar so each layer's right column reveals the cascade — PRIMITIVE shows anatomy, PART shows primitives used, COMPOSITION shows parts used.
---

# Specimen Card Grammar

The shared grammar for specimen cards in `project/preview/`. One structure, three layer-specific contracts for the right column.

This grammar serves a double purpose:
1. **As a template** — every specimen reads the same: hero on the left, spec on the right, variants below.
2. **As a litmus test** — if a card cannot fit this grammar, it is probably in the wrong layer or is drift dressed up as a primitive. Stop and reclassify before designing.

## Structure (all three contracts share this)

```html
<div class="card">
  <div class="label">{NAME} · {ROLE DESCRIPTOR}</div>

  <div class="section-head">Anatomy</div>
  <div class="anatomy-wrap">
    <!-- Hero: one canonical instance, scaled to read -->
    {HERO}
    <!-- Spec table: 78px label column, mono caps -->
    <div class="anatomy">
      {ROWS — contract differs per layer, see below}
    </div>
  </div>

  <div class="section-head">{Variants | States | Sizes | …}</div>
  <div class="variants-full">
    {variant} {variant} {variant} …
  </div>

  <div class="caption">{the one-line rule}</div>
</div>
```

- **Hero** = one canonical instance of the primitive/part/composition, scaled up so it reads. Same visual you'd be most proud to put on a wall.
- **Spec table** = mono caps rows, narrow label column. Bullet-tight, no prose.
- **Variants row** = full-width grid of smaller examples. Title can be "Variants" (default), "States" (rest/hover/active/disabled), "Sizes", "Brand variants", "Ordered series" — whatever the primitive is actually parameterized by.
- **Caption** = one or two lines of the rule that governs use: "one color per card", "always carry an ordinal", "never invert ink-on-color".

### Variants — show the toolbox

Aim for **6–10 variants** in the variants row. Twelve is fine when the primitive earns it (knobs/buttons). Don't stop at the variants the app ships today. The variants section is a style guide, not an inventory — it exists to demonstrate that the primitive *survives* the full token range.

Stretch the primitive across the toolbox:

- **High-contrast inversions** — light-on-dark default plus dark-on-ivory inverse. Both legal. High contrast reads with the mood; lean in.
- **Brass / lit signal** — show what the primitive looks like as the one lit thing on a panel. Filled brass, brass wire, brass text — at least one should appear.
- **Brand colors** — `--tomato / --pine / --plum / --mustard / --bone`. Even when the primitive is "chrome-only", one brand-color variant proves the negative space.
- **Filled vs wire** — if the primitive can be either, show both.
- **Size pairs** — sm / md / lg or 1× / 2× where it changes the read.
- **States** — rest / hover / active / played / disabled — only where state changes the visual character.

When in doubt, **add a variant rather than skip one**. A specimen with 9 variants is a richer reference than the same primitive with 4. The cost is layout time, not maintenance — once the primitive is right, the variants are pure render.

Only skip the variants section entirely when the primitive truly has one shape and the system gains nothing from showing it stretched — and even then, prefer including 2 high-contrast inverses over nothing.

## Layer contracts for the right column

The right column changes its contract by layer. This is what makes the cascade visible in the cards themselves.

### PRIMITIVE — right column is ANATOMY

The spec table enumerates the visual ingredients that *make* the primitive — tokens, type rules, geometry recipes.

Sample rows (use only what applies):

```
Panel    ink-3 · 1px ink-5 hairline · .panel base from _card.css
Label    JBM 10 · ivory-3 · clips top edge at -10px · ink bg
Mark     decoration slot top-right · 8–52px · any decoration primitive
Title    Jazz 19 upper · ivory · max 14ch · h3 semantic
Body     body-s · ivory-3 · max 28ch
Tilt     ±0.15–0.3deg per card · hand-cut, not stamped
State    hover +12% brightness · active 2px ivory inset · disabled saturate(.15)
```

Canonical example: `project/preview/components-spine-card.html`

### PART — right column is PRIMITIVES USED

The spec table lists each primitive this part consumes, with a one-line usage note. Each row is the assembly trace — the reader clicks up the chain back to the primitive.

```
Kicker      components-kicker.html      · row marker · brand dot + label
Badge       components-badge.html       · Lets Jazz wordmark · top-right slot
Bar-tape    components-bar-tape.html    · chromatic 7-segment · foot of header
Button      components-buttons.html     · icon variant · 28sq · right rail
Tabs        components-tabs.html        · off-cut · only one active per part
```

Rule: every entry must point at an actual file in `project/preview/`. If you find yourself listing a primitive that doesn't have a card, stop — either build the primitive specimen first, or the "part" is doing too much and should be split.

### COMPOSITION — right column is PARTS USED

For the four real compositions (loading screen, top drawer, bottom area, plus any future app-screen slice). The spec table lists the parts assembled into this screen.

```
Panel-header     components-panel-header.html     · top edge of drawer
Pattern-card     components-pattern-card.html     · stacked deck
Code-strip       components-code-strip.html       · between patterns and knobs
Hardware-bar     components-chip.html             · knob row + meters
Keys             components-keys.html             · diatonic row, bottom
```

Same rule: every entry must reference a card. The composition's job is *only* to wire parts together — never to invent new visuals. If a composition introduces a new primitive, that's a smell: the primitive should be promoted first.

## Shared CSS — copy verbatim into every specimen

```css
.section-head {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}
.section-head:first-child { margin-top: 6px; }

.anatomy-wrap {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  margin-top: 8px;
}
.anatomy {
  display: grid;
  align-content: start;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ivory-3);
}
.anatomy .row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ink-5);
}
.anatomy .row:last-child { border-bottom: 0; }
.anatomy .row b { color: var(--ivory); font-weight: 700; }

.variants-full {
  display: grid;
  gap: 12px;
  /* set grid-template-columns: repeat(N, 1fr) per card based on variant count */
}
```

## Non-negotiables (carry over from CLAUDE.md)

- Never invent tokens. Palette closed in `colors_and_type.css`.
- Card width fixed at 700px by `_card.css`. Don't override.
- `<link rel="stylesheet" href="_card.css">` is always first in head.
- Ivory default text. Brass only when lit. No cream / paper fills.
- Butt caps on SVG strokes. Hand-cut tilt where it earns its keep.

## Canonical references

- `project/preview/components-spine-card.html` — PRIMITIVE grammar, brand-marked
- `project/preview/components-card.html` — PRIMITIVE grammar, fundamental card with decoration-mark slot
- (PART grammar — first PART rewrite becomes the canonical example)
- (COMPOSITION grammar — landed when the 3 real compositions are built)
