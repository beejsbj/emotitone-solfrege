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

## Primitive Vue Audit

This pass read the ported primitive Vue specimens directly: `src/style-guide/primatives/*.vue`. The goal was to find component recipes, tokens, utility classes, repeated styling, and grammar conflicts that are still trapped in specimen files instead of promoted into `src/emotitone-design-system.css` or real primitive components under `src/components/primatives/`.

## Primitive Clear Promote

- Shared guide chrome should stop living in every specimen.
  Section heads, anatomy grids, anatomy rows, variant grids, and variant cells are duplicated across nearly all primitive files, including `PrimitiveBarTape.vue:233`, `PrimitiveBeatIndicator.vue:89`, `PrimitiveButtons.vue:392`, `PrimitiveCard.vue:145`, `PrimitiveKeys.vue:533`, `PrimitiveKicker.vue:235`, `PrimitiveKnobsAnalog.vue:119`, `PrimitiveKnobsDigital.vue:202`, `PrimitiveMarks.vue:337`, `PrimitiveSpineCard.vue:164`, and `PrimitiveTabs.vue:263`.
  The branch already has `AnatomyDisplay.vue`, `VariantGrid.vue`, and `VariantCell.vue`; the specimens should compose those instead of carrying duplicate scoped CSS.

- `.bar-tape` is a real primitive candidate.
  `PrimitiveBarTape.vue:176-230` contains the base strip, height variants, diatonic segment fills, major/equal proportions, dim state, playhead, and downbeat signal. This should become a reusable primitive component or shared primitive class recipe.

- `.beats` / beat indicator is a real primitive candidate.
  `PrimitiveBeatIndicator.vue:152-215` defines cell sizing, beat/downbeat animation names, meter counts, static/even states, tempo variants, and reduced-motion behavior. It already depends on global `beat-*` keyframes in `src/emotitone-design-system.css`.

- `.ico` and `.ico-pair` are ready to promote as the icon button/control primitive family.
  `PrimitiveButtons.vue:464-596` defines base size, sm/lg sizing, hover/active/disabled states, geometry variants, wire/solid/toggle/brass variants, and paired-button behavior. It already leans on `--ring`, `--dur-tap`, `--ease-stab`, radius tokens, and clip tokens.

- Card shell should become a reusable container primitive.
  `PrimitiveCard.vue:96-152` defines the panel-card body, mark slot, ordinal/glyph/stamp mark treatments, heading/body typography, and panel label. It sits on top of the existing `.panel` and `.panel-label` preview-card grammar, but the card anatomy itself is component-worthy.

- `.key` should become a shared music-key primitive family.
  `PrimitiveKeys.vue:297-511` defines the key face, syllable/degree/raw label stack, format modifiers, pressed/disabled states, and shape/cut variants. It already uses design-system tokens like `--shadow-key`, `--shadow-pressed`, `--dur-tap`, and `--ease-stab`.
  Important correction: the key-specific geometry grammar is not fully promoted. Generic cuts such as tile/offcut/tab overlap existing clip tokens, but the key strip default, pill form, and tall/wide/squary proportion set still live in `PrimitiveKeys.vue`.

- `.kicker` is a real primitive candidate.
  `PrimitiveKicker.vue:140-214` defines dot + label anatomy, color modifiers, density, dot-only/label-only forms, inverse treatment, alignment, and rectangular dot marks. This should not remain only as specimen CSS if kicker is part of the grammar.

- Analog and digital knobs share enough structure to promote a knob primitive layer.
  `PrimitiveKnobsAnalog.vue:163-380` and `PrimitiveKnobsDigital.vue:246-448` both define `knob`, `knob-label`, `knob-foot`, `knob-tile`, hero sizing, role modifiers, disabled state, lit/played states, and button motion. The shared anatomy should move into a real component or common primitive CSS before the analog/digital differences are split.

- `spin360` is duplicated.
  `PrimitiveKnobsAnalog.vue:312-317` and `PrimitiveKnobsDigital.vue:441-448` both define the same beat-based rotation animation for knob button motion. Promote once if this is a real primitive motion, or leave local only if it is just specimen theatre.

