# Residue Proof

Date: 2026-05-26

## Status

Primitive extraction residue is cleared for the current primitive specimen set. Brand unique extraction and DrawerShell promotion are cleared for style-guide surfaces. Overall design-lab residue is not cleared because app integration, loading alignment, and token doctrine gates remain.

## Pattern Checks

| Pattern | Check Method | Current Result | Resolution |
|---|---|---|---|
| Raw hex colors in specimens/components | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/components/uniques src/emotitone-design-system.css` | brand unique SVG fills were pruned to tokens; remaining hits require current search proof before Finish Gate | token/composition gates |
| Raw px values in higher layers | inspect extracted components and specimens per slice | known many in specimens | keep local/promote/prune per slice |
| Raw durations/easings | inspect CSS for `ms`, `s`, `cubic-bezier` outside tokens | known brass/key conflicts; tabs and knobs resolved in source slices | Promotion Gate |
| Repeated clip-path polygons | inspect `clip-path` in primitives | IconButton, ChipTabs, and Key use existing tokens for exact matches | prune to tokens where exact |
| Duplicated primitive internals in compounds/compositions | inspect compounds/compositions after primitive extraction | BarTape, IconButton, CodeStrip, PatternCard, and PatternReel copies are pruned from pattern compounds; unresolved hits are unique/composition surfaces | unique/composition Taxonomy Gate |
| One-offs not marked unique | inspect unique and composition specimens | `BrandCover` and `BrandLogo` now live in `src/components/uniques`; `UniqueCodeStrip` and `UniqueDrawer` are legacy specimen paths for lower layers | pass for current unique surfaces |
| Specimens defining source behavior | compare `src/style-guide/primatives` to `src/components/primatives` | all 12 current primitive specimens import from `src/components/primatives`; `UniqueCodeStrip.vue` imports `CodeStrip.vue` from its legacy path | pass for primitive layer |
| Guide helpers copied instead of composed | inspect primitive specimens for anatomy/variant chrome | known duplicates | prune into helpers during specimen cleanup |
| Unique/composition taxonomy drift | inspect `src/style-guide/uniques`, `src/style-guide/compositions`, and matching app sources | run 2026-05-26; brand cover/logo are true uniques, drawer shell is promoted to `DrawerShell`, loading/top drawer retain app-integration debt | `TAXONOMY_GATE.md`, `PROMOTION_AUDIT.md` |

## Current Residue Verdict

- Residue remains unresolved for the full design lab.
- The run cannot be called complete.
- Primitive extraction layer may close for current scope: every current primitive specimen is source-first, old raw primitive class families have been pruned from primitive/compound specimens, and remaining primitive-adjacent decisions are gate-parked.
- Compound pattern family residue is cleared for `PatternCard` and `PatternReel`; remaining compound/composition closure depends on the next taxonomy audit.
- Unique/composition taxonomy is now classified; brand unique implementation is source-first, but composition implementation is not closed.
- `UniqueDrawer.vue` no longer defines shell behavior; app `TopDrawer.vue` alignment remains residue.

## Slice Proof: BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Specimen defines bar tape internals | `PrimitiveBarTape.vue` owned `.bar-tape`, segment classes, sizes, dim, downbeat, and playhead CSS | `PrimitiveBarTape.vue` imports `src/components/primatives/BarTape.vue` and keeps only panel/tick staging | pass for primitive specimen |
| Source component exists | none | `src/components/primatives/BarTape.vue` | pass |
| Compound copies | Pattern card/reel copied `.bar-tape` CSS | Pattern card/reel compose `BarTape`; copied `.bar-tape` CSS removed | pass for pattern compounds |
| Music color migration | Legacy `--note-*` aliases in specimen/compounds | `BarTape.vue` preserves legacy aliases | gate-parked behind music color model decision |

## Next Proof Step

- Run app `TopDrawer.vue` alignment, loading composition integration, or token closure work.

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

## Slice Proof: ChipTabs

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveTabs.vue` source behavior | Specimen owned `.p5-tabs`, `.active-chip`, `.streak`, JS measurement, selected state, density, chip geometry, and brass chip CSS | Specimen imports `ChipTabs`; source owns rail/chip/streak, measurement, selected/disabled state, geometry, density, and tone | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/ChipTabs.vue` | pass |
| Duplicate clip polygons | Tab specimen repeated tab/offcut/tile/rip polygons | Source uses `--clip-tab`, `--clip-offcut`, `--clip-tile`, and `--clip-paper-rip`; Key later reused the same clip-token strategy | pass |
| Timing recipe | Tab specimen used local 320ms chip motion and 220ms smear | Source uses `--dur-ui` with `--ease-swing`; smear uses the same UI-duration window | pass |
| App tabs provider overlap | Existing `src/components/ui/Tabs*` are generic app tab providers | `ChipTabs` is intentionally a visual/mechanical primitive, not a provider replacement | app alignment remains separate |

Browser DOM proof, 2026-05-25:

- `primitive-tabs.html` renders 10 `.chip-tabs` nodes, 10 `.chip-tabs__chip` nodes, 10 `.chip-tabs__streak` nodes, and 34 `.chip-tabs__button` nodes from the source component.
- Density and tone variants render 1 compact rail, 1 brass rail, and 1 disabled source button.
- The old local `.p5-tabs`, `.active-chip`, `.js-chip-tabs`, `.state-tab`, `.section-head`, and `.vt-cell` families all render 0 nodes.
- Computed chip clips come from token polygons for tab, offcut, and paper-rip variants; the brass chip computes to the global brass gradient.
- The hero chip moved from `left: 6.82942px` to `left: 80.7292px` after clicking the second tab, and that tab's `aria-selected` changed to `true`.

## Slice Proof: Knob

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveKnobsAnalog.vue` source behavior | Specimen owned `.knob`, `.ring`, label/footer/tile frame, role classes, brass/ivory treatment, disabled state, played glow, and spin keyframe | Specimen imports `Knob` with `visual="ring"` and keeps only role/treatment grouping | pass for analog specimen |
| `PrimitiveKnobsDigital.vue` source behavior | Specimen owned `.knob`, SVG track paths/classes, label/footer/tile frame, role classes, brass/ivory treatment, disabled state, played glow, and spin keyframe | Specimen imports `Knob` with `visual="arc"` and keeps only role/treatment grouping | pass for digital specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/Knob.vue` | pass |
| SVG stroke grammar | Digital specimen repeated butt caps, miter joins, 2px background strokes, and 8px value strokes | Source arc visual owns stroke grammar | pass |
| Production knob overlap | App controls exist under `src/components/knobs/` | Production behavior remains untouched and gate-parked for app integration | App Integration Gate parked |

Browser DOM proof, 2026-05-25:

- `primitive-knobs-analog.html` renders 9 `.knob-primitive` nodes, all ring visuals; 8 framed variants render source labels and footers.
- `primitive-knobs-digital.html` renders 9 `.knob-primitive` nodes, all arc visuals; 8 framed variants render source labels and footers.
- Both knob specimens render 5 brass-tone and 4 ivory-tone source knobs.
- Old local `.knob`, `.ring`, `.trk`, `.knob-tile`, `.knob-label`, `.knob-foot`, and `.seg-rotate` families render 0 nodes in both frames.
- Digital value tracks compute to `stroke-width: 8px`, `stroke-linecap: butt`, and `stroke-linejoin: miter`.
- Analog hero ring computes the brass conic sweep from source CSS; digital button motion computes to the source `knob-spin360` keyframe.

## Slice Proof: Key

| Pattern | Before | After | Remaining |
|---|---|---|---|
| `PrimitiveKeys.vue` source behavior | Specimen owned `.key`, label stack, format modifiers, pressed/disabled states, cut/shape variants, clip polygons, and sheen | Specimen imports `Key`; source owns face, note alias fill, label stack, format axis, states, cuts, proportions, and sheen | pass for primitive specimen |
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/Key.vue` | pass |
| Clip polygons | Key specimen repeated tile/offcut/tab polygons and proposed `--clip-key-strip` alias | Source reuses `--clip-tile`, `--clip-offcut`, and `--clip-tab`; pill remains no-clip radius variant | pass |
| Chromatic mapping | Specimen mapped Ra/Me/Se/Le to stale base aliases | Specimen data uses corrected legacy aliases through `Key` note prop | pass for branch; computed `.note` migration parked |
| Degree format claim | Specimen claimed arabic + roman sub while rendering roman-only values | Source treats degree as supplied label text; inaccurate claim removed | pass |

