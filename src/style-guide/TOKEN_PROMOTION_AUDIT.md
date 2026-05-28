# Token Promotion Audit

This note started with a read-through audit of `emotitone-design-system/project/preview/token-*.html` and the ported `src/style-guide/tokens/*.vue` files against the shared token CSS in `src/emotitone-design-system.css`.

Current status, 2026-05-27: this file is now a historical token/primitive audit with current resolutions folded in. The authoritative current promotion ledger is `PROMOTION_AUDIT.md`; the authoritative closure verdict is `LAYER_CLOSURE.md` and `RESIDUE_PROOF.md`.

Scope correction: the preview files from `/Users/burooj/Projects/emotitone-design-system` have now been ported into this branch. Future promotion audits should read the ported Vue files in this repo, not repeat the source HTML/CSS comparison. The primitive audit below reads `src/style-guide/primatives/*.vue` as the source of truth for what still lives only in specimens.

The important question was not whether `colors_and_type.css` matched the copied app CSS. It mostly does. The useful question was whether the token preview files contain token-like rules, recipes, conventions, or constants that have not been promoted into the shared token layer.

## Clear Promote

- Geometry clip tokens from `token-geometry`: `--clip-offcut`, `--clip-tile`, `--clip-tab`, `--clip-paper-rip`.
  These have already been added to `src/emotitone-design-system.css`, but the upstream source `project/colors_and_type.css` does not have them yet.

- Geometry rotation tokens from `token-geometry`: `--rot-tile-1` through `--rot-tile-5`, `--rot-sticker`, `--rot-sticker-lg`, `--rot-mark`.
  These have already been added to `src/emotitone-design-system.css`, but the upstream source `project/colors_and_type.css` does not have them yet.

- SVG stroke grammar from `token-geometry`: butt caps, miter joins, no round caps.
  Stroke recipes shown in the preview include `1px` hairline, `2px` structural rule, `8px` knob track, dash `4 3`, and dot `1 4`. The reusable pieces now live in source primitives such as `Mark.vue` and `Knob.vue`; the geometry specimen documents the doctrine.

- Spacing semantic labels from `token-spacing-scale`: `--s-1` through `--s-11` have role names such as hairline gap, icon nudge, chip padding, panel inset, card padding, and page gutter.
  The shared CSS currently carries raw values, but not these usage semantics.

- Brass usage rules from `token-ui-colors`: reserve brass for active record, captured value, lit beat, and hero wordmark.
  Preview rules also say: never use brass for borders, never use brass text under 12px, and never use brass as chrome background.

- Brand color roles from `token-brand-colors`: tomato, pine, plum, bone, and mustard each have more specific roles than the shared CSS comments currently capture.
  The preview also states that brand color sits on ink, never replaces it; use one brand color per card; and the canonical brand composition is represented by `primitive-spine-card.html`.

- Mono body utilities from `token-typography`: the preview has long-body mono recipes equivalent to `.body-mono` and `.body-s-mono`.
  Shared CSS now ships `--t-body-mono`, `--t-body-s-mono`, `.body-mono`, and `.body-s-mono`.

## Resolved Or Parked Decisions

- Skew transform labels were pruned as token candidates.
  The geometry specimen now names them as specimen recipes, not promoted `--skew-*` tokens. Pure skew transforms and composite transform-plus-opacity recipes stay local until a real component source needs them.

- `--shadow-brass-ring` was a stale preview label.
  The geometry specimen now points at the shared `--shadow-glow-brass` token.

- Music hue model conflict is resolved for token closure.
  The shared `.note` recipe is token source and computes hue from `(degree + --music-rotate) * (360 / --music-count)`. Legacy `--note-*` alias consumers stay parked for app/component migration.

- `--music-rotate` semantics are resolved as a root-degree offset in the computed `.note` formula.

- Solfege and note-label maps no longer live as private specimen arrays.
  The token music specimen imports `CHROMATIC_NOTES`, `SOLFEGE_NOTES`, and `MOVABLE_DO_SOLFEGE_NOTES` from `src/data`.

