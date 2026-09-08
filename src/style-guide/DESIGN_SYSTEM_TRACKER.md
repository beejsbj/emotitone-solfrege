# Design System Plan

Current truth and executable queue for the temporary EmotiTone production visual-design pass. Read this file with `$emotitone-design-system`; use `DESIGN_LOG.md` only for chronological receipts and Git for archaeology.

## Mission

Tighten and promote the visual language already present in production, `/style-guide/`, and the reference material. Burooj is the taste authority where evidence leaves a real visual choice. Reconcile drift and lineage without redesigning the product from zero.

This is a visual-system migration. Preserve interaction, audio, routing, state, persistence, APIs, accessibility behavior, haptics, and motion unless a unit's accepted definition expressly changes them. Park standalone functionality and defects outside this pass.

## System model

```text
Tokens (foundations)
  -> Primitives (reusable elements)
    -> Compounds (reusable assemblies)
      -> Compositions (complete product surfaces)

Uniques (singular artifacts, orthogonal to complexity)
  -> may be primitive-like or compound-scale
  -> may consume appropriate reusable layers and feed compounds/compositions
```

`Unique` is not a rung between Primitive and Compound. It identifies an artifact that should remain singular rather than become a reusable family. Ordinary uniqueness does not make every Primitive a design-system `Unique`.

Every reusable visual rule has one lowest appropriate owner and is consumed upward. A guide-only specimen proves the rule can render; it does not prove production adoption. A token with no consumer outside its own token showcase is an orphan until it is adopted, merged, removed, or explicitly retained with a reason.

## Records, truth, and gates

There are two durable records:

- This file is the **Plan**: live definitions, status, dependencies, collision points, and next gates.
- `DESIGN_LOG.md` is the **Log**: append-only acceptance, implementation, verification, and handoff receipts.

Do not create a third planning ledger. Keep completed implementation narrative, commit lists, and old verification matrices in the Log, Git, or existing evidence directories; keep only decisions that still constrain future work here.

When sources disagree, use this order: Burooj's current instruction, this Plan, current production and observed behavior, the Log, Linear `BJS-35`, then Git history. The external design repository, old preview HTML, screenshots, and guide staging are reference evidence rather than acceptance authority.

Each unit tracks four independent gates:

1. **Defined** — Burooj accepted the shared visual definition.
2. **Authoritative source** — one source owns the accepted grammar.
3. **Real specimen** — `/style-guide/` imports and drives that source.
4. **Production adoption** — a real product surface consumes that source.

Work from a focused branch based on the current mainline, normally the latest `origin/main`. Recompute branch, worktree, ahead/behind, test, and preview state at session start; never cache those facts here. One branch should contain one coherent unit or one coordinated lower-layer promotion.

## Current closed or constrained work

| Unit | Classification | Current truth | Remaining constraint |
| --- | --- | --- | --- |
| Circle-native cut paper | Geometry token family | Five curved disc silhouettes are accepted, authoritative, rendered directly in the Geometry guide, and consumed by real Button guide specimens | Production assignment requires an accepted consumer decision; the default production Button remains circular |
| Note | Primitive | Defined, authoritative, real specimen, production-adopted through Key | Preserve musical identity and the geometry/proportion/surface boundary |
| Key | Compound | Defined, authoritative, real specimen, production-adopted through Keyboard | Preserve native momentary interaction around a complete Note |
| Knob | Primitive deep module | Ring/Arc family is defined, authoritative, represented by real specimens, and production-adopted. Unpinned production Knobs share one app-load edition that alternates Ring/Arc between loads; explicit guide specimens stay fixed. Interactive Range/Options drag values use an Ivory Sticker in production and the accepted brass Badge treatment where Brass is exercised in the guide | Keep one public seam, page-wide edition consistency, viewport-safe gesture feedback, and Range/Boolean/Options behavior; accepted follower/rip motion does not close the Motion collection |
| Button | Primitive | Defined, authoritative, real specimen, and production-adopted | Momentary only; production disc-geometry use remains a separate consumer choice |
| Sticker + Badge | Primitive family; Badge is currently a Sticker variant | Visual definition is closed and Badge is brass-only. The filled Ivory Sticker is production-adopted by interactive Knob drag feedback; the public Knob source and real specimens exercise its Brass-to-Badge mapping, while current production has no Brass Knob. The generic source API and guide still permit/show non-brass Badges | Remove the non-brass Badge drift while preserving Knob consumption, then choose additional placements across Config, Instrument, Loading, and Pattern surfaces without reopening the visual design |
| Chord | Compound | Defined, authoritative, and mounted in the guide; clustered Notes are adopted by CodeStrip | Fused-symbol adoption waits for a trustworthy recognition owner and future Keyboard chord-row work |
| CodeStrip | Unique, compound-scale | Defined, authoritative, real specimen, and production-adopted as the editable Strudel document | Preserve source-range editing, native playback progress, and Note/Chord lineage |
| CodeStrip Bar | Compound | Defined, authoritative, real specimen, and production-adopted | Preserve one continuous translucent instrument-bar surface; 8px block/12px inline inset, 8px beside CodeStrip, 6px between right actions; unframed zero-inset dense editor; and brass Play/Stop, ink Backspace, ivory Return as accessible icon-only 32px Buttons |
| Control Bar | Compound | Defined, authoritative, real specimen, and production-adopted | Preserve its five equal slots and existing musical mutations |
| Drawer | Unique, compound-scale | Defined, authoritative, real specimen, and adopted by bottom Keyboard plus top Instrument/Config hosts | Preserve continuous sizing, progressive clipping/focus, preferred Keyboard height, and natural/capped top-panel reopening |

