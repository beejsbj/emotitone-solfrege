# Emotitone — Design Doctrine

The soft rules that govern Emotitone visuals. These are not enforceable by a linter; they require judgment. Carry them forward into every new card, every Vue component, every consuming app.

The closed token palette lives in `project/colors_and_type.css` — those are the hard rules. This document is the *taste layer* on top of the tokens.

## The four-tier model

Every UI artifact lives in exactly one tier. Filenames encode the tier (`<tier>-<name>.html` in `project/preview/`). The tier IS the source of truth — if a card moves tiers, its file is renamed.

| Tier | Definition | Decision rule |
|---|---|---|
| **TOKEN** | A reference card for the closed palette in `colors_and_type.css`. Documents — not a runtime component. | "Could this be replaced by reading the CSS variables?" Yes → TOKEN. |
| **PRIMITIVE** | A single visual atom with no internal sub-component dependencies. Has all its own states (rest / hover / active / disabled where relevant). | "Does it stand alone with no children that are also named primitives?" Yes → PRIMITIVE. |
| **COMPOUND** | A fixed assembly of primitives that always travel together. Has multiple shapes/modes but the *parts* are stable. | "Is it built from named primitives, and you'd never use just half of it?" Yes → COMPOUND. |
| **UNIQUE** | A one-of-a-kind specimen. Conceptually a primitive but the system only has one instance — there is no "family." Brand-defining or specialized. | "Is there only ever exactly one of these in the system?" Yes → UNIQUE. |
| **COMPOSITION** | A full app screen or screen-region. Wires primitives, compounds, and unique specimens together. May contain state and interaction logic. | "Is this what the user actually sees as a screen of the app?" Yes → COMPOSITION. |

When a card would fit two tiers, the tier rule wins over the convenience of where it currently lives. Move it; rename it; update its citations.

## Two-layer palette — law

**UI chrome** uses ink + ivory + brass, period. Buttons, knobs, tabs, card-shell, panel-header, hardware-bar, drawer, tab bars, transport controls — all chrome.

**Music feedback** uses `--note-*` only. Keys, particles, scope lines, popups, bar-tape segments, code-strip glyphs — anything that conveys pitch or chromatic state.

**Brand colors** (`--tomato`, `--pine`, `--plum`, `--mustard`, `--bone`) are **decoration-only**. Kickers, marks, badges, section anchors, stickers, splash, hero compositions. **Never on functional UI primitives.** The categorical spine on `primitive-spine-card.html` and `compound-pattern-card.html` is an exception only because the spine *is* the brand mark by design — it's not chrome, it's identification.

Color discipline cheat sheet:

| Card / family | Allowed colors |
|---|---|
| Buttons, knobs, tabs, card-shell, drawer, beat-indicator | `ink/ivory` + **one** brass-lit signal |
| Keys (chromatic feedback) | `--note-*` for the playable face; `ink/ivory` for chrome |
| Bar-tape, code-strip | `--note-*` for music feedback; `ink/ivory` for the row chrome |
| Pattern-card spine | `--tomato/--plum/...` brand color as the categorical marker (lifted from real app data) |
| Decoration (kicker, marks, badge) | Brand colors allowed — the main app has no decor space, so the decoration cards earn the brand color |
| Brand (logo, hero) | Full brand palette + `ivory/ink` |
| Token cards | Whatever they document |

## One brass-lit signal per panel

Brass is the "lit" status indicator. It carries weight precisely because it's rare. **Maximum one brass-lit thing per card or panel.** Use the `.brass` class (gradient fill + sheen animation) or the `--shadow-glow-brass` halo token. Never reinvent the glow inline.

If you find yourself wanting two brass elements, one of them is the wrong choice — make it ivory.

## Closed token palette

Don't invent tokens. Everything you need is in `colors_and_type.css`:
- neutrals: `--ink`, `--ink-2/3/4/5`, `--ivory`, `--ivory-2/3/4`
- brass: `--brass`, `--brass-deep`, `--brass-rim`, `--shadow-glow-brass`
- music: `--note-do/re/mi/fa/sol/la/ti` (+ chromatic alterations)
- brand: `--tomato`, `--pine`, `--plum`, `--mustard`, `--bone`
- chrome: `--glass`, `--hairline`, `--ring`, `--scrim`
- type: `--font-display` (Lets Jazz), `--font-mono` (JetBrains Mono), `--font-system`
- type scale: `--t-display-l/m/s`, `--t-h1/h2/h3`, `--t-body`, `--t-body-s`, `--t-caption`, `--t-mono`, `--t-label`
- spacing: `--sp-1` … `--sp-11` (2px → 64px)
- radii: `--r-xs/sm/md/lg/xl/pill`
- motion: `--beat`, `--dur-tap/ui/panel/scene`, `--ease-swing/stab/brush/sustain/bend/paper`

