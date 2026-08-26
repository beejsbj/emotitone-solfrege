# Design System Tracker

Current-truth map for design-unit review and integration. A mounted specimen or a source file is reference material until its definition is explicitly accepted.

## Why this exists

This is the cross-session handhold for the design interview. It exists to stop context-heavy grilling and implementation sessions from blurring four different claims: **defined**, **formalized as a source component**, **shown through a real specimen**, and **adopted in production**. None implies the next.

The style guide is an **interview checklist**, not an accepted design system. `/Users/burooj/BJsWorkspace/Projects/emotitone-design-system` is reference-only inspiration used to recover omissions; it is not automatic extraction authority. An agent recommendation is not a decision until Burooj explicitly accepts it.

Truth has three distinct homes: Linear `BJS-35` holds workflow/next-actor state and receipts; this file holds current per-unit design truth; `DESIGN_LOG.md` holds chronological decision evidence. Reconcile them when they disagree rather than picking whichever one is most convenient.

### Mission: production visual migration with lineage

The style-guide material began as design exploration produced through other design tools. It is reference input, not a parallel application and not automatic authority. The purpose of this work is for Burooj to update the production application's visual design by reviewing that material, accepting or correcting it, formalizing the accepted design in reusable source components, and then composing those sources into the application's production surfaces.

Work one unit at a time so visual lineage remains inspectable:

```text
tokens -> primitives -> compounds + uniques -> compositions
```

**Compositions are the production surfaces.** Each downstream unit must consume accepted upstream sources rather than copy their appearance. A production migration is complete only when the accepted sources own their visual treatments, the style guide imports those sources, the production composition uses them, and the lineage and verification receipt are recorded here.

This is a **visual-system migration**, with existing product behavior treated as a preservation constraint. Formalization may reshape component ownership only as needed to establish the visual lineage; it does not silently redesign interaction, audio, routing, state, or other functionality. When a behavior defect or functional change appears, diagnose and implement it as a separately scoped slice with its own reproduction, regression evidence, and receipt. Then resume the visual gate without making the functionality work part of the component's visual acceptance.

Use this file to resume the workflow without reconstructing it from chat:

- Read the current checkpoint, active unit row, dependencies, and next gate before asking questions or editing.
- Inspect the current app behavior before inventing states, props, or architectural needs for Burooj to judge.
- Grill only the unresolved visual and state-presentation definition of the active unit. Capture functionality ideas separately; they are not acceptance conditions for the visual migration.
- Record explicit acceptance before formalization, with an exact receipt pointer in this file or `DESIGN_LOG.md` (session/turn, Linear comment, or commit). Keep implementation as a separate, focused slice, then update source/specimen/integration truth independently.
- Production adoption happens piece by piece through the composition that forms the live surface. If an accepted unit must pass through an undefined downstream unit, name that code a **provisional adapter**, preserve existing behavior, record every bridge decision, and keep the downstream definition unaccepted.
- End every session with the exact branch/worktree state, verification evidence, unresolved gate, and next frontier reflected here. A spoken "done" is not a handoff.

## Current checkpoint — 2026-08-26

