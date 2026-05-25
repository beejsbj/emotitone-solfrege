# Token Promotion Audit

This note started with a read-through audit of `emotitone-design-system/project/preview/token-*.html` and the ported `src/style-guide/tokens/*.vue` files against the shared token CSS in `src/emotitone-design-system.css`.

Scope correction: the preview files from `/Users/burooj/Projects/emotitone-design-system` have now been ported into this branch. Future promotion audits should read the ported Vue files in this repo, not repeat the source HTML/CSS comparison. The primitive audit below reads `src/style-guide/primatives/*.vue` as the source of truth for what still lives only in specimens.

The important question was not whether `colors_and_type.css` matched the copied app CSS. It mostly does. The useful question was whether the token preview files contain token-like rules, recipes, conventions, or constants that have not been promoted into the shared token layer.

## Clear Promote

- Geometry clip tokens from `token-geometry`: `--clip-offcut`, `--clip-tile`, `--clip-tab`, `--clip-paper-rip`.
  These have already been added to `src/emotitone-design-system.css`, but the upstream source `project/colors_and_type.css` does not have them yet.

- Geometry rotation tokens from `token-geometry`: `--rot-tile-1` through `--rot-tile-5`, `--rot-sticker`, `--rot-sticker-lg`, `--rot-mark`.
  These have already been added to `src/emotitone-design-system.css`, but the upstream source `project/colors_and_type.css` does not have them yet.

- SVG stroke grammar from `token-geometry`: butt caps, miter joins, no round caps.
  Stroke recipes shown in the preview include `1px` hairline, `2px` structural rule, `8px` knob track, dash `4 3`, and dot `1 4`. This is currently only documented inside the geometry preview/specimen.

- Spacing semantic labels from `token-spacing-scale`: `--s-1` through `--s-11` have role names such as hairline gap, icon nudge, chip padding, panel inset, card padding, and page gutter.
  The shared CSS currently carries raw values, but not these usage semantics.

- Brass usage rules from `token-ui-colors`: reserve brass for active record, captured value, lit beat, and hero wordmark.
  Preview rules also say: never use brass for borders, never use brass text under 12px, and never use brass as chrome background.

- Brand color roles from `token-brand-colors`: tomato, pine, plum, bone, and mustard each have more specific roles than the shared CSS comments currently capture.
  The preview also states that brand color sits on ink, never replaces it; use one brand color per card; and the canonical brand composition is represented by `primitive-spine-card.html`.

- Mono body utilities from `token-typography`: the preview has long-body mono recipes equivalent to `.body-mono` and `.body-s-mono`.
  Shared CSS documents the rule that longer prose should switch to mono, but it only ships `.body` and `.body-s` utilities.

## Needs Decision

- Skew transform tokens are inconsistent.
  Preview comments name `--skew-offcut`, `--skew-rip`, and `--skew-mode-out`; rendered labels name `--skew-tab`, `--skew-smear`, and `--skew-rip-out`.
  Some values are pure skew transforms, while others are composite transform plus opacity recipes. These need naming decisions before promotion.

- `--shadow-brass-ring` appears as a preview label, while shared CSS has `--shadow-glow-brass`.
  Decide whether `--shadow-brass-ring` is a stale label for `--shadow-glow-brass`, or a separate brass element shadow token.

- Music hue model conflict.
  The preview keeps a fixed 12-slot chromatic wheel and says scale-count drops cells. Shared CSS currently divides hue by `--music-count`, which stretches hue spacing when count changes.

- `--music-rotate` semantics conflict.
  The preview treats movable root as a 30-degree chromatic offset. Shared CSS treats `--music-rotate` as an additive degree index in the computed hue formula.

- Solfege and note-label maps live only in preview JavaScript.
  `NOTE_LETTERS`, `SOL_7`, and chromatic solfege mappings may belong in shared JS constants or composables, not CSS.

- Hue sweep is generated only inside the music preview.
  The preview creates `hue-sweep-seg-*` keyframes, uses `0.18` chroma, `+-15deg` sweep, negative stagger, and its own reduced-motion behavior. Promote only if hue sweep becomes a product primitive.