Adding a new token requires explicit user sign-off.

## Motion tokens — not raw values

Never write a raw `cubic-bezier(...)` or a raw duration in ms. Use the named tokens. The named tokens are the "horn section" — pick the right one for the gesture:

| Token | Voice |
|---|---|
| `--ease-swing` | The lift — for drawers, panels, picture-perfect entrances |
| `--ease-stab` | The hit — quick assertions, tap responses |
| `--ease-brush` | The wash — opacity drifts, scrim fades, soft transitions |
| `--ease-sustain` | The hold — long fades, ambient changes |
| `--ease-bend` | The pitch — knob sweeps, scrub motions |
| `--ease-paper` | The fold — torn-paper interactions, scrolls, tears |

Duration scale:

| Token | ms | Use |
|---|---|---|
| `--dur-tap` | 90 | Button presses, micro-interactions |
| `--dur-ui` | 220 | Hover states, label fades, tooltip enters |
| `--dur-panel` | 360 | Drawer slides, tab transitions, panel rises |
| `--dur-scene` | 600 | Full-screen transitions, hero entrances |

Beat: `--beat` is 500ms (120bpm). UI breathes on the beat via the global `beat-pulse` keyframe.

## Drawers slide; never fade

Drawer open/close uses `transform: translateY()`, not `opacity`. The opacity-only fade is reserved for `@media (prefers-reduced-motion: reduce)` fallback. This rule is non-negotiable — fading drawers feel wrong on a touch-first app where the user is expecting paper-physical motion.

## Reduced-motion guards required

Every `@keyframes`, every transition that's perceived as motion, every animated element needs a `@media (prefers-reduced-motion: reduce)` fallback. The fallback either stops the animation entirely (`animation: none`) or replaces it with an opacity transition.

## Butt caps on SVG strokes

`stroke-linecap: butt` (never `round`). The aesthetic is "cut paper, lit by a synth" — round caps soften the cut. Always butt.

## Hand-cut tilt

Tiny per-tile rotation (`transform: rotate(±0.2–0.5deg)`) where it earns the cut-paper feel. Stickers, tiles, badges, kicker shapes. Not on functional chrome (buttons, knobs, drawer panels). Use sparingly — three things tilted on one card is jazz; ten things tilted is amateur.

## Ivory default text

The system has no cream or paper fills. The light neutral is **ivory**, in four steps:

| Token | Hex | Role |
|---|---|---|
| `--ivory` | `#F4EFE6` | Primary text, h3, active labels |
| `--ivory-2` | `#C9C2B5` | Secondary text, subdued values |
| `--ivory-3` | `#8E867A` | Meta, muted labels, captions |
| `--ivory-4` | `#514B42` | Disabled, decorative (large ordinals on a card) |

Never use `--paper`, `--bone` on functional UI chrome, or any cream value. Everything lives on the dark stage.

## No emoji

Not in UI strings. Not in copy. Not in component examples. Not in commit messages. The brand voice is jazz-poster precision; emoji break the register.

## Hard-corner discipline

Poster and badge elements: `border-radius: 0` or `--r-xs`. Hardware panels: `--r-sm` to `--r-md`. Soft pill shapes (`--r-pill`) only on transport buttons and floating chips. Most things in the system are sharp.

## `--ring` over drop shadows

Surface separation uses `--ring` (an inset 1px hairline) — not outer drop shadows. Outer shadows are reserved for very specific elevations (modal scrim, drawer-over-stage).

## Lifted, not paraphrased

When a compound or composition embeds a primitive, the source of truth for the primitive's CSS is the primitive's own file. **Never paraphrase**: if you need the bar-tape inside the pattern-card, import or include the bar-tape's CSS — don't rewrite it from memory.

In static-HTML world (current state) this means lift-verbatim and accept the drift risk. In a component framework (Vue 3, the migration target) this means use `<BarTape />` as a child component — no CSS duplication.

## Copy voice

Mono caps for all uppercase labels (`var(--t-label)` with `--tracking-label`).
Lets Jazz period-terminated for display stamps ("Danger." "Live." "Hot.").
JetBrains Mono for body and meta.
Title case for proper nouns; lowercase for everything functional.
"·" as the canonical separator in metadata strings ("Section · 03").

## What NOT to do

- Don't use cream or paper fills on any UI chrome
- Don't switch to v2's cream/paper foreground panels — everything lives on the dark stage
- Don't invent new color variables; the palette is closed
- Don't put two unrelated concepts on one card (split it)
- Don't add long-form doc pages; specimen cards only
- Don't use emoji
- Don't write raw `cubic-bezier` values; use named easings
- Don't fade a drawer; slide it
- Don't ship two brass-lit signals on one panel