- **Closed and authoritative:** Sticker, Note, Key, and the production-led Analog Ring + Digital Arc Knob family. Their source components and real specimens are formalized.
- **Coalescence complete:** `57bc6dd` merges the accepted Key stack at `1df13bc` into `implementing-design-system`. The legacy `KeyboardKey.vue` is removed, the production Keyboard renders the accepted Note through the accepted Key, and `DrawerKeyboard.vue` remains its thin current host.
- **Trusted refs:** draft PR #27 / `origin/implementing-design-system` remains at `85c63fd`; the local `implementing-design-system` branch is ahead and out of the merge. Recompute the live ahead count at handoff instead of trusting a number embedded in this committed file. The obsolete `.claude-continue.sh` was intentionally removed at `090b211`.
- **Definition boundary:** `components/compounds/Keyboard.vue` is now the single production Keyboard component. Commits `3e4690d`, `ebb0014`, `8038665`, and architecture correction `a301139` house production wiring in that compound and let the style-guide workbench drive the same component safely through inert `usage="controlled"`. Grilling and shared intent are concluded; only the exact visual density remains Under review. This does not accept the production baseline values or complete the deferred production correctness/config migration. Drawer remains undefined.
- **Accepted cross-app constraint:** glassmorphism is discarded and must be purged across the app. It is not a live Keyboard or Drawer option, an acceptable fallback, or an open design question. The current persisted setting and its silent mapping to `colored` are obsolete implementation debt.
- **Accepted tokenization follow-up:** promote all five accepted Note/Key geometry variants (`standard`, `tile`, `offcut`, `tab`, `pill`) into coherent named token recipes before Keyboard randomization consumes them. This formalizes already-accepted geometry; it does not reopen the variants or authorize new cuts.
- **Knob formalization and production integration complete:** acceptance remains recorded at `0c6b3ff`; implementation commit `c14c8d0` makes `components/primatives/Knob.vue` the shared Ring/Arc visual face beneath the existing production role family, mounts real production-driven specimens, and preserves `components/knobs/Knob.vue` as the sole gesture, value, haptic, API, density, and hold-motion authority. The migration corrects Range to the accepted 270-degree sweep, makes Boolean and Button full-circle, keeps real Options geometry/rotation, and adds consumer-selected `visual="ring" | "arc"` and semantic `tone="brass" | "ivory"` without creating persisted preference state or overriding explicit/per-option colors.
- **Parallel unresolved gate:** Burooj still needs to inspect the Keyboard workbench at the agreed matrix and settle exact spacing, row proportions, inset, narrow typography, overlap, and variation amplitude. Keep Keyboard **Under review** until that acceptance; then reconcile the tracker before the separate production correctness/config slice.
- **Active frontier:** begin a fresh CodeStrip visual grilling session, including its boundary and visual relationship with the action buttons/bar. Grill Drawer separately afterward. Only once CodeStrip + action bar, Keyboard, and Drawer are each defined should the current `DrawerKeyboard.vue` be reworked as their composition. Do not re-grill Note, Key, or Knob. Music Color retains an independent later gate.
- **Recovered Music Color drift:** the original mounted specimen was a segmented chromatic wheel with fixed/movable, root, octave 0–8, scale-count, and hue-sweep controls. During the unrelated Note/Key migration on 2026-08-18, commit `b140654` replaced it wholesale with the current linear swatch specimen so the guide would call the production `services/musicColor` resolver instead of maintaining duplicate demonstration logic. Consolidating the calculation authority did not constitute acceptance of the new visual presentation; Burooj was not grilled on removing the wheel or narrowing the displayed octave range. Treat the swatch-strip replacement as unaccepted drift. The octave model was not removed: the current specimen exposes octaves 2–8 and passes octave into the runtime lightness calculation.

## Status legend

- **Accepted:** the interview definition is settled.
- **Under review:** the interview is active and the definition is not settled.
- **Next:** the next unit selected for interview/formalization; its definition remains unsettled.
- **Taxonomy only:** its architectural layer/relationship is agreed, but its definition is not.
- **Reference source:** code exists so the style guide can show the idea; it is not yet authoritative.
- **Authoritative source:** the accepted component owns the design and the style-guide specimen imports it.
- **Production use (pre-acceptance):** current app code uses the source, but that does not make its design accepted.

## Mechanical summary

| Scope | Tokens | Primitives | Uniques | Compounds | Compositions | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mounted by `StyleGuide.vue` | 8 | 12 | 4 | 4 | 1 | **29** |
| Accepted definitions among mounted units | 0 | 4 | 0 | 1 | 0 | **5** |
| Authoritative source + real specimen | 0 | 4 | 0 | 1 | 0 | **5** |
| Mounted reference/pending units | 8 | 6 | 4 | 3 | 1 | **22** |