- Digital knob SVG track grammar should become a reusable stroke recipe.
  `PrimitiveKnobsDigital.vue:369-392` repeats butt caps, miter joins, `2px` background stroke, `8px` value stroke, and brass glow/drop-shadow behavior. This reinforces the earlier SVG stroke grammar finding from the token audit.

- `spine-card` is a real primitive candidate.
  `PrimitiveSpineCard.vue:101-161` defines the shell, colored spine, kicker row, dot, stamp, body copy, and brand-color modifiers. This directly matches the brand-token rule that brand color appears as decorative artifact rather than whole-surface replacement.

- `p5-tabs` / chip-slide tabs should become a token-backed tabs primitive.
  `PrimitiveTabs.vue:352-479` defines rail, streak, chip, tab buttons, density, chip geometry, and brass chip finish. The mechanics already map to global clip, motion, and brass tokens, but are still trapped in the specimen.

- Sticker color vocabulary should be shared as a TS constant/map.
  `PrimitiveSticker.vue:51-64` repeats the color list that `Sticker.vue` also carries as a prop union and CSS modifier set. This should become a single exported color vocabulary when more primitives use the same color prop.

- Marks need a primitive/component boundary.
  `PrimitiveMarks.vue:25-30` states the mark role and scale rules, while `PrimitiveMarks.vue:37-153` contains the raw SVG families. The treatment grammar in `PrimitiveMarks.vue:156-239` and stroke behavior should be promoted into a reusable mark primitive once the API is named.

## Primitive Needs Decision

- Music color source for `bar-tape` and `key`.
  `PrimitiveBarTape.vue:188-194` and `PrimitiveKeys.vue:82-167` still use legacy `--note-*` aliases. The shared CSS says those aliases are temporary and points toward `.note + --note-degree/-octave`. Decide whether these primitives stay alias-based for fidelity or become recipe-driven now.

- `bar-tape` major proportions conflict.
  `PrimitiveBarTape.vue:36` describes `2-2-1-2-2-2-1`, but `PrimitiveBarTape.vue:201-207` assigns `mi` wide and `fa` narrow, producing `2-2-2-1-2-2-1`. The correct interval/proportion grammar needs a call before promotion.

- Brass button grammar is not settled.
  Global `.brass` is the canonical brass finish, but `PrimitiveButtons.vue:207`, `PrimitiveButtons.vue:249-275`, and `PrimitiveButtons.vue:562-580` split brass into `brass-signal`, fill, wire, and glow treatments, some inline. Decide whether these become button variants, separate brass treatment utilities, or specimen-only demonstrations.

- Guide/spec typography is mono-heavy.
  The primitives use mono for anatomy labels/spec tables throughout, while `src/emotitone-design-system.css` says labels are Jazz and mono is the exception. Either bless guide/spec tables as a named mono exception or rename them away from label grammar.

- `--clip-key-strip` versus `--clip-tile`.
  `PrimitiveKeys.vue:190-192` proposes `--clip-key-strip`, while `PrimitiveKeys.vue:439-441` uses the same geometry as the existing `--clip-tile`. Decide whether semantic aliases are useful, or whether primitives should reuse the base clip token names directly.

- Key geometry has more visual variety than the promoted generic clip tokens cover.
  `PrimitiveKeys.vue:178-227` shows cut variants, while `PrimitiveKeys.vue:481-511` adds squary, wide, and tall shape variants. The promoted token layer has generic clip paths, but it does not yet name key-specific geometry recipes such as strip, pill, tall, wide, squary, or their paired label-size adjustments.

- Kicker role needs a boundary.
  `PrimitiveKicker.vue:17` presents kicker as a brand-color axis, but `PrimitiveKicker.vue:166-177` adds brass, ivory, and open treatments. Decide whether kicker is a brand marker only, or a general inline status marker that can carry functional brass.

- Kicker typography may be a named exception.
  `PrimitiveKicker.vue:140-149` uses mono labels, while base typography says labels are Jazz. If that is intentional, it should be named as kicker/spec-marker typography rather than accidental drift.

