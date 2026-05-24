# Raw Recipe Inventory

Date: 2026-05-24

## Scope

- Captures raw recipes already visible in the current style-guide branch before further extraction.
- Normalizes evidence from local docs, subagent audits, current Vue specimens, and upstream doctrine.

## Sources Inspected

- `src/emotitone-design-system.css`
- `src/style-guide/WORKFLOW.md`
- `src/style-guide/TOKEN_PROMOTION_AUDIT.md`
- `src/style-guide/StyleGuide.vue`
- `src/components/primatives/Sticker.vue`
- `src/style-guide/primatives/PrimitiveSticker.vue`
- `src/style-guide/compounds/CompoundPatternCard.vue`
- `src/style-guide/compounds/CompoundPatternReel.vue`
- `/Users/burooj/Projects/emotitone-design-system/project/design-doctrine.md`

## Inventory

| Raw recipe | Found in | Evidence | Candidate layer | Proposed resolution | Gate |
|---|---|---|---|---|---|
| Cut-paper clip set | Token geometry, buttons, keys, tabs | `--clip-*`; duplicate polygons | candidate token | promote/prune duplicates | Promotion Gate |
| Cut-paper rotations | Token geometry, sticker/random geometry | `--rot-*`; randomized geometry | candidate token | promote | Token Closure |
| SVG stroke grammar | Token geometry, marks, digital knobs | Butt caps, miter joins, hairline/track/value strokes | candidate token | promote | Promotion Gate |
| Brass usage law | Doctrine, token UI, Sticker, tabs, knobs, buttons | One brass-lit signal; local brass recipes vary | candidate token/pattern | decide/promote/prune | Promotion Gate |
| Brand color roles | Doctrine, brand tokens, spine card, sticker | Decorative poster colors versus functional danger conflict | candidate token/pattern | decide | Doctrine/Promotion Gate |
| Music hue model | Music tokens, keys, bar tape, code strip | Legacy `--note-*` versus `.note` recipe | candidate token/data recipe | decide | Doctrine/Promotion Gate |
| Note/solfege maps | Music token preview, keys, code strip | Preview maps and aliases diverge | candidate data recipe | promote to shared TS constants | Promotion Gate |
| Beat indicator cells | `PrimitiveBeatIndicator.vue` | Beat/downbeat/even/static/tempo grammar local to specimen | candidate primitive | promote | Primitive Extraction |
| Bar tape strip | Primitive + compound files | Segment fills, proportions, dim state, playhead, downbeat, footer-flush usage | primitive | promoted | Promotion Gate 2026-05-24 |
| Icon button/control family | Primitive + compound files | Size, state, geometry, paired-button, sharp icon behavior | candidate primitive | promote | Primitive Extraction |
| Card shell | `PrimitiveCard.vue` | Panel-card body, mark slot, heading/body, labels | candidate primitive | promote | Primitive Extraction |
| Key face family | `PrimitiveKeys.vue` | Syllable/degree/raw stack, states, cut/shape variants | candidate primitive | promote after decisions | Promotion Gate |
| Kicker marker | `PrimitiveKicker.vue` | Dot + label, colors, density, inverse, alignment | candidate primitive | promote after boundary decision | Promotion Gate |
| Knob shared anatomy | Analog/digital knob specimens | Label, foot, tile, role modifiers, disabled/lit/played states | candidate primitive | promote shared core | Promotion Gate |
| Mark glyph/treatment families | `PrimitiveMarks.vue` | Raw SVG families, treatment ladder, scale rules | candidate primitive | decide API then promote | Promotion Gate |
| Spine card | `PrimitiveSpineCard.vue` | Colored spine, kicker row, stamp, body copy | candidate primitive | promote base | Primitive Extraction |
| Preset row | `PrimitiveSpineCard.vue` | Interactive row with status and buttons | candidate compound | split or gate-park | Taxonomy Gate |
| Chip-slide tabs | `PrimitiveTabs.vue` | Rail, streak, chip, density, clip variants, timing | candidate primitive | promote after timing/variant decision | Promotion Gate |
| Sticker color vocabulary | `Sticker.vue`, `PrimitiveSticker.vue` | Prop union and specimen list duplicate colors | candidate data recipe | promote shared constant if reused | Promotion Gate |
| Sticker badge | `Sticker.vue`, `PrimitiveSticker.vue` | Badge ignores color and random geometry | candidate primitive/variant/unique | decide | Promotion Gate |
| Pattern card stack/active shapes | Compound pattern files | Sleek row, active card, spine, ordinal, footer, active rise | candidate compound | promote after lower primitives | Compound Gate |
| Pattern reel stack/promotion behavior | `CompoundPatternReel.vue` | Stack depth transforms, click promotion, active-rise | candidate compound/composition behavior | decide boundary | Taxonomy Gate |
| Code strip | Unique + compound files | Rest/duration/accent/syllable tokens, lit syllable glow/dot | primitive/compound part | decide taxonomy | Taxonomy Gate |
| Top drawer recipe | `CompositionTopDrawer.vue` | Drawer frame, app push-down, scrim, top panel, handle, pane switching | composition/product recipe | keep local or productize | Composition Gate |
| Guide anatomy/variant chrome | Many specimens | Duplicate specimen CSS despite guide helpers | specimen helper | prune into helpers/keep local | Primitive Cleanup |
| Hero/stage wrappers | Primitive/composition specimens | Demo stages and display wrappers | specimen-only | keep local | Layer Closure |

## Repeated Grammar

- Cut-paper clipping and rotation.
- Brass as the lone lit signal, with inconsistent local implementations.
- Dark stage plus ivory text and sparse poster colors.
- Music feedback through solfege/chromatic color.
- Beat-timed motion and playhead/tempo indicators.
- Pattern-card stack/active shapes, bar tape, code strip, and icon control reuse across compounds.
- Component-specific recipes hidden inside specimens despite generic tokens existing.

## Singular But Important

- Brand cover.
- Brand logo.
- Drawer artifact, pending product/composition boundary.
- Sticker badge, pending whether it is a variant or separate primitive.

## Drift

- Generic token overlap mistaken for component recipe completion.
- Local brass finishes duplicating global brass grammar.
- Legacy `--note-*` aliases in primitive/compound candidates despite `.note` recipe direction.
- Mono-heavy guide/spec labels conflicting with typography doctrine unless named as guide/spec exception.
- `UniqueCodeStrip` reused as if it were not unique.

## Extracted Recipes

| Recipe | Source of truth | Promotion decision | Remaining residue |
|---|---|---|---|
| Bar tape strip | `src/components/primatives/BarTape.vue` | Promoted strip, segment colors, major/equal proportions, size variants, dim/downbeat states, live playhead, and boxed/flush frame. Corrected major ratio to `2-2-1-2-2-2-1` with `mi` and `ti` narrow. | Compound pattern files still copy old `.bar-tape` CSS and need a later cleanup slice to compose `BarTape`. |

## Ready For Extraction

yes, but only after Repository Conventions Gate is recorded and each extraction slice writes promotion decisions before component changes
