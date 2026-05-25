# Residue Proof

Date: 2026-05-24

## Status

Initial scaffold only. Residue is not cleared.

## Pattern Checks

| Pattern | Check Method | Current Result | Resolution |
|---|---|---|---|
| Raw hex colors in specimens/components | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/emotitone-design-system.css` | not yet run for closure | pending |
| Raw px values in higher layers | inspect extracted components and specimens per slice | known many in specimens | keep local/promote/prune per slice |
| Raw durations/easings | inspect CSS for `ms`, `s`, `cubic-bezier` outside tokens | known brass/tabs/knobs conflicts | Promotion Gate |
| Repeated clip-path polygons | inspect `clip-path` in primitives | IconButton offcut/tile now use existing tokens; known duplicates remain in keys/tabs | prune to tokens where exact |
| Duplicated primitive internals in compounds/compositions | inspect compounds/compositions after primitive extraction | BarTape, IconButton, CodeStrip, PatternCard, and PatternReel copies are pruned from pattern compounds | extract or gate-park |
| One-offs not marked unique | inspect unique and composition specimens | `UniqueCodeStrip` legacy path now imports primitive source; remaining uniques still need singular-role audit | Taxonomy Gate |
| Specimens defining source behavior | compare `src/style-guide/primatives` to `src/components/primatives` | known: Sticker, BarTape, BeatIndicator, CardShell, IconButton, CodeStrip, Kicker, and SpineCard pass; other primitive specimens still define behavior | extract or keep-local decision |
| Guide helpers copied instead of composed | inspect primitive specimens for anatomy/variant chrome | known duplicates | prune into helpers during specimen cleanup |

## Current Residue Verdict

- Residue remains unresolved.
- The run cannot be called complete.
- Primitive layer cannot close until every primitive specimen is extracted, pruned, or explicitly kept local behind a named gate.
- Compound layer cannot close while it copies lower-layer internals instead of composing source components.

## Slice Proof: BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Specimen defines bar tape internals | `PrimitiveBarTape.vue` owned `.bar-tape`, segment classes, sizes, dim, downbeat, and playhead CSS | `PrimitiveBarTape.vue` imports `src/components/primatives/BarTape.vue` and keeps only panel/tick staging | pass for primitive specimen |
| Source component exists | none | `src/components/primatives/BarTape.vue` | pass |
| Compound copies | Pattern card/reel copied `.bar-tape` CSS | Pattern card/reel compose `BarTape`; copied `.bar-tape` CSS removed | pass for pattern compounds |
| Music color migration | Legacy `--note-*` aliases in specimen/compounds | `BarTape.vue` preserves legacy aliases | gate-parked behind music color model decision |

## Next Proof Step

- After Repository Conventions Gate, run command-based residue scans and attach concrete counts.
- For each extraction slice, update this file with before/after residue evidence.

## Slice Proof: Pattern Compounds Compose BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `CompoundPatternCard.vue` bar tape | Inline `.bar-tape` markup and copied CSS | Imports and renders `BarTape` with specimen data arrays | pass |
| `CompoundPatternReel.vue` bar tape | `innerHTML` string assembly emitted copied `.bar-tape` markup and relied on copied CSS | Vue template/state renders `BarTape` components | pass |
| Compound primitive residue | BarTape, icon button, code strip, stack/active card, and reel choreography copied | BarTape, IconButton, CodeStrip, PatternCard, and PatternReel removed from copied-residue list | pass for pattern compound family |

## Slice Proof: BeatIndicator

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveBeatIndicator.vue` source behavior | Specimen owned `.beats`, `<b>` cells, meter classes, size classes, tempo classes, static/even states, and reduced-motion CSS | Specimen imports `BeatIndicator` and keeps only stage labels plus variant captions | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/BeatIndicator.vue` | pass |
| Hardcoded dark stage | Beat specimen used local `#0a0908` stage/variant backgrounds | Specimen composes guide helpers backed by `var(--ink)` | pass for this specimen |
| Beat keyframe naming | `beat-cell` / `beat-down` consumed locally while `bar-*` names also exist globally | Source component consumes current `beat-*` names | token doctrine naming gate remains |

Browser DOM proof, 2026-05-25:

- `primitive-beat-indicator.html` renders 13 `.beat-indicator` nodes and 51 `.beat-indicator__cell` nodes.
- Meter variants render 4, 3, 2, and 6 cells from the source component.
- State variants render 12 downbeat cells, 1 `.beat-indicator--even`, and 1 `.beat-indicator--static`.
- Old local `.beats` and `.beats b` nodes both render 0 nodes.
- First cell animation computes to `beat-down`; static first cell animation computes to `none`.

