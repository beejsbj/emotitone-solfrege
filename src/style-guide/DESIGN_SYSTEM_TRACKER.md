# Design System Tracker

Current-truth map for design-unit review and integration. A mounted specimen or a source file is reference material until its definition is explicitly accepted.

## Why this exists

This is the cross-session handhold for the design interview. It exists to stop context-heavy grilling and implementation sessions from blurring four different claims: **defined**, **formalized as a source component**, **shown through a real specimen**, and **adopted in production**. None implies the next.

The style guide is an **interview checklist**, not an accepted design system. `/Users/burooj/BJsWorkspace/Projects/emotitone-design-system` is reference-only inspiration used to recover omissions; it is not automatic extraction authority. An agent recommendation is not a decision until Burooj explicitly accepts it.

Truth has three distinct homes: Linear `BJS-35` holds workflow/next-actor state and receipts; this file holds current per-unit design truth; `DESIGN_LOG.md` holds chronological decision evidence. Reconcile them when they disagree rather than picking whichever one is most convenient.

Use this file to resume the workflow without reconstructing it from chat:

- Read the current checkpoint, active unit row, dependencies, and next gate before asking questions or editing.
- Inspect the current app behavior before inventing states, props, or architectural needs for Burooj to judge.
- Grill only the unresolved visual/interaction definition of the active unit. Do not reopen accepted upstream units unless a defect or an explicit new decision requires it.
- Record explicit acceptance before formalization, with an exact receipt pointer in this file or `DESIGN_LOG.md` (session/turn, Linear comment, or commit). Keep implementation as a separate, focused slice, then update source/specimen/integration truth independently.
- Production adoption is the goal, piece by piece. Normally integrate into an already-defined consumer. If an accepted unit must pass through an undefined consumer, name that code a **provisional adapter**, preserve existing behavior, record every bridge decision, and keep the consumer's definition unaccepted.
- End every session with the exact branch/worktree state, verification evidence, unresolved gate, and next frontier reflected here. A spoken "done" is not a handoff.

## Current checkpoint — 2026-08-25

- **Closed and authoritative:** Sticker, Note, and Key definitions. Their source components and real specimens are formalized.
- **Coalescence complete:** `57bc6dd` merges the accepted Key stack at `1df13bc` into `implementing-design-system`. The legacy `KeyboardKey.vue` is removed, the production Keyboard renders the accepted Note through the accepted Key, and `DrawerKeyboard.vue` remains its thin current host.
- **Trusted refs:** draft PR #27 / `origin/implementing-design-system` remains at `85c63fd`; the local `implementing-design-system` branch is ahead and out of the merge. Recompute the live ahead count at handoff instead of trusting a number embedded in this committed file. `.claude-continue.sh` has an unrelated pre-existing modification.
- **Definition boundary:** `components/compounds/Keyboard.vue` is now the single production Keyboard component. Commits `3e4690d`, `ebb0014`, `8038665`, and architecture correction `a301139` house production wiring in that compound and let the style-guide workbench drive the same component safely through inert `usage="controlled"`. Grilling and shared intent are concluded; only the exact visual density remains Under review. This does not accept the production baseline values or complete the deferred production correctness/config migration. Drawer remains undefined.
- **Accepted cross-app constraint:** glassmorphism is discarded and must be purged across the app. It is not a live Keyboard or Drawer option, an acceptable fallback, or an open design question. The current persisted setting and its silent mapping to `colored` are obsolete implementation debt.
- **Accepted tokenization follow-up:** promote all five accepted Note/Key geometry variants (`standard`, `tile`, `offcut`, `tab`, `pill`) into coherent named token recipes before Keyboard randomization consumes them. This formalizes already-accepted geometry; it does not reopen the variants or authorize new cuts.
- **Active gate:** Burooj visually inspects the Keyboard workbench at the agreed matrix and settles exact spacing, row proportions, inset, narrow typography, overlap, and variation amplitude. Keep Keyboard **Under review** until that acceptance; then reconcile the tracker before the separate production correctness/config slice.
- **Following frontier:** begin a fresh session with the visual grilling of CodeStrip, including the boundary and visual relationship of its action buttons/bar. Grill Drawer separately afterward. Only once CodeStrip + action bar, Keyboard, and Drawer are each defined should the current `DrawerKeyboard.vue` be reworked as their composition. Do not re-grill Note or Key. Music Color retains an independent later gate.
- **Recovered Music Color drift:** the original mounted specimen was a segmented chromatic wheel with fixed/movable, root, octave, scale-count, and hue-sweep controls. During the unrelated Note/Key migration on 2026-08-18, commit `b140654` replaced it wholesale with the current linear swatch specimen so the guide would call the production `services/musicColor` resolver instead of maintaining duplicate demonstration logic. Consolidating the calculation authority did not constitute acceptance of the new visual presentation; Burooj was not grilled on removing the wheel. Treat the swatch-strip replacement as unaccepted drift. The octave model was not removed: the current specimen still exposes octaves 2–8 and passes octave into the runtime lightness calculation.