- `beat-cell` name collision.
  Token motion preview defines a local `@keyframes beat-cell` as a transform/scaleY pulse. Shared CSS defines global `beat-cell` as background/border lighting. Same name, different behavior.

- Brass sheen timing differs.
  The motion preview presents brass shimmer as `4s`; global `.brass::after` uses `6.5s`.

- Typography contradiction.
  The typography preview says mono face is for code, captions, and labels, while other token text and CSS say labels use Lets Jazz. The preview also has a mono face sample that appears to use `var(--t-body)`, not `--font-mono`.

- Brand color semantics have some tension.
  Preview copy uses tomato for warning/danger roles, while shared CSS says brand colors are decorative-only, even though `--danger` aliases tomato.

## Specimen-Only

- Motion preview helpers: `dur-fill`, `ease-run`, and `opacity-blink`.
  These visualize duration/easing/reduced-motion behavior but do not clearly belong in the shared token layer.

- `paper-rip-flash`.
  The preview explicitly treats this as a composition of existing motion primitives, not as its own keyframe/token.

- Preview scaffolding classes and layouts: grids, rows, stages, swatches, sample cells, ramps, and demo-only wrappers.

- Easing SVG path shapes.
  The path drawings visualize easing curves; only the stroke grammar seems reusable.

- Glass/scrim showcase CSS inside `TokenUiColors.vue`.
  `--glass` and `--scrim` already exist globally; the local showcase classes look like leftover specimen CSS.

- BEM-like preview section class names that look token-ish in grep output, such as `preview-port--token-motion`.

## Current Porting State

- `src/emotitone-design-system.css` now contains the promoted geometry clip and rotation custom properties.
- `src/utils/randomGeometry.ts` uses token references for clip, transform, and shadow selection.
- `Sticker.vue` consumes `getRandomGeometry("sticker")`; sticker geometry is randomized from token-backed values.
- `BarTape.vue` now owns the bar-tape primitive API and CSS; `PrimitiveBarTape.vue` imports it as a specimen. The promoted component corrected the documented major proportion recipe to `2-2-1-2-2-2-1` by making `mi` and `ti` narrow. Pattern compound specimens now compose `BarTape` instead of copying older bar-tape CSS.
- `IconButton.vue` now owns icon-only control size, geometry, tone, state, pressed, disabled, and brass treatment grammar; `PrimitiveButtons.vue` imports it as a specimen. Pattern compound specimens now compose `IconButton` instead of copying older `.ico` CSS.
- `CodeStrip.vue` now owns notation row chrome, note glyph modes, rests, durations, grouping, lit state, density, wrapping, and duration bars. Pattern compound specimens now compose `CodeStrip` instead of copying older `.cs` CSS, while `UniqueCodeStrip.vue` remains only a legacy specimen path.

## Primitive Vue Audit

This pass read the ported primitive Vue specimens directly: `src/style-guide/primatives/*.vue`. The goal was to find component recipes, tokens, utility classes, repeated styling, and grammar conflicts that are still trapped in specimen files instead of promoted into `src/emotitone-design-system.css` or real primitive components under `src/components/primatives/`.

## Primitive Clear Promote

