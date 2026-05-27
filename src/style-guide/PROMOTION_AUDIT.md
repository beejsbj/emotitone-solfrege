# Promotion Audit

Date: 2026-05-26

## Purpose

Track every raw/new design decision as `promote`, `prune`, `keep local`, or `needs user decision` before it becomes hidden inside a component.

## Promote

| Item | Source | Target | Reason | Status |
|---|---|---|---|---|
| Cut-paper clip tokens | Token geometry and duplicated primitive CSS | `src/emotitone-design-system.css` and component usage | Repeated across buttons, keys, tabs, stickers | promoted/pruned for current primitives |
| SVG stroke grammar | Token geometry, marks, digital knobs | token doctrine and primitive source recipes | Repeated stroke widths/caps/joins | resolved as geometry doctrine plus Mark/Knob source ownership |
| Bar tape primitive | Primitive and compound files | `src/components/primatives/BarTape.vue` | Stable anatomy; copied into compounds | promoted 2026-05-24 |
| Icon button/control primitive | Primitive and compound files | `src/components/primatives/IconButton.vue` | Stable control grammar copied upward | promoted 2026-05-25 |
| Code strip grammar | Unique and compound files | `src/components/primatives/CodeStrip.vue` | Reused, not unique as-is | promoted 2026-05-25 |
| Pattern card stack/active shapes | Compound files | `src/components/compounds/PatternCard.vue` | Stable two-shape pattern-card grammar | promoted 2026-05-25 |
| Pattern reel choreography | Compound files | `src/components/compounds/PatternReel.vue` | Stack/promotion behavior is reusable compound grammar | promoted 2026-05-25 |
| Beat indicator primitive | `PrimitiveBeatIndicator.vue` | `src/components/primatives/BeatIndicator.vue` | Stable beat cell anatomy | promoted 2026-05-25 |
| Card shell primitive | `PrimitiveCard.vue` | `src/components/primatives/CardShell.vue` | Stable dark panel, label, mark slot, title/body shell | promoted 2026-05-25 |
| Kicker marker primitive | `PrimitiveKicker.vue` | `src/components/primatives/Kicker.vue` | Stable dot+label marker with tone/form axes | promoted 2026-05-25 |
| Spine card primitive | `PrimitiveSpineCard.vue` | `src/components/primatives/SpineCard.vue` | Stable brand spine panel using Kicker child | promoted 2026-05-25 |
| Mark primitive | `PrimitiveMarks.vue` | `src/components/primatives/Mark.vue` | Stable flat SVG mark library with tone/size/treatment API | promoted 2026-05-25 |
| Chip-slide tabs | `PrimitiveTabs.vue` | `src/components/primatives/ChipTabs.vue` | Stable rail/chip/streak mechanic with geometry/density/tone axes | promoted 2026-05-25 |
| Shared knob anatomy | Analog/digital knob specimens | `src/components/primatives/Knob.vue` | Stable visual knob grammar shared by ring and arc specimens | promoted 2026-05-25 |
| Key primitive family | `PrimitiveKeys.vue` | `src/components/primatives/Key.vue` | Core music UI primitive with stable face/label/shape/state grammar | promoted 2026-05-25 |
| Drawer shell primitive | `UniqueDrawer.vue`, `CompositionTopDrawer.vue` | `src/components/primatives/DrawerShell.vue` | Reusable bounded drawer shell, torn handle, scrim, anchors, close behavior, and optional resize snaps | promoted 2026-05-26 |
| Brand cover unique | `UniqueBrandCover.vue` | `src/components/uniques/BrandCover.vue` | Singular cover artifact needs source-first ownership without becoming generic component grammar | promoted 2026-05-26 |
| Brand logo unique | `UniqueBrandLogo.vue` | `src/components/uniques/BrandLogo.vue` | Singular identity system needs source-first ownership without becoming a primitive/compound | promoted 2026-05-26 |

## Prune / Replace With Existing

