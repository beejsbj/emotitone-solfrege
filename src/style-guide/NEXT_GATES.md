# Next Gates

Date: 2026-08-18

## Current Doctrine Corrections

- More design-system work remains before main-app implementation.
- Layer order is tokens, primatives, uniques, compounds, compositions.
- Top-drawer composition is removed from the style guide; product top drawer belongs to main-app implementation later.
- CodeStrip is unique. Compounds may compose uniques plus primitives.
- PresetRow is not a source compound; it is just SpineCard usage with a filled button/content.
- Brand colors are decorative only. Semantic color aliases such as `--danger` are legacy cleanup, not design doctrine.
- Brass is instrument metal paired with ink and ivory. It is separate from the funk/poster brand colors.
- Sticker badge is a Sticker variant and should only be brass.
- Use filled surfaces where possible and minimize borders.

## Note / Key / Keyboard Gate — Accepted and Implemented

Accepted boundary:

- `Note` is a controlled, noninteractive primitive for musical identity and presentation: syllable, degree, raw pitch with accidental/octave, color, geometry, clipping, depth, label hierarchy, and externally supplied musical states.
- `Key` is a compound that wraps Note with physical interaction semantics and feedback. Pressed and sounding remain distinct inputs.
- `Keyboard` is a compound that owns the octave grid and app adapter. Global QWERTY is installed once there; MIDI remains centrally routed.
- `DrawerKeyboard` remains the app composition around patterns, live strip, action bar, and Keyboard.
- CodeStrip composes Note glyphs while retaining rests, duration, grouping, density, wrapping, and lit behavior.
- The Music Color Recipe specimen calls the same runtime `musicColor.ts` resolver as Note; movable remains the default and fixed remains supported.

## Deferred App Gates

- Production knobs can eventually adopt the design-system visual knob, but not until the design system is complete.
- Legacy `--note-*` aliases remain for unmigrated specimens/components; prune them only after a consumer audit.
- Cross-key pointer drag routing is a future Keyboard behavior and was intentionally not introduced in this visual migration.
