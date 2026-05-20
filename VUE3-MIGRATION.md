# Emotitone — Vue 3 Migration Brief

Convert the static-HTML specimen cards in `project/preview/` into a Vue 3 component library using the Composition API. The destination app that consumes these designs is also Vue 3 Composition.

## What's in the repo

| Path | Role |
|---|---|
| `project/preview/*.html` | 27 specimen cards. Each is a self-contained HTML file with inline `<style>` and (occasionally) inline `<script>`. Built for static viewing — no build step, no imports. **These are the source artifacts to convert.** |
| `project/preview/_card.css` | Shared card chrome (the wrapper, labels, swatches, brass utility). Imported by every specimen. |
| `project/colors_and_type.css` | **Single source of truth for design tokens** — colors, type scale, spacing, radii, motion (durations, easings, named keyframes like `brass-sheen`, `beat`, `cut-slide-in`, `smear`, `flash`, `flash-ring`, `cross-fade-rip`). |
| `project/README.md` | Brand system (palette rules, typography, motion, layout, copy voice). |
| `project/ui_kits/mobile/` | A React 18 + CDN-Babel mobile UI kit from a prior phase. **Decide with the user whether to port this to Vue or delete it.** It is not part of this migration's required scope. |
| `sink.js` | Bun-served kitchen-sink page at `localhost:3000` that inlines and groups all specimens. Useful for visual reference during conversion. Replace with Vite dev server once Vue port is up. |
| `CLAUDE.md` | Doctrine and constraints. **Read this first.** |

## Mission

Convert each card in `project/preview/` into a Vue 3 SFC under a new directory (suggested: `src/components/`). The component library should:

1. Preserve the **visual fidelity** of each specimen (positions, sizes, motion, color discipline)
2. Use **`<script setup>`** Composition API (no Options API)
3. Use **`<style scoped>`** for component-local CSS (the global token system stays in `colors_and_type.css`)
4. Expose **props** for the parameterizations the specimen card demonstrates (e.g. `<SpineCard mark="tomato">`, `<BarTape :segments="7" :playhead="3">`, `<Drawer anchor="top|bottom">`, `<CodeStrip mode="solfege|degree|raw" :notes="...">`)
5. Be **standalone** — a consuming app should be able to import any primitive without dragging the whole library

## Stack (recommended)