Do not re-grill closed units without a concrete contradiction or explicit request.

## Governing constraints

- Brand colors are decorative; brass is an instrument material. Semantic aliases such as `--danger` are legacy cleanup, not design doctrine.
- Prefer filled surfaces and minimize borders. An outline must be intentional visual grammar rather than default structure.
- Glassmorphism remains rejected. Keyboard Glass/Opacity, Roundness, and Angled Style controls are retired; do not restore them through token cleanup or later compositions.
- Drawer uses its accepted exposed-edge icon/grip handle. Do not reintroduce the retired floating triggers or Drawer Boolean Knob.

## Open system work

| Unit | Current truth | Next gate |
| --- | --- | --- |
| Token collections | UI Colors, Brand Colors, Spacing + Radius, Spacing Scale, Typography, Motion, and remaining Geometry have not received a complete ownership/adoption audit | Inventory declarations, aliases, literals, guide specimens, and real consumers; resolve every orphan or duplicate |
| Music Color | Runtime resolver is calculation authority; the current linear-swatch guide is unaccepted drift from the original segmented chromatic-wheel intent | Define the visual recipe independently, then make guide and runtime consume one authority |
| UIBeat | Planned system-wide music/motion token and runtime protocol; not a component or composition | Define transport phase, playback start/stop, BPM response, consumer API, Reduced Motion stillness, transform coexistence, performance budget, and migration from BeatingShapes before distributing it |
| Keyboard | One production compound and controlled guide specimen; Keyboard Padding is exposed through that seam | Add representative shorter/non-chromatic cardinalities to the controlled specimen, or gather equivalent production-mode evidence, then accept or adjust the density matrix; this is visual review, not source reconciliation |
| Bar Tape | Source and guide specimen exist; acceptance/adoption unresolved | Define and formalize before Pattern Card closes if its grammar is reused there |
| Pattern Card | Guide and production have separate sources | Reconcile one authoritative source and preserve production pattern actions/state |
| Pattern List | Production `PatternList.vue` binds `patternsStore` and loading actions; the guide's PatternReel is reference evidence whose active/stack state is demo-local | Define the list/stack compound and mount a real controlled specimen without replacing production state ownership |
| Tabs | `ChipTabs.vue` and production `ui/Tabs*` are separate implementations | Reconcile the shared tab grammar before closing Instrument Picker or Config Menu |
| Brand Cover + Brand Logo | Unique sources and guide specimens exist; visual/source/adoption gates remain open | Close these small singular artifacts; the Loading Screen is their sole planned production consumer |
| Spine Card | Source and guide specimen exist; the unit is being reworked in a separate lane | Do not redesign Spine Card in the Marks pass. Its current `Kicker.vue` import may use a thin compatibility adapter until the owning lane adopts Mark Sticker directly |
| Mark family | Astra-low redraw candidate is implemented as one 28-glyph renderer-neutral registry for SVG and canvas, adding quarter, half, whole, natural, quarter rest, repeat, crescendo, and bass clef. The code lineage is verified; Burooj has not yet accepted the revised drawings | Review the complete family and especially detailed notation at particle scale in `/page`; adjust or accept the visual candidate. Loading Screen's pre-existing copied triangle remains deferred to its own lane |
| Mark Sticker | Accepted concept is now formalized as the real compound and guide specimen: authoritative Mark inside authoritative Sticker, optionally beside one short label. Kicker has no guide unit or geometry; only a thin source-compatibility adapter remains for Spine Card | Burooj visual review of the candidate. The separate Spine Card lane should adopt Mark Sticker directly and delete the adapter when it owns that integration |
| Beat Indicator | Defined as a compound, authoritative, and represented by a real specimen. It selects and animates Mark instances and owns no glyph geometry | Production placement is intentionally deferred until UIBeat defines phase, start/stop, BPM, grouping, and Reduced Motion protocol |

