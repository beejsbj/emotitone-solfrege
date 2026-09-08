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
| Key | Compound | Defined, authoritative, real specimen, production-adopted through Keyboard; standalone instances own native momentary input while Keyboard may opt into root-managed glissando | Preserve the complete Note, standalone momentary behavior, and the explicit managed-input boundary |
| Knob | Primitive deep module | Ring/Arc family is defined, authoritative, represented by real specimens, and production-adopted. Unpinned production Knobs share one app-load edition that alternates Ring/Arc between loads; explicit guide specimens stay fixed. Interactive Range/Options values use the shared `DragValue` support primitive with an Ivory Sticker in production and the accepted Brass Badge treatment where Brass is exercised in the guide | Keep one public seam, page-wide edition consistency, viewport-safe gesture feedback, and Range/Boolean/Options behavior; accepted follower/rip motion does not close the Motion collection |
| Instrument control frame + DragValue | Primitive support | Defined and authoritative for Knob/Joystick reuse. Shared CSS owns default face size, the inset visible-hardware diameter, analog dark-well material, centering, and bottom-label anatomy; `DragValue.vue` owns the spring/viewport follower and composes Sticker/Badge material. Production Knobs and Joystick consume the appropriate seams | Keep gesture/value ownership in each control and paper material in Sticker/Badge; do not turn this support seam into a behavioral superclass |
| Button | Primitive | Defined, authoritative, real specimen, and production-adopted. Non-brass Buttons share the promoted `--dur-bounce` / `--ease-bounce` elastic release with Boolean Knob; Brass keeps its direct tap response | Momentary only; preserve Reduced Motion stillness; production disc-geometry use remains a separate consumer choice |
| Sticker + Badge | Primitive family; Badge is currently a Sticker variant | Visual definition is closed. Badge uses Brass as its default signal material and an Ivory body with Ink marks for committed Joystick latch confirmation. The filled Ivory Sticker remains production-adopted by ordinary interactive Knob drag feedback. Outline and fill Stickers may compose one leading or trailing Mark through the same public source, as exercised by the real Sticker specimen. The guide shows only the accepted Badge treatments, though the generic source API still permits other colors | Remove the remaining non-Brass source-API drift without erasing the constrained Ivory latch state or marked-content consumption, then choose additional placements across Config, Instrument, Loading, and Pattern surfaces without reopening the visual design |
| Chord | Compound | Defined, authoritative, and mounted in the guide. Clustered Notes are adopted by CodeStrip; fused symbols are adopted by the permanent Keyboard chord row through `ChordKey`, where edge-matched member gradients blend the actual pitch colors without giving up per-member progress | Preserve display-coupled anatomy, member order/progress, and presentation-only ownership |
| Bar Tape | Primitive | Defined, authoritative, real specimen, and production-adopted through Pattern Card as a 4px compressed musical-event timeline | Preserve chronological event order, duration-proportional segments with a 50ms visibility floor, runtime Music Color fills, and its borderless noninteractive boundary |
| Card | Primitive | Defined, authoritative as `Card.vue`, mounted as a real guide specimen, and production-adopted through Pattern Card. It owns the Ink-3 square shell, Ink-5 hairline, required notched edge label, 4px Ivory-default spine with a plain color input, optional mark/footer anchors, and flexible content. Colored Cards are not variants or a separate Spine Card family; obsolete `CardShell.vue` and `SpineCard.vue` sources are retired | Preserve the one-shell boundary: consumers own content anatomy; compact, borderless, and light-inversion modes remain rejected |
| Pattern Card | Compound | Defined, authoritative, mounted as a real controlled specimen, and production-adopted. Both states compose Card with the ordinal in its top-right mark. Collapsed shows name, non-duplicated note/retention metadata, and Bar Tape. Expanded replaces Bar Tape with CodeStrip and exposes two-tap Delete, Copy Strudel Code, and right-most Open in Strudel Buttons; default patterns cannot be deleted | Pattern List owns active state, ordering, and stack/list choreography in a separate unit. The production adapter owns stores, notation, clipboard, external URL, and deletion. Keep remains deferred to Pattern List |
| CodeStrip | Unique, compound-scale | Defined, authoritative, real specimen, and production-adopted as the editable Strudel document; reparsed absolute notes preserve borrowed/raw identity and exact chromatic color for both notes and chord members | Preserve source-range editing, native playback progress, exact-pitch identity after edits, and Note/Chord lineage |
| CodeStrip Bar | Compound | Defined, authoritative, real specimen, and production-adopted | Preserve one continuous translucent instrument-bar surface; 8px block/12px inline inset, 8px beside CodeStrip, 6px between right actions; unframed zero-inset dense editor; and brass Play/Stop, ink Backspace, ivory Return as accessible icon-only 32px Buttons |
| Control Bar | Compound | Defined, authoritative, real specimen, and production-adopted with five Knobs plus one distinct Harmony Joystick in six equal slots | Preserve the existing five musical mutations, controlled harmony events, shared surface, and distinct Joystick ownership |
| Joystick | Unique | Direction semantics, Analog/Digital brass treatments, relative drag, page edition, Knob-aligned face and visible-hardware diameter, shared analog dark well, canonical sheen, detent alignment, and directional drag feedback are defined, authoritative, represented by real fixed specimens, and production-adopted through Control Bar | Preserve automatic center, eight explicit directions, 5px two-axis relative drag, short-drag latch with a firmer haptic and briefly retained Ivory Badge, stationary tap-to-Auto unlatch, held override/restore, cancellation cleanup, native radio-grid access whose arrow/Home navigation selects and moves the roving tab stop, and fixed guide specimens |
| Drawer | Unique, compound-scale | Defined, authoritative, real specimen, and adopted by bottom Keyboard plus top Instrument/Config hosts | Preserve continuous sizing, progressive clipping/focus, preferred Keyboard height, and natural/capped top-panel reopening |
| Mark family | Primitive family | The accepted 28-glyph renderer-neutral registry is authoritative for SVG and canvas, has a real complete guide specimen, and is production-adopted by Stage particles. Structural and musical shapes are equal Marks; particle selection is random per spawn | Preserve one geometry authority, Stage Music Color/physics/lifetime ownership, and the Loading Screen triangle deferral to its own lane |
| Brand Logo | Unique, compound-scale | The approved Centered Cluster is defined and authoritative in `BrandLogo.vue`: five smooth brand-colour circles sit behind a six-cut Ink/Ivory ET while nine accepted Marks scatter across an expanded field. The real guide specimen drives stacked, compact, mark-only, Ink, and Bone presentations through that source. The browser and installable-app icons carry a static export of the same accepted mark | Production component adoption remains deferred to the Loading Screen composition gate; preserve the current `LoadingSplash.vue` until that composition is accepted |

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
| Music Color | Runtime resolver is calculation authority; exact-pitch Note, Chord, Pattern Card, Blob, and particle consumers fall back to chromatic identity for borrowed tones while general movable and ROLI off-scale semantics remain unchanged. The current linear-swatch guide is unaccepted drift from the original segmented chromatic-wheel intent | Define the visual recipe independently, then make guide and runtime consume one authority |
| UIBeat | Planned system-wide music/motion token and runtime protocol; not a component or composition | Define transport phase, playback start/stop, BPM response, consumer API, Reduced Motion stillness, transform coexistence, performance budget, and migration from BeatingShapes before distributing it |
| Blob relationships | Blobs own one canonical configuration and master toggle across body appearance, motion, relationships, analysis, and labels; the separate Harmony config/tab is retired. Connections are Off by default, with exactly Merge and Web modes. Merge makes every blob one continuous body through its accepted sparse N-1 material topology. Web keeps bodies distinct while the analyzed full graph becomes field filaments: perimeter strands are stronger, interior strands finer and dimmer, intersections fuse, and surviving roles stay stable through drift and release. `useBlobRenderer.ts` owns lifecycle, exact chromatic color identity, exact animated contours, breathing, and edge motion; sustained bodies persist until release, and Blob blur plus color-preserving glow finish ordinary, Merge, and Web bodies consistently. `useBlobFieldRenderer.ts` owns the capped/batched shared field and relationship morphology through Blob-owned Field Softness and Fusion Strength; Web attaches filaments to stable rendered radii so contour vibration remains body motion rather than shaking the graph. `useHarmonicAnalysis.ts` plus `useHarmonicGeometryRenderer.ts` retain event-lived analysis, graph topology, and optional-label runtime responsibilities without owning a second user configuration. Released analysis expires with the body's earliest visible exit; partial scenes suppress stale whole-harmony labels; narrow labels wrap without glyph compression. Web and label opacity are independent; Analysis Hold Time replaces the former split timing controls. Production, persistence, presets, and the real guide consume the Blob seam. Legacy Harmony values migrate into it, including Outline -> Merge and Center Only -> Web, then disappear from canonical exports | Inspect the deployed one-note-to-Web transition, filament stability, glow/blur continuity, grouped Blob controls, and maximum-density performance on PR #32. Preserve replay/lifecycle, exact-pitch color, Merge's accepted continuity, the 30k field-pixel budget, CodeStrip/Chord presentation, and feed the accepted two-mode result into later Stage definition |
| Keyboard | One production compound and controlled guide specimen. Its permanent chord row renders one fused playable chord per active 5/6/7/12-note scale degree, keeps each held face on its attacked voicing and key/mode color context while later owners attack live Harmony, normalizes extreme voicings into MIDI range, keeps borrowed members colored, and drives the corresponding in-scale Note Keys through their native down-state for the chord owner's lifetime. Melody rows own continuous multi-pointer glissando with sparse-path reconstruction and shared-key reference ownership; the chord row remains independently pannable. Native pointer, touch, keyboard, click-only, and mirrored-unison owners release independently; root-owned activation-key release survives focus movement between chord and melody zones, a focused orphan transfers to the nearest surviving chord before release removes it, and released melody/chord owners cancel late asynchronous publication. CodeStrip playback emits the same exact chromatic lifecycle identity for borrowed pitches as live chord attacks. The overflowing chord row distinguishes an 8px horizontal pan from a 120ms stationary touch intent before attacking, and controlled Reduced Motion/Forced Colors previews include both melody and chord faces. Broader density remains unaccepted | Inspect the existing variable-cardinality workbench and accept or adjust only the broader gap, row hierarchy, inset, typography, overlap, and variation-amplitude matrix |
| Pattern List | Production `PatternList.vue` binds `patternsStore` and loading actions; the guide's PatternReel is reference evidence whose active/stack state is demo-local | Define the list/stack compound and mount a real controlled specimen without replacing production state ownership |
| Tabs | `ChipTabs.vue` and production `ui/Tabs*` are separate implementations | Reconcile the shared tab grammar before closing Instrument Picker or Config Menu |
| Beat Indicator | Accepted as a production-owned compound, authoritative, and represented by a real specimen. It selects and animates Mark instances and owns no glyph geometry. It is production-ready but has no real runtime consumer, so the production-adoption gate remains explicitly deferred rather than falsely closed | Let UIBeat define phase, start/stop, BPM, grouping, and Reduced Motion before selecting its first production placement |

