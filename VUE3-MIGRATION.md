# Emotitone — Vue 3 Migration Brief

Convert the static-HTML specimen cards in `project/preview/` into a Vue 3 component library using the Composition API. The destination app that consumes these designs is also Vue 3 Composition.

## What's in the repo

| Path | Role |
|---|---|
| `project/preview/*.html` | 26 specimen cards. Each is a self-contained HTML file with inline `<style>` and (occasionally) inline `<script>`. Built for static viewing — no build step, no imports. **These are the source artifacts to convert.** |
| `project/preview/_card.css` | Shared card chrome (the wrapper, labels, swatches, brass utility). Imported by every specimen. |
| `project/colors_and_type.css` | **Single source of truth for design tokens** — colors, type scale, spacing, radii, motion (durations, easings, named keyframes like `brass-sheen`, `beat`, `cut-slide-in`, `smear`, `flash`, `flash-ring`, `cross-fade-rip`). |
| `project/README.md` | Brand system (palette rules, typography, motion, layout, copy voice). |
| `project/ui_kits/mobile/` | A React 18 + CDN-Babel mobile UI kit from a prior phase. **Decide with the user whether to port this to Vue or delete it.** It is not part of this migration's required scope. |
| `sink.js` | Bun-served kitchen-sink page at `localhost:3000` that inlines and groups all specimens by tier (Tokens · Primitives · Compounds · Unique · Compositions). The tier+family schema is inlined in the top of `sink.js`. Useful for visual reference during conversion. Replace with Vite dev server once Vue port is up. |
| `CLAUDE.md` | Doctrine and constraints. **Read this first.** |

## Mission

Convert each card in `project/preview/` into a Vue 3 SFC under a new directory (suggested: `src/components/`). The component library should:

1. Preserve the **visual fidelity** of each specimen (positions, sizes, motion, color discipline)
2. Use **`<script setup>`** Composition API (no Options API)
3. Use **`<style scoped>`** for component-local CSS (the global token system stays in `colors_and_type.css`)
4. Expose **props** for the parameterizations the specimen card demonstrates
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

## The four-tier model — full inventory

The static cards are organized into four tiers. Each row below: source file → suggested Vue SFC → one-line role → primitives it consumes (use this to order conversion: a card with no `consumes` line is a leaf and can be converted first; cards with consumes need their dependencies built first).

### TOKEN — design system primitives (not Vue components)

These are reference cards documenting `colors_and_type.css`. **Do not convert as runtime components.** Either skip or render as Storybook-style docs:

| Source | Documents |
|---|---|
| `tokens-ui-colors.html` | Chrome token set — neutrals + the one lit signal. |
| `tokens-brand-colors.html` | Five flat fills for poster, sticker, and brand use only. |
| `tokens-music-colors.html` | Interactive OKLCH music color recipe for chromatic feedback. |
| `tokens-typography.html` | Typeface samples, type ramp, tracking, and usage rules. |
| `spacing-scale.html` | Eleven-step spacing scale from 2px to 64px. |
| `spacing-radius.html` | Radius tokens from XS through XL plus pill. |
| `tokens-geometry.html` | Clip-paths, transforms, shadows, and stroke caps as named recipes. |
| `tokens-motion.html` | Beat, durations, easings, and named keyframes in one card. |

### PRIMITIVE — single visual atoms (convert first, no internal dependencies)

| Source | Vue SFC | Role |
|---|---|---|
| `components-kicker.html` | `Kicker.vue` | Colored square plus mono all-caps scope label. |
| `components-marks.html` | `Marks.vue` (or split into `MarkRule`, `MarkBullet`, …) | Two mark families — structural and notational. |
| `components-badge.html` | `Badge.vue` | Lets Jazz wordmark in a sharp wire box. |
| `components-keys.html` | `Keys.vue` (`format="syll \| deg \| raw"` prop) | Diatonic cut-paper key clips for the main octave. |
| `components-buttons.html` | `IconButton.vue` (variant + size props) | Icon button system — roles and sizes. Used by pattern-card + drawer + many compositions. |
| `components-knobs-digital.html` | `KnobDigital.vue` (arc family — bipolar, unipolar, lit/unlit) | Arc / flat indicators — range, boolean, options, button. |
| `components-knobs-analog.html` | `KnobAnalog.vue` (ring family) | Seated ring indicators with conic sweep. |
| `components-tabs.html` | `Tabs.vue` (off-cut clip-path variants) | Skewed ivory active tab with hard paper geometry. |
| `components-card.html` | `Card.vue` | Fundamental card shell — panel, floating label, decoration-mark slot, title, body. |
| `components-spine-card.html` | `SpineCard.vue` + `PresetRow.vue` (separate component composing SpineCard) | Brand-marked card shell. Preset-row variant is a horizontal layout with an apply button on the right. |
| `components-beat-indicator.html` | `BeatIndicator.vue` | N-cell row that ticks the bar; downbeat strobes brass. Consumes hoisted `beat-cell` + `beat-down` keyframes. |
| `components-bar-tape.html` | `BarTape.vue` (`:segments`, `:playhead`, dim/lit state) | Chromatic 7-segment tape — music-feedback strip. |