- Hue sweep is generated only inside the music preview.
  The preview creates `hue-sweep-seg-*` keyframes, uses `0.18` chroma, `+-15deg` sweep, negative stagger, and its own reduced-motion behavior. Promote only if hue sweep becomes a product primitive.

- `beat-cell` name collision.
  Token motion preview defines a local `@keyframes beat-cell` as a transform/scaleY pulse. Shared CSS defines global `beat-cell` as background/border lighting. `BeatIndicator.vue` consumes the current global `beat-*` names, so any `bar-*`/`beat-*` cleanup is future motion naming cleanup rather than a token closure blocker.

- Brass sheen timing is resolved for the shared utility.
  Global `.brass::after`, the token motion specimen, and Sticker badge shimmer all use 6.5s.

- Typography contradiction is localized.
  Product labels are Lets Jazz; guide/spec inspection labels may use mono. Long-body mono utilities now use `--font-mono`.

- Brand color semantics are resolved for token closure.
  Brand colors remain decorative in product composition. Semantic status aliases such as `--danger` are legacy compatibility, not doctrine, and should be removed in a future token cleanup.

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
- Token doctrine is closed for current style-guide scope: spacing roles are documented, mono body utilities are shipped, music data constants are imported from `src/data`, stale skew/shadow labels are pruned, brass shimmer timing is normalized, and app/component migrations are parked separately.

## Primitive Vue Audit

This pass read the ported primitive Vue specimens directly: `src/style-guide/primatives/*.vue`. The goal was to find component recipes, tokens, utility classes, repeated styling, and grammar conflicts that are still trapped in specimen files instead of promoted into `src/emotitone-design-system.css` or real primitive components under `src/components/primatives/`.

## Primitive Clear Promote

- Shared guide chrome was promoted to helper vocabulary.
  Section heads, anatomy grids, anatomy rows, variant grids, and variant cells were duplicated across many primitive files. The branch now has `AnatomyDisplay.vue`, `VariantGrid.vue`, and `VariantCell.vue` as the guide helper vocabulary, and remaining guide staging is treated as inspection chrome rather than implementation source.

- `.bar-tape` has been promoted to a real primitive.
  `src/components/primatives/BarTape.vue` contains the base strip, height variants, diatonic segment fills, major/equal proportions, dim state, playhead, downbeat signal, and boxed/flush frame. `PrimitiveBarTape.vue` is now a specimen that imports it.

- `.beats` / beat indicator has been promoted to a real primitive.
  `src/components/primatives/BeatIndicator.vue` owns cell sizing, beat/downbeat animation names, meter counts, static/even states, tempo variants, and reduced-motion behavior. `PrimitiveBeatIndicator.vue` now imports it and keeps only specimen staging.

- `.ico` has been promoted to the icon button/control primitive family.
  `src/components/primatives/IconButton.vue` now owns base size, sm/lg sizing, hover/active/disabled states, geometry variants, wire/solid/toggle/brass variants, and clip-token use. `PrimitiveButtons.vue` imports the source component. The paired shell remains a specimen-local wrapper until a real non-documentation consumer appears.

- Card shell has been promoted to a reusable container primitive.
  `src/components/primatives/CardShell.vue` owns the dark panel body, floating label, mark slot placement, heading/body typography, compact sizing, and border toggle. Demo ordinal/glyph/stamp drawings remain in `PrimitiveCard.vue` until the mark primitive is extracted.

- `.key` has become a shared music-key primitive family.
  `src/components/primatives/Key.vue` owns the key face, syllable/degree/raw label stack, format modifiers, pressed/disabled states, sheen, and shape/cut variants. It uses design-system tokens like `--shadow-key`, `--shadow-pressed`, `--dur-tap`, and `--ease-stab`.
  Generic cuts such as tile/offcut/tab use existing clip tokens. Key-specific pill/tall/wide/squary proportion recipes are promoted as component variants, not token aliases.

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

