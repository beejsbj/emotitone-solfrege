# Promotion Audit

Date: 2026-05-24

## Purpose

Track every raw/new design decision as `promote`, `prune`, `keep local`, or `needs user decision` before it becomes hidden inside a component.

## Promote

| Item | Source | Target | Reason | Status |
|---|---|---|---|---|
| Cut-paper clip tokens | Token geometry and duplicated primitive CSS | `src/emotitone-design-system.css` and component usage | Repeated across buttons, keys, tabs, stickers | partially done; prune duplicate polygons during extraction |
| SVG stroke grammar | Token geometry, marks, digital knobs | token or shared primitive recipe | Repeated stroke widths/caps/joins | pending |
| Bar tape primitive | Primitive and compound files | `src/components/primatives/BarTape.vue` | Stable anatomy; copied into compounds | promoted 2026-05-24 |
| Icon button/control primitive | Primitive and compound files | `src/components/primatives/IconButton.vue` | Stable control grammar copied upward | promoted 2026-05-25 |
| Code strip grammar | Unique and compound files | `src/components/primatives/CodeStrip.vue` | Reused, not unique as-is | promoted 2026-05-25 |
| Pattern card stack/active shapes | Compound files | `src/components/compounds/PatternCard.vue` | Stable two-shape pattern-card grammar | promoted 2026-05-25 |
| Beat indicator primitive | `PrimitiveBeatIndicator.vue` | source component | Stable beat cell anatomy | pending |
| Key primitive family | `PrimitiveKeys.vue` | source component | Core music UI primitive | pending decisions |
| Shared knob anatomy | Analog/digital knob specimens | source component family | Repeated label/tile/role/state grammar | pending decisions |
| Mark primitive | `PrimitiveMarks.vue` | source component | Repeated SVG/treatment/scale grammar | pending API |
| Chip-slide tabs | `PrimitiveTabs.vue` | source component or app `Tabs*` alignment | Stable tab rail/chip motion grammar | pending decisions |

## Prune / Replace With Existing

| Item | Source | Replace with | Reason | Status |
|---|---|---|---|---|
| Duplicate specimen anatomy/variant chrome | Primitive/compound specimens | `AnatomyDisplay`, `VariantGrid`, `VariantCell` | Guide helpers already exist | pending per specimen |
| Duplicate clip polygons | Buttons, keys, tabs | Existing `--clip-*` tokens where exact match | Avoid parallel geometry recipes | resolved for IconButton offcut/tile; pending elsewhere |
| Local brass finish duplicates | Tabs/buttons/knobs where overlapping | Global brass grammar / brass tokens | Preserve one brass language | pending Promotion Gate |
| Lifted verbatim lower-layer CSS in compounds | Pattern card/reel | Source components | Doctrine says Vue should compose, not paraphrase | pending extraction |
| Hardcoded `#0a0908` | Beat indicator, tabs | `var(--ink)` | Token exists | pending |
| Undefined `--font-body` | `PrimitiveCard.vue` | `--font-text`, `--font-mono`, or type shorthand | Current token does not exist | pending |

## Keep Local

| Item | Source | Reason | Status |
|---|---|---|---|
| Style-guide sink layout | `StyleGuide.vue` | Documentation entry surface | accepted |
| Preview frame/source labels | `StyleGuide.vue`, `preview-card.css` | Guide-only inspection chrome | accepted |
| Hero/stage wrappers | Primitive/composition specimens | Demo staging, not reusable component grammar | accepted unless reused by component |
| Variant demo captions and shape labels | Specimens | Documentation scaffolding | accepted |
| BarTape hero panel and tick row | `PrimitiveBarTape.vue` | Specimen staging around the source primitive | accepted |
| IconButton paired-control shell | `PrimitiveButtons.vue` | Specimen-only grouping wrapper until pair behavior appears outside documentation | accepted |
| Drawer fake app content | `CompositionTopDrawer.vue` | Proof context, not automatically primitive grammar | pending composition audit |

## Needs User Decision

| Item | Source | Decision Needed | Gate | Status |
|---|---|---|---|---|
| Music color model | Music tokens, keys, bar tape, code strip | Legacy solfege classes versus computed `.note` recipe | Doctrine/Promotion Gate | pending |
| Brand colors and danger semantics | Brand tokens, spine card, CSS `--danger` | Decorative-only or functional status allowed | Doctrine/Promotion Gate | pending |
| Brass timing | Motion tokens, global brass, Sticker badge | One duration/easing or component-specific timings | Promotion Gate | pending |
| Label typography exceptions | Token typography, kicker/spec tables | Guide/spec/kicker mono exception or prune to Jazz labels | Doctrine/Promotion Gate | pending |
| `Sticker` badge taxonomy | Sticker source/specimen | Variant, separate primitive, or unique | Promotion Gate | pending |
| Code-strip boundary | Unique + compound files | Primitive, compound part, or pattern-card-private slot | Taxonomy Gate | resolved: primitive |
| Active-card/reel boundary | Compound files | Promotion behavior belongs to reel or pattern-card state | Taxonomy Gate | resolved for now: PatternCard owns shapes; reel owns choreography |
| Drawer primitives | `CompositionTopDrawer.vue` | Which controls are reusable versus drawer-private | Taxonomy Gate | pending |
| Key geometry recipes | `PrimitiveKeys.vue` | Semantic aliases versus generic clip reuse; pill/tall/wide/squary names | Promotion Gate | pending |
| Mark API | `PrimitiveMarks.vue` | `family`, `name`, `size`, `tone`, `treatment`, etc. | Promotion Gate | pending |
| Tabs timing and variants | `PrimitiveTabs.vue` | Add `--dur-chip` or reuse existing duration; final variant set | Promotion Gate | pending |