The Motion audit must include the current Reduced Motion opacity-blink fallback and unrelated literal demo timings. Its scoped square `beat-cell` specimen is old reference evidence after the global square-beat keyframes were retired; reconcile it with UIBeat or remove it during Motion/UIBeat definition. Already accepted local recipes such as rip-mode and Drawer Swing remain constrained evidence, not automatic acceptance of the full collection.

## Compositions

These are the five planned compositions:

| Composition | Boundary | Current state and predecessors |
| --- | --- | --- |
| **PerformanceDeck** | Bottom Drawer + Pattern List + CodeStrip Bar + Control Bar + Keyboard | Planned name; current production host is `DrawerKeyboard.vue`. Drawer and both bars are closed. It cannot close until Keyboard and the production Pattern Card/List chain are defined, authoritative, represented by real specimens, and adopted |
| **Instrument Picker** | Instrument-selection content inside the shared top Drawer | Drawer shell is closed; interior design-system adoption remains. Resolve Tabs and consider Sticker/Badge placements before composition review |
| **Config Menu** | Configuration content inside the shared top Drawer | Drawer shell is closed; interior design-system adoption remains. Resolve Tabs and coordinate Sticker/Badge placement plus UIBeat's old-config migration before composition review |
| **Loading Screen** | Complete startup/loading surface | Production currently uses the restored `LoadingSplash.vue`. The newer `LoadingScreen.vue` is guide-only and unaccepted; Brand Cover and Brand Logo are expected production uniques, with Kicker/Spine Card reconciled if used |
| **Stage** | The unified visual canvas: `UnifiedVisualEffects.vue` + `useUnifiedCanvas` and its canvas-owned layers | Production particles now choose a random Mark from the whole registry for every spawn; interval/note data has no visual assignment. Music Color and existing physics remain unchanged. The wider Stage definition remains pending. Stage is the canvas, not UIBeat; do not absorb DOM overlays or unrelated UI into it |

`UIBeat` sits across the whole interface during playback. It retires and transforms the intent of `BeatingShapes`: the UI itself beats instead of random Stage shapes beating. Existing `BeatingShapes` playback/BPM bindings, its mount in `UnifiedVisualEffects`, and its saved Config fields are migration evidence, not the new architecture.

## Parallel execution lanes