## Status legend

- **Accepted:** the interview definition is settled.
- **Under review:** the interview is active and the definition is not settled.
- **Taxonomy only:** its architectural layer/relationship is agreed, but its definition is not.
- **Reference source:** code exists so the style guide can show the idea; it is not yet authoritative.
- **Authoritative source:** the accepted component owns the design and the style-guide specimen imports it.
- **Production use (pre-acceptance):** current app code uses the source, but that does not make its design accepted.

## Mechanical summary

| Scope | Tokens | Primitives | Uniques | Compounds | Compositions | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mounted by `StyleGuide.vue` | 8 | 12 | 4 | 4 | 1 | **29** |
| Accepted definitions among mounted units | 0 | 2 | 0 | 1 | 0 | **3** |
| Authoritative source + real specimen | 0 | 2 | 0 | 1 | 0 | **3** |
| Mounted reference/pending units | 8 | 10 | 4 | 3 | 1 | **26** |

One additional architecture unit is tracked but not mounted: the future **DrawerKeyboard composition** of CodeStrip + action bar, Keyboard, and Drawer. Across all 30 tracked units, 3 definitions are accepted and formalized (`Sticker`, `Note`, and `Key`), and 27 still need a definition gate. The mounted Keyboard is a production-integrated reference, not an accepted definition. `Music Color Recipe` is a separately flagged token review, not authority to interrupt the current unit order.

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
| Knob — Analog | Not reviewed | Reference source exists; mounted specimen imports shared primitive `Knob.vue` | Production uses the separate `components/knobs` family | Interview and reconcile ownership |
| Knob — Digital | Not reviewed | Reference source exists; mounted specimen imports shared primitive `Knob.vue` | Production uses the separate `components/knobs` family | Interview and reconcile ownership |
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
- Key's physical `pressed` and Note's musical `sounding` are independent. Keyboard coordinates source-aware cross-key input and app adapters without moving those responsibilities into Key or Note. Optional haptics apply only to direct on-screen pointer/touch presses; the preference's owning settings surface and the centralized MIDI adapter boundary remain on the active Keyboard frontier below.
- Note supports `colored` and `monochrome`. Production Keyboard currently maps legacy glassmorphism to `colored`, but the cross-app decision rejects glassmorphism entirely; purge the obsolete persisted/config option rather than treating that bridge as accepted behavior.
- Movable/fixed music-color config is already persisted and used by production JavaScript. Do not replace that behavior until the Music Color Recipe review establishes one authority.

## Active Keyboard interview — current truth

Keyboard's exact visual definition remains **Under review**, not accepted; `Keyboard.vue` itself is already the production component. Explicit answers through Q67 are recorded in the `BJS-35` Cockpit Thread, and the production compound plus inspection workbench are implemented at `3e4690d`, `ebb0014`, `8038665`, and `a301139`; this section is the cross-session orientation spine, not a second chronological transcript.

### Accepted intent through the current frontier