- Shared guide chrome should stop living in every specimen.
  Section heads, anatomy grids, anatomy rows, variant grids, and variant cells are duplicated across many unresolved primitive files, including `PrimitiveKeys.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, `PrimitiveMarks.vue`, `PrimitiveSpineCard.vue`, and `PrimitiveTabs.vue`.
  The branch already has `AnatomyDisplay.vue`, `VariantGrid.vue`, and `VariantCell.vue`; the specimens should compose those instead of carrying duplicate scoped CSS.

- `.bar-tape` has been promoted to a real primitive.
  `src/components/primatives/BarTape.vue` contains the base strip, height variants, diatonic segment fills, major/equal proportions, dim state, playhead, downbeat signal, and boxed/flush frame. `PrimitiveBarTape.vue` is now a specimen that imports it.

- `.beats` / beat indicator has been promoted to a real primitive.
  `src/components/primatives/BeatIndicator.vue` owns cell sizing, beat/downbeat animation names, meter counts, static/even states, tempo variants, and reduced-motion behavior. `PrimitiveBeatIndicator.vue` now imports it and keeps only specimen staging.

- `.ico` has been promoted to the icon button/control primitive family.
  `src/components/primatives/IconButton.vue` now owns base size, sm/lg sizing, hover/active/disabled states, geometry variants, wire/solid/toggle/brass variants, and clip-token use. `PrimitiveButtons.vue` imports the source component. The paired shell remains a specimen-local wrapper until a real non-documentation consumer appears.

- Card shell has been promoted to a reusable container primitive.
  `src/components/primatives/CardShell.vue` owns the dark panel body, floating label, mark slot placement, heading/body typography, compact sizing, and border toggle. Demo ordinal/glyph/stamp drawings remain in `PrimitiveCard.vue` until the mark primitive is extracted.

- `.key` should become a shared music-key primitive family.
  `PrimitiveKeys.vue:297-511` defines the key face, syllable/degree/raw label stack, format modifiers, pressed/disabled states, and shape/cut variants. It already uses design-system tokens like `--shadow-key`, `--shadow-pressed`, `--dur-tap`, and `--ease-stab`.
  Important correction: the key-specific geometry grammar is not fully promoted. Generic cuts such as tile/offcut/tab overlap existing clip tokens, but the key strip default, pill form, and tall/wide/squary proportion set still live in `PrimitiveKeys.vue`.

- `.kicker` has been promoted to a real primitive.
  `src/components/primatives/Kicker.vue` owns dot + label anatomy, color/tone modifiers, density, dot-only/label-only forms, inverse treatment, and rectangular dot marks. The unused center/right alignment helpers were pruned.

- Analog and digital knobs share a promoted source primitive.
  `src/components/primatives/Knob.vue` now owns `knob-primitive`, label/footer frame, hero sizing, role modifiers, disabled state, lit/played states, tone axis, and button motion. `PrimitiveKnobsAnalog.vue` and `PrimitiveKnobsDigital.vue` import it with `visual="ring"` or `visual="arc"`.

- Knob spin motion is promoted once.
  `Knob.vue` owns one `knob-spin360` keyframe for ring and arc button motion with one reduced-motion rule.

- Digital knob SVG track grammar is source-owned for this primitive.
  `Knob.vue` owns butt caps, miter joins, `2px` background stroke, `8px` value stroke, and brass glow/drop-shadow behavior for arc knobs.

- `spine-card` has been promoted to a real primitive.
  `src/components/primatives/SpineCard.vue` owns the shell, colored spine, matching Kicker child, stamp, body copy, compact mode, and brand-color modifiers. This directly matches the brand-token rule that brand color appears as decorative artifact rather than whole-surface replacement.

- `p5-tabs` / chip-slide tabs have become a token-backed tabs primitive.
  `src/components/primatives/ChipTabs.vue` now owns rail, streak, active chip measurement, tab buttons, density, chip geometry, selected/disabled state, and brass chip tone. The source uses global clip, motion, and brass tokens instead of keeping the recipe trapped in `PrimitiveTabs.vue`.

- Sticker color vocabulary should be shared as a TS constant/map.
  `PrimitiveSticker.vue:51-64` repeats the color list that `Sticker.vue` also carries as a prop union and CSS modifier set. This should become a single exported color vocabulary when more primitives use the same color prop.

- Marks now have a primitive/component boundary.
  `src/components/primatives/Mark.vue` owns the raw SVG paths, named glyph API, tone, size, fill/wire treatment, and stroke behavior. `PrimitiveMarks.vue` keeps family panels and legends local.

## Primitive Needs Decision

- Music color source for `bar-tape` and `key`.
  `BarTape.vue` and `PrimitiveKeys.vue:82-167` still use legacy `--note-*` aliases. The shared CSS says those aliases are temporary and points toward `.note + --note-degree/-octave`. BarTape intentionally stayed alias-based for this slice to preserve branch fidelity; decide whether future primitives become recipe-driven.

- `bar-tape` major proportions conflict is resolved in the source component and pattern compounds.
  The earlier specimen described `2-2-1-2-2-2-1` but assigned `mi` wide and `fa` narrow. `BarTape.vue` now makes `mi` and `ti` narrow, matching the documented major interval recipe, and pattern compounds compose that source component.

- Brass button grammar is not settled.
  Global `.brass` is the canonical brass finish, but `PrimitiveButtons.vue:207`, `PrimitiveButtons.vue:249-275`, and `PrimitiveButtons.vue:562-580` split brass into `brass-signal`, fill, wire, and glow treatments, some inline. Decide whether these become button variants, separate brass treatment utilities, or specimen-only demonstrations.

- Guide/spec typography is mono-heavy.
  The primitives use mono for anatomy labels/spec tables throughout, while `src/emotitone-design-system.css` says labels are Jazz and mono is the exception. Either bless guide/spec tables as a named mono exception or rename them away from label grammar.

- `--clip-key-strip` versus `--clip-tile`.
  `PrimitiveKeys.vue:190-192` proposes `--clip-key-strip`, while `PrimitiveKeys.vue:439-441` uses the same geometry as the existing `--clip-tile`. Decide whether semantic aliases are useful, or whether primitives should reuse the base clip token names directly.

- Key geometry has more visual variety than the promoted generic clip tokens cover.
  `PrimitiveKeys.vue:178-227` shows cut variants, while `PrimitiveKeys.vue:481-511` adds squary, wide, and tall shape variants. The promoted token layer has generic clip paths, but it does not yet name key-specific geometry recipes such as strip, pill, tall, wide, squary, or their paired label-size adjustments.

- Kicker role boundary is resolved for this branch as a general marker.
  `Kicker.vue` supports brand tones plus brass, ivory, and open treatments. It is not limited to brand-color section dots.

- Kicker typography is kept as a named mono exception.
  `Kicker.vue` uses mono labels at 9px as section/spec-marker grammar, while the wider guide/spec label contradiction remains parked.

- Brass glow/drop-shadow is normalized for Knob.
  `Knob.vue` uses `--shadow-glow-brass` for played glow and brass ball states; SVG value strokes keep local `drop-shadow()` filters because they apply to stroke rendering rather than box shadow.

- Sticker `badge` may not belong as a `Sticker` variant.
  `PrimitiveSticker.vue:31-40` and `Sticker.vue:187-222` make badge ignore color and random geometry. That might be correct as a unique brass sticker variant, but it may also be a separate brass badge primitive.

- `preset-row` is gate-parked as a compound/control row.
  `PrimitiveSpineCard.vue` keeps local preset-row demos for apply/applied/expiring states, but `SpineCard.vue` does not absorb them into the primitive API.

- Mark API is resolved for this branch.
  Runtime API is `name`, `size`, `tone`, and `treatment`. `family` remains specimen taxonomy because it groups marks for inspection rather than changing render behavior.

- Tabs timing needs a token decision.
  `ChipTabs.vue` resolves this slice by using `--dur-ui` with `--ease-swing` for chip selection and the same 220ms window for transient smear. No `--dur-chip` token was added.

- Tab variant naming needs cleanup.
  Source variants are `tab`, `offcut`, `tile`, `sharp`, `pill`, and `rip`, with brass handled as a tone axis rather than a geometry. The specimen demonstrates the active set through `ChipTabs`.

## Primitive Specimen-Only

- Hero/stage wrappers should stay guide-only.
  Examples include `PrimitiveBarTape.vue`, `PrimitiveButtons.vue`, and `PrimitiveKeys.vue:513-531`. `PrimitiveBeatIndicator.vue`, `PrimitiveKicker.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, and `PrimitiveKnobsDigital.vue` have already been rewritten to keep source behavior in components and guide staging in specimens.