| Item | Source | Replace with | Reason | Status |
|---|---|---|---|---|
| Duplicate specimen anatomy/variant chrome | Primitive/compound specimens | `AnatomyDisplay`, `VariantGrid`, `VariantCell` | Guide helpers already exist | accepted keep-local / opportunistic cleanup; not a primitive closure blocker |
| Duplicate clip polygons | Buttons, keys, tabs | Existing `--clip-*` tokens where exact match | Avoid parallel geometry recipes | resolved for IconButton, ChipTabs, and Key |
| Local brass finish duplicates | Tabs/buttons/knobs where overlapping | Global brass grammar / brass tokens | Preserve one brass language | resolved for ChipTabs and Knob; token preview remains unaudited |
| Lifted verbatim lower-layer CSS in compounds | Pattern card/reel | Source components | Doctrine says Vue should compose, not paraphrase | resolved for PatternCard/PatternReel |
| Hardcoded `#0a0908` | Beat indicator, tabs | `var(--ink)` | Token exists | resolved for BeatIndicator and ChipTabs specimens; token demos not audited |
| Undefined `--font-body` | `PrimitiveCard.vue` | `--t-body-s` | Current token does not exist | resolved for CardShell specimen |

## Keep Local

| Item | Source | Reason | Status |
|---|---|---|---|
| Style-guide sink layout | `StyleGuide.vue` | Documentation entry surface | accepted |
| Preview frame/source labels | `StyleGuide.vue`, `preview-card.css` | Guide-only inspection chrome | accepted |
| Hero/stage wrappers | Primitive/composition specimens | Demo staging, not reusable component grammar | accepted unless reused by component |
| Variant demo captions and shape labels | Specimens | Documentation scaffolding | accepted |
| BarTape hero panel and tick row | `PrimitiveBarTape.vue` | Specimen staging around the source primitive | accepted |
| IconButton paired-control shell | `PrimitiveButtons.vue` | Specimen-only grouping wrapper until pair behavior appears outside documentation | accepted |
| Drawer fake app content | `CompositionTopDrawer.vue` | Product/context proof around the drawer shell, not automatically reusable component grammar | accepted as composition-local; `DrawerShell` promoted |
| Brand cover specimen inspection | `UniqueBrandCover.vue` | Singular source lives in `BrandCover.vue`; specimen labels/anatomy are guide-only | accepted |
| Brand logo specimen inspection | `UniqueBrandLogo.vue` | Singular source lives in `BrandLogo.vue`; specimen grid/anatomy are guide-only | accepted |
| Kicker specimen grid/staging | `PrimitiveKicker.vue` | Guide-only inspection layout | accepted |
| SpineCard preset-row demo | `PrimitiveSpineCard.vue` | Parked compound/control-row specimen until the compound layer decides API | gate-parked |
| ChipTabs explanatory grouping | `PrimitiveTabs.vue` | Anatomy, geometry, and density groupings document source behavior without owning it | accepted |
| Knob specimen role groupings | `PrimitiveKnobsAnalog.vue`, `PrimitiveKnobsDigital.vue` | Role/treatment grids document source variants without owning knob internals | accepted |
| Key specimen groupings | `PrimitiveKeys.vue` | Format, chromatic, state, cut, and proportion groupings document source variants without owning key internals | accepted |

## Needs User Decision