The Motion audit must include the current Reduced Motion opacity-blink fallback and unrelated literal demo timings. Its scoped square `beat-cell` specimen is old reference evidence after the global square-beat keyframes were retired; reconcile it with UIBeat or remove it during Motion/UIBeat definition. Already accepted local recipes such as rip-mode and Drawer Swing remain constrained evidence, not automatic acceptance of the full collection.

## Compositions

These are the five planned compositions:

| Composition | Boundary | Current state and predecessors |
| --- | --- | --- |
| **PerformanceDeck** | Bottom Drawer + Pattern List + CodeStrip Bar + Control Bar + Keyboard | Planned name; current production host is `DrawerKeyboard.vue`. Drawer and both bars are closed. It cannot close until Keyboard and the production Pattern Card/List chain are defined, authoritative, represented by real specimens, and adopted |
| **Instrument Picker** | Instrument-selection content inside the shared top Drawer | Drawer shell is closed; interior design-system adoption remains. Resolve Tabs and consider Sticker/Badge placements before composition review |
| **Config Menu** | Configuration content inside the shared top Drawer | Drawer shell is closed; interior design-system adoption remains. Resolve Tabs and coordinate Sticker/Badge placement plus UIBeat's old-config migration before composition review |
| **Loading Screen** | Complete startup/loading surface | Production currently uses the restored `LoadingSplash.vue`. The newer `LoadingScreen.vue` is guide-only and unaccepted; Brand Logo is ready. Brand Cover was removed as a guide-only orphan rather than becoming a false dependency; marked Sticker remains available if the accepted composition calls for it |
| **Stage** | The unified visual canvas: `UnifiedVisualEffects.vue` + `useUnifiedCanvas` and its canvas-owned layers | Production particles now choose a random Mark from the whole registry for every spawn; interval/note data has no visual assignment. Music Color and existing physics remain unchanged. The wider Stage definition remains pending. Stage is the canvas, not UIBeat; do not absorb DOM overlays or unrelated UI into it |