- Brass glow/drop-shadow needs a token decision.
  Knobs hardcode brass glows in places like `PrimitiveKnobsAnalog.vue:285`, `PrimitiveKnobsAnalog.vue:321-324`, `PrimitiveKnobsDigital.vue:386`, `PrimitiveKnobsDigital.vue:418`, and `PrimitiveKnobsDigital.vue:431`, even though `--shadow-glow-brass` exists. Decide whether drop-shadow glow becomes its own token or all uses collapse to `--shadow-glow-brass`.

- Sticker `badge` may not belong as a `Sticker` variant.
  `PrimitiveSticker.vue:31-40` and `Sticker.vue:187-222` make badge ignore color and random geometry. That might be correct as a unique brass sticker variant, but it may also be a separate brass badge primitive.

- `preset-row` stretches spine-card toward a compound.
  `PrimitiveSpineCard.vue:57-84` and `PrimitiveSpineCard.vue:227-268` turn the spine-card into an interactive row with status text and buttons. Decide whether this is a spine-card variant or a compound/control row.

- Marks need an API before promotion.
  Current marks are raw SVG snippets. A likely component API is some combination of `family`, `name`, `size`, `tone`, and `treatment`, but that decision should be explicit before extracting.

- Tabs timing needs a token decision.
  `PrimitiveTabs.vue:69-82` describes `320ms` chip motion and `220ms` smear, the JS removes smear after `220`, and `PrimitiveTabs.vue:387-390` uses `320ms`. Global durations are `--dur-ui: 220ms` and `--dur-panel: 360ms`. Decide whether tabs need a new `--dur-chip` or should snap to an existing duration.

- Tab variant naming needs cleanup.
  Template variants are tab/offcut/tile/sharp/rip/brass in `PrimitiveTabs.vue:123-205`, while CSS also defines unused `.chip-pill` at `PrimitiveTabs.vue:421-426`. Decide the actual variant set before extracting `Tabs`.

## Primitive Specimen-Only

- Hero/stage wrappers should stay guide-only.
  Examples include `PrimitiveBarTape.vue:277`, `PrimitiveBeatIndicator.vue:132`, `PrimitiveButtons.vue:435`, `PrimitiveKeys.vue:513-531`, `PrimitiveKicker.vue:278-339`, `PrimitiveKnobsAnalog.vue:163-195`, `PrimitiveKnobsDigital.vue:246-278`, `PrimitiveMarks.vue:274-434`, and `PrimitiveTabs.vue:121-211`.

- Variant-card chrome and demo tilts are display scaffolding unless routed through the shared random geometry utility.
  Examples include `PrimitiveBarTape.vue:319`, `PrimitiveButtons.vue:599-623`, `PrimitiveKicker.vue:216-233`, `PrimitiveKnobsAnalog.vue:197-201`, `PrimitiveKnobsDigital.vue:280-284`, `PrimitiveMarks.vue:312-319`, `PrimitiveMarks.vue:404-408`, and `PrimitiveMarks.vue:431-434`.

- Inline demo sizing/padding should stay local unless promoted into named variants.
  `PrimitiveKeys.vue` has many specimen-only inline dimensions and demo paddings around lines `41`, `52`, `63`, `79-81`, `143`, `181`, `234`, and `268`.

- Card inverted examples are specimen-only.
  `PrimitiveCard.vue:61-73` explicitly shows dark/light inversion examples for the guide. The light inversion in particular should not be promoted unless the app needs a light card primitive.

- Marks exhibition scaffolding should stay local.
  `.family`, `.family-head`, `.shape-row`, `.legend`, `.treatments-grid`, and `.scales-row` in `PrimitiveMarks.vue:274-434` are display machinery around glyphs, not the reusable primitive itself.

- Tabs state specimens are documentation, not the tab primitive.
  `PrimitiveTabs.vue:88-117` and `PrimitiveTabs.vue:527-558` show state-button examples. They should not be mixed into the chip-slide tab component.

## Primitive Inconsistencies

