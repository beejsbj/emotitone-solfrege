# Phase 1: Instrument Trust & Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 1-Instrument Trust & Flow
**Areas discussed:** Control grouping, Instrument warming behavior, Working sketch semantics, Scroll boundaries

---

## Control grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Keep flat row | Keep knobs and transport/edit/send actions as visual peers in one row | |
| Split actions from knobs | Move play/delete out of knob presentation and colocate them with the live working area | ✓ |
| Larger redesign later | Leave hierarchy rough for now and solve it in a later UI phase | |

**User's choice:** Split actions from knobs. `Play` and `Delete/Backspace` should become smaller icon buttons near the live strip. `Send/Enter` should move out of the row and live at a more pattern-level position to the right side of that area.
**Notes:** User described `Send` as having a typewriter/new-line feeling rather than being another generic control.

---

## Instrument warming behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent async warm | Select immediately and let the first taps fail or race while warming finishes | |
| Visible warm state | Start background warm immediately and visibly show that the working area is not ready yet | ✓ |
| Delay selection until ready | Do not visually switch to the new instrument until warm completes | |

**User's choice:** Visible warm state.
**Notes:** The moment the user selects an instrument, warming should begin in the background. The play surface should show that state, for example by desaturating keys or showing a loading state over the key/action area. Context capture assumes the newly selected instrument is guarded until ready so taps are not misleading.

---

## Working sketch semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Treat strip as secondary | Keep keys as primary and treat the strip as mostly passive output | |
| Treat keys + strip as one desk | Keep keys and live strip together as the working area, with pattern swapping remaining easy | ✓ |
| Redefine pattern workflow now | Rework pattern semantics deeply during Phase 1 | |

**User's choice:** Treat keys and live strip as one working area.
**Notes:** User did not want a larger semantic redesign here. `Delete/Backspace` should behave like true backspace and keep the strip visually oriented around the deletion point. `Send` should commit the current line and reset/clear for the next sketch, like a typewriter moving to a new line.

---

## Scroll boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all scrolling | Eliminate all scrollable regions, including local interaction surfaces | |
| Keep local scroll, kill page scroll | Preserve mini-scrollables but remove the main page/body scrollbar | ✓ |
| Ignore for now | Leave scrolling behavior rough until later polish | |

**User's choice:** Keep local scroll, kill page scroll.
**Notes:** The problem is the literal main body/document scrollbar, as if non-absolute content is stretching the site. Intentional local scroll regions are fine.

---

## the agent's Discretion

- Exact icon set and placement details for `Play`, `Delete/Backspace`, and `Send/Enter`
- Exact warming-state visual treatment
- Exact deletion-follow animation or centering behavior

## Deferred Ideas

None
