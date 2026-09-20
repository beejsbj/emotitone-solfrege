# EmotiTone Repository Router

For any `implementing-design-system` work that reviews, defines, tightens, promotes, adopts, or verifies a visual-design unit, invoke `$emotitone-design-system` and follow it before asking questions or editing.

The visual pass has two durable repository records:

- `src/style-guide/DESIGN_SYSTEM_TRACKER.md` — current design truth and next gate.
- `src/style-guide/DESIGN_LOG.md` — chronological acceptance and implementation receipts.

Do not use `design-lab` for this pass. Keep standalone functionality and bug fixes outside the visual-system slice. Respect the dirty tree and coordinate with adjacent unit sessions before touching shared lineage or files.

## Project Overview

EmotiTone Solfège is an interactive, mobile-first music web application that teaches solfège and music theory through intuitive, emotional experiences. It combines touch keyboard and chord performance, live Strudel notation sketching, and canvas visual effects that tie musical harmony directly to color and geometry.

## Common Development Commands

Use **Bun** as the primary package manager and runtime:

```bash
# Start development server (port 5175)
bun run dev

# Type check without emitting files
bun run type-check

# Production build (type-check + vite build)
bun run build

# Preview production build
bun run preview

# Linting with auto-fix
bun run lint

# Run all tests
bun run test:run

# Run tests in watch / UI mode
bun run test
bun run test:ui
```

## System Architecture

### Core Systems Pipeline

```text
┌─── THEORY LAYER ──────────────────────────────┐
│ Tonal.js + src/domain/harmony.ts               │
│ Scales, modes, pitch classes, chords, solfège │
└───────────────────────┬───────────────────────┘
                        │
┌─── STATE LAYER ───────────────────────────────┐
│ Pinia Stores (src/stores/)                    │
│ music, instrument, patterns, visualConfig     │
└───────────────────────┬───────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌─── AUDIO ENGINE ──────────────┐ ┌─── VISUAL & CANVAS ──────────┐
│ Superdough + Strudel WebAudio │ │ Canvas 2D / RAF Render Loops │
│ Samples, soundfonts, worklet  │ │ Blobs, strings, particles    │
│ Low-latency live voices       │ │ OKLCH Music Color mapping    │
└───────────────────────────────┘ └──────────────────────────────┘
```

- **Music Theory Layer** (`src/services/music.ts`, `src/domain/harmony.ts`): Pure theory calculations with Tonal.js, scales, modes, degree alterations, and voicing.
- **Audio Layer** (`src/services/superdoughAudio.ts`, `src/audio/live/`): Sample and soundfont synthesis via Superdough and Strudel WebAudio. Note event scheduling, articulation, and live worklet rendering.
- **State Management** (`src/stores/`): Pinia stores managing key/mode, active notes, instrument selection, recorded patterns, and visual configurations.
- **Interface & Compounds** (`src/components/`):
  - `PerformanceDeck.vue`: Primary interactive performance shell.
  - `Keyboard.vue`: Touch-optimized drawer keyboard with solfège keyfaces, octave shifting, and chord row.
  - `CodeStrip`: Strudel code strip with live notation, recording tokens, and responsive scrolling.
  - `PatternReel.vue` / `PatternStrip.vue`: Cycle and browse saved patterns.
  - `UnifiedVisualEffects.vue`: Coordinates canvas renderers (blobs, harmonic geometry, particles).

## Coding Standards & Conventions

- **Vue 3 Composition API**: Use `<script setup lang="ts">`, template, then scoped styles (if needed).
- **TypeScript**: Strict typing; place shared types/interfaces in `src/types/`.
- **Styling**: Prefer Tailwind CSS and design-system CSS variables.
- **Color Systems**:
  - UI colors must use design-system tokens.
  - Music Color is strictly derived from the OKLCH dynamic authority and its gamut-mapped adapter (`src/services/musicColor.ts`). Never introduce parallel ad-hoc color calculations.
- **Motion & Animation**: Use GSAP or RAF loops for fluid visual animations. Always respect `prefers-reduced-motion`.
- **Mobile First**: Optimize for touch interaction, responsive clamping, and mobile viewport constraints.

## Historical Documentation & Plans Archive

Archived design evidence, historical research, early audit notes, audio benchmark runs, and completed plans (e.g. modes expansion, Tone.js-era refactor PRP, stack review triage, and original notes) are preserved on the `archive/docs-and-plans` branch.