- Variant-card chrome and demo tilts are display scaffolding unless routed through the shared random geometry utility.
  Examples include `PrimitiveBarTape.vue:319`, `PrimitiveButtons.vue:599-623`, and unresolved key/mark-adjacent specimens. Knob specimen tile/tilt chrome was pruned into guide helpers plus `Knob` source frame anatomy.

- Inline demo sizing/padding should stay local unless promoted into named variants.
  `PrimitiveKeys.vue` has many specimen-only inline dimensions and demo paddings around lines `41`, `52`, `63`, `79-81`, `143`, `181`, `234`, and `268`.

- Card inverted examples are specimen-only.
  `PrimitiveCard.vue` keeps a light inversion example in specimen-local CSS. The light inversion in particular should not be promoted unless the app needs a light card primitive.

- Marks exhibition scaffolding stays local.
  Family headings, legends, treatment grids, and scale grids in `PrimitiveMarks.vue` are display machinery around `Mark`, not source component behavior.

- Tabs state specimens are documentation, not the tab primitive.
  Previous state-button examples were pruned from the specimen. `ChipTabs.vue` owns real selected and disabled tab states; standalone face-state cards are no longer a separate local recipe.

## Primitive Inconsistencies

- Button, key, and tab clip variants re-hardcode some polygons already tokenized.
  `PrimitiveButtons.vue:522-528`, the generic key cuts in `PrimitiveKeys.vue:441-467`, and old tab chip CSS should use `--clip-offcut`, `--clip-tile`, `--clip-tab`, and `--clip-paper-rip` where those exact shapes match. `ChipTabs.vue` now does this for tabs.
  This does not mean all key geometry is promoted; the key-specific strip/pill/proportion recipes above are still missing from the shared grammar.

