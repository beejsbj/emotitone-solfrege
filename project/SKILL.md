---
name: emotitone-design
description: Use this skill to generate well-branded interfaces and assets for Emotitone — a touch-first, mobile-first immersive instrument and melody sketchpad with a "cut-paper jazz, lit by a synth" visual identity. Use for production work or throwaway prototypes/mocks. Contains design guidelines, colors, type, fonts, assets, and a UI kit.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files. Key starting points:

- `README.md` — brand context, content fundamentals, visual foundations, iconography, file index
- `colors_and_type.css` — drop-in CSS variables (neutrals, jazz accents, chromatic note hues, type, motion, radii, shadows)
- `fonts/` — `lets-jazz-regular.woff2` (display, free-license)
- `assets/` — logos, brand collages, b&w pattern, play-state references
- `ui_kits/mobile/` — interactive UI kit (keyboard, knobs, off-cut tabs, top drawer, hilbert scope)
- `preview/` — atomized design-system cards (one concept per file)

If creating visual artifacts (slides, mocks, throwaway prototypes), import `colors_and_type.css`, copy any assets you reference, and produce static HTML.
If working on production code, lift the tokens, the cut-paper clip-paths, and the beating-UI motion patterns directly.
If invoked without further guidance, ask the user what they want to build/design, ask focused questions (audience, surface, fidelity, animation budget), then act as an expert designer who outputs HTML artifacts or production code.

Two non-negotiables for this brand:
1. **Color belongs to music.** The chromatic 13-step palette is reserved for note feedback (keys, particles, the live-status dot, the scope tint). Static UI is ink + ivory; jazz accents are decorative only.
2. **The UI beats.** Surfaces breathe on the kick at the current BPM (`--beat`). Use the `beat-pulse` keyframes or the `useBeatScale(bpm)` hook from the mobile kit.