Browser DOM proof, 2026-05-25:

- `primitive-keys.html` renders 28 `.key-face` nodes from the source component, each with source syllable, degree, and raw label nodes.
- Format variants render 1 syllable-hero, 1 raw-hero, and 26 degree-hero keys.
- Shape variants render strip, tile, offcut, tab, pill, tall, squary, wide, and hero source classes.
- Old local `.key`, `.k-syll`, `.k-deg`, `.k-raw`, `.fmt-row`, `.var-cell`, and `.section-head` families all render 0 nodes.
- Corrected Ra, Me, Se, and Le aliases compute to distinct legacy note colors instead of stale base-note aliases.
- Offcut and tab keys compute to existing token clip polygons; pressed computes to `translateY(1px)` and disabled computes to `saturate(0.12) brightness(0.45)`.

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

## Slice Proof: Primitive Closure

| Pattern | Evidence | Result |
|---|---|---|
| Primitive specimens import source components | `find src/style-guide/primatives -name '*.vue' -maxdepth 1 -print | sort | while read f; do rg -c "../../components/primatives" "$f"; done` | all 12 current primitive specimens import from `src/components/primatives` |
| Old raw primitive class families in primitive/compound specimens | `rg "class=\"(bar-tape|beats|panel-card|ico|cs|kicker|spine-card|mark|p5-tabs|knob|key)\\b|\\.bar-tape\\b|\\.beats\\b|\\.panel-card\\b|\\.ico\\b|\\.cs\\b|\\.kicker\\b|\\.spine-card\\b|\\.mark\\b|\\.p5-tabs\\b|\\.knob\\b|\\.key\\b" src/style-guide/primatives src/style-guide/uniques src/style-guide/compounds` | no old primitive-defining class families remain in primitive/compound specimens; remaining hits are `PrimitiveMarks.vue` styling source `Mark` via `:deep(.mark)` and unique/composition artifacts |
| Raw primitive source hex leakage | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/emotitone-design-system.css` | no hits in `src/components/primatives`; remaining hits belong to token docs, guide chrome, and unique/composition surfaces |
| Per-slice render evidence | Browser DOM proofs above | each extracted primitive slice rendered source classes and rendered 0 old local raw classes for its former family |
| Full style-guide route render | Browser proof at `http://127.0.0.1:5175/style-guide` | 5 sink sections, 28 sink frames, 12 primitive frames, source primitive families rendered, and scoped old primitive local families rendered 0 nodes |