One additional architecture unit is tracked but not mounted: the future **DrawerKeyboard composition** of CodeStrip + action bar, Keyboard, and Drawer. Across all 30 tracked units, 5 definitions are accepted and formalized: `Sticker`, `Note`, `Key`, and the two mounted Knob visual units as one production-led family. The remaining 25 still need a definition gate. The mounted Keyboard is a production-integrated reference, not an accepted definition. `Music Color Recipe` is a separately flagged token review, not authority to interrupt the current unit order.

## Mounted inventory

### Token collections

All eight specimens are mounted references over the globally loaded `emotitone-design-system.css`. Global availability is not collection acceptance.

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| UI Colors | Glass rejected; remaining palette not reviewed | Mounted token reference | Variables are globally active; glassmorphism is an explicitly discarded cross-app treatment awaiting purge | Define the surviving UI palette without reopening glass; schedule the purge as scoped implementation work |
| Brand Colors | Not reviewed | Mounted token reference | Variables are globally active | Review against accepted brand units |
| Music Color Recipe | **Under review** | The current mounted specimen calls `services/musicColor`, but its linear swatch presentation is not accepted. Commit `b140654` silently replaced the original segmented wheel during Note/Key work; that visual change is recorded as drift, not a decision | Production color is currently calculated through `useColorSystem`/`services/musicColor`; octave still affects lightness and the result feeds Note, current keys, live strip, and visual renderers | At the later Music Color gate, start from the original wheel/octave presentation as preserved visual intent while reconciling it with the runtime resolver, CSS recipe, and movable/fixed semantics; do not restore duplicate color logic |
| Spacing + Radius | Not reviewed | Mounted token reference | Variables are globally active | Define scale and radius contract |
| Spacing Scale | Not reviewed | Mounted token reference | Variables are globally active | Define scale contract |
| Typography | Not reviewed | Mounted token reference | Variables are globally active; accepted Note typography constrains its consumer, not this whole collection | Review the collection without regressing Note identity ranks |
| Motion | Not reviewed | Mounted token reference | Variables are globally active; accepted Note `sounding` motion consumes them. Known review defect: Reduce Motion replaces distinct demos with `opacity-blink`; disabling macOS Reduce Motion only masked that fallback | Define collection/consumer semantics and replace the misleading blinking fallback with a static or explicit preview treatment |
| Geometry | Not reviewed | Mounted token reference | Variables are globally active; the mirrored offcut token is an accepted Note-level correction, not acceptance of the whole collection | Review the complete geometry vocabulary |

### Primitives

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Sticker | **Accepted** | `components/primatives/Sticker.vue` is authoritative; mounted specimen imports it | No production consumer found outside the guide/tests | Maintain parity; integrate only through a defined consumer |
| Bar Tape | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `PatternCard`; no production consumer found | Interview before formalization/integration |
| Beat Indicator | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Buttons (`IconButton`) | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `PatternCard`; production uses a separate `components/ui/IconButton.vue` | Interview and reconcile the parallel button sources |
| Card | Not reviewed | Reference `CardShell` source exists; mounted specimen imports it | No production consumer found | Interview |
| Note | **Accepted** | `components/primatives/Note.vue` is authoritative; mounted specimen imports it | Consumed by accepted Key and now used by production Keyboard; its five accepted geometry recipes are only partly tokenized; later CodeStrip use remains undefined | Promote the five accepted geometry recipes into coherent named tokens, maintain parity through Keyboard, and define other consumers separately |
| Kicker | Not reviewed | Reference source exists; mounted specimen imports it | Feeds reference `SpineCard`; no production consumer found | Interview |
| Knob — Analog | **Accepted** | `components/primatives/Knob.vue` is the authoritative Ring/Arc visual face; the mounted Analog specimen drives the real production Knob family | Production `components/knobs/Knob.vue` remains gesture, value, haptic, API, density, label, and hold-motion authority; role components consume the shared face | Maintain parity through production consumers; change behavior only in a separately scoped slice |
| Knob — Digital | **Accepted** | The same authoritative visual face owns Arc; the mounted Digital specimen drives real Range, full-circle Boolean, real Options, and full-circle state-driven Button controls | Production consumes Arc by default for backward visual compatibility; `visual` and semantic `tone` remain per-consumer, non-persisted choices and explicit/per-option colors retain precedence | Maintain parity; do not restore the rejected layered/perpetual Button or partial Boolean drift |
| Marks | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Spine Card | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Kicker; no production consumer found | Define after or with Kicker |
| Tabs (`ChipTabs`) | Not reviewed | Reference source exists; mounted specimen imports it | Production uses a separate `components/ui/Tabs*` family | Interview and reconcile the parallel tab sources |

