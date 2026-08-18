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

`Note.vue` is now the accepted design-system primitive for controlled musical identity and presentation.

Remaining decisions:

- Finalize the visual language and precedence for `sounding`, `sustained`, `playedRecently`, `selected`, and `ghosted`.
- Decide how Key and Keyboard should consume `Note` without altering existing production interaction or audio behavior.
- Keep geometry x proportion as a design-system axis for now; do not promote it to a production keyboard setting until Keyboard is defined.

## Deferred App Gates

- Production knobs can eventually adopt the design-system visual knob, but not until the design system is complete.
- Legacy `--note-*` aliases should not be swept from production until Key and Keyboard are redefined around the accepted Note primitive.
- Main app implementation starts after design-system gates close.