- **Vite** as the build tool
- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** for prop typing
- **Bun** as the package manager (per the user's global preference)

```bash
bun create vite@latest emotitone-ui -- --template vue-ts
cd emotitone-ui
bun install
```

Drop `project/colors_and_type.css` into `src/styles/tokens.css` and `@import` it in `src/main.ts`. Components consume tokens via `var(--token-name)` exactly as the HTML cards do today.

## The four-tier model (preserve this)

Cards in `project/preview/` are organized into four conceptual tiers. Keep the same shape in the Vue library:

### Primitives — single visual atoms

| Card | Vue component |
|---|---|
| `components-buttons.html` | `IconButton.vue` (variants: filled-brass / wire / glow; sizes; states) |
| `components-knobs-digital.html` | `KnobDigital.vue` (arc family — bipolar, unipolar, lit/unlit) |
| `components-knobs-analog.html` | `KnobAnalog.vue` (ring family) |
| `components-tabs.html` | `Tabs.vue` (off-cut clip-path variants) |
| `components-keys.html` | `Keys.vue` (v2 `.note-card` anatomy — syllable + Roman degree + raw note; `format` prop: `syll \| deg \| raw`) |
| `components-kicker.html` | `Kicker.vue` (dot + label) |
| `components-marks.html` | `Marks.vue` (structural + notational marks — likely split into `<MarkRule>`, `<MarkBullet>`, etc.) |
| `components-badge.html` | `Badge.vue` |
| `components-card.html` | `Card.vue` (base panel shell) |
| `components-spine-card.html` | `SpineCard.vue` (brand-marked card; preset-row variant via a slot or `as="preset"` prop) |
| `components-beat-indicator.html` | `BeatIndicator.vue` (N-cell bar tick) |
| `components-bar-tape.html` | `BarTape.vue` (chromatic 7-segment strip) |

### Compounds — fixed primitive assemblies

| Card | Vue component |
|---|---|
| `components-pattern-card.html` | `PatternCard.vue` with `shape="sleek \| expanded"` prop. Sleek = header + `<BarTape />` footer. Expanded = header + `<CodeStrip />` (no bar-tape). |

### Unique specimens — one-of-a-kind

| Card | Vue component |
|---|---|
| `brand-logo.html` | `BrandLogo.vue` |
| `composition-brand-cover.html` | `BrandCover.vue` (hero) |
| `components-code-strip.html` | `CodeStrip.vue` (Strudel notation row; props: `mode`, `notes[]`, `durationFormat`, `density`) |
| `components-drawer.html` | `Drawer.vue` (`anchor="top \| bottom"`; drag-to-resize with snap points: closed, designed, full) |

### Compositions — full app screens / regions

| Card | Vue component |
|---|---|
| `brand-loading-screen.html` | `LoadingScreen.vue` |
| `composition-drawer.html` | `TopDrawer.vue` (uses `<Drawer anchor="top">` + content panels for instrument picker / visual config) |
| `composition-pattern-reel.html` | `PatternReel.vue` (uses `<Drawer anchor="bottom">` + a stack of `<PatternCard />` with click-to-promote) |

### Tokens (not components)

`tokens-*.html` cards are documentation, not components. Either skip them in the Vue port, or render them as a Storybook-style docs page that reflects on `tokens.css`. Don't author them as live components.

## Doctrine to carry over (non-negotiable)

These rules came out of phase 8 audits. Keep them.

- **Two-layer palette is law.** UI chrome = `ink/ivory + brass` only. Music feedback = `--note-*` only. Brand colors (`--tomato`, `--pine`, `--plum`, `--mustard`, `--bone`) are **decoration-only** — never on functional UI primitives (buttons, knobs, tabs, keys-as-UI, card-shell, drawer).
- **One brass-lit signal per panel max.** The brass class is `.brass` (gradient + sheen animation). Use `--shadow-glow-brass` for halos; do not reinvent the glow.
- **Closed token palette.** Don't add new tokens without sign-off. Everything you need is in `colors_and_type.css`.
- **Motion tokens, not raw values.** Easings: `--ease-swing / --ease-stab / --ease-brush / --ease-sustain / --ease-bend / --ease-paper`. Durations: `--dur-tap` (90ms) / `--dur-ui` (220ms) / `--dur-panel` (360ms) / `--dur-scene` (600ms). Beat: `--beat` (500ms).
- **Drawers slide, never fade.** Use `transform: translateY()`. Opacity fade only in `@media (prefers-reduced-motion: reduce)` fallbacks.
- **Reduced-motion guards** required on every keyframe usage.
- **Butt caps** on SVG strokes (`stroke-linecap: butt`).
- **Hand-cut tilt** — tiny per-tile `transform: rotate(±0.2–0.5deg)` for the cut-paper aesthetic on poster/sticker elements.
- **No emoji** anywhere in UI or copy.
- **Ivory default text** — no cream/paper fills on functional chrome.

## Suggested conversion order

1. **Tokens.** Drop `colors_and_type.css` into `src/styles/`, verify Vite serves it, verify a smoke-test component can read `var(--ivory)`.
2. **Primitives** in this order — they have the fewest dependencies:
   `Card → SpineCard → Kicker → Badge → Marks → IconButton → BarTape → BeatIndicator → Tabs → Keys → KnobDigital → KnobAnalog`
3. **Unique specimens**: `CodeStrip`, `Drawer`, `BrandLogo`, `BrandCover`
4. **Compounds**: `PatternCard` (uses BarTape, CodeStrip, IconButton)
5. **Compositions**: `TopDrawer`, `PatternReel`, `LoadingScreen`

## Per-component conversion checklist

For each card:

1. Open the source HTML at `project/preview/<card>.html`
2. Extract the `<style>` block → component's `<style scoped>` block (strip the `_card.css` reset chrome — Vite's app shell + the global token import replace it)
3. Extract the `<body>` content → `<template>`
4. Extract any inline `<script>` → `<script setup>` (translate vanilla event listeners to Vue refs / `@click` / `onMounted`)
5. Identify the parameterizations the specimen card demonstrates in its "Variants" section → expose as props with TypeScript types
6. Write a docs example or Storybook story showing the variants the original card showed
7. Visual diff against the static card (`localhost:3000/preview/<card>.html` via `bun sink.js`)

## A few specific landmines

- **`components-drawer.html` has working pointer-event drag-to-resize logic.** Port it to Vue refs + `usePointer` (or a custom `useDrag` composable). Don't reimplement from scratch — the snap-to-three-points logic (closed / designed / full) is intentional.
- **`components-pattern-card.html` has two shape props.** The current card shows both stacked in its hero. In Vue, one `<PatternCard>` instance picks a shape; document both in a story.
- **`composition-pattern-reel.html` has click-to-promote interactivity** between stacked sleek cards and an active expanded card at the bottom. Port the state to a `ref(activeId)` in `PatternReel.vue` that flips children's `shape` prop.
- **`components-code-strip.html` has 9 variants** including stacked-duration (note-glyph on top, duration value below). Don't drop variants — expose them via the `durationFormat` and `mode` props.
- **`components-spine-card.html` has a "preset-row" variant section** at the bottom — a horizontal layout with an apply button on the right. In Vue, this is probably better as a separate `<PresetRow>` component composing `<SpineCard>` rather than a prop overload.

## Outstanding architectural decision

`project/ui_kits/mobile/` is React 18 with CDN-loaded Babel. Two options:

1. **Port to Vue 3** — convert the components to match the new SFC library
2. **Delete** — it was a prior phase's artifact and may not be needed

**Surface this question to the user early in the migration session.** Don't decide silently.

## What to do first in the next session

1. Read `CLAUDE.md`, `project/README.md`, this file
2. Skim `project/preview/components-spine-card.html` (smallest grammar-compliant primitive) — see the conversion shape end to end
3. Skim `project/preview/composition-pattern-reel.html` (largest composition) — see what the destination size feels like
4. Ask the user: (a) where the new Vue project should live (subdirectory in this repo, or a separate repo), (b) what to do with `ui_kits/mobile/`, (c) TypeScript yes/no
5. Init Vite + Vue 3 + (optionally) TypeScript, wire up the token CSS, ship `Card.vue` as the smoke test
