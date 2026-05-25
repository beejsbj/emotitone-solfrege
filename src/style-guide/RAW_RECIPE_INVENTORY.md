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
| Beat indicator cells | `PrimitiveBeatIndicator.vue` | Beat/downbeat/even/static/tempo grammar local to specimen | primitive | promoted | Promotion Gate 2026-05-25 |
| Bar tape strip | Primitive + compound files | Segment fills, proportions, dim state, playhead, downbeat, footer-flush usage | primitive | promoted | Promotion Gate 2026-05-24 |
| Icon button/control family | Primitive + compound files | Size, state, geometry, paired-button, sharp icon behavior | primitive | promoted | Promotion Gate 2026-05-25 |
| Card shell | `PrimitiveCard.vue` | Panel-card body, mark slot, heading/body, labels | primitive | promoted | Promotion Gate 2026-05-25 |
| Key face family | `PrimitiveKeys.vue` | Syllable/degree/raw stack, states, cut/shape variants | candidate primitive | promote after decisions | Promotion Gate |
| Kicker marker | `PrimitiveKicker.vue` | Dot + label, colors, density, inverse, alignment | primitive | promoted | Promotion Gate 2026-05-25 |
| Knob shared anatomy | Analog/digital knob specimens | Label, foot, tile, role modifiers, disabled/lit/played states | candidate primitive | promote shared core | Promotion Gate |
| Mark glyph/treatment families | `PrimitiveMarks.vue` | Raw SVG families, treatment ladder, scale rules | primitive | promoted | Promotion Gate 2026-05-25 |
| Spine card | `PrimitiveSpineCard.vue` | Colored spine, kicker row, stamp, body copy | primitive | promoted | Promotion Gate 2026-05-25 |
| Preset row | `PrimitiveSpineCard.vue` | Interactive row with status and buttons | candidate compound | gate-parked | Taxonomy Gate 2026-05-25 |
| Chip-slide tabs | `PrimitiveTabs.vue` | Rail, streak, chip, density, clip variants, timing | primitive | promoted | Promotion Gate 2026-05-25 |
| Sticker color vocabulary | `Sticker.vue`, `PrimitiveSticker.vue` | Prop union and specimen list duplicate colors | candidate data recipe | promote shared constant if reused | Promotion Gate |
| Sticker badge | `Sticker.vue`, `PrimitiveSticker.vue` | Badge ignores color and random geometry | candidate primitive/variant/unique | decide | Promotion Gate |
| Pattern card stack/active shapes | Compound pattern files | Sleek row, active card, spine, ordinal, footer, active card child contract | compound | promoted | Repository Conventions + Promotion Gate 2026-05-25 |
| Pattern reel stack/promotion behavior | `CompoundPatternReel.vue` | Stack depth transforms, click promotion, active-rise | compound | promoted | Taxonomy + Promotion Gate 2026-05-25 |
| Code strip | Unique + compound files | Rest/duration/accent/syllable tokens, lit syllable glow/dot | primitive | promoted | Taxonomy + Promotion Gate 2026-05-25 |
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
| Bar tape strip | `src/components/primatives/BarTape.vue` | Promoted strip, segment colors, major/equal proportions, size variants, dim/downbeat states, live playhead, and boxed/flush frame. Corrected major ratio to `2-2-1-2-2-2-1` with `mi` and `ti` narrow. | Primitive specimen and pattern compound specimens now compose `BarTape`; music color model remains gate-parked. |
| Beat indicator cells | `src/components/primatives/BeatIndicator.vue` | Promoted cell count, size, loop duration, downbeat/even/static states, current `beat-cell`/`beat-down` keyframe consumption, and reduced-motion behavior. Pruned raw dark-stage hex to `var(--ink)` through guide helpers. | `PrimitiveBeatIndicator.vue` now composes `BeatIndicator`; beat keyframe naming collision remains gate-parked in token doctrine. |
| Card shell | `src/components/primatives/CardShell.vue` | Promoted dark panel, floating label, mark-slot placement, title/body rhythm, compact sizing, and border toggle. Pruned undefined `--font-body` by using `--t-body-s`. | `PrimitiveCard.vue` now composes `CardShell`; demo mark drawings and light inversion remain specimen-local until Mark/Taste gates. |
| Icon button/control family | `src/components/primatives/IconButton.vue` | Promoted size, geometry, tone, simulated state, disabled, pressed/toggle, and brass signal/fill/wire/glow treatments. Pruned offcut/tile polygons to existing `--clip-offcut` and `--clip-tile` tokens. | `PrimitiveButtons.vue` and pattern compound specimens now compose `IconButton`; paired-control shell remains specimen-local until another component needs it. |
| Kicker marker | `src/components/primatives/Kicker.vue` | Promoted dot+label anatomy, tone, dot geometry, density, inverse, and dot/label-only forms. Pruned unused alignment-demo CSS. | `PrimitiveKicker.vue` now composes `Kicker`; mono label is recorded as a kicker/spec-marker typography exception pending wider doctrine cleanup. |
| Spine card | `src/components/primatives/SpineCard.vue` | Promoted brand spine panel, matching Kicker child, stamped headline, body copy, compact mode, bone tone surface, and one-color rule. | `PrimitiveSpineCard.vue` now composes `SpineCard`; preset-row action/status demos remain local and gate-parked as a compound/control-row candidate. |
| Mark glyph/treatment families | `src/components/primatives/Mark.vue` | Promoted flat SVG path library, named glyph API, tone, size, fill/wire treatment, and butt/miter stroke grammar for wire marks. | `PrimitiveMarks.vue` now composes `Mark`; family panels, legends, and scale/treatment grids remain specimen-local. |
| Chip-slide tabs | `src/components/primatives/ChipTabs.vue` | Promoted rail, streak, measured active chip, selected/disabled state, geometry variants, compact density, and ivory/brass tone. Pruned duplicate clip polygons to existing `--clip-*` tokens and snapped chip motion to `--dur-ui`. | `PrimitiveTabs.vue` now composes `ChipTabs`; state-button examples and explanatory grouping remain specimen-local. |
| Code strip | `src/components/primatives/CodeStrip.vue` | Promoted notation row, note glyph modes, durations, rests, brackets/separators, lit glyph marker, density, wrapping, stacked duration, and duration-bar grammar. | Pattern compound specimens now compose `CodeStrip`; `UniqueCodeStrip.vue` remains a legacy specimen path until a naming/navigation gate. |
| Pattern card stack/active shapes | `src/components/compounds/PatternCard.vue` | Promoted sleek and active card anatomy, child-component contract, spine, ordinal/name/sub metadata, optional actions, code-strip body, bar-tape footer, and active footer/status. | PatternCard source composes BarTape, IconButton, and CodeStrip. |
| Pattern reel stack/promotion behavior | `src/components/compounds/PatternReel.vue` | Promoted stack order, active id, click-promotion behavior, stack depth classes, and active-rise motion. | PatternReel source composes PatternCard; specimen keeps only example data and documentation variants. |

## Ready For Extraction

yes, but only after Repository Conventions Gate is recorded and each extraction slice writes promotion decisions before component changes
