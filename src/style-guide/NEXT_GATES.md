# Next Gates

Date: 2026-05-27

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

## Note Primitive Gate

The next design-system gate should define a `Note` primitive before migrating app note-color usage.

Open decisions:

- API: should `Note` accept pitch names, scale degree, solfege identity, or a normalized note model?
- Display modes: degree, solfege, and raw note should probably be variants of the same primitive.
- Color modes: fixed hue and movable hue both exist in the app; the primitive must not collapse them into one model.
- Color source: decide how the primitive bridges current CSS `.note` custom-property recipe, legacy `--note-*` aliases, and runtime `useColorSystem` / `musicColor.ts`.
- Scope: start as design-system primitive first; migrate app components only after the primitive doctrine is accepted.

## Deferred App Gates

- Production knobs can eventually adopt the design-system visual knob, but not until the design system is complete.
- Legacy `--note-*` aliases should not be swept until the Note primitive exists.
- Main app implementation starts after design-system gates close.