| Item | Source | Decision Needed | Gate | Status |
|---|---|---|---|---|
| Music color model | Music tokens, keys, bar tape, code strip | Legacy solfege classes versus computed `.note` recipe | Doctrine/Promotion Gate | resolved: `.note` is token source; legacy aliases parked for app migration |
| Brand colors and danger semantics | Brand tokens, spine card, CSS `--danger` | Decorative-only or functional status allowed | Doctrine/Promotion Gate | resolved: brand colors decorative; semantic `--danger` may alias tomato for status |
| Brass timing | Motion tokens, global brass, Sticker badge | One duration/easing or component-specific timings | Promotion Gate | resolved: global `.brass` sheen and Sticker badge shimmer use 6.5s |
| Label typography exceptions | Token typography, guide/spec tables | Guide/spec mono exception or prune to Jazz labels | Doctrine/Promotion Gate | resolved: product labels Jazz; guide/spec inspection labels may be mono |
| `Sticker` badge taxonomy | Sticker source/specimen | Variant, separate primitive, or unique | Promotion Gate | resolved: fixed-geometry Sticker variant |
| Code-strip boundary | Unique + compound files | Primitive, compound part, or pattern-card-private slot | Taxonomy Gate | resolved: primitive |
| Active-card/reel boundary | Compound files | Promotion behavior belongs to reel or pattern-card state | Taxonomy Gate | resolved: PatternCard owns shapes; PatternReel owns choreography |
| App top-drawer alignment | `src/components/TopDrawer.vue`, `src/components/primatives/DrawerShell.vue` | Whether production `TopDrawer.vue` should adopt, wrap, or remain separate from the promoted style-guide `DrawerShell` | App Integration Gate | resolved: production wrapper composes `DrawerShell` and preserves existing slot API |
| Loading splash alignment | `CompositionLoadingScreen.vue`, `src/components/LoadingSplash.vue` | Whether to map the style-guide composition into the behavior-heavy app loading source | App Integration Gate | resolved: `LoadingScreen` source composition; `LoadingSplash` behavior adapter |
| Unique source location | `UniqueBrandCover.vue`, `UniqueBrandLogo.vue` | Whether to establish `src/components/uniques/` or keep singular artifacts style-guide-local | Repository Conventions/Unique Extraction Gate | resolved: `src/components/uniques/` |
| Key geometry recipes | `PrimitiveKeys.vue` | Reuse generic clip tokens where exact; promote pill/tall/wide/squary as component variants | Promotion Gate | resolved |
| Mark API | `PrimitiveMarks.vue` | `name`, `size`, `tone`, `treatment`; family remains specimen taxonomy | Promotion Gate | resolved |
| Tabs timing and variants | `PrimitiveTabs.vue` | Reuse `--dur-ui`; source variant set is tab/offcut/tile/sharp/pill/rip plus ivory/brass tone | Promotion Gate | resolved |
| Production knob alignment | `src/components/knobs/*` | Whether app controls should adopt the design-lab visual primitive | App Integration Gate | pending |

## Recipe Gaps