`UIBeat` sits across the whole interface during playback. It retires and transforms the intent of `BeatingShapes`: the UI itself beats instead of random Stage shapes beating. Existing `BeatingShapes` playback/BPM bindings, its mount in `UnifiedVisualEffects`, and its saved Config fields are migration evidence, not the new architecture.

## Parallel execution lanes

| Lane | Ordered work | May run beside | Merge/collision rule |
| --- | --- | --- | --- |
| Foundations | Audit each token collection -> resolve orphans/duplicates -> Music Color and UIBeat foundations | Keyboard review and artifact definition | Token-family inventories may run in parallel; serialize edits to the central token CSS and shared token guide |
| Keyboard | Review variable-cardinality matrix -> accept density -> close source/specimen/adoption gates | Token inventory and brand work | Coordinate changes to `Keyboard.vue`, its guide specimen, and `DrawerKeyboard.vue` |
| Patterns | Pattern List real specimen/adoption -> PerformanceDeck | Brand/Loading and top-menu definition | Bar Tape, Card, and Pattern Card are closed; PatternReel remains reference-only until reconciled; `DrawerKeyboard.vue` has one owner during integration |
| Top menus | Tabs -> Instrument Picker and Config Menu | Patterns and Brand/Loading | Instrument and Config may proceed in parallel after shared Tabs grammar closes; serialize `TopDrawer.vue`, shared panel shells, and guide registration |
| Brand/Loading | Loading Screen definition -> marked Sticker only if consumed -> production adoption | Keyboard, Patterns, and top-menu work | Brand Logo is ready and Brand Cover is retired. Production replacement happens only after the composition is accepted; preserve the working LoadingSplash until then |
| UIBeat | Protocol definition -> representative UI consumers -> runtime/config migration -> BeatingShapes retirement -> broad adoption | Read-only Stage definition | Serialize its edits with Config Menu at config files and with Stage at `UnifiedVisualEffects.vue`; define one transform-composition strategy before touching many consumers |
| Stage | Mark-backed particles complete -> define remaining unified canvas -> reconcile canvas layers -> real specimen/production verification | UIBeat definition and unrelated composition work | Stage owns canvas effects only. Mark owns particle geometry; Stage owns Music Color, release, physics, and lifetime. Coordinate `UnifiedVisualEffects.vue`; UIBeat remains system-wide and DOM overlays remain outside Stage |
| Final adoption audit | Scan all five compositions and remaining runtime surfaces -> close or explicitly defer every lineage gap | Nothing that changes shared lineage | Run after lane integration. Remaining `MainApp`-level surfaces such as TooltipRenderer still require a lower-layer owner/consumer or an explicit deferral; they do not create a sixth composition |

