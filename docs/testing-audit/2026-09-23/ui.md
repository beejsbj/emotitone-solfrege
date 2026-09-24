# UI test-value audit — 2026-09-23

**Scope:** 57 files, 507 passing runtime cases in the supplied manifest. I read the assigned test assertions and relevant production seams; I did not run tests, a build, a browser, or mutation probes. Counts below are from the prior passing run. `it.each` declarations expand into multiple runtime cases.

**Judgment:** The large UI lane mostly earns its size. Keyboard contact ownership, accessibility, CodeStrip evaluation races, Drawer allocation, and pattern lifecycle cover distinct failures. Four cases claim behavior using only source strings and merit observable replacements; four other source cases intentionally protect architecture and should be retained with narrower claims or titles. **Defensible deletion now: 0 cases.** The four replacement targets are touched cases, not a projected net reduction.

**Cross-review receipt:** An independent audio-state challenge and root reconciliation confirmed App bootstrap, lazy entry graph, named popup retirement, and Chord guide lineage as structural contracts. The accepted [fifteen-destination Tabs fixture](../../../src/style-guide/DESIGN_LOG.md#L154) remains a real behavior target. No production extraction or new guide motion test is proposed solely to change test form.

## Per-file inventory

| Test file | Cases | Disposition | Judgment / finding |
| --- | ---: | --- | --- |
| [BarTape.test.ts](../../../src/__tests__/components/BarTape.test.ts) | 4 | replace | Primitive mount checks segment order, colors, 50 ms floor; source checks guard the single production/guide seam, but onset ordering is only a regex. UI-02 |
| [App.test.ts](../../../src/__tests__/components/core/App.test.ts) | 6 | keep | MainApp shell/loading/tooltip are mounted. Three source checks protect intentional entry-routing, persistence-exclusion, and retired-popup architecture; their guarantees are structural and should be stated narrowly. UI-03, UI-07, UI-08 |
| [AudioInitializer.test.ts](../../../src/__tests__/components/core/AudioInitializer.test.ts) | 6 | keep | Prompt visibility, successful and failed initialization, in-flight disablement cover separate asynchronous states. — |
| [Chord.test.ts](../../../src/__tests__/components/keyboard/Chord.test.ts) | 7 | keep | Chord display, geometry, progress, order, and semantics are mounted; the final raw-source case protects guide adoption and presentation-only motion ownership, but its title should say structural rather than mounted. UI-05 |
| [ChordKey.test.ts](../../../src/__tests__/components/keyboard/ChordKey.test.ts) | 9 | keep | Native button, independent contact owners, cancellation, click pulse and duplicate-event prevention have event-level assertions. — |
| [CodeStripBar.test.ts](../../../src/__tests__/components/keyboard/CodeStripBar.test.ts) | 5 | keep | Compound anatomy, Stop semantics, transport emits and dense CodeStrip props are mounted; CSS source checks encode accepted rail material. — |
| [CodeStripNote.test.ts](../../../src/__tests__/components/keyboard/CodeStripNote.test.ts) | 10 | keep | Note/Chord composition, exact pitch coloring, rest/duration ratios, density and scroll surface exercise rendered output. — |
| [ControlBar.test.ts](../../../src/__tests__/components/keyboard/ControlBar.test.ts) | 6 | keep | Controlled Knob/Joystick props and emitted changes establish assembly contract; equal-width and rate options add distinct checks. — |
| [ControlBarHaptics.test.ts](../../../src/__tests__/components/keyboard/ControlBarHaptics.test.ts) | 1 | keep | Real Knob and Joystick input under haptic=false proves intent remains live while haptic calls are suppressed. — |
| [HummingCaptureTransport.test.ts](../../../src/__tests__/components/keyboard/HummingCaptureTransport.test.ts) | 7 | keep | Recording/request/error/selection controls and emitted actions are observed in the rendered transport. — |
| [Joystick.test.ts](../../../src/__tests__/components/keyboard/Joystick.test.ts) | 18 | keep | Octant mapping, pointer capture/latch/cancel, keyboard use and visual treatments cover distinct stick behavior. — |
| [joystickEdition.test.ts](../../../src/__tests__/components/keyboard/joystickEdition.test.ts) | 3 | keep | Edition rotation, storage fallback and persistence-failure behavior have direct deterministic assertions. — |
| [Key.test.ts](../../../src/__tests__/components/keyboard/Key.test.ts) | 13 | keep | Native Key, touch owners, blur/visibility/disable cleanup and Note prop forwarding are exercised; source CSS checks document target and focus constraints. — |
| [Keyboard.test.ts](../../../src/__tests__/components/keyboard/Keyboard.test.ts) | 31 | keep | Production/controlled rows, chord snapshots, focus/key ownership, warming lock and fast glissando geometry cover nontrivial regressions. — |
| [keyboardAccessibility.test.ts](../../../src/__tests__/components/keyboard/keyboardAccessibility.test.ts) | 2 | keep | One-based scale degree and accidental/octave speech normalization have direct output checks. — |
| [KeyboardCompound.test.ts](../../../src/__tests__/components/keyboard/KeyboardCompound.test.ts) | 14 | keep | Roving focus, scale cardinality, chord identity, keyboard activation and held-input release are mounted through compound. — |
| [KeyboardControlledIsolation.test.ts](../../../src/__tests__/components/keyboard/KeyboardControlledIsolation.test.ts) | 1 | keep | Injected resolver test catches accidental use of persisted color composable in controlled Keyboard. — |
| [keyboardEdition.test.ts](../../../src/__tests__/components/keyboard/keyboardEdition.test.ts) | 5 | keep | Daily family cycling, adjacent variants, token identity and octave bounds are direct helper contracts. — |
| [keyboardSizing.test.ts](../../../src/__tests__/components/keyboard/keyboardSizing.test.ts) | 6 | keep | Row height, hysteresis, boundaries and saturation protect the Drawer-to-Keyboard sizing algorithm. — |
| [KeyboardSpecimen.test.ts](../../../src/__tests__/components/keyboard/KeyboardSpecimen.test.ts) | 2 | replace | First source case protects isolation/import architecture; second merely finds matrix strings without driving controls. UI-04 |
| [Note.test.ts](../../../src/__tests__/components/keyboard/Note.test.ts) | 14 | keep | Exact pitch, rank/accidental labels, geometry proportions and noninteractive Note states are mounted; CSS source assertions protect authored typography. — |
| [PerformanceDeckActions.test.ts](../../../src/__tests__/components/keyboard/PerformanceDeckActions.test.ts) | 14 | keep | Production adapter sequencing, warming, store mutations, drawer rows and haptic boundary are observed via emits/mocks. — |
| [PerformanceDeckControlled.test.ts](../../../src/__tests__/components/keyboard/PerformanceDeckControlled.test.ts) | 3 | keep | Controlled assembly checks store isolation and event forwarding; reactive row target and comment-only playback block cover distinct paths. — |
| [PerformanceDeckPage.test.ts](../../../src/__tests__/components/keyboard/PerformanceDeckPage.test.ts) | 9 | keep | Specimen page state tests Return, fixture loading, edits, IDs, deletion and row selector via real controlled deck. — |
| [Knob.test.ts](../../../src/__tests__/components/knobs/Knob.test.ts) | 27 | keep | Knob gestures, follower cleanup, display precision, disabled and keyboard modes, rebound and option cycling have direct interaction assertions. — |
| [knobEdition.test.ts](../../../src/__tests__/components/knobs/knobEdition.test.ts) | 3 | keep | Edition alternation and storage failures have deterministic direct helper checks. — |
| [PatternReel.test.ts](../../../src/__tests__/components/PatternReel.test.ts) | 35 | keep | Reel timers, drag capture, wheel/keyboard navigation, deletion/focus and reduced-motion paths are independently exercised; CSS source checks guard layout contract. — |
| [PatternList.test.ts](../../../src/__tests__/components/patterns/PatternList.test.ts) | 18 | keep | PatternList store adapter checks working-take lifecycle, color/root mapping, selection and deletion, plus live source/action updates. — |
| [PatternStrip.test.ts](../../../src/__tests__/components/PatternStrip.test.ts) | 10 | keep | PatternStrip selection, rename and action semantics are mounted; final source seam case guards guide/production reuse. — |
| [BrandLogo.test.ts](../../../src/__tests__/components/ui/BrandLogo.test.ts) | 4 | keep | Logo identity, Mark composition, layer ordering and variants are checked in rendered DOM. — |
| [Button.test.ts](../../../src/__tests__/components/ui/Button.test.ts) | 11 | keep | Native Button semantics, materials, disabled state, haptics and UIBeat/reduced motion are mounted. — |
| [ConfigPanel.test.ts](../../../src/__tests__/components/ui/ConfigPanel.test.ts) | 15 | keep | Config destinations, control dependencies, Stage/Deck routing and MIDI-port visibility are exercised as UI behavior. — |
| [InstrumentSelector.test.ts](../../../src/__tests__/components/ui/InstrumentSelector.test.ts) | 15 | keep | Search, bank switching, warmup ordering/races, errors, selection and controlled callbacks test distinct instrument flows. — |
| [LoadingScreen.test.ts](../../../src/__tests__/components/ui/LoadingScreen.test.ts) | 3 | keep | Loading anatomy, skip/start, retry and audio-permission actions are mounted across states. — |
| [LoadingSplash.test.ts](../../../src/__tests__/components/ui/LoadingSplash.test.ts) | 4 | keep | Production splash checks loading identity, MIDI status, ready audio handoff and retry. — |
| [Sticker.test.ts](../../../src/__tests__/components/ui/Sticker.test.ts) | 6 | keep | Sticker Badge/Mark variants and actual paper UIBeat transform are checked through rendered DOM. — |
| [TabbedOverlayPanel.test.ts](../../../src/__tests__/components/ui/TabbedOverlayPanel.test.ts) | 8 | keep | Swipe settle/cancel, tap/keyboard, scroll, reduced motion and gesture exclusion protect panel navigation. — |
| [Tabs.test.ts](../../../src/__tests__/components/ui/Tabs.test.ts) | 7 | replace | Tab selection, resize reveal, drag/wheel and reduced motion are exercised; guide-stress source case guards the retired destination but does not count the accepted fifteen controls. UI-06 |
| [tabsEdition.test.ts](../../../src/__tests__/components/ui/tabsEdition.test.ts) | 3 | keep | Edition cycling, unknown storage value and storage failure are direct persistence helper contracts. — |
| [TopDrawer.test.ts](../../../src/__tests__/components/ui/TopDrawer.test.ts) | 2 | keep | Top Drawer keeps handle mounted and checks panel switching, outside state and Escape dismissal. — |
| [CodeMirrorSelection.test.ts](../../../src/__tests__/components/uniques/CodeMirrorSelection.test.ts) | 5 | keep | Editor selection mapping covers blurred/focused/readonly flows and restored cursor without using DOM text as proxy. — |
| [CodeStrip.test.ts](../../../src/__tests__/components/uniques/CodeStrip.test.ts) | 31 | keep | Production/controlled editor ownership, evaluation races, cancellation, phase, warmup and scroll-follow are distinct observable cases. — |
| [CodeStripColors.test.ts](../../../src/__tests__/components/uniques/CodeStripColors.test.ts) | 1 | keep | Live color config updates existing notes without hue-frame subscription, a meaningful reactivity boundary. — |
| [CodeStripControlledIsolation.test.ts](../../../src/__tests__/components/uniques/CodeStripControlledIsolation.test.ts) | 1 | keep | Controlled CodeStrip renders real descendants while asserting absence of production color/state hooks. — |
| [CodeStripNativeReveal.test.ts](../../../src/__tests__/components/uniques/CodeStripNativeReveal.test.ts) | 5 | keep | Microtask reveal helper covers coalescing, stale document/view invalidation and teardown. — |
| [CodeStripViewport.test.ts](../../../src/__tests__/components/uniques/CodeStripViewport.test.ts) | 5 | keep | Viewport tests check clipped playback/color work, latest-state catch-up, one observer and cleanup. — |
| [Drawer.test.ts](../../../src/__tests__/components/uniques/Drawer.test.ts) | 23 | keep | Drawer covers drag/key allocation, overflow, viewport clamp, persistence, focus shielding and top-anchor dismissal. — |
| [recordingTokens.test.ts](../../../src/__tests__/components/uniques/recordingTokens.test.ts) | 10 | keep | Recording tokens preserve measured gaps, overlap order, borrowed pitches and rest source-map semantics. — |
| [strudelExtension.test.ts](../../../src/__tests__/components/uniques/strudelExtension.test.ts) | 33 | keep | Strudel extension tests parse source and assert real CodeMirror widgets, metadata invalidation, playback history and edit recovery. — |
| [ExactPitchVisuals.test.ts](../../../src/__tests__/components/visual/ExactPitchVisuals.test.ts) | 1 | keep | Exact-pitch Blob resolver case guards borrowed enharmonic position independent of scale ordinal. — |
| [MarkBeatIndicator.test.ts](../../../src/__tests__/components/visual/MarkBeatIndicator.test.ts) | 7 | keep | Mark registry/SVG/Sticker linkage and Beat Indicator injected clock/gate are checked through rendered elements. — |
| [StagePage.test.ts](../../../src/__tests__/components/visual/StagePage.test.ts) | 3 | keep | Stage specimen drives isolated real Stage states, retry and moving occlusion geometry. — |
| [StageSpecimenCanvas.test.ts](../../../src/__tests__/components/visual/StageSpecimenCanvas.test.ts) | 2 | keep | Specimen replay IDs and isolated Pinia disposal protect attack freshness and ownership cleanup. — |
| [UnifiedVisualEffects.test.ts](../../../src/__tests__/components/visual/UnifiedVisualEffects.test.ts) | 9 | keep | Visuals gate, event-target routing, canvas forwarding and listener/animation teardown are verified. — |
| [PrimitiveNote.test.ts](../../../src/__tests__/style-guide/PrimitiveNote.test.ts) | 1 | keep | Real PrimitiveNote specimen is mounted and every displayed pitch class index checked against its exact raw pitch. — |
| [SystemUIBeat.test.ts](../../../src/__tests__/style-guide/SystemUIBeat.test.ts) | 2 | replace | Tempo-phase claim is only raw source string matching; distribution exclusion is an intentional guide composition constraint. UI-01 |
| [TokenMusicColors.test.ts](../../../src/__tests__/style-guide/TokenMusicColors.test.ts) | 1 | keep | Real color-token specimen is mounted and mode toggles, slot counts, motion cancellation and Note/Chord presence are observed. — |

## Actionable findings

These findings distinguish four behavioral replacements from four retained structural guards. Each names one existing runtime case. Replace a case only after preserving its accepted behavior; no finding claims mutation or browser validation.

### UI-01 — replace one case (high confidence)

**Evidence:** [SystemUIBeat.test.ts:5](../../../src/__tests__/style-guide/SystemUIBeat.test.ts#L5), [SystemUIBeat.vue:140](../../../src/style-guide/systems/SystemUIBeat.vue#L140), [SystemUIBeat.vue:164](../../../src/style-guide/systems/SystemUIBeat.vue#L164). “preserves musical position when tempo changes during playback” reads only five source strings. tick could publish a reset or use the wrong bar duration while every assertion passes.

**Action and preservation:** Keep the separate guide-distribution case. Existing CodeStrip.test.ts:719 tests production UIBeat phase under tempo change, but does not exercise this guide fixture. Mount SystemUIBeat with controlled requestAnimationFrame/performance.now, advance a frame, change BPM through its button, advance again, and assert BeatIndicator phase or injected clock snapshot remains continuous.

**Loss risk:** A replacement can be brittle if it asserts wall time or CSS animation; assert normalized clock phase under a fake frame schedule.

**Verification:** Focused style-guide test plus a deliberate local wrong-phase mutation or equivalent red test; no mutation check performed in this audit.

### UI-02 — replace one case (high confidence)

**Evidence:** [BarTape.test.ts:59](../../../src/__tests__/components/BarTape.test.ts#L59), [PatternList.vue:99](../../../src/components/patterns/PatternList.vue#L99), [PatternList.vue:107](../../../src/components/patterns/PatternList.vue#L107), [PatternList.test.ts:127](../../../src/__tests__/components/patterns/PatternList.test.ts#L127). “orders production PatternStrip segments by note onset” matches the literal sort expression and spread. It would pass if orderedNotes is unused or barTape maps the unsorted input.

**Action and preservation:** BarTape.test.ts:11 proves primitive order/width; PatternList.test.ts:127 maps only a one-note pattern. Add a PatternList case with deliberately out-of-order pressTime and distinct pitch colors/durations, asserting reel item barTape order; then retire the regex case.

**Loss risk:** Must use distinguishable note colors and not rely on same-color repeated notes.

**Verification:** Focused PatternList and BarTape tests; demonstrate unordered mapping fails the new test.

### UI-03 — retain one structural case (high confidence)

**Evidence:** [App.test.ts:148](../../../src/__tests__/components/core/App.test.ts#L148), [main.ts:39](../../../src/main.ts#L39), [main.ts:43](../../../src/main.ts#L43), [tabsEdition.test.ts:21](../../../src/__tests__/components/ui/tabsEdition.test.ts#L21). The raw-source assertion pins the two persistence-free guide routes and guards the sole beginTabsPageEdition call in main.ts. It is a deliberate bootstrap wiring contract; it does not execute route visits or prove storage remains unchanged.

**Action and preservation:** Keep the case and its exact route/guard seam. tabsEdition.test.ts separately exercises the edition writer. Do not extract production routing solely for a new test.

**Loss risk:** Literal formatting changes may require updating the assertion; scope its name to bootstrap structure rather than behavioral persistence proof.

**Verification:** At an ordinary code review, check that the tested call remains the only main.ts invocation and that both excluded paths remain listed. No replacement test is required.

### UI-04 — replace one case (high confidence)

**Evidence:** [KeyboardSpecimen.test.ts:16](../../../src/__tests__/components/keyboard/KeyboardSpecimen.test.ts#L16), [CompoundKeyboard.vue:44](../../../src/style-guide/compounds/CompoundKeyboard.vue#L44), [CompoundKeyboard.vue:256](../../../src/style-guide/compounds/CompoundKeyboard.vue#L256). “covers accepted visual inspection dimensions with bounded controls” checks strings such as widths, labels, and handler names; controls could be disconnected or both Keyboard instances ignore changes.

**Action and preservation:** Keep KeyboardSpecimen.test.ts:5 as an architecture/isolation guard. KeyboardCompound.test.ts covers production compound behavior but not specimen controls. Mount specimen, set width/row-count/scale selectors, and assert the live Keyboard props, rendered row count, and status values change.

**Loss risk:** DOM sizing in jsdom is synthetic; assert bound props/state, leaving actual visual layout to browser review.

**Verification:** Focused mounted specimen test; verify a disconnected v-model fails.

### UI-05 — retain one structural case (high confidence)

**Evidence:** [Chord.test.ts:229](../../../src/__tests__/components/keyboard/Chord.test.ts#L229), [CompoundChord.vue:1](../../../src/style-guide/compounds/CompoundChord.vue#L1), [Chord.test.ts:71](../../../src/__tests__/components/keyboard/Chord.test.ts#L71), [DESIGN_SYSTEM_TRACKER.md:61](../../../src/style-guide/DESIGN_SYSTEM_TRACKER.md#L61). The case title claims it mounts a specimen, but its assertions intentionally pin StyleGuide registration, the real Chord import, retired prop absence, and guide-only animation ownership. DESIGN_SYSTEM_TRACKER.md:61 identifies Chord as authoritative in the guide and presentation-only. Runtime Chord display and semantics are already mounted in earlier cases.

**Action and preservation:** Keep the structural checks for guide adoption, removed identity/structure props, reduced-motion guard, and animation ownership. Rename the case to describe source/architecture wiring and trim incidental heading or example labels if they create maintenance noise.

**Loss risk:** It remains source-level evidence only; it does not prove the guide renders correctly or that guide motion looks right.

**Verification:** Review the lineage contract and exact source seam when editing the guide; no new guide-motion unit test is required solely for this audit.

### UI-06 — replace one case (high confidence)

**Evidence:** [Tabs.test.ts:53](../../../src/__tests__/components/ui/Tabs.test.ts#L53), [Tabs.test.ts:28](../../../src/__tests__/components/ui/Tabs.test.ts#L28), [Tabs.test.ts:58](../../../src/__tests__/components/ui/Tabs.test.ts#L58), [DESIGN_LOG.md:154](../../../src/style-guide/DESIGN_LOG.md#L154). The case checks guide prose and absence of retired floatingPopup, but never counts rendered destinations. DESIGN_LOG.md:154 explicitly accepts the canonical fifteen-item Tabs stress fixture, so a fourteen-item fixture could pass this source test.

**Action and preservation:** Tabs.test.ts:28 and :58 exercise selection/overflow with small fixtures. Replace this case with a mounted TabsPage assertion of fifteen actual destinations and absence of the retired floatingPopup destination.

**Loss risk:** Counting rendered guide destinations is the accepted contract; do not substitute prose or count production instrument banks.

**Verification:** Focused mounted TabsPage test should fail on a removed or extra guide destination; no acceptance decision remains open.

### UI-07 — retain one structural case (high confidence)

**Evidence:** [App.test.ts:157](../../../src/__tests__/components/core/App.test.ts#L157), [MainApp.vue:5](../../../src/MainApp.vue#L5), [App.test.ts:88](../../../src/__tests__/components/core/App.test.ts#L88). The source check bans the named retired FloatingPopup mount in MainApp and requires UnifiedVisualEffects. This is a narrow migration/architecture constraint; App.test.ts:88 separately mounts the production shell and proves the canvas component appears.

**Action and preservation:** Keep the named retired-component ban as a structural guard and keep App.test.ts:88 as the runtime presence check. Do not claim the source assertion proves every possible popup is absent.

**Loss risk:** A new popup with a different name would not be detected, but that is outside the named retirement contract.

**Verification:** Review the named import/mount seam when changing MainApp; no extra production abstraction or test is needed.

### UI-08 — retain one structural case (high confidence)

**Evidence:** [App.test.ts:127](../../../src/__tests__/components/core/App.test.ts#L127), [App.vue:29](../../../src/App.vue#L29), [App.vue:36](../../../src/App.vue#L36). The source check guards lazy StyleGuide import, guide CSS gating and retired direct guide imports in App.vue. That is an intentional entry-graph architecture contract, though it does not itself inspect emitted chunks.

**Action and preservation:** Keep the lexical architectural guard. At the existing package build gate, optionally inspect emitted bundle module reachability for guide exclusion; do not extract production code or add a per-unit build test solely for this.

**Loss risk:** Exact source syntax may be refactored while preserving the lazy boundary; reviewers should update the assertion with the intended seam.

**Verification:** Source review suffices for routine edits; emitted graph inspection belongs at the existing build gate if bundle exclusion is questioned.

## Valuable coverage and gaps

- Keep the [Keyboard contact and swipe cases](../../../src/__tests__/components/keyboard/Keyboard.test.ts#L677), [ChordKey owner cleanup](../../../src/__tests__/components/keyboard/ChordKey.test.ts#L46), and [Key blur/visibility teardown](../../../src/__tests__/components/keyboard/Key.test.ts#L253). Their input-order and cleanup failures are distinct; merging them for a smaller number would hide regressions.
- Keep [CodeStrip overlapping-evaluation cancellation](../../../src/__tests__/components/uniques/CodeStrip.test.ts#L461), [Strudel source/widget history](../../../src/__tests__/components/uniques/strudelExtension.test.ts#L210), and [Drawer focus/persistence](../../../src/__tests__/components/uniques/Drawer.test.ts#L213). They observe race and ownership contracts rather than only component presence.
- Keep the intentional source-level architecture assertions where they protect a real boundary: [Key’s no-store interaction shell and focus CSS](../../../src/__tests__/components/keyboard/Key.test.ts#L329), [PatternStrip guide/production component reuse](../../../src/__tests__/components/PatternStrip.test.ts#L202), and [SystemUIBeat’s excluded dense keyboard family](../../../src/__tests__/style-guide/SystemUIBeat.test.ts#L15). Their scope should be described as structural; they are not visual or timing proof.
- The source assertions for exact CSS properties in BarTape, PatternReel, and Note protect authored design values but cannot prove browser layout, hit targets, color contrast, or animation smoothness. Use a bounded browser review at visual-system gates. The existing [real-app audio harness](../../../audio-lab/ui-README.md) already drives trusted Chrome input to rendered PCM and optional CodeStrip Play/live-edit/mute/stop; it sits outside the package unit-test case count. Extend or reuse it when an actual app/audio failure needs that evidence.
- UI tests do not establish that the Keyboard workbench selectors drive the live compound (UI-04), that the accepted fifteen-destination Tabs fixture actually renders fifteen controls (UI-06), or that guide tempo phase stays continuous (UI-01). App and Chord source checks intentionally establish narrower structural contracts; they are not runtime or visual proof.

## Phased resolution

1. Replace UI-01 guide tempo continuity and UI-02 PatternList onset order with behavior-level checks. Keep the existing source cases until the replacements detect a targeted wrong-phase or unordered-input defect.
2. Replace UI-04 with a mounted Keyboard specimen control test and UI-06 with a rendered count of the [accepted fifteen Tabs destinations](../../../src/style-guide/DESIGN_LOG.md#L154). Run focused tests while changing each seam, then one package-script full checkpoint under repository verification rules.
3. Retain UI-03/05/07/08 as structural assertions. Narrow misleading titles and trim incidental literals if they impede maintenance. Do not extract production routing or add guide-motion tests solely to turn these into runtime tests. Inspect emitted guide-chunk reachability at the existing build gate if UI-08's bundle exclusion needs stronger evidence.
4. At a visual review gate, check real-browser layout, reduced motion and focus behavior. Use the existing real-app audio harness when the change touches audible input or CodeStrip transport; the audit did not run it.

## Limits

- Read-only semantic review of all 57 assigned test files and relevant production seams; no test run, build, browser pass, or mutation test authorized for this lane.
- Case totals and names come from the last passing manifest; source declarations with it.each represent multiple runtime cases.
- Four existing cases require REPLACE (UI-01, UI-02, UI-04, UI-06). Four cases remain structural guards (UI-03, UI-05, UI-07, UI-08). None is a defensible delete-now; replacements are touched cases, not a projected net reduction.