- **Boundary and layout:** Keyboard is the bare instrument grid; its parent owns shell, section framing, and resizing. The main octave retains the strongest hierarchy, and the user-facing requested row counts are exactly 1, 3, 5, and 7, centered around it when the supported octave range permits. Unavailable rows clip at octaves 1/8 rather than restricting `mainOctave`, so edge cases may display fewer—and an even number of—actual rows. Every 12-pitch row divides the available width without scrolling, pitch removal, or a fixed minimum width. The accepted support matrix begins at 320 CSS px of Keyboard content width, with roughly 24–27px-wide Keys and a provisional 44px minimum height. Daily visual editions never move the underlying target grid.
- **Geometry:** the five accepted Note/Key families become coherent named token recipes. Local date selects one family through the deterministic shuffled five-day deck; each page load creates bounded per-Key cut, rotation, shadow, and layer variation inside that family. Cut, rotation, shadow, and overlap amplitudes scale down with Key width so narrow Keys retain legible, trustworthy boundaries. Slight face overlap is visual only; physically pressed Keys rise above the edition-stable resting order.
- **Pointer and source behavior:** cross-key drag is seamless glissando; each pointer owns one Key at a time, releases it on crossing or leaving Keyboard, attacks every crossed Key even during fast movement, and resumes from a re-entered Key before pointer-up. Concurrent pointers remain independent; all input sources use one source-aware press lifecycle. Keyboard owns spatial mapping and visible state but emits source-aware note intents to one centralized interaction/audio coordinator rather than owning audio note IDs. Each distinct human attack on an already-held pitch retriggers the shared pitch, while final release waits for the last holding source. Pointer, QWERTY, and MIDI produce both `pressed` and `sounding`; sequencer playback produces `sounding` only. Centralized MIDI continues app-wide sound outside visible rows, while Keyboard reflects only displayed pitches. Optional haptics fire only for direct on-screen pointer/touch presses and once per newly entered glissando Key; the preference belongs to app-wide interaction/accessibility settings and Keyboard only consumes it.
- **Literal keyboard:** routing is active only while the Keyboard/Drawer surface is active and follows visible octave rows. Mapping is anchored by octave relation: main uses the home row, plus one uses the top row, minus one uses the bottom row, farther visible octaves are pointer/MIDI only, and physical rows for clipped-away octaves remain unused. Keyboard exposes one roving focus stop: first Tab entry focuses the main-octave tonic, later entries remember the last focused Key while mounted, remount resets to the tonic, and pointer/touch use updates that memory without forcing keyboard-focus treatment. Physical Left/Right arrows move focus by semitone, Up/Down move to the same pitch class in an adjacent visible octave, Home/End move to the row endpoints, and focus never wraps; movement is silent. Space/Enter attack on keydown, release on keyup or focus/visibility loss, and suppress repeat. Ctrl/Alt/Meta-modified mapped keys bypass musical routing, while Shift plus a mapped letter remains playable. Physical Backspace invokes exactly one app-level undo per press, never repeats while held, and shares that action with the visual Backspace control in the toolbar to the right of CodeStrip.
- **Remapping safety:** changes to `mainOctave`, `rowCount`, or Keyboard visibility release and cancel Keyboard-owned pointer/QWERTY sources before applying the new mapping. Centralized MIDI and sequencer sources continue unaffected.
- **Labels and color:** `showLabels` remains a user preference and never removes accessible names. The accepted main/outer label hierarchy applies when labels are visible; narrow Keys retain that content and scale the typography rather than silently abbreviating or hiding it. `colored | monochrome` remains a Keyboard presentation preference. Music color and labels remain deterministic; Keyboard consumes the separately gated Music Color Recipe rather than owning brightness, saturation, or gradient controls.
- **Accessibility:** expose one named `Solfège keyboard` group with nested named main/outer octave-row groups; do not claim grid, toolbar, or application semantics. Every focused Key exposes syllable, scale degree, raw pitch, and relevant octave context independent of visible-label preferences, while QWERTY shortcuts remain separate metadata. Expose musical `sounding` only for the currently focused Key, with no Keyboard-wide MIDI/sequencer live region. If remapping removes a Key while focus is inside Keyboard, focus falls back to the new main-octave tonic; if focus is outside, only roving-focus memory resets.
- **Rejected configuration:** purge glassmorphism across the app and remove the obsolete `angledStyle`, `keyShape`, `keyGaps`, height-only `keySize`, `isEnabled`, `keyBrightness`, `keySaturation`, and unused `gradientDirection` Keyboard controls. Exact stable spacing is chosen during the complete specimen pass rather than exposed as a preference.

### Current evidence that must not be mistaken for accepted behavior