### Uniques

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Brand Cover | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| Brand Logo | Not reviewed | Reference source exists; mounted specimen imports it | No production consumer found | Interview |
| CodeStrip | **Undefined** | Reference source exists; mounted display is not acceptance | Feeds reference `PatternCard`; the current production strip and its action buttons/bar have not been assigned their final component boundary | Begin the next fresh grilling session here: define the CodeStrip visually and settle its relationship to the action buttons/bar before composition work |
| Drawer | **Undefined** | Mounted reference currently demonstrates `DrawerShell`, not an accepted Drawer definition | `DrawerShell` is used by production `TopDrawer`; current `DrawerKeyboard` hosts Keyboard, pattern/live content, action bar, chrome, and motion without an accepted Drawer contract | Interview Drawer after CodeStrip + action bar; preserve behavior while settling the boundary |

### Compounds

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Key | **Accepted** | `components/compounds/Key.vue` is authoritative; mounted `CompoundKey.vue` imports it | Composes Note and replaces the removed legacy `KeyboardKey` inside production Keyboard; Keyboard keeps routing/config/audio concerns and will assign whole tokenized Note geometry variants | Maintain parity while the five geometry recipes are tokenized and Keyboard is grilled |
| Keyboard | **Under review** | `components/compounds/Keyboard.vue` is the single production component and formalization source; mounted `CompoundKeyboard.vue` merely drives that same source with explicit inert `usage="controlled"`; production uses its default mode directly | Composes accepted Keys, authored daily-edition tokens, grouped accessibility and roving focus while housing current production routing in the compound; exact visual density and deferred production lifecycle/config debt remain unaccepted | Burooj inspects the production component through the matrix; accept or adjust exact values before production correctness integration |
| Pattern Card | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Bar Tape, IconButton, and CodeStrip; production has a separate `components/patterns/PatternCard.vue` | Interview and reconcile the parallel component |
| Pattern Reel | Not reviewed | Reference source exists; mounted specimen imports it | Consumes reference Pattern Card; no production consumer found | Define after Pattern Card |

### Compositions

| Unit | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- |
| Loading Screen | Not reviewed | Reference source exists; mounted specimen imports it | Production `LoadingSplash` already consumes it; this pre-acceptance use is not formalization | Interview against the live loading flow |

## Anticipated architecture not mounted by the guide

| Unit | Layer | Definition | Source/specimen truth | Current production/dependencies | Next gate |
| --- | --- | --- | --- | --- | --- |
| DrawerKeyboard | Composition | Relationship accepted; definition pending | No composition source or specimen accepted; the current production file is mixed-responsibility implementation evidence only | Will arrange the defined CodeStrip + action bar, production Keyboard, and defined Drawer; the later rework must turn `DrawerKeyboard.vue` into that composition rather than create parallel production components | Define CodeStrip + action bar and Drawer first; keep Keyboard as the one production Keyboard component |

## Dependency map

```text
Global tokens / Music Color Recipe
                `-> Note -> Key -> Keyboard
                       `-> CodeStrip (only after CodeStrip is defined)

CodeStrip + action bar + Keyboard + Drawer -> future DrawerKeyboard composition

Reference-only chains:
Kicker -> Spine Card
Bar Tape + IconButton + CodeStrip -> Pattern Card -> Pattern Reel
DrawerShell -> Drawer specimen and production TopDrawer
Loading Screen -> production LoadingSplash
```

