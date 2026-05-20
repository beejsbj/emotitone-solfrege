# Emotitone — Vue 3 Migration Brief

Convert the static-HTML specimen cards in `project/preview/` into a Vue 3 component library using the Composition API. The destination app that consumes these designs is also Vue 3 Composition.

## What's in the repo

| Path | Role |
|---|---|
| `project/preview/<tier>-<name>.html` | 28 specimen cards. Each filename starts with its tier (`token-`, `primitive-`, `compound-`, `unique-`, `composition-`) — the tier IS the source of truth. Each card is self-contained HTML with inline `<style>` and (occasionally) inline `<script>`. **These are the source artifacts to convert.** |
| `project/preview/_card.css` | Shared card chrome (the wrapper, labels, swatches, brass utility). Imported by every specimen. |
| `project/colors_and_type.css` | **Single source of truth for design tokens** — colors, type scale, spacing, radii, motion. |
| `design-doctrine.md` | **The soft rules.** Read alongside this file. Defines the two-layer palette law, color discipline cheat sheet, motion grammar, the four-tier model, and everything that's not enforceable by lint. |
| `project/README.md` | Brand system overview. |
| `project/ui_kits/mobile/` | A React 18 + CDN-Babel mobile UI kit from a prior phase. **Decide with the user whether to port to Vue or delete.** Not part of required scope. |
| `sink.js` | Bun-served kitchen-sink at `localhost:3000` that renders all specimens grouped by tier. The tier+family schema is inlined at the top. Run `bun sink.js` and keep the page open during conversion as your visual diff target. |
| `CLAUDE.md` | Project instructions. Read first. |

## Mission

For each card in `project/preview/`, produce a Vue 3 SFC under a new directory (suggested: `src/components/`) that:

1. Preserves **visual fidelity** to the source (positions, sizes, motion, color discipline)
2. Uses **`<script setup>`** Composition API — no Options API
3. Uses **`<style scoped>`** for component-local CSS; the global token system stays in `colors_and_type.css`
4. Exposes **props** for the parameterizations the specimen card demonstrates
5. Is **standalone** — a consuming app can import any primitive without dragging the whole library

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

Tier definitions live in [`design-doctrine.md`](design-doctrine.md). Here's the conversion map. Filenames in `project/preview/` already declare their tier — read them top-to-bottom in this order to respect dependencies.

### TOKEN — reference cards (NOT runtime components)

Skip these for runtime. Either ignore in the Vue port, or render as Storybook docs that reflect on `tokens.css`.

| Source | Documents |
|---|---|
| `token-ui-colors.html` | Chrome token set — neutrals + the one lit signal. |
| `token-brand-colors.html` | Five flat fills for poster, sticker, and brand use only. |
| `token-music-colors.html` | Interactive OKLCH music color recipe for chromatic feedback. |
| `token-typography.html` | Typeface samples, type ramp, tracking, and usage rules. |
| `token-spacing-scale.html` | Eleven-step spacing scale from 2px to 64px. |
| `token-spacing-radius.html` | Radius tokens from XS through XL plus pill. |
| `token-geometry.html` | Clip-paths, transforms, shadows, and stroke caps as named recipes. |
| `token-motion.html` | Beat, durations, easings, and named keyframes. |

### PRIMITIVE — single visual atoms (convert first; no internal dependencies)

| Source | Vue SFC | Role |
|---|---|---|
| `primitive-kicker.html` | `Kicker.vue` | Colored square plus mono all-caps scope label. |
| `primitive-marks.html` | `Marks.vue` (or split into `MarkRule`, `MarkBullet`, …) | Two mark families — structural and notational. |
| `primitive-badge.html` | `Badge.vue` | Lets Jazz wordmark in a sharp wire box. |
| `primitive-keys.html` | `Keys.vue` (`format="syll \| deg \| raw"` prop) | Diatonic cut-paper key clips. |
| `primitive-buttons.html` | `IconButton.vue` (variant + size props) | Icon button system. Used by pattern-card, drawer, many compositions. |
| `primitive-knobs-digital.html` | `KnobDigital.vue` (arc family) | Arc / flat indicators. |
| `primitive-knobs-analog.html` | `KnobAnalog.vue` (ring family) | Seated ring indicators with conic sweep. |
| `primitive-tabs.html` | `Tabs.vue` | Skewed ivory active tab with hard paper geometry. |
| `primitive-card.html` | `Card.vue` | Fundamental card shell — panel, floating label, decoration-mark slot. |
| `primitive-spine-card.html` | `SpineCard.vue` + `PresetRow.vue` (separate component composing SpineCard) | Brand-marked card shell. Preset-row variant is horizontal with apply button. |
| `primitive-beat-indicator.html` | `BeatIndicator.vue` | N-cell row that ticks the bar; downbeat strobes brass. |
| `primitive-bar-tape.html` | `BarTape.vue` (`:segments`, `:playhead`, dim/lit state) | Chromatic 7-segment tape — music-feedback strip. |