- Button, key, and tab clip variants re-hardcode some polygons already tokenized.
  `PrimitiveButtons.vue:522-528`, the generic key cuts in `PrimitiveKeys.vue:441-467`, and `PrimitiveTabs.vue:386-436` should use `--clip-offcut`, `--clip-tile`, `--clip-tab`, and `--clip-paper-rip` where those exact shapes match.
  This does not mean all key geometry is promoted; the key-specific strip/pill/proportion recipes above are still missing from the shared grammar.

- Hardcoded ink appears where `var(--ink)` exists.
  `PrimitiveBeatIndicator.vue:134`, `PrimitiveBeatIndicator.vue:193`, and `PrimitiveTabs.vue:342-345` use `#0a0908`.

- `PrimitiveCard.vue` uses undefined `--font-body`.
  `PrimitiveCard.vue:67` and `PrimitiveCard.vue:73` reference `var(--font-body)`, but the shared CSS defines `--font-text`, `--font-mono`, and type shorthands such as `--t-body`.

- Beat keyframe naming is split.
  Shared CSS contains both `bar-cell`/`bar-down` and `beat-cell`/`beat-down`, while `PrimitiveBeatIndicator.vue:161` consumes only `beat-*`. Decide whether both sets are intentional or whether one is stale.

- `.live` repeats inline positioning already handled by CSS.
  `PrimitiveBarTape.vue:14` repeats `position:relative`, while `.bar-tape.live` already sets `position: relative` at `PrimitiveBarTape.vue:216`.

- Keys note mapping appears wrong.
  `PrimitiveKeys.vue:74-79` says chromatic palette while comments mention seven diatonic seats, and `PrimitiveKeys.vue:89-133` maps several chromatic labels to the wrong base aliases: `Ra` uses `--note-re`, `Me` uses `--note-mi`, `Se` uses `--note-sol`, and `Le` uses `--note-la`.

- Keys degree-format text does not match the implementation.
  `PrimitiveKeys.vue:52-58` says arabic + roman sub, but `PrimitiveKeys.vue:352-359` renders roman-only values and `PrimitiveKeys.vue:419-421` leaves degree numeral toggles unimplemented.

- Disabled naming and filters diverge.
  Keys use `.disabled` with `saturate(.12) brightness(.45)` at `PrimitiveKeys.vue:429-431`; knobs use `.is-disabled` with `saturate(0.1) brightness(0.55)` at `PrimitiveKnobsAnalog.vue:357-360` and `PrimitiveKnobsDigital.vue:434-437`.

- Digital knob played selector appears structurally wrong.
  `PrimitiveKnobsDigital.vue:426-431` targets `.knob.is-played .knob--arc` as a descendant, but `knob--arc` lives on the same element in the template. Analog uses same-element selector grammar at `PrimitiveKnobsAnalog.vue:320-324`.

- Non-brass knob grammar differs between analog and digital.
  Analog uses knob-level `.is-nobrass` in `PrimitiveKnobsAnalog.vue:327-355`; digital uses per-track `.ivory-only` in `PrimitiveKnobsDigital.vue:389-392`. Same variant axis, different anatomy.

- Kicker has unused alignment-demo CSS.
  `PrimitiveKicker.vue:194-196` defines center/right alignment classes and `PrimitiveKicker.vue:347-355` defines alignment demo CSS, but the current specimen does not appear to use that path.

- Tabs duplicate brass finish instead of using the global `.brass` grammar.
  `PrimitiveTabs.vue:433-457` locally recreates brass fill, sheen, shadow, and animation that overlaps global `.brass` in `src/emotitone-design-system.css`.

- Brand danger semantics remain split.
  Shared CSS says brand colors are decorative-only, but also aliases `--danger` to tomato. `PrimitiveSpineCard.vue:8-28` uses danger language for tomato spine-card examples. This needs a semantic decision rather than another token alias.

- Marks scale text and proof do not exactly agree.
  `PrimitiveMarks.vue:29` says `14px inline`, `18-22px header`, `56-96px hero`; `PrimitiveMarks.vue:271` forces hero SVGs to `92px`, and `PrimitiveMarks.vue:207-239` demonstrates `14`, `28`, `56`, and `96`.