- Sticker color vocabulary can become a TS constant/map later.
  `PrimitiveSticker.vue` repeats the color list that `Sticker.vue` also carries as a prop union and CSS modifier set. This remains future cleanup only if more primitives need the same exported color vocabulary; it is not current style-guide residue.

- Marks now have a primitive/component boundary.
  `src/components/primatives/Mark.vue` owns the raw SVG paths, named glyph API, tone, size, fill/wire treatment, and stroke behavior. `PrimitiveMarks.vue` keeps family panels and legends local.

## Primitive Resolved Or Parked Decisions

- Music color source for `bar-tape` and `key`.
  `BarTape.vue` and `Key.vue` still use legacy `--note-*` aliases. The shared CSS says those aliases are temporary and points toward `.note + --note-degree/-octave`. Both primitives intentionally stay alias-based for this branch while the computed `.note` migration is parked as app/component migration.

- `bar-tape` major proportions conflict is resolved in the source component and pattern compounds.
  The earlier specimen described `2-2-1-2-2-2-1` but assigned `mi` wide and `fa` narrow. `BarTape.vue` now makes `mi` and `ti` narrow, matching the documented major interval recipe, and pattern compounds compose that source component.

- Brass button grammar is resolved for current scope.
  `IconButton.vue` owns button variants and brass treatments, while global `.brass` remains the shared finish utility. No separate brass utility was promoted from the old button specimen.

- Guide/spec typography is localized.
  Product labels use Lets Jazz; guide/spec inspection labels and kicker/spec-marker labels may use mono as named exceptions.

- `--clip-key-strip` versus `--clip-tile` is resolved for this branch.
  `Key.vue` reuses `--clip-tile` for strip/default forms instead of adding a semantic alias.

- Key geometry has component-specific variants beyond generic clip tokens.
  `Key.vue` promotes pill, tall, wide, and squary as source component variants with paired label-size adjustments. They are not new global clip tokens.

- Kicker role boundary is resolved for this branch as a general marker.
  `Kicker.vue` supports brand tones plus brass, ivory, and open treatments. It is not limited to brand-color section dots.

- Kicker typography is kept as a named mono exception.
  `Kicker.vue` uses mono labels at 9px as section/spec-marker grammar; the wider guide/spec label exception is recorded in token closure.

- Brass glow/drop-shadow is normalized for Knob.
  `Knob.vue` uses `--shadow-glow-brass` for played glow and brass ball states; SVG value strokes keep local `drop-shadow()` filters because they apply to stroke rendering rather than box shadow.

- Sticker `badge` belongs as a fixed-geometry `Sticker` variant.
  Badge color and brass timing now use the shared Sticker color vocabulary and global brass sweep.

- `PresetRow` was pruned as over-extraction.
  The preset/action examples are now represented as ordinary `SpineCard` usage with a filled button/content slot.

- Mark API is resolved for this branch.
  Runtime API is `name`, `size`, `tone`, and `treatment`. `family` remains specimen taxonomy because it groups marks for inspection rather than changing render behavior.

- Tabs timing is resolved for current scope.
  `ChipTabs.vue` resolves this slice by using `--dur-ui` with `--ease-swing` for chip selection and the same 220ms window for transient smear. No `--dur-chip` token was added.

- Tab variant naming is resolved for current scope.
  Source variants are `tab`, `offcut`, `tile`, `sharp`, `pill`, and `rip`, with brass handled as a tone axis rather than a geometry. The specimen demonstrates the active set through `ChipTabs`.

## Primitive Specimen-Only

- Hero/stage wrappers should stay guide-only.
  Examples include `PrimitiveBarTape.vue` and `PrimitiveButtons.vue`. `PrimitiveBeatIndicator.vue`, `PrimitiveKicker.vue`, `PrimitiveMarks.vue`, `PrimitiveTabs.vue`, `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue`, and `PrimitiveKeys.vue` have already been rewritten to keep source behavior in components and guide staging in specimens.

- Variant-card chrome and demo tilts are display scaffolding unless routed through the shared random geometry utility.
  Examples include historical `PrimitiveBarTape.vue` and `PrimitiveButtons.vue` staging. Key, mark, tab, and knob behavior now lives in source components; remaining specimen wrappers are inspection chrome.