### COMPOUND — fixed primitive assemblies

| Source | Vue SFC | Consumes |
|---|---|---|
| `compound-pattern-card.html` | `PatternCard.vue` (`shape="sleek \| expanded"` prop). Sleek = header + `<BarTape />` footer. Expanded = header + `<CodeStrip />` (no bar-tape). | `<BarTape>`, `<CodeStrip>`, `<IconButton>`, `<Kicker>`, `<Card>` |
| `compound-pattern-reel.html` | `PatternReel.vue` (live deck — click-to-promote between stacked sleek cards and an active expanded card at bottom) | `<PatternCard>`, `<IconButton>` |

### UNIQUE — one-of-a-kind specimens

| Source | Vue SFC | Notes |
|---|---|---|
| `unique-brand-logo.html` | `BrandLogo.vue` | Wordmark + solfège subtitle + note glyphs. |
| `unique-brand-cover.html` | `BrandCover.vue` | Brand hero composition. |
| `unique-code-strip.html` | `CodeStrip.vue` | Strudel notation row. Props: `mode` (`solfege \| degree \| raw`), `notes[]`, `durationFormat` (`numeric \| stacked \| width-bar`), `density`. 9 variants demonstrated. |
| `unique-drawer.html` | `Drawer.vue` | Sliding panel. `anchor` prop (`top \| bottom`). Drag-to-resize with three snap points (closed / designed / full). Working pointer-event drag logic exists — port it, don't reimplement. |

### COMPOSITION — full app screens / regions

| Source | Vue SFC | Consumes |
|---|---|---|
| `composition-loading-screen.html` | `LoadingScreen.vue` | tilted-sticker, beat-pulse, brass-sheen, paper-pill button |
| `composition-top-drawer.html` | `TopDrawer.vue` | `<Drawer anchor="top">` plus instrument-picker / visual-config panels |
| **MISSING** | `BottomDrawer.vue` | A `<Drawer anchor="bottom">` housing the pattern-reel + keys. Flagged as Wave 4 work that wasn't built. Build it during the Vue port, or leave as follow-up. |

## Conversion order (dependency-respecting)

1. **Tokens.** Drop `colors_and_type.css` into `src/styles/`, verify Vite serves it, verify a smoke-test component can read `var(--ivory)`.
2. **Primitives** (leaves first):
   - `Card`, `Kicker`, `Badge`, `Marks` (no consumes)
   - `IconButton` (uses `brass-sheen` keyframe)
   - `BarTape`, `BeatIndicator`
   - `Tabs`, `Keys`
   - `KnobDigital`, `KnobAnalog`
   - `SpineCard`, then `PresetRow` (composes SpineCard)
3. **Unique**: `CodeStrip`, `Drawer`, `BrandLogo`, `BrandCover`
4. **Compounds**: `PatternCard` (needs BarTape + CodeStrip + IconButton + Kicker + Card), then `PatternReel` (needs PatternCard)
5. **Compositions**: `LoadingScreen`, `TopDrawer` (needs Drawer + many subparts), `BottomDrawer` (new — needs Drawer + PatternReel + Keys)

## Per-component conversion checklist

For each card:

1. Open the source at `project/preview/<tier>-<name>.html`
2. Open the rendered version at `http://localhost:3000/#card-<tier>-<name>` (run `bun sink.js` from repo root) — keep this open as your visual diff target
3. Extract the `<style>` block → component's `<style scoped>` block (strip the `_card.css` reset chrome — Vite's app shell + the global token import replace it)
4. Extract the `<body>` content → `<template>`
5. Extract any inline `<script>` → `<script setup>` (translate vanilla event listeners to Vue refs / `@click` / `onMounted` / composables)
6. Identify the parameterizations the specimen card demonstrates in its "Variants" section → expose as props with TypeScript types
7. Write a docs example or Storybook story showing every variant the original card showed
8. Visual diff against `localhost:3000/#card-<tier>-<name>` — match positions, sizes, motion, color, **every variant**

## Landmines (specific gotchas)