- Production is not presently resizable; its old `keySize` changes height only. Drawer/composition resizing is a later gate, while Keyboard must merely respond to the space it receives.
- The generic config can request even `rowCount` values although the accepted control values are exactly 1, 3, 5, and 7. Near octave 1 or 8, current rendering filters unavailable candidates and returns fewer rows, which is accepted behavior. Current QWERTY routing still targets main octave plus/minus one even when those rows are hidden, contradicting accepted visible-row routing.
- Current centered horizontal overflow can strand leading Keys on narrow viewports, contradicting the accepted always-fit row. Native Tab visits every Key, Space/Enter does not invoke the musical press/release contract, modified mapped keys still play, and held Backspace repeats Undo; all contradict accepted literal-keyboard behavior.
- Visual pressed state is partly source-aware, but current code still owns audio through parallel note-ID maps; pending attacks can outlive release or teardown, and current cross-Key touch glissando is absent. These are correctness debts under the accepted centralized, source-aware lifecycle, not new design options.

### Active frontier — write answers here before advancing

- **Grilling concluded:** the audited Keyboard interview has no remaining user decision, and Burooj explicitly confirmed this current-truth summary as the shared understanding on 2026-08-25. The original session authority allowed edits only to this tracker, so no component or specimen implementation was authorized.

### Next Keyboard gate — visual specimen acceptance

- The production Keyboard is implemented and mounted directly in the style guide through the controllable workbench. Inspection starts from current spacing, 88px/56px row heights, proportions, and inset as a **baseline**, not automatic design authority.
- Compare content widths 320, 390, 768, and 960px; requested rows 1/3/5/7 including `mainOctave` 1/8 clipping; all five daily geometry families; labels on/off and every primary label; colored/monochrome; resting, focused, pressed, sounding, and combined states; Reduced Motion; and forced colors.
- Use that inspection to choose the exact stable gap, main/outer row proportions, outer inset, narrow typography, overlap, and responsive variation amplitudes. The specimen must be controllable without mutating persisted app state or producing real audio.
- Verification receipt: typecheck passes; the six affected test files pass 26/26; production build passes with existing bundle/dynamic-import warnings. The repository-wide Vitest run has 13 failures in untouched utility/integration areas and no failure in the affected Keyboard/Key/Note/specimen files. Browser DOM checks proved 12-column containment at 320/960px and state previews, but T3 screenshot capture failed; no pixel artifact or visual acceptance is claimed.
- Keyboard remains **Under review** until Burooj visually accepts this matrix. Only then mark the definition Accepted and authorize a separate focused production-integration/correctness slice.

### Correctness obligations — not user questions

- Momentary Key interaction must not claim toggle-button semantics through `aria-pressed`; correct that accepted-Key defect without reopening its visual or ownership definition.
- Implement the already-accepted roving focus, literal-keyboard routing, source-aware coordinator, glissando interpolation, remap cancellation, teardown, and pending-attack cancellation as one coherent lifecycle rather than parallel local/global note maps.
- Purge rejected Keyboard configuration and migrations, including remaining glass opacity and Keyboard-owned padding/framing. A controllable style-guide specimen must not mutate persisted app state or produce real audio.

### Explicitly deferred from Keyboard

- Drawer chrome, resize controls, focus return to its opener, and the host condition that makes Keyboard active.
- CodeStrip migration, its action buttons/bar, and the visual Backspace control's composition; Keyboard owns only the accepted shared undo intent. These are grilled next in a fresh CodeStrip session before Drawer and the final DrawerKeyboard composition.
- Music Color Recipe internals, the app-wide haptic settings surface, and execution of the wider glassmorphism purge.

Replace resolved frontier entries with the accepted truth and add the newly unblocked frontier in the same edit; do not leave the working interview only in chat or Linear.

## Current gate order

1. Maintain the closed Note and Key gates through the single production `Keyboard.vue`; keep Keyboard Under review until its visual matrix is explicitly accepted.
2. In a fresh session, visually grill CodeStrip and settle the component boundary and relationship of CodeStrip + action buttons/bar before migrating either surface.
3. Grill Drawer as its own unique.
4. Rework `DrawerKeyboard.vue` as the composition of the defined CodeStrip + action bar, production Keyboard, and defined Drawer.
5. At the independent Music Color gate, recover the original wheel/octave visual intent while keeping the production runtime resolver as the calculation source; settle the recipe before changing production color behavior.
6. Continue the remaining mounted reference units one accepted definition at a time.

For every unit, the normal gate is: **accept definition -> formalize source -> make the specimen import that source -> integrate into a defined consumer (or explicitly recorded provisional adapter) -> verify config/music dependencies and live app/guide behavior -> update this checkpoint -> commit and PR as a focused slice**.