Primitive closure decision, 2026-05-25:

- The primitive extraction layer can advance to unique/composition taxonomy.
- The full design lab cannot close yet.
- Gate-parked primitive-adjacent decisions remain recorded in `LAYER_CLOSURE.md` and `PROMOTION_AUDIT.md`.

## Slice Proof: Unique / Composition Taxonomy

| Pattern | Evidence | Result |
|---|---|---|
| Singular brand artifacts | `UniqueBrandCover.vue` has fixed cover copy/meta/collage; `UniqueBrandLogo.vue` has brand lockup variants | classified as true uniques and extracted to `BrandCover.vue` / `BrandLogo.vue` |
| Misclassified drawer unique | `UniqueDrawer.vue` demonstrates reusable drawer anatomy; `CompositionTopDrawer.vue` repeats drawer shell; app `TopDrawer.vue` exists | reclassified and promoted as `DrawerShell`; app alignment debt remains |
| Loading screen source split | `CompositionLoadingScreen.vue` is visual proof; `src/components/LoadingSplash.vue` owns loading/audio/MIDI/error behavior | classify as composition plus App Integration Gate |
| Top drawer composition | `CompositionTopDrawer.vue` owns product panes/content and app-region context | keep as composition proof; drawer shell cannot stay hidden inside it |
| Raw higher-layer residue | Searches find raw SVG fills, inline styles, raw HSL tiles, and local drawer/control classes in unique/composition files | justified as unique/composition-local or gate-parked; not cleared for Finish Gate |

