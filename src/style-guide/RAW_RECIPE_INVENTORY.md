# Raw Recipe Inventory

Date: 2026-05-26

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
| Cut-paper clip set | Token geometry, buttons, keys, tabs | `--clip-*`; duplicate polygons | token | promoted/pruned for current primitives | Promotion Gate 2026-05-26 |
| Cut-paper rotations | Token geometry, sticker/random geometry | `--rot-*`; randomized geometry | token | promoted | Token Closure 2026-05-26 |
| SVG stroke grammar | Token geometry, marks, digital knobs | Butt caps, miter joins, hairline/track/value strokes | token doctrine / primitive recipes | promoted into Mark/Knob and documented in geometry | Promotion Gate 2026-05-26 |
| Brass usage law | Doctrine, token UI, Sticker, tabs, knobs, buttons | One brass-lit signal; local brass recipes vary | token/pattern | promoted as global `.brass` law; Sticker badge timing normalized | Promotion Gate 2026-05-27 |
| Brand color roles | Doctrine, brand tokens, spine card, sticker | Decorative poster colors versus functional danger conflict | token/pattern | resolved: brand decorative, semantic status aliases functional | Doctrine/Promotion Gate 2026-05-26 |
| Music hue model | Music tokens, keys, bar tape, code strip | Legacy `--note-*` versus `.note` recipe | token/data recipe | resolved: `.note` is source, aliases parked for migration | Doctrine/Promotion Gate 2026-05-26 |
| Note/solfege maps | Music token preview, keys, code strip | Preview maps and aliases diverge | data recipe | pruned to existing `src/data` music constants | Promotion Gate 2026-05-26 |
| Beat indicator cells | `PrimitiveBeatIndicator.vue` | Beat/downbeat/even/static/tempo grammar local to specimen | primitive | promoted | Promotion Gate 2026-05-25 |
| Bar tape strip | Primitive + compound files | Segment fills, proportions, dim state, playhead, downbeat, footer-flush usage | primitive | promoted | Promotion Gate 2026-05-24 |
| Icon button/control family | Primitive + compound files | Size, state, geometry, paired-button, sharp icon behavior | primitive | promoted | Promotion Gate 2026-05-25 |
| Card shell | `PrimitiveCard.vue` | Panel-card body, mark slot, heading/body, labels | primitive | promoted | Promotion Gate 2026-05-25 |
| Key face family | `PrimitiveKeys.vue` | Syllable/degree/raw stack, states, cut/shape variants | primitive | promoted | Promotion Gate 2026-05-25 |
| Kicker marker | `PrimitiveKicker.vue` | Dot + label, colors, density, inverse, alignment | primitive | promoted | Promotion Gate 2026-05-25 |
| Knob shared anatomy | Analog/digital knob specimens | Label, foot, tile, role modifiers, disabled/lit/played states | primitive | promoted | Promotion Gate 2026-05-25 |
| Mark glyph/treatment families | `PrimitiveMarks.vue` | Raw SVG families, treatment ladder, scale rules | primitive | promoted | Promotion Gate 2026-05-25 |
| Spine card | `PrimitiveSpineCard.vue` | Colored spine, kicker row, stamp, body copy | primitive | promoted | Promotion Gate 2026-05-25 |
| Preset row | `PrimitiveSpineCard.vue` | Interactive row with status and buttons | compound | promoted as `PresetRow` | Taxonomy/Promotion Gate 2026-05-27 |
| Chip-slide tabs | `PrimitiveTabs.vue` | Rail, streak, chip, density, clip variants, timing | primitive | promoted | Promotion Gate 2026-05-25 |
| Sticker color vocabulary | `Sticker.vue`, `PrimitiveSticker.vue` | Prop union and specimen list duplicate colors | candidate data recipe | promote shared constant if reused | Promotion Gate |
| Sticker badge | `Sticker.vue`, `PrimitiveSticker.vue` | Badge fixed geometry diverged from outline/fill color vocabulary and brass timing | primitive variant | resolved as fixed-geometry Sticker variant; color controls edge/text | Promotion Gate 2026-05-27 |
| Pattern card stack/active shapes | Compound pattern files | Sleek row, active card, spine, ordinal, footer, active card child contract | compound | promoted | Repository Conventions + Promotion Gate 2026-05-25 |
| Pattern reel stack/promotion behavior | `CompoundPatternReel.vue` | Stack depth transforms, click promotion, active-rise | compound | promoted | Taxonomy + Promotion Gate 2026-05-25 |
| Code strip | Unique + compound files | Rest/duration/accent/syllable tokens, lit syllable glow/dot | primitive | promoted | Taxonomy + Promotion Gate 2026-05-25 |
| Brand cover | `UniqueBrandCover.vue` | Fixed SVG collage, cover headline/body/meta, rotated file stamp | unique | promoted as source unique | Unique Extraction Gate 2026-05-26 |
| Brand logo lockups | `UniqueBrandLogo.vue` | Wordmark, monogram, tagline, brass signal, inverted and note-mark variants | unique | promoted as source unique | Unique Extraction Gate 2026-05-26 |
| Drawer shell recipe | `UniqueDrawer.vue`, `CompositionTopDrawer.vue`, `src/components/TopDrawer.vue` | Drawer frame, scrim, top/bottom anchors, torn handle, snap points, app push-down, Escape/scrim close | primitive | promoted for style-guide and app top-drawer surfaces | Promotion/App Integration Gates 2026-05-27 |
| Loading screen composition | `CompositionLoadingScreen.vue`, `src/components/LoadingSplash.vue` | Brand loading stage, chromatic progress tape, app loading/audio/MIDI/error states | composition/app source | promoted as `LoadingScreen`; app behavior adapter feeds it | App Integration Gate 2026-05-27 |
| Top drawer composition | `CompositionTopDrawer.vue` | Trigger row, panes, drawer shell, instrument/preset/settings content, app keyboard context | composition/product recipe | keep product content local; compose `DrawerShell` and `PresetRow`; app wrapper aligned | Taxonomy/App Integration Gates 2026-05-27 |
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
- Drawer artifact, now promoted as a source primitive for style-guide surfaces and wrapped by app `TopDrawer.vue`.
- Loading screen, classified as composition proof with app integration debt.
- Sticker badge, resolved as a fixed-geometry Sticker variant.

