# Residue Proof

Date: 2026-05-26

## Status

Token doctrine, primitive extraction, compound pattern extraction, brand unique extraction, DrawerShell promotion, production top-drawer alignment, loading composition integration, and final all-layer residue audit are cleared for current surfaces. User Finish Gate acceptance is still required before calling the design-lab run complete.

## Pattern Checks

| Pattern | Check Method | Current Result | Resolution |
|---|---|---|---|
| Raw hex colors in specimens/components | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/components/compounds src/components/uniques src/components/compositions src/emotitone-design-system.css` | remaining hits are token source values, token swatch labels, and historical audit text; no component/source/specimen styling hex remains outside token docs | pass |
| Raw px values in higher layers | inspect extracted components and specimens per slice | many component dimensions remain intentionally component-local anatomy; no repeated px recipe was found crossing unresolved layers in the Finish Gate sweep | keep local/promote/prune per slice |
| Raw durations/easings | inspect CSS for `ms`, `s`, `cubic-bezier` outside tokens | global brass timing normalized to 6.5s; Sticker badge edge/text now use the same 6.5s timing and easing | pass for brass timing |
| Repeated clip-path polygons | inspect `clip-path` in primitives | IconButton, ChipTabs, and Key use existing tokens for exact matches | prune to tokens where exact |
| Duplicated primitive internals in compounds/compositions | inspect compounds/compositions after primitive extraction | BarTape, IconButton, CodeStrip, PatternCard, PatternReel, DrawerShell, and LoadingScreen copies are pruned from current higher layers | pass |
| One-offs not marked unique | inspect unique and composition specimens | `BrandCover` and `BrandLogo` now live in `src/components/uniques`; `UniqueCodeStrip` and `UniqueDrawer` are legacy specimen paths for lower layers | pass for current unique surfaces |
| Specimens defining source behavior | compare `src/style-guide/primatives` to `src/components/primatives` | all 12 current primitive specimens import from `src/components/primatives`; `UniqueCodeStrip.vue` imports `CodeStrip.vue` from its legacy path | pass for primitive layer |
| Guide helpers copied instead of composed | inspect primitive specimens for anatomy/variant chrome | remaining guide/spec chrome is accepted as inspection surface, not implementation source | keep local |
| Unique/composition taxonomy drift | inspect `src/style-guide/uniques`, `src/style-guide/compositions`, and matching app sources | run 2026-05-27; brand cover/logo are true uniques, drawer shell is promoted to `DrawerShell`, top drawer app wrapper is aligned, and loading source composition is shared by app/specimen | pass |

## Current Residue Verdict

- Token layer closes for current style-guide scope: token source owns groups, aliases, music recipe, type utilities, spacing roles, and documented exceptions; app/component migrations remain parked.
- Primitive extraction layer closes for current scope: every current primitive specimen is source-first, old raw primitive class families have been pruned from primitive/compound specimens, and remaining primitive-adjacent decisions are gate-parked.
- Compound layer closes for current scope: current compound artifacts are `PatternCard` and `PatternReel`, both source-first and composed.
- Unique/composition taxonomy is classified; brand unique and current composition implementation are source-first for current scope.
- `UniqueDrawer.vue`, `CompositionTopDrawer.vue`, and app `TopDrawer.vue` share `DrawerShell` as the drawer shell source.
- `CompositionLoadingScreen.vue` and app `LoadingSplash.vue` share `LoadingScreen` as the loading visual source.
- Production knob alignment has been inspected and remains parked as a future production migration because `src/components/knobs/*` owns behavior-heavy input contracts; it is not hidden residue in the current style-guide decomposition.
- The only remaining completion requirement is the user Finish Gate decision: accept, continue, or pause.

## Finish Gate Audit, 2026-05-27

| Requirement | Evidence | Result |
|---|---|---|
| Coverage rows resolved | `rg "\|\s*\|" src/style-guide/COVERAGE_AUDIT.md src/style-guide/STYLE_GUIDE_SCHEMA.md src/style-guide/PROMOTION_AUDIT.md src/style-guide/RAW_RECIPE_INVENTORY.md src/style-guide/LAYER_CLOSURE.md` | no empty table cells found |
| Current source/specimen inventory known | `find src/style-guide ...` and `find src/components/primatives src/components/compounds src/components/uniques src/components/compositions ...` | current scope contains 12 primitive specimens, 2 compound specimens, 4 unique specimens, 2 composition specimens, 14 primitive sources, 2 compound sources, 2 unique sources, and 1 composition source |
| Raw styling hex outside token docs | `rg "#[0-9a-fA-F]{3,8}" src/style-guide src/components/primatives src/components/compounds src/components/uniques src/components/compositions src/emotitone-design-system.css` | remaining hits are token source values, token swatch labels, and historical audit text; guide-stage `#0a0908` uses were pruned to `var(--ink)` |
| Raw HSL in higher layers | `rg "hsla?\(" src/style-guide/compositions src/components/compositions src/components/compounds src/components/uniques src/components/primatives src/style-guide/compounds src/style-guide/uniques src/style-guide/primatives` | no hits after top-drawer demo tiles moved to `var(--note-*)` tokens |
| Raw higher-layer hex in source/specimen styling | `rg "background: \"hsl|background:\s*#[0-9a-fA-F]|#[0-9a-fA-F]{3,8}" src/style-guide/compositions src/style-guide/compounds src/style-guide/uniques src/style-guide/primatives src/components/compositions src/components/compounds src/components/uniques src/components/primatives` | no hits |
| Clip-path duplication | `rg "clip-path|polygon\(" src/style-guide src/components/primatives src/components/compounds src/components/uniques src/components/compositions src/emotitone-design-system.css` | reusable components consume clip tokens; remaining polygons are token definitions/specimen token demonstrations |
| Old primitive class copies | `rg "class=\"(bar-tape|beats|panel-card|ico|cs|kicker|spine-card|mark|p5-tabs|knob|key)\b|\.(bar-tape|beats|panel-card|ico|cs|kicker|spine-card|mark|p5-tabs|knob|key)\b" src/style-guide/primatives src/style-guide/compounds src/style-guide/uniques src/style-guide/compositions` | only expected `PrimitiveMarks.vue :deep(.mark)` styling and key text references remain; no old primitive-defining copies in specimens |
| Open closure wording | `rg "not audited|app integration decisions remain|Composition artifacts \| gate-parked|remaining compound/composition closure|Finish Gate still needs|cannot be called complete|Residue remains unresolved" src/style-guide/LAYER_CLOSURE.md src/style-guide/RESIDUE_PROOF.md src/style-guide/COVERAGE_AUDIT.md \| rg -v "Open closure wording"` | stale blocker wording removed or replaced with user Finish Gate decision requirement |

Finish Gate packet:

- Evidence: layer source paths are named, coverage rows are resolved, current compound/composition scope is source-first, raw higher-layer color residue is pruned, and verification commands below pass.
- Recommendation: accept the current decomposed style-guide scope as complete, with named future work remaining parked behind explicit gates.
- Alternatives rejected: expand scope into production knob migration now; it is already a named future gate and not hidden residue in the current style-guide decomposition.
- Unresolved risk: the user has not yet made the required Finish Gate decision.
- Unblocks: if the user accepts, the active design-lab goal can be marked complete.

Browser DOM proof, 2026-05-27:

- `/style-guide` renders with 5 sink sections and no Chrome runtime log or exception events.
- Source families render in the page: BarTape 22, BeatIndicator 13, CardShell 6, IconButton 56, CodeStrip 17, Kicker 27, SpineCard 6, Mark 31, ChipTabs 10, Knob 18, Key 28, DrawerShell 4, PatternCard 19, PatternReel 4, BrandCover 1, BrandLogo 7, and LoadingScreen 1. PresetRow proof was added in the later preset-row slice.
- The top-drawer composition's first note tile computes to `rgb(238, 105, 47)` from `--note-do: hsl( 18  85% 56%)`.
- The shared guide `.state-frame` background computes to `rgb(10, 9, 8)` after replacing hardcoded stage hex with `var(--ink)`.

Command proof, 2026-05-27:

- `bun run type-check` passes.
- `bun run build` passes; Vite builds 228 modules. The only note is the existing stale Browserslist/caniuse-lite warning.
- `bun run test:run src/__tests__/components/ui/Sticker.test.ts src/__tests__/components/ui/PresetRow.test.ts src/__tests__/components/ui/TopDrawer.test.ts src/__tests__/components/ui/LoadingScreen.test.ts` passes 6 tests across 4 files. The only note is the existing stale Browserslist/caniuse-lite warning.
- `git diff --check` passes.

Current verification refresh, 2026-05-27:

- `bun run type-check` passes.
- `bun run build` passes; Vite builds 228 modules. Existing stale Browserslist/caniuse-lite warning only.
- `bun run test:run src/__tests__/components/ui/Sticker.test.ts src/__tests__/components/ui/PresetRow.test.ts src/__tests__/components/ui/TopDrawer.test.ts src/__tests__/components/ui/LoadingScreen.test.ts` passes 6 tests across 4 files. Existing stale Browserslist/caniuse-lite warning only.
- `git diff --check` passes.
- Render proof: `bun run dev --host 127.0.0.1` served the style guide on `http://127.0.0.1:5176/` because 5175 was already in use. Chrome headless wrote `/tmp/emotitone-style-guide.png` at 1440x1200 and the screenshot shows the style-guide sink rendering token collections. Chrome exited under a 25s alarm after writing the screenshot because Google updater logging kept the process alive.

## Slice Proof: Sticker Badge Taxonomy

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Badge taxonomy | Badge was parked as variant vs primitive vs unique | Resolved as a fixed-geometry `Sticker` variant | pass |
| Badge color vocabulary | Badge ignored the `color` prop while outline/fill used it | Badge carries `sticker--color-*` and applies `--sticker-fill` to edge/text | pass |
| Badge brass timing | Badge used separate 3.6s linear shimmer | Badge edge/text use the global 6.5s brass-sheen timing/easing | pass |

Browser DOM proof, 2026-05-27:

- `/style-guide` renders 28 `.sticker` nodes and 3 `.sticker--badge` nodes with no Chrome runtime log or exception events.
- Badge examples render `sticker--color-brass-sheen`, `sticker--color-tomato`, and `sticker--color-pine`.
- Tomato badge edge and text compute to `rgb(216, 54, 42)`.
- Tomato badge edge/text animation duration computes to `6.5s`.

Unit proof, 2026-05-27:

- `Sticker.test.ts` verifies badge variants receive the shared color class, render edge/text anatomy, and do not receive randomized geometry style.

## Slice Proof: Token Closure

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Music hue model | Token specimen described fixed `30deg` math and kept private note/solfege arrays | Specimen matches `.note` source math `(degree + rotate) * (360 / count)` and imports note/solfege constants from `src/data` | legacy `--note-*` consumers parked for app/component migration |
| Long-body mono utilities | Typography specimen showed mono body recipes without source utilities | `--t-body-mono`, `--t-body-s-mono`, `.body-mono`, and `.body-s-mono` exist in token source | pass |
| Guide/spec typography | Mono labels conflicted with product-label doctrine | Product labels remain Lets Jazz; guide/spec inspection labels are named mono exception | pass |
| Brass timing | Motion specimen showed 4s shimmer while global `.brass` used 6.5s; Sticker badge used a separate 3.6s shimmer | Token motion specimen and Sticker badge now match the global 6.5s brass sweep | pass |
| Skew token drift | Geometry specimen labeled unpromoted skew transforms as `--skew-*` tokens | Skews are documented as specimen recipes, not token custom properties | pass |
| Brand/danger semantics | Brand colors were decorative, but `--danger` aliases tomato | Brand colors stay decorative; semantic aliases may map to brand values for functional status | pass |

Browser DOM proof, 2026-05-26:

- `/style-guide` renders at `http://127.0.0.1:5175/style-guide` with 117 token/specimen-related sections and no browser console errors.
- Rendered markup contains `--t-body-mono`, the `360 / var(--music-count)` music formula, `skew tab recipe`, and `--shadow-glow-brass`.
- Rendered markup no longer contains stale `--shadow-brass-ring` or `--skew-tab` labels.
- Computed root variables include `--t-body-mono`, `--t-body-s-mono`, and `--music-count: 12`.

## Slice Proof: BarTape

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Specimen defines bar tape internals | `PrimitiveBarTape.vue` owned `.bar-tape`, segment classes, sizes, dim, downbeat, and playhead CSS | `PrimitiveBarTape.vue` imports `src/components/primatives/BarTape.vue` and keeps only panel/tick staging | pass for primitive specimen |
| Source component exists | none | `src/components/primatives/BarTape.vue` | pass |
| Compound copies | Pattern card/reel copied `.bar-tape` CSS | Pattern card/reel compose `BarTape`; copied `.bar-tape` CSS removed | pass for pattern compounds |
| Music color migration | Legacy `--note-*` aliases in specimen/compounds | `BarTape.vue` preserves legacy aliases | gate-parked behind music color model decision |

## Next Proof Step

- Present the Finish Gate packet to the user for accept/continue/pause.

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
| Beat keyframe naming | `beat-cell` / `beat-down` consumed locally while `bar-*` names also exist globally | Source component consumes current `beat-*` names | parked as future motion cleanup, not token closure blocker |

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
| Typography exception | Kicker used mono labels while token doctrine is split | Kept as named kicker/spec-marker exception; guide/spec inspection labels may use mono | pass for token closure |
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
| Preset row | Horizontal action/status row lived inside primitive specimen | Promoted to `src/components/compounds/PresetRow.vue`; specimen composes source rows | pass |
| Brand danger semantics | Tomato example used danger wording while brand tokens are semantically split | Preserved as content; functional status styling goes through semantic aliases | pass under Doctrine Gate 2026-05-26 |

Browser DOM proof, 2026-05-25:

- `primitive-spine-card.html` renders 6 `.spine-card` nodes, including 5 compact variants.
- Each source SpineCard renders one Kicker child, one `.spine-card__stamp`, and one `.spine-card__body`.
- Tone variants render for tomato, pine, plum, bone, and mustard; bone computes to the raised ink-3 surface.
- Old local `.mark-tomato`, `.apply-btn`, and `.what` nodes render 0 nodes.
- Three `.preset-row` nodes render from the promoted `PresetRow` compound; `.preset-row-demo` renders 0 nodes.

## Slice Proof: PresetRow

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Source component | Preset-row action/status grammar lived inside `PrimitiveSpineCard.vue` and was repeated in `CompositionTopDrawer.vue` | `src/components/compounds/PresetRow.vue` owns row spine, Kicker child, preset name, action button, meta state, tone variants, disabled state, and action emit | pass |
| SpineCard specimen | `PrimitiveSpineCard.vue` owned `.preset-row-demo` markup/CSS | Specimen imports and renders `PresetRow` examples | pass |
| Top drawer composition | `CompositionTopDrawer.vue` owned local `.preset-row`, spine, name, and apply button CSS | Composition imports and renders `PresetRow` for visual presets | pass |

Browser DOM proof, 2026-05-27:

- `/style-guide` renders 7 `.preset-row` nodes from source `PresetRow`: 3 in the SpineCard specimen and 4 in the TopDrawer composition.
- Old `.preset-row-demo` renders 0 nodes.
- PresetRow renders 5 action buttons and 2 meta labels across the page.
- The first row renders Kicker text `Soft Glass` and name `Soft Glass.` with no Chrome runtime log or exception events.

Unit proof, 2026-05-27:

- `PresetRow.test.ts` verifies Kicker/name/action composition, action emit, and meta-only state.

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
| Production knob overlap | App controls exist under `src/components/knobs/` | Inspected as behavior-heavy controls with drag/tap gestures, haptics, GSAP arc animation, display mode, option cycling, and compatibility events | future production migration; not current style-guide residue |

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
| Clip polygon duplicates | Button specimen repeated offcut/tile polygons | Source component uses `--clip-offcut` and `--clip-tile` | pass for IconButton; Key and ChipTabs later resolved exact clip reuse |
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
| Misclassified drawer unique | `UniqueDrawer.vue` demonstrates reusable drawer anatomy; `CompositionTopDrawer.vue` repeats drawer shell; app `TopDrawer.vue` exists | reclassified and promoted as `DrawerShell`; app wrapper now composes it |
| Loading screen source split | `CompositionLoadingScreen.vue` was visual proof; `src/components/LoadingSplash.vue` owns loading/audio/MIDI/error behavior | `LoadingScreen.vue` promoted as source composition; `LoadingSplash.vue` remains behavior adapter |
| Top drawer composition | `CompositionTopDrawer.vue` owns product panes/content and app-region context | keep as composition proof; drawer shell cannot stay hidden inside it |
| Raw higher-layer residue | Earlier searches found raw SVG fills, inline styles, raw HSL tiles, and local drawer/control classes in unique/composition files | current composition sources are aligned; Finish Gate sweep pruned remaining raw guide-stage hex and top-drawer HSL tile residue |

Taxonomy decision, 2026-05-26:

- The next implementation slice should not start with brand polish.
- Brand unique extraction, DrawerShell Promotion Gate, app `TopDrawer.vue` alignment, loading composition integration, token doctrine, and Finish Gate residue audit are resolved; the next blocker is the user Finish Gate decision.

## Slice Proof: Loading Composition Integration

| Pattern | Before | After | Remaining |
|---|---|---|---|
| Loading visual source | `CompositionLoadingScreen.vue` owned the cut-paper loading target while app `LoadingSplash.vue` owned a divergent monochrome implementation | `src/components/compositions/LoadingScreen.vue` owns the visual composition and state display API | pass |
| Style-guide specimen | Specimen defined loading markup/CSS directly | Specimen imports `LoadingScreen.vue` and keeps only explanatory caption | pass |
| App behavior | `LoadingSplash.vue` mixed initialization orchestration with local visual CSS | `LoadingSplash.vue` preserves loading/audio/MIDI/error/retry/dev-skip behavior and feeds state/actions into `LoadingScreen.vue` | pass |
| Progress grammar | Style-guide chromatic tape was static | Source composition lights chromatic tape segments from app progress | pass |

Browser DOM proof, 2026-05-27:

- `/style-guide` renders 1 loading-screen source node inside `.preview-port--composition-loading-screen` with no Chrome runtime log or exception events.
- The loading specimen renders `Cut-paper jazz, lit by a synth.`, `57% · 120 BPM`, and 3 lit chromatic progress notes from `LoadingScreen.vue`.
- The old local `.stage` family renders 0 nodes inside the loading composition specimen.
- The specimen source box renders at 652 x 560 in the 1440px Chrome proof viewport.

Unit proof, 2026-05-27:

- `LoadingScreen.test.ts` verifies progress copy, chromatic lit-note count, MIDI copy, dev skip emission, ready-state start emission, and error-state retry emission from the source composition.

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
| `CompositionTopDrawer.vue` shell behavior | Composition owned raw drawer shell classes and DOM controller behavior while also owning product panes | Composition composes `DrawerShell`; product panes and controls remain composition-local | pass |
| App top drawer overlap | Existing `src/components/TopDrawer.vue` owned production behavior without the promoted shell grammar | App source wraps `DrawerShell` while preserving trigger/panel slots and exposed controls | pass |
| Local raw shell residue | Old style-guide drawer shell classes and `@ts-nocheck` lived in unique/composition files | Search finds no `@ts-nocheck`, DOM lookup/controller, or old raw drawer class families in `UniqueDrawer.vue` or `CompositionTopDrawer.vue` | pass |

Unit proof, 2026-05-27:

- `TopDrawer.test.ts` opens the production wrapper through the trigger slot and verifies a real `.drawer-shell` renders through Teleport.
- The panel slot still receives `close`, `isOpen`, and `anchor`, and closing from panel content removes the drawer shell.
- Existing ConfigPanel and InstrumentSelector tests still pass with their TopDrawer consumer mocks.

Browser DOM proof, 2026-05-27:

- `/style-guide` renders 4 `.drawer-shell` nodes and 1 `CompositionTopDrawer` specimen with no browser console errors.
- Opening the first top-drawer composition trigger renders 1 `.drawer-shell--open`, visible pane content, and the `Tap · ESC` handle label.