| Lane | Ordered work | May run beside | Merge/collision rule |
| --- | --- | --- | --- |
| Foundations | Audit each token collection -> resolve orphans/duplicates -> Music Color and UIBeat foundations | Keyboard review and artifact definition | Token-family inventories may run in parallel; serialize edits to the central token CSS and shared token guide |
| Keyboard | Review variable-cardinality matrix -> accept density -> close source/specimen/adoption gates | Token inventory and brand work | Coordinate changes to `Keyboard.vue`, its guide specimen, and `DrawerKeyboard.vue` |
| Patterns | Bar Tape -> Pattern Card source reconciliation -> Pattern List real specimen/adoption -> PerformanceDeck | Brand/Loading and top-menu definition | PatternReel remains reference-only until reconciled; `DrawerKeyboard.vue` has one owner during integration |
| Top menus | Tabs -> Instrument Picker and Config Menu | Patterns and Brand/Loading | Instrument and Config may proceed in parallel after shared Tabs grammar closes; serialize `TopDrawer.vue`, shared panel shells, and guide registration |
| Brand/Loading | Brand Cover and Brand Logo in parallel -> Kicker/Spine Card if consumed -> Loading Screen | Keyboard, Patterns, and top-menu work | Production replacement happens only after the composition is accepted; preserve the working LoadingSplash until then |
| UIBeat | Protocol definition -> representative UI consumers -> runtime/config migration -> BeatingShapes retirement -> broad adoption | Read-only Stage definition | Serialize its edits with Config Menu at config files and with Stage at `UnifiedVisualEffects.vue`; define one transform-composition strategy before touching many consumers |
| Stage | Formalize Mark-backed particles -> define remaining unified canvas -> reconcile canvas layers -> real specimen/production verification | UIBeat definition and unrelated composition work | Stage owns canvas effects only. Mark owns particle geometry; Stage owns Music Color, release, physics, and lifetime. Coordinate `UnifiedVisualEffects.vue`; UIBeat remains system-wide and DOM overlays remain outside Stage |
| Final adoption audit | Scan all five compositions and remaining runtime surfaces -> close or explicitly defer every lineage gap | Nothing that changes shared lineage | Run after lane integration. `MainApp`-level surfaces such as FloatingPopup and TooltipRenderer still require a lower-layer owner/consumer or an explicit deferral; they do not create a sixth composition |

The shared collision files are the central token stylesheet, `StyleGuide.vue`, this Plan, and the Log. Give each one integration owner per merge window. Parallel branches report receipts to that owner; they do not all append or rewrite the ledgers independently.

## Immediate frontier

The queue can start on several independent branches now:

1. **Keyboard visual acceptance:** inspect the controlled matrix at 320, 390, 768, and 960 CSS px across representative row counts, octave edges, geometry families, surfaces, labels, pressed/sounding states, Reduced Motion, and forced colors. Scale cardinality is variable, including a twelve-note chromatic scale. Keyboard explicitly lets keys shrink evenly to fit; the twelve-key guide is a valid maximum-density case, not a production mismatch. Because the current controlled guide hard-codes twelve keys, add representative shorter/non-chromatic cardinalities there or exercise equivalent production modes before acceptance. Resolve only gap, row-height hierarchy, inset, narrow typography, overlap, and variation amplitude.
2. **Token lineage inventory:** audit every token family, not only Motion. For every declaration, record its source owner and guide/production consumers in the live unit row; remove duplicate aliases/literals and leave only unresolved findings in this Plan.
3. **Pattern foundation:** begin Bar Tape and the two Pattern Card sources while preserving production actions and store ownership.
4. **Brand artifacts:** close Brand Cover and Brand Logo as focused, singular units ready for Loading Screen consumption.
5. **Top-menu reconnaissance:** compare Instrument and Config interiors against `/style-guide/`, identifying reusable Tabs/Sticker/Badge grammar without redesigning their behavior.

PerformanceDeck follows Keyboard and the Pattern chain. Loading Screen follows its brand/lower-layer artifacts. Instrument Picker and Config Menu follow shared Tabs grammar. UIBeat implementation follows its protocol acceptance and must coordinate both Config and Stage hosts.

## Unit acceptance and handoff

Before implementation, write a compact unit brief with its definition, current source/specimen/production status, dependencies, preservation boundary, and observable finish. Compare production, the real guide specimen, and relevant reference evidence before asking taste questions. Implementation begins only after Burooj accepts the shared-understanding summary.

A unit closes only when:

- the four gates above are updated independently;
- every changed rule has one lowest owner and a real upward consumer or explicit deferral;
- guide scaffolding and demo state have not entered production;
- focused tests, type-check/build, responsive/state verification, and a fresh bounded lineage audit pass in proportion to risk;
- visual evidence is named precisely, including anything not captured or exercised;
- this Plan contains only the resulting current truth and `DESIGN_LOG.md` receives one concise receipt;
- branch, commits, checks, pushed state, residual risk, and next dependent unit are handed off exactly.

After all lanes merge, run the final adoption/orphan scan across token declarations, guide registrations, component imports, the five compositions, and other runtime-mounted surfaces. The pass is complete only when every design-system unit is consumed by a later layer, a terminal composition is mounted in production, a direct foundational specimen is intentionally retained with a recorded reason, or the unit is removed.