- Inline demo sizing/padding should stay local unless promoted into named variants.
  `PrimitiveKeys.vue` no longer uses inline key dimensions or demo key paddings; key sizing now lives behind source `shape` variants.

- Card inverted examples are specimen-only.
  `PrimitiveCard.vue` keeps a light inversion example in specimen-local CSS. The light inversion in particular should not be promoted unless the app needs a light card primitive.

- Marks exhibition scaffolding stays local.
  Family headings, legends, treatment grids, and scale grids in `PrimitiveMarks.vue` are display machinery around `Mark`, not source component behavior.

- Tabs state specimens are documentation, not the tab primitive.
  Previous state-button examples were pruned from the specimen. `ChipTabs.vue` owns real selected and disabled tab states; standalone face-state cards are no longer a separate local recipe.

## Primitive Inconsistencies

- Button, key, and tab clip variants reuse tokens where exact.
  `ChipTabs.vue` and `Key.vue` now use existing clip tokens for exact matches; `IconButton.vue` already does this for offcut/tile. Key-specific pill/proportion recipes stay component-local.

- Hardcoded ink appears where `var(--ink)` exists.
  `PrimitiveTabs.vue` now composes guide helpers and `ChipTabs`; its hardcoded `#0a0908` stage was removed. `PrimitiveBeatIndicator.vue` was resolved by composing guide helpers backed by `var(--ink)`.

- Card shell no longer uses undefined `--font-body`.
  `CardShell.vue` and the remaining specimen-local inversion use `--t-body-s`; the old `var(--font-body)` references were pruned.

- Beat keyframe naming is split.
  Shared CSS contains both `bar-cell`/`bar-down` and `beat-cell`/`beat-down`, while `BeatIndicator.vue` consumes only `beat-*`. Any naming consolidation is future motion cleanup and not a token closure blocker.

- BarTape live positioning is source-owned.
  `BarTape.vue` owns the relative positioning needed for the live playhead; the old specimen-level inline positioning is gone.

- Keys note mapping is corrected in the specimen data.
  `PrimitiveKeys.vue` now demonstrates the full legacy chromatic alias set and maps Ra/Me/Se/Le to `--note-ra`, `--note-me`, `--note-se`, and `--note-le` through the `Key` source API.

- Keys degree-format text now matches the implementation.
  `Key.vue` treats `degree` as supplied label text and the specimen no longer claims an arabic+roman sub-rendering that does not exist.

- Disabled naming and filters are source-owned per primitive.
  `Key.vue` uses a `disabled` prop and `.key-face--disabled`; `Knob.vue` uses a `disabled` prop and `.knob-primitive--disabled`. Filter values remain component-specific visual recipes.

- Digital knob played selector is fixed in source.
  `Knob.vue` uses same-element `.knob-primitive--arc.knob-primitive--played` selectors, so the old descendant mismatch is removed.

- Non-brass knob grammar is normalized.
  `Knob.vue` uses the `tone="ivory"` axis for ring and arc visuals instead of separate analog `.is-nobrass` and digital `.ivory-only` recipes.

- Kicker unused alignment-demo CSS was pruned.
  `Kicker.vue` does not carry center/right alignment helpers because the specimen did not use them.

- Tabs and knobs use source-owned brass grammar.
  `ChipTabs.vue` uses the global `.brass` utility on the active chip and brass tokens for the component-specific active surface shadow. `Knob.vue` owns brass value marks and shared glow usage for visual knob primitives.

- Brand danger semantics are localized.
  Brand colors remain decorative-only. Semantic aliases such as `--danger` are legacy cleanup targets, and `SpineCard.vue` uses tomato as brand/decor copy rather than functional danger language.

- Marks scale text and proof are reconciled through the source size prop.
  `Mark.vue` accepts a numeric/string `size`; `PrimitiveMarks.vue` demonstrates 14, 28, 56, 92 hero, and 96 hero cases without hardcoded source CSS.