| Artifact | Gap | Resolution Path |
|---|---|---|
| `PrimitiveBarTape.vue` / compounds | Generic music colors exist, but segment/proportion/playhead/downbeat grammar was local and duplicated | resolved for BarTape: primitive specimen and pattern compounds compose source component. |
| `PrimitiveBeatIndicator.vue` | Beat motion tokens/keyframes exist, but cell count, stagger, downbeat/even/static states, and size grammar were local | resolved for style-guide: `BeatIndicator` source component owns primitive row/cell grammar and consumes current global keyframes. |
| `PrimitiveCard.vue` | Panel tokens existed, but card label, mark slot, title/body rhythm, compact sizing, and border toggle were local | resolved for style-guide: `CardShell` source component owns shell grammar; demo mark drawings stay local as specimen-only examples now that `Mark` is extracted. |
| `PrimitiveKicker.vue` | Kicker tokens existed as loose color/typography values, but dot+label anatomy, tone, form, density, and dot geometry were local | resolved for style-guide: `Kicker` source component owns marker grammar. |
| `PrimitiveSpineCard.vue` | Brand color tokens and Kicker existed, but spine panel, matching Kicker, stamp/body layout, and compact sizing were local | resolved for base primitive: `SpineCard` source component owns the brand-marked shell; preset rows remain gate-parked. |
| `PrimitiveMarks.vue` | SVG paths, treatment ladder, scale proof, wire stroke behavior, and family grouping were local | resolved for source primitive: `Mark` owns glyph paths, tone, size, fill/wire treatment, and stroke grammar; family panels remain specimen-local. |
| `PrimitiveButtons.vue` / compounds | Clip/duration tokens exist, but button geometry/state/brass grammar was local and copied | resolved for style-guide: `IconButton` source component owns the grammar and pattern compounds compose it. App `components/ui/IconButton.vue` remains a separate app-system alignment question. |
| `UniqueCodeStrip.vue` / compounds | Music tokens exist, but code-strip token grammar was reused without a real layer | resolved for style-guide: `CodeStrip` source component owns notation row grammar and pattern compounds compose it. |
| `CompoundPatternCard.vue` / `CompoundPatternReel.vue` | Compound grammar copied lower-layer internals | resolved: PatternCard and PatternReel source components own reusable compound grammar. |
| `UniqueBrandCover.vue` | Fixed brand cover uses raw SVG fills/transforms, local stamp, and cover layout | resolved for unique source: `BrandCover` owns fixed artifact; SVG fills now consume brand tokens. |
| `UniqueBrandLogo.vue` | Wordmark/monogram/tagline/note-mark lockups use local variant tiles and inline note marks | resolved for unique source: `BrandLogo` owns lockups; inline note-mark styles moved to source classes. |
| `UniqueDrawer.vue` / `CompositionTopDrawer.vue` / `src/components/TopDrawer.vue` | Drawer shell behavior repeats across style-guide specimens and overlaps current app source | resolved: `DrawerShell` source component promoted and production `TopDrawer.vue` wraps it. |
| `CompositionLoadingScreen.vue` / `src/components/LoadingSplash.vue` | Loading visual composition and app behavior source diverged | resolved: `LoadingScreen` owns visual grammar and app `LoadingSplash` preserves loading/audio/MIDI/error behavior as adapter. |
| `CompositionTopDrawer.vue` | Composition contains local drawer controls, instrument/preset/settings content, and app keyboard context | keep composition-local unless controls repeat; drawer shell now composes `DrawerShell`. |
| `PrimitiveKeys.vue` | Generic clips existed, but key-specific recipes were local | resolved for style-guide: `Key` source component owns face, label stack, format, cuts, proportions, pressed/disabled states, and sheen. |
| `PrimitiveTabs.vue` | Clip/motion/brass tokens exist, but chip-slide tab grammar and timing were local | resolved for style-guide: `ChipTabs` source component owns rail/chip/streak grammar, active chip measurement, geometry, density, tone, and selected/disabled state. |
| `PrimitiveKnobsAnalog.vue` / `PrimitiveKnobsDigital.vue` | Generic tokens existed, but knob visual anatomy, label/footer frame, role variants, disabled/lit/played states, brass/ivory axis, spin motion, and SVG stroke grammar were duplicated locally | resolved for style-guide: `Knob` source component owns shared visual grammar for ring and arc variants. |
| Token music specimen | Preview-only note/solfege maps lived inside token specimen script | resolved for token docs: specimen imports `CHROMATIC_NOTES`, `SOLFEGE_NOTES`, and `MOVABLE_DO_SOLFEGE_NOTES` from `src/data`. |
| Token geometry skew labels | Skew transform examples were labeled like custom properties without source tokens | resolved: kept as specimen recipes, not promoted tokens. |
| Token typography long body | Long-body mono recipes existed only in specimen examples | resolved: `--t-body-mono`, `--t-body-s-mono`, `.body-mono`, and `.body-s-mono` added to token source. |

## Primitive Closure Gate

| Check | Decision | Evidence | Status |
|---|---|---|---|
| All current primitive specimens source-first | advance | 12 primitive specimen files import from `src/components/primatives`; `UniqueCodeStrip.vue` imports `CodeStrip.vue` from its legacy path | pass |
| Old raw primitive class families | prune complete for primitive/compound specimens | Search found no old `.bar-tape`, `.beats`, `.panel-card`, `.ico`, `.cs`, `.kicker`, `.spine-card`, `.p5-tabs`, `.knob`, or `.key` definitions in primitive/compound specimens; expected source hooks and unique/composition artifacts remain | pass |
| Primitive-adjacent unresolved items | gate-park | Music-color model, marker typography, brand/danger semantics, preset row, and production knob alignment have named gates; Sticker badge and brass timing are resolved | may advance |
| Next layer | start taxonomy audit | Unique and composition surfaces still contain raw recipes and singular-role questions | pending |

## Unique / Composition Taxonomy Gate