## Recipe Gaps

| Artifact | Gap | Resolution Path |
|---|---|---|
| `PrimitiveBarTape.vue` / compounds | Generic music colors exist, but segment/proportion/playhead/downbeat grammar was local and duplicated | resolved for BarTape: primitive specimen and pattern compounds compose source component. |
| `PrimitiveButtons.vue` / compounds | Clip/duration tokens exist, but button geometry/state/brass grammar was local and copied | resolved for style-guide: `IconButton` source component owns the grammar and pattern compounds compose it. App `components/ui/IconButton.vue` remains a separate app-system alignment question. |
| `UniqueCodeStrip.vue` / compounds | Music tokens exist, but code-strip token grammar was reused without a real layer | resolved for style-guide: `CodeStrip` source component owns notation row grammar and pattern compounds compose it. |
| `CompoundPatternCard.vue` / `CompoundPatternReel.vue` | Compound grammar copied lower-layer internals | resolved for PatternCard: source component owns sleek/active card anatomy; PatternReel choreography remains local pending reusable-source need. |
| `CompositionTopDrawer.vue` | Composition contains many local control primitives | Taxonomy audit after primitive closure. |
| `PrimitiveKeys.vue` | Generic clips exist, but key-specific recipes are local | Promotion Gate before extraction. |
| `PrimitiveTabs.vue` | Clip/motion/brass tokens exist, but chip-slide tab grammar and timing are local | Promotion Gate before extraction. |

## Gate-Parked Decisions

| Decision | Gate | Owner | Date | Unblock Condition | May Advance? |
|---|---|---|---|---|---:|
| Token doctrine contradictions | Intent/Doctrine Gate | user + agent | 2026-05-24 | Contradiction affects extraction outcome | no for affected token family |

## Resolved Decisions

| Item | Decision | Reason | Gate |
|---|---|---|---|
| BarTape source component | promote | Repeated primitive grammar appears in primitive specimen and compound copies | Promotion Gate 2026-05-24 |
| BarTape major proportions | promote corrected ratio | Documented ratio is `2-2-1-2-2-2-1`; source component makes `mi` and `ti` narrow | Promotion Gate 2026-05-24 |
| BarTape music colors | keep current legacy aliases for now | Preserves branch fidelity while `.note` migration remains a wider doctrine decision | Promotion Gate 2026-05-24 |
| BarTape specimen panel/ticks | keep local | Contextual inspection staging, not reusable strip grammar | Promotion Gate 2026-05-24 |
| Pattern compound BarTape copies | prune | Compound specimens now compose `BarTape`; copied `.bar-tape` CSS/markup removed | Promotion Gate 2026-05-25 |
| IconButton source component | promote | `.ico`/`.ico-pair` grammar had stable source identity and was copied into pattern compounds | Promotion Gate 2026-05-25 |
| IconButton offcut/tile polygons | prune to tokens | Source component uses existing `--clip-offcut` and `--clip-tile` instead of repeating polygons | Promotion Gate 2026-05-25 |
| Pattern compound IconButton copies | prune | Pattern card/reel now compose `IconButton`; copied `.ico` CSS/markup classes removed | Promotion Gate 2026-05-25 |
| CodeStrip taxonomy | promote as primitive | It renders independently, has stable notation-row anatomy, and is reused in pattern compounds | Taxonomy Gate 2026-05-25 |
| Pattern compound CodeStrip copies | prune | Pattern card/reel now compose `CodeStrip`; copied `.cs`/`.seq`/`.syl` CSS/markup removed | Promotion Gate 2026-05-25 |
| Compound source path | promote | `src/components/compounds/` is needed once lower child primitives are source-first | Repository Conventions Gate 2026-05-25 |
| PatternCard source component | promote | Sleek/active card shapes have stable anatomy and are reused by PatternCard and PatternReel specimens | Promotion Gate 2026-05-25 |
| PatternReel choreography | keep local for now | Stack depth, click promotion, and active-rise are reel orchestration; no non-specimen consumer yet | Taxonomy Gate 2026-05-25 |