## Config, state, and behavior handholds

- `keyboard.primaryLabel` (`syllable | degree | raw`) exists in visual config metadata/store and production Keyboard now feeds it through Key to the main-octave Note; outer rows retain raw pitch as their single identity.
- The legacy user-facing `keyboard.keyGaps` (`none | small | medium`) control is rejected. Keyboard will own one stable design-system spacing recipe across families and reloads; choose its exact value during the full specimen matrix at the narrowest supported row width and larger sizes.
- Note geometry (`standard | tile | offcut | tab | pill`) and responsive proportion (`tall | medium | stocky | wide`) are independent axes, not a persisted config surface. Existing `keyboard.keyShape` is only border radius.
- The five accepted Note/Key geometry variants must become coherent named token recipes covering their clip, radius, and shadow relationship. The user's local calendar date selects one shared family for the whole Keyboard from a deterministic shuffled five-day deck: every family appears once per block, adjacent block boundaries cannot repeat a family, and an open Keyboard never changes at midnight. Each full page load generates fresh, coherent per-Key combinations of family-specific cut-contour tokens and subtle rotation and shadow-offset tokens within that day's family. The visible non-interactive paper faces may overlap their gaps or neighbouring cells slightly, while their separate rectangular hitboxes retain an otherwise stable grid across families and reloads. Every 12-pitch row divides the available width and remains completely visible: there is no horizontal scrolling, pitch removal, or fixed 44px minimum width. Resting faces receive a page-load-stable shuffled layer order; a physically pressed Key rises above resting neighbours, while sounding alone does not change its layer. The randomizer must not mix families within a load, independently mix Sticker geometry pools, or invent runtime polygons.
- Note owns reusable musical presentation and its externally supplied `sounding` state. Key owns only its native button, focus, momentary mouse/touch press lifecycle, and externally supplied physical `pressed`; it emits local input identity without owning sound or routing.
- Key's physical `pressed` and Note's musical `sounding` are independent. Existing production routing remains behavior to preserve during visual migration. Source-aware cross-key coordination, glissando, centralized MIDI boundaries, and revised haptic behavior are separately parked functionality ideas, not requirements of Keyboard visual acceptance.
- Note supports `colored` and `monochrome`. Production Keyboard currently maps legacy glassmorphism to `colored`, but the cross-app decision rejects glassmorphism entirely; purge the obsolete persisted/config option rather than treating that bridge as accepted behavior.
- Movable/fixed music-color config is already persisted and used by production JavaScript. Do not replace that behavior until the Music Color Recipe review establishes one authority.

## Accepted Knob visual definition — 2026-08-26

The Analog/Digital Knob question frontier is closed. Burooj explicitly agreed to the shared-understanding summary in the active BJS-35 T3/Codex session. This accepts the visual definition only; the current shared primitive and specimens remain reference implementations until a separate focused slice formalizes them and migrates the treatment into production.