The shared collision files are the central token stylesheet, `StyleGuide.vue`, this Plan, and the Log. Give each one integration owner per merge window. Parallel branches report receipts to that owner; they do not all append or rewrite the ledgers independently.

## Immediate frontier

The queue can start on several independent branches now:

1. **Blob relationship modes deployed acceptance:** inspect the fused-filament Web and its maximum-density performance on PR #32 beside the accepted all-distance Merge, including the unified grouped Blob controls. If accepted, close the two-mode treatment and retain it as constrained Stage input; if adjusted, keep the correction inside the authoritative field renderer without reopening its material ownership, labels, lifecycle, or canonical config ownership.
2. **Keyboard visual acceptance:** inspect the existing controlled 5/6/7/12-cardinality matrix at 320, 390, 768, and 960 CSS px across representative row counts, octave edges, geometry families, surfaces, labels, pressed/sounding states, Reduced Motion, and forced colors. Keyboard explicitly lets keys shrink evenly to fit; the twelve-key guide is a valid maximum-density case, not a production mismatch. Resolve only gap, row-height hierarchy, inset, narrow typography, overlap, and variation amplitude.
3. **Token lineage inventory:** audit every token family, not only Motion. For every declaration, record its source owner and guide/production consumers in the live unit row; remove duplicate aliases/literals and leave only unresolved findings in this Plan.
4. **Pattern List:** define the list/stack compound around the closed Pattern Card source, mount a real controlled specimen, and preserve production store ownership and loading behavior.
5. **Loading Screen definition:** compare the working `LoadingSplash.vue`, guide-only `LoadingScreen.vue`, and approved Brand Logo; define the complete composition without restoring the retired Brand Cover.
6. **Top-menu reconnaissance:** compare Instrument and Config interiors against `/style-guide/`, identifying reusable Tabs/Sticker/Badge grammar without redesigning their behavior.

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