| Check | Decision | Evidence | Status |
|---|---|---|---|
| Brand cover classification | true unique | Fixed cover copy, meta row, stamp, and SVG collage form one singular brand artifact | source extracted |
| Brand logo classification | true unique | Wordmark, monogram, tagline, brass signal, inverted, and note-mark lockups are brand identity variants | source extracted |
| CodeStrip legacy path | primitive specimen | `UniqueCodeStrip.vue` already imports `CodeStrip.vue` and is not a unique | naming/navigation gate |
| Drawer classification | not unique | Drawer shell repeats in `UniqueDrawer.vue` and `CompositionTopDrawer.vue`, and overlaps app `TopDrawer.vue` | promoted for style-guide and app wrapper alignment |
| Loading screen classification | composition | Style-guide loading screen proves visual state; `LoadingSplash.vue` owns current app behavior | App Integration Gate resolved 2026-05-27 |
| Top drawer composition | composition with app-alignment resolved | Product panes/content are composition-local; drawer shell composes `DrawerShell`; app `TopDrawer.vue` wraps the same shell | pass for current composition scope |

## Gate-Parked Decisions

| Decision | Gate | Owner | Date | Unblock Condition | May Advance? |
|---|---|---|---|---|---:|
| Token doctrine contradictions | Doctrine Gate | agent + user | 2026-05-26 | Resolved/localized in token closure slice; remaining app migrations are parked separately | yes |

## Resolved Decisions