### COMPOUND — fixed primitive assemblies

| Source | Vue SFC | Consumes |
|---|---|---|
| `components-pattern-card.html` | `PatternCard.vue` (`shape="sleek \| expanded"` prop). Sleek = header + `<BarTape />` footer. Expanded = header + `<CodeStrip />` (no bar-tape). | `<BarTape>`, `<CodeStrip>`, `<IconButton>`, `<Kicker>`, `<Card>` |
| `composition-pattern-reel.html` | `PatternReel.vue` (the live composition that uses pattern-cards) | `<PatternCard>`, `<IconButton>`, panel-floating-label |

### UNIQUE — one-of-a-kind specimens

| Source | Vue SFC | Notes |
|---|---|---|
| `brand-logo.html` | `BrandLogo.vue` | Emotitone wordmark with solfège subtitle and note glyphs. Consumes `music-glyph` recipe. |
| `composition-brand-cover.html` | `BrandCover.vue` | Brand hero composition. Consumes kicker-dot, poster-shape, music-glyph, filemark-stamp, decorative-scatter, meta-anno-row. |
| `components-code-strip.html` | `CodeStrip.vue` | Strudel notation row — props: `mode` (`solfege \| degree \| raw`), `notes[]`, `durationFormat` (`numeric \| stacked \| width-bar`), `density` (`normal \| dense`). 9 variants demonstrated. |
| `components-drawer.html` | `Drawer.vue` | Sliding panel — `anchor` prop (`top \| bottom`), drag-to-resize with three snap points (closed / designed / full). Working pointer-event drag logic exists in the source — port it, don't reimplement. |

### COMPOSITION — full app screens / regions

| Source | Vue SFC | Consumes |
|---|---|---|
| `brand-loading-screen.html` | `LoadingScreen.vue` | tilted-sticker, beat-pulse, brass-sheen, button-paper-pill |
| `composition-drawer.html` | `TopDrawer.vue` | `<Drawer anchor="top">` plus instrument-picker / visual-config content panels (drawer-from-ceiling, torn-paper-edge, segmented-control, preset-row, panel-header-with-tape, tile-solfege) |
| **MISSING** | `BottomDrawer.vue` | A `<Drawer anchor="bottom">` housing the pattern-reel + keys. The user flagged this as Wave 4 work that wasn't built. Either build it as a new composition during the Vue port, or leave as a follow-up. |

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

## Conversion order (dependency-respecting)

1. **Tokens.** Drop `colors_and_type.css` into `src/styles/`, verify Vite serves it, verify a smoke-test component can read `var(--ivory)`.
2. **Primitives** (in dependency order — leaves first):
   - `Card`, `Kicker`, `Badge`, `Marks` (no consumes)
   - `IconButton` (uses brass-sheen keyframe)
   - `BarTape`, `BeatIndicator` (consume music + motion tokens)
   - `Tabs`, `Keys`
   - `KnobDigital`, `KnobAnalog`
   - `SpineCard`, then `PresetRow` (composes SpineCard)
3. **Unique**: `CodeStrip`, `Drawer`, `BrandLogo`, `BrandCover`
4. **Compounds**: `PatternCard` (needs BarTape + CodeStrip + IconButton + Kicker + Card)
5. **Compositions**: `LoadingScreen`, `TopDrawer` (needs Drawer + many subparts), `PatternReel` (needs PatternCard), `BottomDrawer` (new — needs Drawer + PatternReel + Keys)

## Per-component conversion checklist

For each card:

1. Open the source HTML at `project/preview/<card>.html`
2. Open the rendered card at `http://localhost:3000/#card-<name>` (run `bun sink.js` from repo root) — keep this open as your visual diff target
3. Extract the `<style>` block → component's `<style scoped>` block (strip the `_card.css` reset chrome — Vite's app shell + the global token import replace it)
4. Extract the `<body>` content → `<template>`
5. Extract any inline `<script>` → `<script setup>` (translate vanilla event listeners to Vue refs / `@click` / `onMounted`)
6. Identify the parameterizations the specimen card demonstrates in its "Variants" section → expose as props with TypeScript types
7. Write a docs example or Storybook story showing the variants the original card showed
8. Visual diff against `localhost:3000/#card-<name>` — match positions, sizes, motion, color

## Landmines (specific gotchas)

- **`components-drawer.html` has working pointer-event drag-to-resize logic.** Port it to Vue refs + `usePointer` (or a custom `useDrag` composable). Don't reimplement from scratch — the snap-to-three-points logic (closed / designed / full) is intentional.
- **`components-pattern-card.html` has two shape props.** The current card shows both stacked in its hero. In Vue, one `<PatternCard>` instance picks a shape; document both in a story. Critically: **expanded shape does NOT show bar-tape** (the bar-tape footer is sleek-only).
- **`composition-pattern-reel.html` has click-to-promote interactivity** between stacked sleek cards and an active expanded card at the bottom. Port the state to a `ref(activeId)` in `PatternReel.vue` that flips children's `shape` prop.
- **`components-code-strip.html` has 9 variants** including stacked-duration (note-glyph on top, duration value below — decimal `@0.xx` form, not literal music-theory fractions). Don't drop variants — expose them via the `durationFormat` and `mode` props. Chord-brace variant uses ivory + Lets Jazz (NOT brass).
- **`components-spine-card.html` has a "preset-row" variant section** at the bottom — a horizontal layout with an apply button on the right. In Vue, this is probably better as a separate `<PresetRow>` component composing `<SpineCard>` rather than a prop overload.
- **`brand-loading-screen.html`** predates the Phase 8 Wave 2/3 doctrine. **Audit it against the doctrine cheat sheet before treating its visuals as canonical.** Some of its decorations may need revision during the port.
- **`composition-drawer.html`** has working JS handlers for drawer open/close via delegated clicks + ESC. Port the state to a parent `ref(open)` and emit events; don't ship a global window listener.

## Suggested execution pattern — Codex 5.5 builds, Opus reviews

The mechanical HTML → Vue SFC translation is well-suited to **Codex 5.5 (GPT-5.5 via Codex CLI) running with `--reasoning high`** (or `xhigh` if the conversion needs careful prop-API decisions). Codex is methodical, fast, and reliable on framework-conversion work. The risks are:

- **Visual fidelity drift** — Vue scoped CSS subtly changes selector specificity vs the cards' inline styles
- **Design doctrine violations** — the audit-driven rules above (color discipline, brass-lit-once, motion-token usage) are not enforceable mechanically
- **Prop API decisions** — sometimes a primitive's "variants" are better expressed as discriminated-union props, sometimes as separate components

A two-pass workflow works well:

1. **Codex 5.5 (high reasoning)** does the conversion, one card at a time, against this brief
2. **Opus 4.x** reviews each converted SFC against:
   - The source HTML card at `localhost:3000/#card-<name>` (must match visually)
   - The Doctrine section above (color discipline, motion tokens, reduced-motion guards, no emoji)
   - The prop API (does it expose every variant the source card demonstrated?)
   - The dependency graph (does it import the right primitives instead of duplicating their CSS?)

Codex commits one converted component per commit; Opus reviews the commit and either approves or files specific fix instructions. The user lands the merge.

## Outstanding architectural decision

`project/ui_kits/mobile/` is React 18 with CDN-loaded Babel. Two options:

1. **Port to Vue 3** — convert the components to match the new SFC library
2. **Delete** — it was a prior phase's artifact and may not be needed

**Surface this question to the user early in the migration session.** Don't decide silently.

## What to do first in the next session

1. Read `CLAUDE.md`, `project/README.md`, this file
2. Skim `project/preview/components-spine-card.html` (smallest grammar-compliant primitive) — see the conversion shape end to end
3. Skim `project/preview/composition-pattern-reel.html` (largest composition) — see what the destination size feels like
4. **Ask the user**: (a) where the new Vue project should live (subdirectory in this repo, or a separate repo); (b) what to do with `ui_kits/mobile/`; (c) TypeScript yes/no; (d) whether to use Storybook for the docs/variant gallery
5. Init Vite + Vue 3 + (optionally) TypeScript, wire up the token CSS, ship `Card.vue` as the smoke test
6. Continue down the conversion order