- **Production-led contract:** the existing production `components/knobs` family remains authority for footprint and density, bottom-label relationship, range/boolean/options/button role grammar, live value and option calculations, tap and vertical-drag behavior, horizontal-scroll discrimination, haptics, disabled/display behavior, backward-compatible events, consumer APIs, and microanimations. Formalization must not replace these with the current specimen's hard-coded sweeps, segments, or perpetual demo motion.
- **Family topology:** Analog Ring and Digital Arc both survive as visual treatments of one Knob family. They are not separate control UXs and do not create a new persisted user preference. A production consumer selects the treatment appropriate to its context.
- **Anatomy boundary:** the style-guide tile, top label, sublabel, divider, and footer are gallery scaffolding, not production Knob anatomy. Production's compact control and bottom label relationship remain the composition reference.
- **Tone semantics:** `brass | ivory` is a semantic per-Knob treatment chosen by the consumer, not a universal mapping of brass to active state. A particular Knob may be brass while another is ivory; that Knob's rest, value, active, disabled, loading, and played states remain expressed within its assigned treatment.
- **Role grammar:** preserve the production distinction between continuous Range, discrete Options, Boolean, and Button. Range retains the 270-degree value sweep. Options retains its full-circle track, real option-count/current-position grammar, center label, and continuous wraparound rotation. Boolean uses a full-circle track while retaining the production center-ball/icon and elastic state behavior. Button uses the production-consistent full-circle track, center icon/text, and state-driven active/loading motion.
- **Rejected Digital drift:** the mounted fourth Digital Button's layered half-rings, center ball, and perpetual decorative presentation are inconsistent with production and rejected. The mounted Boolean's partial/open track is also rejected; its accepted base is a full circle. Static role examples must be driven by real production values and states rather than fixed ornamental marks.
- **Motion preservation:** the tactile production feel is accepted evidence, not a redesign target. A live hold sampled during grilling overshot to about `1.20x` at 80ms, settled at `1.15x`, released through about `0.94x`, and returned to `1x`; existing range easing, Boolean elastic ball, Options rotation, Button state motion, gesture discrimination, and haptics remain preservation constraints.
- **Implementation boundary:** accessibility/API defects or behavior ideas discovered during the audit require separate diagnosis and regression slices. They are not part of Knob visual formalization and must not hitchhike into it.

### Knob formalization and integration receipt — `c14c8d0`

- `components/primatives/Knob.vue` now owns both accepted visual treatments and all role track geometry. `components/knobs/KnobCircles.vue` is a thin production adapter to that source; Range, Boolean, Options, and Button retain their production value/content/state components, while `components/knobs/Knob.vue` retains all gesture, event, haptic, density, label, and wrapper-scale behavior.
- Analog and Digital specimens import the production Knob family and drive actual range values, Boolean states, real three/four-item options, and active/loading Button states. Gallery cells and captions remain outside the component anatomy.
- Focused verification passes 12/12 tests across `Knob.test.ts` and `KnobVisual.test.ts`; `bun run type-check` passes; `bun run build` passes with the pre-existing Strudel `eval`, mixed static/dynamic import, and bundle-size warnings.
- T3 live DOM/motion QA found nine production compact controls at 42px face width and 18 mounted specimen controls covering Ring/Arc, brass/ivory, all four roles, and active/off/loading states. Live specimen interaction proved Boolean full-circle activation and elastic ball scale, Options label/segment advancement (`SQ` to `SAW`), Button segment hidden while idle and rotating only while active, and the existing held-wrapper elastic scale. T3 snapshot and recording both failed, so this receipt claims no pixel screenshot artifact; DOM geometry, computed styles, GSAP state, and live interaction were inspected directly.

## Active Keyboard interview — current truth

Keyboard's exact visual definition remains **Under review**, not accepted; `Keyboard.vue` itself is already the production component. Explicit answers through Q67 are recorded in the `BJS-35` Cockpit Thread, and the production compound plus inspection workbench are implemented at `3e4690d`, `ebb0014`, `8038665`, and `a301139`; this section is the cross-session orientation spine, not a second chronological transcript.

### Accepted visual intent and separately parked behavior

Only the visual and state-presentation statements below govern this design-system migration. Items explicitly marked **Parked behavior** capture ideas discussed during grilling for possible later product work; they do not block visual acceptance and do not authorize implementation in a component-formalization slice.