Taxonomy decision, 2026-05-26:

- The next implementation slice should not start with brand polish.
- Brand unique extraction and DrawerShell Promotion Gate are resolved for style-guide surfaces; the next blockers are app `TopDrawer.vue` alignment, loading composition integration, and token doctrine.

## Slice Proof: Brand Uniques

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Unique source location | none | `src/components/uniques/` established in repository conventions | pass for brand uniques |
| Brand cover source behavior | `UniqueBrandCover.vue` owned fixed copy, meta grid, stamp, collage SVG, and raw SVG fills | `BrandCover.vue` owns singular cover artifact; specimen imports it and keeps inspection labels/anatomy | pass for unique source extraction |
| Brand logo source behavior | `UniqueBrandLogo.vue` owned wordmark, monogram, tagline, brass/inverted/note variants, and inline note styles | `BrandLogo.vue` owns identity lockups; specimen imports it through anatomy/variant helpers | pass for unique source extraction |
| Raw brand SVG colors | Cover SVG used raw hex fills | Source uses brand token classes for brass, tomato, plum, ink, and bone fills/strokes | pass |
| Unique generalization risk | Brand artifacts were classified but still style-guide-local | Source files live under `src/components/uniques/`, preserving singular role without making generic primitives | pass |

Browser DOM proof, 2026-05-26:

- `style-guide` renders 1 `.brand-cover` node and 7 `.brand-logo` nodes from source unique components.
- `BrandLogo` renders 5 source note-mark nodes and 5 source wordmark nodes across hero/variants.
- Old local brand cover classes `.cover-wrap`, `.shapes-panel`, and `.meta-grid` render 0 nodes.
- Old local brand logo classes `.logo-hero`, `.var-tile`, `.var-glyph`, and `.var-tagline` render 0 nodes.

## Slice Proof: DrawerShell

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Source component exists | none under `src/components/primatives/` | `src/components/primatives/DrawerShell.vue` owns bounded frame, anchors, scrim, torn handle, open/close, optional resize snaps, stage push-down, and reduced-motion behavior | pass for style-guide surfaces |
| `UniqueDrawer.vue` source behavior | Specimen owned raw drawer frame classes, shell/controller behavior, and DOM event wiring | Specimen imports `DrawerShell` and keeps only drawer examples/anatomy documentation | pass for legacy specimen path |
| `CompositionTopDrawer.vue` shell behavior | Composition owned raw drawer shell classes and DOM controller behavior while also owning product panes | Composition composes `DrawerShell`; product panes and controls remain composition-local | app `TopDrawer.vue` alignment parked |
| App top drawer overlap | Existing `src/components/TopDrawer.vue` owns production behavior | App source intentionally unchanged in this promotion slice | App Integration Gate |
| Local raw shell residue | Old style-guide drawer shell classes and `@ts-nocheck` lived in unique/composition files | Search finds no `@ts-nocheck`, DOM lookup/controller, or old raw drawer class families in `UniqueDrawer.vue` or `CompositionTopDrawer.vue` | pass |