| Item | Decision | Reason | Gate |
|---|---|---|---|
| BarTape source component | promote | Repeated primitive grammar appears in primitive specimen and compound copies | Promotion Gate 2026-05-24 |
| BarTape major proportions | promote corrected ratio | Documented ratio is `2-2-1-2-2-2-1`; source component makes `mi` and `ti` narrow | Promotion Gate 2026-05-24 |
| BarTape music colors | keep current legacy aliases for now | Preserves branch fidelity while `.note` migration remains a wider doctrine decision | Promotion Gate 2026-05-24 |
| BarTape specimen panel/ticks | keep local | Contextual inspection staging, not reusable strip grammar | Promotion Gate 2026-05-24 |
| Pattern compound BarTape copies | prune | Compound specimens now compose `BarTape`; copied `.bar-tape` CSS/markup removed | Promotion Gate 2026-05-25 |
| BeatIndicator source component | promote | Beat row/cell grammar has stable anatomy and variants independent of the specimen stage | Promotion Gate 2026-05-25 |
| BeatIndicator dark stage hex | prune to token/helper | Specimen now uses `AnatomyDisplay`/`VariantCell` guide stages backed by `var(--ink)` instead of local `#0a0908` | Promotion Gate 2026-05-25 |
| Beat keyframe naming collision | gate-park | Component consumes current global `beat-cell`/`beat-down`; token-level `bar-*` versus `beat-*` cleanup is wider than this primitive slice | Token Doctrine Gate |
| CardShell source component | promote | Card shell has a stable primitive anatomy independent of specimen demo marks | Promotion Gate 2026-05-25 |
| Card demo marks | keep local | Ordinal/glyph/stamp drawings overlap with unresolved `PrimitiveMarks.vue`; CardShell owns only slot placement | Promotion Gate 2026-05-25 |
| Card light inversion | keep local | Light inversion is spec-only until a real app use appears | Taste Gate parked |
| Card undefined font body | prune to token | Removed `--font-body` references and used existing `--t-body-s` | Promotion Gate 2026-05-25 |
| Kicker source component | promote | Dot+label marker has stable primitive anatomy and is reused by spine/brand specimens | Promotion Gate 2026-05-25 |
| Kicker role boundary | promote as general marker | Specimen used brand tones plus brass/ivory/open treatments; source supports both brand and status marker tones | Promotion Gate 2026-05-25 |
| Kicker mono typography | keep as named exception | Kicker/spec marker labels intentionally use mono at 9px; wider guide/spec inspection labels are now a named mono exception | Doctrine Gate 2026-05-26 |
| Kicker unused alignment demo | prune | Center/right alignment CSS existed without current specimen use | Promotion Gate 2026-05-25 |
| SpineCard source component | promote | Base spine-card shell has stable primitive anatomy and composes Kicker | Promotion Gate 2026-05-25 |
| SpineCard one-color rule | promote | Source uses one brand tone per card for spine and Kicker child | Promotion Gate 2026-05-25 |
| SpineCard preset row | gate-park | Horizontal action/status rows coordinate buttons/meta and should be compound/control-row work | Taxonomy Gate 2026-05-25 |
| SpineCard danger wording | keep as content pending doctrine | Tomato example still says Danger; brand/danger semantics are a wider token-doctrine decision already parked | Doctrine Gate parked |
| Mark source component | promote | Flat SVG marks have stable primitive anatomy and recurring use as decorative slots | Promotion Gate 2026-05-25 |
| Mark API | promote `name`/`tone`/`size`/`treatment` | `family` is documentation grouping, while runtime usage needs glyph name plus visual treatment | Promotion Gate 2026-05-25 |
| Mark family panels and legends | keep local | Inspection grouping/staging, not source component behavior | Promotion Gate 2026-05-25 |
| Mark wire stroke grammar | promote | Source wire treatment uses butt caps, miter joins, and token color via `currentColor` | Promotion Gate 2026-05-25 |
| ChipTabs source component | promote | Chip-slide has stable primitive anatomy independent of the specimen page and separate from generic app tabs providers | Promotion Gate 2026-05-25 |
| ChipTabs timing | prune to existing token | Source uses `--dur-ui` for chip selection instead of adding a one-off `--dur-chip`; transient smear keeps the existing 220ms UI timing | Promotion Gate 2026-05-25 |
| ChipTabs geometry polygons | prune to tokens | Source uses `--clip-tab`, `--clip-offcut`, `--clip-tile`, and `--clip-paper-rip`; sharp/pill are named no-clip variants | Promotion Gate 2026-05-25 |
| ChipTabs brass treatment | promote as component tone | Source uses the global brass utility/tokens for the active chip, preserving brass as the one lit signal | Promotion Gate 2026-05-25 |
| Knob source component | promote | Analog and digital specimens shared a stable knob frame, roles, tone axis, state grammar, and motion recipe | Promotion Gate 2026-05-25 |
| Knob ring and arc visuals | promote as visual axis | Ring and arc differ by rendering technique but share roles, frame, state, and tone contracts | Promotion Gate 2026-05-25 |
| Knob SVG stroke grammar | promote into Knob | Digital arc stroke widths, butt caps, miter joins, and active value stroke now live in the source primitive | Promotion Gate 2026-05-25 |
| Knob spin motion | promote once | Analog ring and digital arc button motion now share one source keyframe and reduced-motion rule | Promotion Gate 2026-05-25 |
| Production knob controls | gate-park | Existing app controls under `src/components/knobs/` are behavior-heavy production inputs and were not rewritten in this style-guide slice | App Integration Gate parked |
| Key source component | promote | Music key face has stable primitive anatomy and removed the final raw primitive specimen blocker | Promotion Gate 2026-05-25 |
| Key clip geometry | prune/promote split | Strip/tile/squary/tall/wide reuse `--clip-tile`; offcut/tab reuse existing clip tokens; pill remains key-specific no-clip rounded variant | Promotion Gate 2026-05-25 |
| Key chromatic aliases | prune stale specimen mapping | Ra/Me/Se/Le now map to `--note-ra`, `--note-me`, `--note-se`, and `--note-le`; legacy alias consumers stay parked for app/component migration | Promotion Gate 2026-05-25 |
| Key degree format | prune inaccurate doc claim | Source treats `degree` as supplied label text; old arabic+roman sub claim was removed from specimen copy | Promotion Gate 2026-05-25 |
| IconButton source component | promote | `.ico`/`.ico-pair` grammar had stable source identity and was copied into pattern compounds | Promotion Gate 2026-05-25 |
| IconButton offcut/tile polygons | prune to tokens | Source component uses existing `--clip-offcut` and `--clip-tile` instead of repeating polygons | Promotion Gate 2026-05-25 |
| Pattern compound IconButton copies | prune | Pattern card/reel now compose `IconButton`; copied `.ico` CSS/markup classes removed | Promotion Gate 2026-05-25 |
| CodeStrip taxonomy | promote as primitive | It renders independently, has stable notation-row anatomy, and is reused in pattern compounds | Taxonomy Gate 2026-05-25 |
| Pattern compound CodeStrip copies | prune | Pattern card/reel now compose `CodeStrip`; copied `.cs`/`.seq`/`.syl` CSS/markup removed | Promotion Gate 2026-05-25 |
| Compound source path | promote | `src/components/compounds/` is needed once lower child primitives are source-first | Repository Conventions Gate 2026-05-25 |
| PatternCard source component | promote | Sleek/active card shapes have stable anatomy and are reused by PatternCard and PatternReel specimens | Promotion Gate 2026-05-25 |
| PatternReel source component | promote | Stack depth, click promotion, and active-rise are reusable reel orchestration above PatternCard | Taxonomy Gate 2026-05-25 |
| DrawerShell source component | promote | Drawer shell behavior repeats across unique and composition specimens and can stand apart from product panes | Promotion Gate 2026-05-26 |
| UniqueDrawer drawer shell | prune to source import | Legacy drawer specimen now imports `DrawerShell` instead of owning shell/controller behavior | Promotion Gate 2026-05-26 |
| CompositionTopDrawer drawer shell | prune to source import | Top-drawer composition now composes `DrawerShell`; panes and controls remain composition-local | Promotion Gate 2026-05-26 |
| App TopDrawer alignment | promote wrapper adoption | Existing app `TopDrawer.vue` now composes `DrawerShell` while keeping Teleport, trigger/panel slots, offsets, and public open/close/toggle controls | App Integration Gate 2026-05-27 |
| LoadingScreen source composition | promote | Loading screen is a concrete app state with brand composition, progress, ready, error, audio, MIDI, and dev-skip states | App Integration Gate 2026-05-27 |
| Unique source path | promote | `src/components/uniques/` gives true uniques source-first ownership without treating specimens as implementation | Repository Conventions/Unique Extraction Gate 2026-05-26 |
| BrandCover source component | promote | The cover is singular but still deserves a source artifact separate from inspection markup | Unique Extraction Gate 2026-05-26 |
| BrandLogo source component | promote | The identity lockups are singular brand system artifacts, not generic primitive/compound UI | Unique Extraction Gate 2026-05-26 |
| Brand cover SVG fills | prune to tokens | Source component uses brand token classes instead of raw SVG hex fills | Unique Extraction Gate 2026-05-26 |
| Brand logo note marks | prune to source classes | Note-mark variant no longer uses inline specimen styles | Unique Extraction Gate 2026-05-26 |
| Music color model | promote `.note`; park legacy aliases | `.note` with `--note-degree`, `--note-octave`, `--music-count`, and `--music-rotate` is the token source; `--note-*` aliases stay for branch consumers until app migration | Doctrine/Promotion Gate 2026-05-26 |
| Note/solfege maps | prune specimen-private arrays | Token specimen now reads existing `src/data` music constants instead of owning duplicate maps | Promotion Gate 2026-05-26 |
| Brand/danger semantics | resolve as semantic alias | Brand colors remain decorative poster colors; functional status must use semantic aliases such as `--danger` rather than direct brand-color chrome | Doctrine Gate 2026-05-26 |
| Brass timing | promote global utility timing | `.brass` / `brass-sheen` uses the 6.5s global sweep; Sticker badge edge/text now use the same timing and easing | Promotion Gate 2026-05-27 |
| Sticker badge taxonomy | keep as variant | Badge is not a separate primitive or unique; it is the fixed-geometry Sticker variant with shared color vocabulary applied to edge and text | Promotion Gate 2026-05-27 |
| Typography exception | localize guide/spec mono | Product labels use Lets Jazz; guide/spec inspection labels are a named mono exception | Doctrine Gate 2026-05-26 |
| Skew transform labels | keep specimen-local | Skew examples describe motion recipes but do not become global `--skew-*` tokens until repeated outside specimens | Token Closure 2026-05-26 |