- **Boundary and layout:** Keyboard is the bare instrument grid; its parent owns shell, section framing, and resizing. The main octave retains the strongest hierarchy, and the user-facing requested row counts are exactly 1, 3, 5, and 7, centered around it when the supported octave range permits. Unavailable rows clip at octaves 1/8 rather than restricting `mainOctave`, so edge cases may display fewer—and an even number of—actual rows. Every 12-pitch row divides the available width without scrolling, pitch removal, or a fixed minimum width. The accepted support matrix begins at 320 CSS px of Keyboard content width, with roughly 24–27px-wide Keys and a provisional 44px minimum height. Daily visual editions never move the underlying target grid.
- **Geometry:** the five accepted Note/Key families become coherent named token recipes. Local date selects one family through the deterministic shuffled five-day deck; each page load creates bounded per-Key cut, rotation, shadow, and layer variation inside that family. Cut, rotation, shadow, and overlap amplitudes scale down with Key width so narrow Keys retain legible, trustworthy boundaries. Slight face overlap is visual only; physically pressed Keys rise above the edition-stable resting order.
- **Parked behavior — pointer and source coordination:** a possible later capability is seamless cross-key glissando with source-aware pointer ownership, interpolation, concurrent contacts, retrigger rules, and centralized MIDI/haptic coordination. None of that exists as a requirement of the current visual migration. `BJS-371` holds glissando as a later issue.
- **Parked behavior — literal keyboard:** the proposed visible-row QWERTY mapping, roving focus, arrow/Home/End navigation, Space/Enter lifecycle, modifier bypass, and single-fire Backspace behavior are separate product/accessibility work. Preserve current production behavior during visual migration.
- **Parked behavior — remapping safety:** proposed source cancellation across `mainOctave`, `rowCount`, or visibility changes belongs with later input-lifecycle work, not visual acceptance.
- **Labels and color:** `showLabels` remains a user preference and never removes accessible names. The accepted main/outer label hierarchy applies when labels are visible; narrow Keys retain that content and scale the typography rather than silently abbreviating or hiding it. `colored | monochrome` remains a Keyboard presentation preference. Music color and labels remain deterministic; Keyboard consumes the separately gated Music Color Recipe rather than owning brightness, saturation, or gradient controls.
- **Parked behavior — accessibility:** proposed collection semantics, focus announcements, sounding announcements, and remap focus recovery remain separate accessibility work. Visual migration must preserve current operability and may not claim these proposals are already implemented.
- **Rejected configuration:** purge glassmorphism across the app and remove the obsolete `angledStyle`, `keyShape`, `keyGaps`, height-only `keySize`, `isEnabled`, `keyBrightness`, `keySaturation`, and unused `gradientDirection` Keyboard controls. Exact stable spacing is chosen during the complete specimen pass rather than exposed as a preference.

### Current production behavior and separate behavior gaps

- Production is not presently resizable; its old `keySize` changes height only. Drawer/composition resizing is a later gate, while Keyboard must merely respond to the space it receives.
- The generic config can request even `rowCount` values although the accepted visual control values are exactly 1, 3, 5, and 7. Near octave 1 or 8, current rendering filters unavailable candidates and returns fewer rows, which is accepted visual behavior. Current QWERTY routing remains current functionality; the proposed visible-row routing is parked.
- Current centered horizontal overflow can strand leading Keys on narrow viewports, contradicting the accepted always-fit visual row. Native Tab, Space/Enter, modified-key, and held-Backspace behavior remain current functionality until separately scoped product/accessibility work changes them.
- Cross-Key glissando is absent for both mouse/pointer and touch. This is the current baseline, not a visual regression and not a defect blocking Keyboard acceptance. Adding it later is tracked in `BJS-371`.

### Active frontier — write answers here before advancing

- **Grilling concluded:** the audited Keyboard interview has no remaining user decision, and Burooj explicitly confirmed this current-truth summary as the shared understanding on 2026-08-25. The original session authority allowed edits only to this tracker, so no component or specimen implementation was authorized.

### Next Keyboard gate — visual specimen acceptance