- **`unique-drawer.html` has working pointer-event drag-to-resize logic.** Port it to Vue refs + a custom `useDrag` composable. Don't reimplement — the snap-to-three-points logic (closed / designed / full) is intentional.
- **`compound-pattern-card.html` has two shape props.** The current card shows both stacked in its hero. In Vue, one `<PatternCard>` instance picks a shape; document both in a story. Critical: **expanded shape does NOT show bar-tape** (bar-tape footer is sleek-only).
- **`compound-pattern-reel.html` has click-to-promote interactivity** between stacked sleek cards and an active expanded card at the bottom. Port the state to a `ref(activeId)` in `PatternReel.vue` that flips children's `shape` prop.
- **`unique-code-strip.html` has 9 variants** including stacked-duration (note-glyph on top, decimal `@0.xx` duration below — not literal music-theory fractions). Don't drop variants — expose via `durationFormat` and `mode` props. Chord-brace variant uses ivory + Lets Jazz (NOT brass).
- **`primitive-spine-card.html` has a "preset-row" variant section** — horizontal layout with apply button on the right. Better as a separate `<PresetRow>` component composing `<SpineCard>` than a prop overload on SpineCard.
- **`composition-loading-screen.html`** predates the Phase 8 audits. **Verify against `design-doctrine.md` before treating its visuals as canonical** — some decorations may need revision during the port.
- **`composition-top-drawer.html`** has working JS handlers for drawer open/close via delegated clicks + ESC. Port to a parent `ref(open)` and emit events; don't ship a global window listener.

## Doctrine

[`design-doctrine.md`](design-doctrine.md) is authoritative. Skim before starting, re-read when making judgment calls. Non-negotiables in one sentence each:

- Two-layer palette: UI chrome = `ink/ivory + brass`; music = `--note-*`; brand colors decoration-only
- One brass-lit signal per panel max
- Closed token palette — no new tokens
- Motion tokens, never raw `cubic-bezier`
- Drawers slide via `transform`, never fade (opacity allowed only in reduced-motion fallback)
- Reduced-motion guards on every keyframe
- Butt caps on SVG strokes
- No emoji anywhere

## Execution pattern — Opus orchestrates, Codex implements

The user runs a fresh Claude Opus session as the orchestrator/reviewer. Opus dispatches Codex as a subagent (via the `codex` CLI in `Bash`) to do the mechanical HTML → Vue SFC conversion, then Opus reviews each commit before moving on.

Why this split:

- **Codex 5.5 at `--reasoning high` (or `xhigh` for the harder ones)** is well-suited to mechanical framework-conversion. It's methodical, fast, reliable on well-trodden work.
- **Opus 4.x** is better at taste — visual fidelity verification against the source, doctrine adherence (`design-doctrine.md`), prop API expressiveness, dependency graph correctness.

### Per-component loop

1. **Opus** reads the source card, decides the prop API, writes a brief for Codex including:
   - Source filename
   - Target SFC name
   - Prop API (with TypeScript types)
   - Variants to demonstrate
   - Specific landmines from this brief
   - Doctrine reminders from `design-doctrine.md`
2. **Opus dispatches Codex** via `Bash`: `codex --reasoning high "..." > out.vue` (exact invocation depends on your codex CLI version — verify before starting)
3. **Opus reviews the output** against:
   - The source card rendered at `localhost:3000/#card-<tier>-<name>`
   - The doctrine cheat sheet in `design-doctrine.md`
   - The prop API (does it expose every variant the source demonstrated?)
   - The dependency graph (does it import other primitives instead of duplicating their CSS?)
4. **If review passes**, commit. **If it fails**, file specific fix instructions back to Codex and re-run.
5. **One component per commit.** The user merges.

Save complex prop-API decisions (Drawer, PatternCard, PatternReel, CodeStrip) for `xhigh`. Use `high` for simple primitives.

## Outstanding architectural decision

`project/ui_kits/mobile/` is React 18 with CDN-loaded Babel. Two options:

1. **Port to Vue 3** — convert the components to match the new SFC library
2. **Delete** — it was a prior phase's artifact

**Surface this question to the user early.** Don't decide silently.

## What to do first in the next session

1. Read `CLAUDE.md`, `design-doctrine.md`, this file, `project/README.md`
2. Skim `project/preview/primitive-spine-card.html` (smallest grammar-compliant primitive) — see the conversion shape end to end
3. Skim `project/preview/compound-pattern-reel.html` (largest assembly) — see what the destination size feels like
4. Run `bun sink.js` and open `http://localhost:3000` — keep it open
5. **Ask the user**: (a) where the new Vue project should live (subdirectory in this repo, or a separate repo); (b) what to do with `project/ui_kits/mobile/`; (c) TypeScript yes/no; (d) Storybook yes/no for the variant gallery; (e) confirm the Codex CLI is installed and working
6. Init Vite + Vue 3 (+ TypeScript if yes), wire up the token CSS, ship `Card.vue` as the smoke test
7. Continue down the conversion order, one card per commit, Codex implements → Opus reviews
