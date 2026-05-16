# Emotitone — Mobile UI Kit

Click-thru recreation of the Emotitone instrument/melody-sketchpad. Built against the design tokens in `../../colors_and_type.css`.

## Files

- `index.html` — interactive prototype (open this)
- `app.jsx` — root composition + state (active tab, drawer, melody loop)
- `components.jsx` — `CutTab`, `IconBtn`, `Knob`, `SoundChip`, the `useBeat` / `useBeatScale` hooks, and the `SOLFEGE` chromatic data
- `keyboard.jsx` — `SolfegeKey` and the 3-row `Keyboard`
- `drawer.jsx` — top-down `PresetDrawer` and the `PatternBar` strudel pill
- `scope.jsx` — `HilbertScope` organic visualizer for play-state
- `ios-frame.jsx` — device bezel (starter)

## What it shows

1. **Top chrome** — instrument chip, scope toggle, drawer trigger; the whole row breathes on the beat.
2. **Live status pill** — the dot is the *currently sounded note*'s color.
3. **Pattern bar** — strudel-syntax pattern with chromatic note tints.
4. **Knob row** — Key / Mode / BPM / Octave / Rows.
5. **Solfège keyboard** — three octaves; middle row is the "main" with full names; top/bottom rows show alt names.
6. **Off-cut tab strip** — Persona-5 active tab, skewed and lifted.
7. **Preset drawer** — slide-from-top, replaces the old modal/dialog pattern.
8. **Hilbert scope** — toggle the round button on the top right; the playing note's hue drives the entire visualizer.

## What's intentionally simple

- Audio is faked: a melody loop visually lights keys at half-beat. No web-audio.
- Strudel pattern is a fixed sample string.
- Drawer "Apply" only closes — there's no preset state model.

This kit is for design composition; not production code.