- The production Keyboard is implemented and mounted directly in the style guide through the controllable workbench. Inspection starts from current spacing, 88px/56px row heights, proportions, and inset as a **baseline**, not automatic design authority.
- Compare content widths 320, 390, 768, and 960px; requested rows 1/3/5/7 including `mainOctave` 1/8 clipping; all five daily geometry families; labels on/off and every primary label; colored/monochrome; resting, focused, pressed, sounding, and combined states; Reduced Motion; and forced colors.
- Use that inspection to choose the exact stable gap, main/outer row proportions, outer inset, narrow typography, overlap, and responsive variation amplitudes. The specimen must be controllable without mutating persisted app state or producing real audio.
- Verification receipt: typecheck passes; the six affected test files pass 26/26; production build passes with existing bundle/dynamic-import warnings. The repository-wide Vitest run has 13 failures in untouched utility/integration areas and no failure in the affected Keyboard/Key/Note/specimen files. Browser DOM checks proved 12-column containment at 320/960px and state previews, but T3 screenshot capture failed; no pixel artifact or visual acceptance is claimed.
- Keyboard remains **Under review** until Burooj visually accepts this matrix. Only then mark the definition Accepted and authorize a separate focused production-integration/correctness slice.

### Separate behavior backlog — outside visual migration

- Review the momentary Key `aria-pressed` semantics as a separately scoped accessibility issue; it does not reopen Key's accepted visuals.
- Glissando, revised literal-keyboard routing, roving focus, source-aware coordination, remap cancellation, teardown, and pending-attack cancellation require separate product decisions and implementation receipts. They are not correctness obligations of the visual-system migration.
- Visual migration cleanup may purge rejected visual configuration, including remaining glass opacity and Keyboard-owned padding/framing, while preserving the currently working product behavior. A controllable style-guide specimen must not mutate persisted app state or produce real audio.

#### Deferred glissando evidence — 2026-08-25

- A production drag from main-octave Do across Re failed twice with the deterministic result `expected attacks [Do, Re], observed [Do]`. Directly clicking Re produced `[Re]`, ruling out Re's hitbox, audio path, and recording path.
- This is longstanding missing behavior, not a visual regression: `Key.vue` starts and ends only local mouse/touch contacts, while `Keyboard.vue` forwards those local events without pointer ownership, cross-Key hit-testing, or interpolation. Leaving Do releases it; entering Re during the same held contact never attacks Re.
- If glissando is added later, the coherent implementation seam is Keyboard-level source/pointer coordination, with Key remaining the local interactive face. That future slice should carry its own compound regression coverage and an end-to-end production drag smoke. `BJS-371` is deferred rather than ready for execution.

### Explicitly deferred from Keyboard

- Drawer chrome, resize controls, focus return to its opener, and the host condition that makes Keyboard active.
- CodeStrip migration, its action buttons/bar, and the visual Backspace control's composition; Keyboard owns only the accepted shared undo intent. These are grilled next in a fresh CodeStrip session before Drawer and the final DrawerKeyboard composition.
- Music Color Recipe internals, the app-wide haptic settings surface, and execution of the wider glassmorphism purge.

Replace resolved frontier entries with the accepted truth and add the newly unblocked frontier in the same edit; do not leave the working interview only in chat or Linear.

## Current gate order

1. Maintain the closed Note and Key gates through the single production `Keyboard.vue`; keep Keyboard Under review until its visual matrix is explicitly accepted. Preserve current behavior; glissando remains a later issue rather than part of this migration.
2. Maintain the formalized Analog/Digital Knob family at `c14c8d0`; preserve the production behavior authority and keep treatment selection per-consumer and non-persisted.
3. In a fresh session, visually grill CodeStrip and settle the component boundary and relationship of CodeStrip + action buttons/bar before migrating either surface.
4. Grill Drawer as its own unique.
5. Rework `DrawerKeyboard.vue` as the composition of the defined CodeStrip + action bar, production Keyboard, and defined Drawer.
6. At the independent Music Color gate, recover the original wheel/octave visual intent while keeping the production runtime resolver as the calculation source; settle the recipe before changing production color behavior.
7. Continue the remaining mounted reference units one accepted definition at a time.

For every unit, the normal gate is: **accept definition -> formalize source -> make the specimen import that source -> integrate into a defined consumer (or explicitly recorded provisional adapter) -> verify config/music dependencies and live app/guide behavior -> update this checkpoint -> commit and PR as a focused slice**.
