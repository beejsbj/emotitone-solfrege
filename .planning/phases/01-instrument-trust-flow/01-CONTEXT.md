# Phase 1: Instrument Trust & Flow - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the current play, capture, and playback surface feel trustworthy and smooth without adding new capabilities. This phase is about clarifying the behavior and presentation of the existing instrument flow: control hierarchy, instrument warming feedback, the working sketch loop, and the boundary between intentional local scrolling and accidental page-level scrolling.

</domain>

<decisions>
## Implementation Decisions

### Control grouping
- **D-01:** `Play` and `Delete/Backspace` should stop presenting as knobs and become smaller icon-first actions.
- **D-02:** These smaller actions should live in the same visual zone as the live strip rather than in the flat keyboard control row.
- **D-03:** `Send/Enter` should move out of the keyboard control row and become a more pattern-level action, positioned on the pattern/list-card side of the working area rather than grouped with instrument configuration controls.

### Instrument warming behavior
- **D-04:** Selecting a new instrument should immediately start downloading and warming its sounds in the background.
- **D-05:** The instrument surface must show a visible warming state instead of silently accepting input and producing no response.
- **D-06:** Treat the warming state as belonging to the keyboard/action working area, with the play surface visibly guarded or desaturated until the newly selected instrument is actually ready.
- **D-07:** For planning purposes, assume the newly selected instrument does not become fully playable until warming completes; do not rely on ambiguous “first tap maybe works” behavior.

### Working sketch semantics
- **D-08:** The keys plus the live strip are the active working area for this phase.
- **D-09:** Users should be able to swap patterns in and out of that working area easily; Phase 1 should preserve that desk-like flow rather than turning the live strip into a separate destination.
- **D-10:** `Delete/Backspace` should feel like a true backspace action, and the strip should stay visually oriented around the point where deletion is happening so the user understands what changed.
- **D-11:** `Send/Enter` should keep its “typewriter to a new line” feeling: commit the current working sketch, then reset/clear the active line so the user can continue with the next sketch.

### Scroll boundaries
- **D-12:** The problem to fix is the main document/body scrolling, not the intentional internal scroll regions.
- **D-13:** Horizontal scrolling inside the keyboard control strip, horizontal scrolling inside the live strip/editor, and other local interaction-specific scrolling may remain if they feel intentional.
- **D-14:** Planning should treat any page-level scrollbar or body-stretching layout as a Phase 1 regression unless it is explicitly required by a local surface.

### the agent's Discretion
- Exact icon choices for `Play`, `Delete/Backspace`, and `Send/Enter`
- Exact warming affordance design, as long as it visibly communicates “selected but not ready”
- Exact animation, focus, and scroll-centering treatment for deletion feedback
- Exact layout mechanics used to keep local scroll regions intentional while eliminating body-level scroll

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and sequencing constraints
- `.planning/REQUIREMENTS.md` — FEEL-01 through FEEL-04 define the required outcomes for this phase
- `.planning/PROJECT.md` — product framing, polish-first constraint, and anti-scope-creep guidance

### Control hierarchy and working area
- `src/components/keyboard/KeyboardActionBar.vue` — current flat control row that mixes knobs and actions as peers
- `src/components/DrawerKeyboard.vue` — current composition of pattern list, live card, action bar, and keyboard grid
- `src/components/patterns/LiveCard.vue` — wrapper around the live strip that may become the new home for action-level controls
- `src/components/patterns/LiveStrip.vue` — active working strip, playback follow behavior, and local horizontal scroll
- `src/components/knobs/Knob.vue` — existing interaction primitive used by the current control row

### Instrument warming and readiness
- `src/stores/instrument.ts` — current instrument selection, loading flag, and prewarm flow
- `src/services/superdoughAudio.ts` — prewarm helpers and runtime readiness behavior
- `src/components/InstrumentSelector.vue` — current user-facing selection flow
- `src/composables/useAppLoading.ts` — existing granular loading progress pattern
- `src/components/LoadingSplash.vue` — current startup loading UX that can inform post-start warming feedback

### Flow semantics and scroll behavior
- `src/stores/patterns.ts` — current working sketch, load/send/delete behavior
- `src/composables/useLiveStrudelMirror.ts` — shared playback state used by action surfaces and live strip
- `src/stores/music.ts` — current live note dispatch and play/release flow
- `src/style.css` — root/body overflow rules relevant to accidental document scrolling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Knob.vue`: already handles dense control-strip interactions and horizontal local scrolling, so new control hierarchy should reuse its surrounding system where appropriate instead of replacing the strip wholesale.
- `useLiveStrudelMirror.ts`: already exposes shared playback state for both the live strip and the action surface.
- `instrument.ts` + `superdoughAudio.ts`: already expose enough readiness and warming hooks to build an honest post-start loading state.
- `patterns.ts`: already models the “working desk” through current sketch, load-from-pattern, send, and delete flows.

### Established Patterns
- The app already uses the keyboard area as a layered working surface: pattern list, live strip, action controls, then keys.
- Startup loading uses explicit progress messaging and phase ownership instead of invisible background work; Phase 1 should reuse that honesty principle for instrument switching.
- Local scroll regions are already accepted in the UI, so the phase should target accidental document scrolling rather than flattening every scrollable surface.

### Integration Points
- Control hierarchy changes connect through `KeyboardActionBar.vue`, `LiveCard.vue`, and possibly `PatternList.vue`.
- Warming feedback connects through `InstrumentSelector.vue`, `instrument.ts`, `superdoughAudio.ts`, and the keyboard/live-strip surface.
- Backspace/send semantics connect through `patterns.ts`, `LiveStrip.vue`, and the relocated action controls.
- Scroll fixes likely connect through `App.vue`, `DrawerKeyboard.vue`, `LiveStrip.vue`, and global shell CSS in `src/style.css`.

</code_context>

<specifics>
## Specific Ideas

- `Play` and `Delete/Backspace` should feel like compact live-strip actions rather than parameter knobs.
- `Send/Enter` should feel like a typewriter moving to a new line rather than a generic utility button.
- The keyboard/live-strip region should visibly show that an instrument is warming, for example through desaturation or an overlay on the working area.
- Deletion should keep the user visually oriented to where the deletion is happening, not just silently mutate the sketch off-screen.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 01-instrument-trust-flow*
*Context gathered: 2026-03-31*
