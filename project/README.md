# Emotitone Design System

> **Cut-paper jazz, lit by a synth.**
> A touch-first, mobile-first immersive instrument & melody sketchpad.

Emotitone is a music-learning / melody-sketchpad app where playing notes triggers
an immersive, color-driven sensory layer (particles, hilbert scopes, ambient
washes, beating shapes). The visual identity collides two worlds:

- **Mid-century cut-paper jazz collage** — torn paper, off-cut tabs, hand-cut
  shapes, ivory paper textures, posterized red/yellow/purple accents, instrument
  silhouettes, "LET'S JAZZ!" energy.
- **Noir-neon synth UI** — a near-black, high-contrast UI shell where chromatic
  music color is the *only* color. Color belongs to MUSIC.

The UI itself is **black & white with a paper-warm off-white**. The 12-note
chromatic palette is reserved for the music feedback layer: keys, particles,
strings, popups, scope lines. This intentional split is what makes the colors
mean something — every hue you see is a scale degree you've heard.

---

## Sources used to build this system

- **Codebase:** `github.com/beejsbj/emotitone-solfrege` (Vue 3 + TS + Tone.js +
  Tonal.js + GSAP + Tailwind). Read directly via the GitHub connector — color
  system in `src/composables/useColorSystem`, solfège data in
  `src/data/solfege.ts`, drawer keyboard in `src/components/DrawerKeyboard.vue`,
  hilbert scope in `src/components/UnifiedVisualEffects.vue`.