## Drift

- Generic token overlap mistaken for component recipe completion.
- Local brass finishes duplicating global brass grammar.
- Legacy `--note-*` aliases in primitive/compound candidates despite `.note` recipe direction; now parked as app/component migration residue.
- Mono-heavy guide/spec labels are allowed only as a named guide/spec inspection exception.
- `UniqueCodeStrip` reused as if it were not unique.

## Extracted Recipes

| Recipe | Source of truth | Promotion decision | Remaining residue |
|---|---|---|---|
| Bar tape strip | `src/components/primatives/BarTape.vue` | Promoted strip, segment colors, major/equal proportions, size variants, dim/downbeat states, live playhead, and boxed/flush frame. Corrected major ratio to `2-2-1-2-2-2-1` with `mi` and `ti` narrow. | Primitive specimen and pattern compound specimens now compose `BarTape`; music color model remains gate-parked. |
| Beat indicator cells | `src/components/primatives/BeatIndicator.vue` | Promoted cell count, size, loop duration, downbeat/even/static states, current `beat-cell`/`beat-down` keyframe consumption, and reduced-motion behavior. Pruned raw dark-stage hex to `var(--ink)` through guide helpers. | `PrimitiveBeatIndicator.vue` now composes `BeatIndicator`; beat keyframe naming collision remains gate-parked in token doctrine. |
| Card shell | `src/components/primatives/CardShell.vue` | Promoted dark panel, floating label, mark-slot placement, title/body rhythm, compact sizing, and border toggle. Pruned undefined `--font-body` by using `--t-body-s`. | `PrimitiveCard.vue` now composes `CardShell`; demo mark drawings and light inversion remain specimen-local until Mark/Taste gates. |
| Icon button/control family | `src/components/primatives/IconButton.vue` | Promoted size, geometry, tone, simulated state, disabled, pressed/toggle, and brass signal/fill/wire/glow treatments. Pruned offcut/tile polygons to existing `--clip-offcut` and `--clip-tile` tokens. | `PrimitiveButtons.vue` and pattern compound specimens now compose `IconButton`; paired-control shell remains specimen-local until another component needs it. |
| Kicker marker | `src/components/primatives/Kicker.vue` | Promoted dot+label anatomy, tone, dot geometry, density, inverse, and dot/label-only forms. Pruned unused alignment-demo CSS. | `PrimitiveKicker.vue` now composes `Kicker`; mono label is recorded as a kicker/spec-marker typography exception pending wider doctrine cleanup. |
| Spine card | `src/components/primatives/SpineCard.vue` | Promoted brand spine panel, matching Kicker child, stamped headline, body copy, compact mode, bone tone surface, and one-color rule. | `PrimitiveSpineCard.vue` now composes `SpineCard`; preset-row action/status demos compose `PresetRow`. |
| Preset row | `src/components/compounds/PresetRow.vue` | Promoted row spine, Kicker child, display name, action button, status meta, tone variants, disabled state, and action emit. | `PrimitiveSpineCard.vue` now composes `PresetRow`; local `.preset-row-demo` CSS removed. |
| Mark glyph/treatment families | `src/components/primatives/Mark.vue` | Promoted flat SVG path library, named glyph API, tone, size, fill/wire treatment, and butt/miter stroke grammar for wire marks. | `PrimitiveMarks.vue` now composes `Mark`; family panels, legends, and scale/treatment grids remain specimen-local. |
| Chip-slide tabs | `src/components/primatives/ChipTabs.vue` | Promoted rail, streak, measured active chip, selected/disabled state, geometry variants, compact density, and ivory/brass tone. Pruned duplicate clip polygons to existing `--clip-*` tokens and snapped chip motion to `--dur-ui`. | `PrimitiveTabs.vue` now composes `ChipTabs`; state-button examples and explanatory grouping remain specimen-local. |
| Knob shared anatomy | `src/components/primatives/Knob.vue` | Promoted analog ring and digital arc visuals, shared frame/label/footer anatomy, range/boolean/options/button roles, brass/ivory treatment, disabled/lit/played states, SVG stroke grammar, and beat-timed button motion. | `PrimitiveKnobsAnalog.vue` and `PrimitiveKnobsDigital.vue` now compose `Knob`; production `src/components/knobs/` controls remain a separate app-alignment question. |
| Key face family | `src/components/primatives/Key.vue` | Promoted music key face, legacy `--note-*` fill, syllable/degree/raw stack, format axis, pressed/disabled states, clip-token cuts, key-specific pill/tall/squary/wide proportions, and sheen. Corrected chromatic aliases in specimen examples. | `PrimitiveKeys.vue` now composes `Key`; computed `.note` color migration remains gate-parked. |
| Code strip | `src/components/primatives/CodeStrip.vue` | Promoted notation row, note glyph modes, durations, rests, brackets/separators, lit glyph marker, density, wrapping, stacked duration, and duration-bar grammar. | Pattern compound specimens now compose `CodeStrip`; `UniqueCodeStrip.vue` remains a legacy specimen path until a naming/navigation gate. |
| Pattern card stack/active shapes | `src/components/compounds/PatternCard.vue` | Promoted sleek and active card anatomy, child-component contract, spine, ordinal/name/sub metadata, optional actions, code-strip body, bar-tape footer, and active footer/status. | PatternCard source composes BarTape, IconButton, and CodeStrip. |
| Pattern reel stack/promotion behavior | `src/components/compounds/PatternReel.vue` | Promoted stack order, active id, click-promotion behavior, stack depth classes, and active-rise motion. | PatternReel source composes PatternCard; specimen keeps only example data and documentation variants. |
| Drawer shell | `src/components/primatives/DrawerShell.vue` | Promoted bounded drawer frame, top/bottom anchor axis, scrim, torn handle, open/close behavior, optional resize snaps, stage push-down, and reduced-motion behavior. | `UniqueDrawer.vue`, `CompositionTopDrawer.vue`, and production `TopDrawer.vue` now compose or wrap `DrawerShell`. |
| Loading screen | `src/components/compositions/LoadingScreen.vue` | Promoted loading composition visual grammar, chromatic progress tape, ready/error/audio states, MIDI message slot, and dev skip affordance. | `CompositionLoadingScreen.vue` imports it; app `LoadingSplash.vue` preserves behavior and feeds state/actions into it. |
| Brand cover | `src/components/uniques/BrandCover.vue` | Promoted singular cover copy, meta grid, stamp, and fixed cut-paper collage into source unique. Pruned raw SVG hex fills to brand tokens. | `UniqueBrandCover.vue` now imports `BrandCover`; specimen keeps inspection labels/anatomy only. |
| Brand logo lockups | `src/components/uniques/BrandLogo.vue` | Promoted singular identity lockups, including wordmark, monogram, tagline, brass, inverted, and note-mark variants. Pruned inline specimen note-mark styles into source classes. | `UniqueBrandLogo.vue` now imports `BrandLogo`; specimen keeps anatomy and variant grid only. |