## Slice Proof: CardShell

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveCard.vue` source behavior | Specimen owned `.panel-card`, label, mark slot, title/body, compact grid sizing, borderless shell, and inline inversion examples | Specimen imports `CardShell` and keeps only demo mark drawings plus the light inversion example | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/CardShell.vue` | pass |
| Undefined body font token | Specimen used `var(--font-body)` in inline examples | Source and specimen use `--t-body-s` | pass |
| Mark drawings | Ordinal/glyph/stamp treatments lived inside the card specimen | Kept local to the card specimen until real card mark slots consume `Mark` | Card specimen-local |
| Light inversion | Specimen showed a light card shell | Kept local because no real app need is proven | Taste Gate parked |

Browser DOM proof, 2026-05-25:

- `primitive-card.html` renders 6 `.card-shell` nodes, including 5 compact shells and 1 borderless shell.
- The card shell renders 6 labels, 5 mark slots, 6 titles, and 6 bodies from source classes.
- Old local `.panel-card` and `.panel-label` nodes both render 0 nodes.
- The borderless shell computes to `0px` border width.
- One `.spec-inversion` node remains as specimen-local proof, not source grammar.

## Slice Proof: Kicker

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveKicker.vue` source behavior | Specimen owned `.kicker`, `.dot`, color classes, dot geometry, density, inverse, form variants, and unused alignment helpers | Specimen imports `Kicker` and keeps guide variant staging only | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/Kicker.vue` | pass |
| Brass dot glow | Specimen hardcoded `rgba(224,169,58,.45)` glow | Source uses `--shadow-glow-brass` | pass |
| Role boundary | Specimen mixed brand-color section dots and brass/ivory/open treatments | Source promotes Kicker as a general marker with tone axis | pass |
| Typography exception | Kicker used mono labels while token doctrine is split | Kept as named kicker/spec-marker exception | Doctrine Gate remains for wider guide/spec typography |
| Alignment helpers | Center/right helper CSS existed without active specimen use | Pruned from source and specimen | pass |

Browser DOM proof, 2026-05-25:

- `primitive-kicker.html` renders 18 `.kicker` nodes from the source component.
- Source markup renders 17 `.kicker__dot` nodes and 17 `.kicker__label` nodes; dot-only and label-only each omit the opposite child.
- Brand tones, brass, ivory, open, micro dot, inverse, dot-only, and label-only variants all render from source classes.
- Old local `.dot`, `.kicker-label`, and `.mark-tomato` nodes render 0 nodes.
- Brass dot shadow computes from the shared brass glow token and micro dot width computes to `5px`.

## Slice Proof: SpineCard

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveSpineCard.vue` base behavior | Specimen owned `.spine-card`, brand spine, copied kicker anatomy, stamp, body, compact grid sizing, and bone surface | Specimen imports `SpineCard`; source composes `Kicker` and owns the base brand-marked shell | pass for base primitive |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/SpineCard.vue` | pass |
| Kicker copy | Spine card copied `.kicker` and `.dot` internals | Source composes `Kicker` | pass |
| Preset row | Horizontal action/status row lived inside primitive specimen | Kept local as `.preset-row-demo` and gate-parked as compound/control-row candidate | Taxonomy Gate parked |
| Brand danger semantics | Tomato example used danger wording while brand tokens are semantically split | Preserved as content, parked behind existing brand/danger doctrine gate | Doctrine Gate remains |

Browser DOM proof, 2026-05-25:

- `primitive-spine-card.html` renders 6 `.spine-card` nodes, including 5 compact variants.
- Each source SpineCard renders one Kicker child, one `.spine-card__stamp`, and one `.spine-card__body`.
- Tone variants render for tomato, pine, plum, bone, and mustard; bone computes to the raised ink-3 surface.
- Old local `.mark-tomato`, `.apply-btn`, and `.what` nodes render 0 nodes.
- Three `.preset-row-demo` nodes remain as explicitly parked compound demos.

## Slice Proof: Mark

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveMarks.vue` source behavior | Specimen owned raw SVG path data, mark families, tone classes, scale demos, and wire stroke treatment | Specimen imports `Mark`; source owns named glyph paths, tone axis, size, fill/wire treatment, and stroke behavior | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/Mark.vue` | pass |
| Family staging | Family panels, local legends, and scale comparison wrappers lived beside glyph internals | Specimen keeps only family/legend/staging data around source `Mark` nodes | accepted keep-local |
| Card mark drawings | Card specimen had ordinal/glyph/stamp demo drawings | Kept local to `PrimitiveCard.vue` until a real card-shell mark API is proven | Card specimen-local |

Browser DOM proof, 2026-05-25:

- `primitive-marks.html` renders 31 `.mark` nodes from the source component.
- Tone variants render for brass, tomato, pine, plum, and mustard; first brass mark computes to `rgb(224, 169, 58)`.
- Exactly 1 `.mark--wire` node renders; its path uses `fill="none"`, `stroke="currentColor"`, `stroke-width="2.5"`, `stroke-linecap="butt"`, and `stroke-linejoin="miter"`.
- Old local `.mark-hero`, `.family`, `.family-head`, `.shape-row`, `.treatments-grid`, `.scales-row`, `.treat-cell`, and `.scale-cell` nodes all render 0 nodes.

## Slice Proof: PatternCard

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Compound source path | none | `src/components/compounds/PatternCard.vue` established by Repository Conventions Gate | pass for PatternCard |
| `CompoundPatternCard.vue` source behavior | Specimen owned `.stack-card`, `.active-card`, card metadata, child layout, footer, and status CSS | Specimen imports `PatternCard` and keeps only demo staging/data | pass |
| `CompoundPatternReel.vue` card copies | Reel copied PatternCard stack/active internals and only varied stack depth/promotion | Reel composes `PatternCard`; keeps only stack depth and promotion choreography | pass for card anatomy |
| Child dependencies | BarTape, IconButton, CodeStrip previously copied in stages | PatternCard composes all three source components | pass |
| Reel choreography | Active-rise, stack depth, click promotion | Moved into `src/components/compounds/PatternReel.vue` | pass |

Browser DOM proof, 2026-05-25:

- `compound-pattern-card.html` frame renders 5 `.pattern-card` nodes: 2 sleek and 3 active.
- `CompoundPatternReel` renders 4 `.pattern-card` nodes: 3 sleek and 1 active.
- Both checked surfaces render 0 old `.sc-row`, `.active-inner`, `.active-head`, or `.active-copy` nodes.

## Slice Proof: PatternReel

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `CompoundPatternReel.vue` source behavior | Specimen owned stack order, active id, click promotion, stack depth, active-rise, and PatternCard composition | Specimen imports `PatternReel` and keeps example data/variant staging only | pass |
| Source component exists | none | `src/components/compounds/PatternReel.vue` | pass |
| Child dependencies | Reel formerly composed primitive children directly and copied card anatomy | PatternReel composes PatternCard; PatternCard composes lower children | pass |

Browser DOM proof, 2026-05-25:

- `compound-pattern-reel.html` renders 4 `.pattern-reel` nodes and 19 `.pattern-card` nodes.
- The reel source classes render 10 `.pattern-reel__stack-card` nodes and 4 `.pattern-reel__active-card` nodes.
- The old local `.stack-card`, `.active-card`, `.sc-row`, `.active-inner`, `.active-head`, and `.active-copy` families all render 0 nodes.
- The reel root computes to `position: relative`, containing its own absolute label.

## Slice Proof: CodeStrip

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Unique specimen owns code-strip behavior | `UniqueCodeStrip.vue` owned `.cs`, `.seq`, glyph, duration, rest, lit, dense, wrapped, and bar CSS | Specimen imports `CodeStrip` and keeps only documentation data | pass for legacy specimen path |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/CodeStrip.vue` | pass |
| Compound copies | Pattern card/reel copied `.cs` CSS and notation markup | Pattern card/reel compose `CodeStrip` with token arrays | pass for pattern compounds |
| Unique taxonomy conflict | Code-strip was under uniques while reused in compounds | Taxonomy Gate reclassifies it as primitive; file path remains legacy specimen path | naming/navigation gate remains |

Browser DOM proof, 2026-05-25:

- `unique-code-strip.html` frame renders 10 `.code-strip` nodes and 0 `.cs` nodes.
- `CompoundPatternCard` renders 2 `.code-strip` nodes and 0 `.cs` nodes.
- `CompoundPatternReel` renders 1 `.code-strip` node and 0 `.cs` nodes.

## Slice Proof: IconButton

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveButtons.vue` source behavior | Specimen owned `.ico`, `.ico-pair`, geometry, state, tone, brass, and toggle CSS | Specimen imports `IconButton` and guide helpers; source component owns button grammar | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/IconButton.vue` | pass |
| Compound copies | Pattern card/reel copied `.ico` CSS and button classes | Pattern card/reel compose `IconButton` and keep only transport rail layout | pass for pattern compounds |
| Clip polygon duplicates | Button specimen repeated offcut/tile polygons | Source component uses `--clip-offcut` and `--clip-tile` | pass for IconButton; keys/tabs still pending |
| Paired controls | `.ico-pair` existed only in the button specimen | Kept as specimen-local wrapper around `IconButton` until reused elsewhere | accepted keep-local |

Browser DOM proof, 2026-05-25:

- `primitive-buttons.html` frame renders 32 `.icon-button` nodes and 0 `.ico` nodes.
- `CompoundPatternCard` renders 8 `.icon-button` nodes and 0 `.ico` nodes.
- `CompoundPatternReel` renders 4 `.icon-button` nodes and 0 `.ico` nodes.
