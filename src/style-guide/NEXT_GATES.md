# Next Gates

Date: 2026-08-19

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

`Note.vue` is accepted and formalized as the controlled, noninteractive musical identity and presentation primitive.

- Final geometry: `standard`, `tile`, mirrored `offcut`, `tab`, and `pill`.
- Final responsive proportions: `tall`, `medium`, `stocky`, and `wide`; `medium` is default.
- Final surfaces: `colored` and `monochrome`.
- Final identity: syllable, scale degree, and raw pitch use one rank-based display typography system; raw pitch includes accidental and octave.
- Final activity API: externally controlled `sounding` only. Onset ring, held rim/halo, brushed release, and the static Reduce Motion treatment are accepted.
- Persisted `keyboard.primaryLabel` remains wired. Note owns no input, timer, store, or audio engine.

The Note gate is closed. `sustained`, `playedRecently`, `selected`, and `ghosted` remain undefined tracker candidates, not Note props.

## Next Independent Gate

- Formalize Key as a compound around Note while preserving current production keyboard, pointer, touch, drag, literal-keyboard, and audio-trigger behavior.
- Keep Note's musical sounding presentation separate from Key's physical press, focus, hover, and input presentation.
- Do not migrate Keyboard, Drawer, or CodeStrip during the Key gate.
- Keep geometry x proportion as a design-system axis; do not promote it to a production keyboard setting until Keyboard is defined.
- Purge glassmorphism across the wider app in a separately scoped gate; Note no longer exposes it.

## Deferred App Gates

- Production knobs can eventually adopt the design-system visual knob, but not until the design system is complete.
- Legacy `--note-*` aliases should not be swept from production until Key and Keyboard are redefined around the accepted Note primitive.
- Main app implementation starts after design-system gates close.