## Taxonomy-Gated Recipes

| Recipe | Current artifact | Taxonomy decision | Next gate |
|---|---|---|---|
| Brand cover | `UniqueBrandCover.vue` | True unique; fixed brand artwork and cover copy now live in `BrandCover.vue`. | closed for unique source extraction |
| Brand logo / wordmark | `UniqueBrandLogo.vue` | True unique; identity lockups and variants now live in `BrandLogo.vue`. | closed for unique source extraction |
| Drawer shell | `UniqueDrawer.vue`, `CompositionTopDrawer.vue`, `src/components/TopDrawer.vue` | Not unique; reusable shell is promoted to `DrawerShell` and app `TopDrawer.vue` now wraps it. | closed for top-drawer app integration |
| Loading screen | `CompositionLoadingScreen.vue`, `src/components/LoadingSplash.vue` | Composition proof plus current app source; visual target now lives in `LoadingScreen.vue`, and app behavior feeds it. | closed for app integration |
| Top drawer app region | `CompositionTopDrawer.vue` | Composition proof composes `DrawerShell`; product panes/controls stay local until repetition proves lower-layer value. | composition-local controls remain keep-local |

## Ready For Extraction

yes, but only after Repository Conventions Gate is recorded and each extraction slice writes promotion decisions before component changes
