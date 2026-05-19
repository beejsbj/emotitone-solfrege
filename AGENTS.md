# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this repo is

A design system handoff bundle for **Emotitone** — a touch-first, mobile-first solfège music sketchpad with a "cut-paper jazz, lit by a synth" visual identity. The deliverable is a set of self-contained HTML specimen cards in `project/preview/`, plus a React-based UI kit in `project/ui_kits/mobile/`.

There is no build step. Preview cards are static HTML/CSS. The mobile UI kit uses React 18 via CDN Babel (no npm). The kitchen sink is served by a Bun server.

## Dev server (kitchen sink)

```bash
# From repo root — starts Bun server with live reload at http://localhost:3000
bun sink.js
```

`sink.js` builds the kitchen sink page on every request by reading and inlining all card files — no iframes, one DOM, instant render. It also watches `project/` and pushes a WebSocket reload to the browser on any file save.

Individual cards can still be opened directly via `http://localhost:3000/preview/<card>.html`.

## Key files — read these before touching anything

| File | Role |
|---|---|
| `project/colors_and_type.css` | **Single source of truth for all tokens.** Neutrals, brass, jazz accents, chromatic note palette, type scale, spacing, radii, motion. Never invent new tokens — add here first. |
| `project/preview/_card.css` | Card chrome shared by every specimen (`@import`s `colors_and_type.css`). The `.card`, `.label`, `.swatch`, `.brass`, `.brass-text` utilities live here. |
| `project/handoff-done.md` | Historical brief: design philosophy, four-tier decomposition model, already-shipped card list, and the recipe for making a new card. Reference if you need context on decisions already made. |
| `project/README.md` | Full brand system: palette rules, typography, motion, layout, iconography, copy voice. |
| `project/SKILL.md` | Skill manifest — invoked as a Codex skill when working on Emotitone design tasks. |

## Architecture

### Two-layer palette rule (enforced everywhere)
- **Ink/ivory** = UI chrome. `--ink` through `--ink-5`, `--ivory` through `--ivory-4`, `--glass`, `--hairline`, `--ring`.
- **Chromatic notes** (`--note-do` … `--note-ti`) = music feedback only. Keys, particles, scope lines, popups. Never static UI.
- **Brass** = one lit accent per panel, max. Always via the `.brass` class (gradient + sheen animation), never flat `--brass` as a fill.
- **Jazz accents** (`--tomato`, `--saffron`, `--plum`, etc.) = decorative only. Splash, empty states, brand stickers, kicker dots. Never functional chrome.

### Four-tier specimen model
Every card in `preview/` is exactly one of:
1. **Primitive** — single element, all states (rest / hover / active / disabled).
2. **Part** — fixed assembly of primitives that always travel together.
3. **Surface** — empty container showing the mechanic, with greyed placeholders.
4. **Composition** — a surface filled with specific content. File prefix: `composition-`.

When adding a card, identify its tier first. If a card covers two concepts, split it.

### Preview card structure
```html
<!doctype html><html><head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="_card.css">   <!-- always first -->
  <style>/* component-specific additions only */</style>
</head><body>
  <div class="card">
    <div class="label">Component Name</div>
    <!-- specimen content -->
    <div class="caption">description</div>
  </div>
</body></html>
```
Card width is fixed at 700px by `_card.css`. Don't override this.

### Mobile UI kit (`project/ui_kits/mobile/`)
React 18 + JSX via CDN Babel transform (no npm, no bundler). Entry point: `index.html`. Components split across `app.jsx`, `components.jsx`, `keyboard.jsx`, `drawer.jsx`, `scope.jsx`, `ios-frame.jsx`. The kit imports `../../colors_and_type.css` — all token changes automatically apply.

## Motion rules (non-negotiable)
- **`--beat` (500ms = 120bpm)** drives the global pulse. UI breathes on the kick via `beat-pulse` keyframe.
- Use the named ease/duration tokens only — never write raw `cubic-bezier` values inline. The "horn section": `--ease-swing` / `--ease-stab` / `--ease-brush` / `--ease-sustain` / `--ease-bend`. Duration scale: `--dur-tap` (90ms) / `--dur-ui` (220ms) / `--dur-panel` (360ms) / `--dur-scene` (600ms).
- Off-cut tab transitions: `cut-slide-in` keyframe + `clip-path: polygon(...)` — see `.cut-tab` in `colors_and_type.css`.
- Drawers slide (`--ease-paper`, `--dur-panel`); never fade.
- Add `@media (prefers-reduced-motion)` guards: beats become opacity-only.

## Aesthetic checklist for new cards
- Ivory default text (`--ivory` / `--fg`), brass for one lit signal max.
- Butt stroke caps on SVG lines (not round).
- Tiny per-tile rotation (`.tile:nth-child(n) { transform: rotate(±0.2–0.5deg); }`) — hand-cut feel, not stamped.
- Mono captions (`var(--t-caption)`, `--font-mono`), uppercase labels (`var(--t-label)` + `--tracking-label`).
- Sharp corners on poster/badge elements (`border-radius: 0` or `var(--r-xs)`). Hardware panels use `var(--r-sm)`–`var(--r-md)`.
- `--ring` (inset 1px hairline) for surface separation — not outer drop shadows.

## Current focus

Systematically tightening the design across all specimen cards — reviewing each card for visual consistency, token compliance, and aesthetic quality against the checklist above.

## Neutral palette — how ivory replaces cream

The current system has **no cream/paper fills**. v2 used `--paper` (`#f1e9d8`) as a lit foreground panel; the current system dropped it entirely. The light neutral is **ivory**, a four-step scale:

| Token | Hex | Role |
|---|---|---|
| `--ivory` | `#F4EFE6` | Primary text, h3, active labels |
| `--ivory-2` | `#C9C2B5` | Secondary text, subdued values |
| `--ivory-3` | `#8E867A` | Meta, muted labels, captions |
| `--ivory-4` | `#514B42` | Disabled, decorative (e.g. the large ordinal in a card) |

When a v2 spec or description says "cream" or "paper", translate to the appropriate ivory step. Never use `--paper`, `--bone`, or `--paper-rise` on functional UI chrome.

## Floating-label card pattern

The `components-card.html` specimen documents this Part-level pattern:
- Card: `--ink-3` bg, `1px solid --ink-5` border, `position: relative`, `margin-top: 14px`
- Floating label (CSS `::before` via `data-label`): `position: absolute; top: -10px; left: 14px`, background `var(--ink)` so it clips into the border like a folder tab, `10px JetBrains Mono`, `--ivory-3`, `letter-spacing: 0.18em`, uppercase
- Large faint ordinal: `52px Lets Jazz`, `--ivory-4`, `position: absolute; top: 8px; right: 12px`

## What NOT to do
- Don't use cream or paper fills on any UI chrome. Ivory is the light neutral.
- Don't switch to v2's cream/paper foreground panels. Everything lives on the dark stage.
- Don't invent new color variables. Palette is closed in `colors_and_type.css`.
- Don't put two unrelated concepts on one card.
- Don't add long-form doc pages. Specimen cards only.
- Don't use emoji anywhere in the UI or copy.