- **Brand asset board** — see `assets/aesthetic-board.png` (the user's mood
  board, source of the cut-paper / let's-jazz / palette direction).
- **Live screenshots** — `assets/play-state-*.png`,
  `assets/screen-keyboard-locrian.png`, `assets/screen-instrument-picker.png`,
  `assets/screen-config-presets.png`, `assets/loading-splash.png` — captured
  from the running app, in play state.
- **Font:** `fonts/lets-jazz-regular.woff2` — the brand display face.

---

## Index — files in this folder

| File / Folder                  | Purpose                                                 |
|--------------------------------|---------------------------------------------------------|
| `README.md`                    | This document                                            |
| `colors_and_type.css`          | All design tokens — neutrals, chromatic notes, type, motion |
| `fonts/`                       | `Lets Jazz` woff2                                        |
| `assets/`                      | Mood board, screenshots, play states                     |
| `preview/`                     | Cards rendered into the Design System review tab         |
| `SKILL.md`                     | Agent-skill manifest (compatible with Claude Code skills)|

---

## CONTENT FUNDAMENTALS — voice, copy, tone

Emotitone is **playful, condensed, and unapologetic.** It addresses the player
directly, like a musician on stage talking to the room. Copy is short, rhythmic,
and rarely punctuated. Headlines are ALL CAPS in the Lets Jazz face; UI labels
are short SMALL-CAPS-styled tokens.

**Voice principles**

- **Imperative & direct.** "Play.", "Learn.", "Emote.", "Repeat." — the brand
  tagline. Verbs do the heavy lifting.
- **Musician-to-musician.** Use solfège ("Do", "Re", "Mi…"), interval names
  ("3M", "7m"), key+mode notation ("E LOCRIAN", "C MAJOR · 3"). Never explain
  in beginner-speak unless inside an onboarding tooltip.
- **Lower-case for chrome, UPPER for headlines and STATE chips.**
  Chrome reads `piano · c major · 3 · 7d left`; headlines read `EMOTITONE`,
  `JAZZ IS FEELING MADE VISIBLE.`
- **No emoji.** Music symbols (♩ ♪ ♫ # ♭) and bracketed code marks
  (\`< { Do@0.282 ~@0.041 Ra } >\`) carry the personality instead.
- **Numbers are characters.** `120 BPM`, `49`, `100%` — set in the display face
  at large size, treated like poster numerals.
- **You, not we.** "Stop playback", "Apply", "Drop sample here." Microcopy
  speaks to the player, never on behalf of the brand.

**Tone of voice — examples from the product**

| Surface           | Live copy                                              |
|-------------------|--------------------------------------------------------|
| Loading splash    | `EMOTITONE` / `solfège learning` / `audio system · all instruments · visual engine · midi ready: iac driver bus 1` / `▶ play` |
| Live strip header | `piano · c major · 3 · 7d left` |
| Preset card       | `SOFT GLASS  [ apply ]` |
| Tab labels        | `anim · freq · color · popup · scope` |
| Sound picker tab  | `sound · all sounds · 992` |
| Tagline           | `Jazz is feeling made visible.` |
| CTA tagline       | `play. learn. emote. repeat.` |
| Instrument chip   | `contrabass`, `clavinet`, `music box`, `steinway` |

**Casing rules**

- Display/headline: ALL CAPS, tracked +0.01em.
- UI labels (knob captions, tab text, chip text): UPPERCASE, tracked +0.14em.
- Body / tooltips / metadata: lower-case, no period.
- Code/pattern strings: monospaced, lower-case, never paraphrased.

---

## VISUAL FOUNDATIONS

### Palette
Two systems, one rule: **color is musical, neutrals are functional.**

- **Neutrals (UI shell):** `--ink` `#0a0a0a` (page), `--ink-2/3/4/5` for surfaces
  & dividers, `--ivory` `#f6f1e6` for paper text, `--ivory-2/3/4` for hierarchy.
- **Jazz accents (sparingly):** `--tomato` `#d8362a`, `--saffron` `#f2b134`,
  `--plum` `#6b3fa0`, `--bone` `#efe6d0`. Only on brand artifacts (logo, splash,
  empty-state stickers, posters), never on functional UI.
- **Chromatic notes (12):** `--note-do … --note-ti`, hsl-based, hue-rotated by
  semitone. These are the *only* colors used for music feedback — keys, popups,
  scope lines, particles, beat shapes, strudel string highlights.

### Type
- **Display:** `Lets Jazz` — a condensed, slightly chiseled poster face. ALWAYS
  uppercase, tracked +0.01em. Used at 22–56px for headlines and large numerals.
- **Body / UI:** `Inter` (substituted) — clean neutral sans. 13–15px for body,
  11px for labels (tracked +0.14em, uppercase to feel rubber-stamped).
- **Mono:** `JetBrains Mono` (substituted) — strudel code, timestamps, MIDI
  event lines. The bracketed pattern strings are part of the brand.

### Backgrounds
- **Default:** flat near-black `--ink` with subtle radial vignette pulled
  centerward when audio is active. Never a gradient as decoration; gradient is
  reserved for signal (e.g. note bloom).
- **Drawers/panels:** translucent black `--glass` (rgba(20 20 20 / 0.72)) with a
  16–24px backdrop blur and a 1px hairline ring (`--ring`).
- **Visual effect bed:** the `UnifiedVisualEffects` canvas sits behind
  everything, full-bleed, drawing strings (vertical scale lines), particles,
  blobs, hilbert scope. Color comes from the currently held notes.
- **Imagery:** mood-board cut-paper assets are reserved for splash, empty
  states, and brand surfaces — never as content backgrounds.

### Animation / motion (CRITICAL — this is half the brand)
The product is a rhythm-first instrument. **The UI itself beats.**

- **Tempo-locked.** Surfaces breathe on the kick: a `--beat` token (default
  500ms = 120bpm) drives a global pulse. Buttons, tab markers, brand mark, and
  empty-state chips swell ~3.5% on the beat (Hi-Fi Rush style).
- **Cut-paper transitions.** Tab swaps don't crossfade — a Persona-5-style
  off-cut sliver slides in skewed (`--ease-cut`, `cubic-bezier(.2,.9,.2,1)`,
  220ms) and snaps to true. Selected tab is visibly *off-cut*.
- **Drawers slide, never fade.** Bottom keyboard, top visual-config drawer, and
  instrument-picker drawer use `--ease-paper` (380ms slide). No modal dialogs.
- **Note bloom.** Pressing a key fires a 680ms color bloom (radial particle +
  string vibration on the matching x-position) using `--ease-swing`.
- **Reduced-motion respected** — beats become opacity-only.

### Hover / press / selected
- **Hover (pointer):** raise surface by 1 stop (`--ink-3 → --ink-4`); add a
  1px white-10% ring. Never use color.
- **Press:** instantly drop to `--shadow-pressed` and `scale(.96)` for 120ms.
  Haptic fires too on capable devices.
- **Selected:** off-cut clip-path tab, slight skew, white text, surrounded by
  the *unselected* peers which shrink ~6%. The "active" feels physically lifted
  off the page, like a torn sticker.

### Borders
- Thin hairlines only (`1px var(--hairline)` = white 10%).
- No shadow-rounded card edges with colored borders. If a card needs separation,
  use `--ring` (inset 1px hairline), never an outer drop shadow alone.

### Shadows
- Mostly inset. Keys use `--shadow-key` (inset bottom darken + top highlight) to
  feel *cut from the same paper.* Drawers get one large soft outer shadow
  (`--shadow-2`) to lift them off the visual canvas.

### Capsules vs gradients (legibility)
- Use **capsule chips** (`--ink-3` + `--ring` + 8px radius) for chrome that
  sits over the visual canvas. Gradient scrims only over the bottom 96px when
  the keyboard is closed and live patterns are scrolling.

### Layout
- **Mobile-portrait first.** Fixed elements: top settings/cog (right), sound
  picker (top-left), bottom keyboard drawer with action bar above it. The visual
  canvas occupies all space between.
- **Top-drawer for config & instrument picker** (NOT modals). They slide down
  from the status bar with a torn paper edge at the bottom.
- **Pattern reel** lives at the bottom-right of the play canvas. Stacked
  collapsed cards with metadata on the side; the active card expands to the
  full bottom strip (Skiper-16 / Skiper-53 inspired).
- **Safe areas:** respect iOS notch + home indicator; bottom keyboard sits
  above the home indicator, drawers respect the dynamic island.

### Transparency & blur
- Reserved for floating chrome only (drawers, popups, instrument chip,
  cog button). The play canvas is fully opaque.
- Blur radius = 16–24px, always paired with `--glass` and `--ring`.

### Corner radii
- `--r-xs (4)` — chips, tab triggers
- `--r-sm (8)` — buttons, knob plates
- `--r-md (12)` — cards, drawer inner panels
- `--r-lg (18)` — keyboard keys (default)
- `--r-xl (24)` — drawer outer
- `--r-pill` — knob rings, ghost buttons

### Cards
- Surface `--ink-3`, hairline ring, no outer shadow on the canvas.
- Header is a SMALL-CAPS label + numeric chip (`SOUND  [ ALL SOUNDS ]  992`).
- Action lives bottom-right as a ghost-bordered button (`[ APPLY ]`).
- Active state replaces the ghost with a filled ivory button.

### Imagery vibe
- The cut-paper / collage assets are vivid and warm: tomato red, mustard,
  plum, bone. They live ONLY on splash, brand surfaces, and decorative scrap
  pinned into corners (a torn note, a piano-key corner peel, a treble-clef
  sticker). Never inside the play UI.
- Live screenshots — the play state — are nearly black with chromatic line
  glow. The two registers (cut-paper vs noir-neon) are deliberately opposite.

---

## ICONOGRAPHY

Emotitone uses **Lucide** as the working icon set (clean 1.5px stroke,
24×24 grid). The codebase imports from `lucide-vue-next`. We mirror that here
via the Lucide CDN — see usage examples in the UI kit.

- **Stroke weight:** 1.5px. Round line caps + joins. Never filled, never duo-tone.
- **Sizing:** 16 / 18 / 20 / 24 px. Tap targets keep ≥44px container.
- **Color:** inherits `currentColor`. Default `--fg-2`; active `--fg`.
  Never hue-tinted from the chromatic palette — icons are part of the
  noir-neon UI, not the music feedback layer.
- **Decorative musical glyphs** (treble clef, eighth note, sharp, flat,
  trumpet silhouette, hand) come from the brand collage assets in
  `assets/jazz-collage.png` / `assets/instruments-spread.png`. They are
  bitmap stickers used **only on brand surfaces** — splash, empty states,
  decorative corners. Treat them like real cut-paper stickers, not icons.
- **No emoji.** No system emoji anywhere in the app or marketing.
- **Unicode music marks** (♩ ♪ ♫ # ♭ ° ø) ARE used inline with text
  (especially in code/pattern strings and inside the loading splash).

The icon font / SVG sprite directly from the codebase was not exported as a
separate file (Lucide is imported as a tree-shaken Vue package), so we link
Lucide via CDN. **Flag for the user:** if you want a curated subset baked into
the project (just the icons used by the app), let me know which surfaces and
I'll cherry-pick them out of `lucide-vue-next` into `assets/icons/`.

---

## Open questions / iteration asks

1. The Lets Jazz font is the only brand face we have — confirm you don't want a
   second decorative face (e.g. for marketing pages).
2. The chromatic note colors here are tuned by ear from the screenshots; the
   live app generates them dynamically per key. Confirm the C-major rotation
   listed here is the one to ship as the canonical preview, or paste the
   `useColorSystem` HSL recipe and I'll match exactly.
3. Lucide is a substitution — say the word and I'll cherry-pick + bake the
   actual icons used in the codebase.
4. We have *no* full-bleed photography in the brand. If you want a
   "marketing page" track later (web/landing), I'll need photo direction.