- Hardcoded ink appears where `var(--ink)` exists.
  `PrimitiveTabs.vue` now composes guide helpers and `ChipTabs`; its hardcoded `#0a0908` stage was removed. `PrimitiveBeatIndicator.vue` was resolved by composing guide helpers backed by `var(--ink)`.

- Card shell no longer uses undefined `--font-body`.
  `CardShell.vue` and the remaining specimen-local inversion use `--t-body-s`; the old `var(--font-body)` references were pruned.

- Beat keyframe naming is split.
  Shared CSS contains both `bar-cell`/`bar-down` and `beat-cell`/`beat-down`, while `BeatIndicator.vue` consumes only `beat-*`. Decide whether both sets are intentional or whether one is stale.

- `.live` repeats inline positioning already handled by CSS.
  `PrimitiveBarTape.vue:14` repeats `position:relative`, while `.bar-tape.live` already sets `position: relative` at `PrimitiveBarTape.vue:216`.

- Keys note mapping appears wrong.
  `PrimitiveKeys.vue:74-79` says chromatic palette while comments mention seven diatonic seats, and `PrimitiveKeys.vue:89-133` maps several chromatic labels to the wrong base aliases: `Ra` uses `--note-re`, `Me` uses `--note-mi`, `Se` uses `--note-sol`, and `Le` uses `--note-la`.

- Keys degree-format text does not match the implementation.
  `PrimitiveKeys.vue:52-58` says arabic + roman sub, but `PrimitiveKeys.vue:352-359` renders roman-only values and `PrimitiveKeys.vue:419-421` leaves degree numeral toggles unimplemented.

- Disabled naming and filters still diverge between keys and source knobs.
  Keys use `.disabled` with `saturate(.12) brightness(.45)` at `PrimitiveKeys.vue:429-431`; `Knob.vue` uses `disabled` prop and `.knob-primitive--disabled` with `saturate(.1) brightness(.55)`.

- Digital knob played selector is fixed in source.
  `Knob.vue` uses same-element `.knob-primitive--arc.knob-primitive--played` selectors, so the old descendant mismatch is removed.

- Non-brass knob grammar is normalized.
  `Knob.vue` uses the `tone="ivory"` axis for ring and arc visuals instead of separate analog `.is-nobrass` and digital `.ivory-only` recipes.

- Kicker unused alignment-demo CSS was pruned.
  `Kicker.vue` does not carry center/right alignment helpers because the specimen did not use them.

- Tabs and knobs use source-owned brass grammar.
  `ChipTabs.vue` uses the global `.brass` utility on the active chip and brass tokens for the component-specific active surface shadow. `Knob.vue` owns brass value marks and shared glow usage for visual knob primitives.

- Brand danger semantics remain split.
  Shared CSS says brand colors are decorative-only, but also aliases `--danger` to tomato. `SpineCard.vue` preserves the tomato example content through the specimen, but the semantic decision still needs doctrine work rather than another token alias.

- Marks scale text and proof are reconciled through the source size prop.
  `Mark.vue` accepts a numeric/string `size`; `PrimitiveMarks.vue` demonstrates 14, 28, 56, 92 hero, and 96 hero cases without hardcoded source CSS.
