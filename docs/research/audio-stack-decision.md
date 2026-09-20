# Audio stack resolution — 2026-09-20

The stack is being landed bottom-up with merge commits, preserving both its history and the unrelated Config/Stage work already merged to main. #76, #79 and #82 are merged. #83 and #84 are staged; their final performance and review gates remain open.

## Renderer decision

Keep the worklet as the prepared live-audio candidate and Superdough as the compatibility and authored-pattern renderer. The production native selector has been removed from the staged implementation. Its repaired renderer, manager and tests remain runnable in `audio-lab/reference` through `LAB_UI_BACKEND=native`; normal Vite builds do not install that redirect. The shared `preparedNativeInstrument` extractor stays in production because the worklet uses it too.

The four-way comparison used identical app, harness and dependency hashes. Native at 400 and 1200 ms missed audible repeat windows. Native at 2000 ms filled all tested windows, but its worst synchronous release took 84.7 ms and its worst press 56.7 ms, above the declared 25 ms limit. Those calls include application callbacks; they do not isolate DSP or node creation.

The worklet filled all windows with command calls below 0.2 ms, but dense three-note repeats exposed a 20-second lifecycle/UI backlog. Its audio release was correctly captured; the dedicated tail query arrived after the capture buffer ended. The original comparison therefore has **no complete performance winner**. The notification backlog is being repaired and must pass a separate, explicit validation before #83 lands. The four original receipts remain unchanged. See [the comparison and its limits](../../audio-lab/native-comparison-results.md).

All 48 warm inputs in that comparison sounded; every renderer had a 5.58 ms pooled median. These small desktop software captures do not establish physical input-to-speaker latency, mobile memory safety or broad instrument fidelity.

## Instrument selection and Superdough

Selection resolves the registered sound name and prepares supported mono/stereo sample banks, soundfonts, or the four basic oscillators. The worklet keeps sample roots, channel data, soundfont tuning/ranges and loop points. Unregistered sounds can retry after loading; unsupported source types, unavailable worklets and temporarily occupied bank budgets retain Superdough output. It does not silently substitute a different instrument. Authored Strudel patterns and their effects keep their existing renderer.

The Superdough and soundfont patches remain installed, including cancellation, voice retirement and source extraction. The finite-voice fade patch is repaired in both source and shipped distribution. This work does not remove the patches or prove that Superdough itself is intrinsically slow.

Installed plus pending worklet PCM is capped at 192 MiB. A separate 192 MiB reservation covers cached/building preparation pyramids, so the worst owned transient is 384 MiB and acknowledged installed ownership is at most 192 MiB. Original Superdough buffers and garbage-collector lag are outside that accounting. The measured piano retains approximately 138 MiB of original buffers and adds approximately 138 MiB for the worklet; neither is total application memory.

## The six surviving findings

| Finding | Repair and regression |
| --- | --- |
| #76 near-deadline arpeggio release created a gap | Preserve an imminent committed pitch while another input remains held; final-input release still cancels it. |
| #79 finite pattern voices were stolen without a fade | Ramp the existing post-gain for finite voices; held voices retain their dedicated gate. No extra voice nodes. |
| #82 delayed lifecycle retriggered completed MIDI plans | Retain exactly-once submission receipts and reconcile cancellation in FIFO order; #83 gives reused physical inputs distinct renderer lifetimes. |
| #82 transient preparation failure became permanently unsupported | Distinguish retryable loading/decoding failures from unsupported source structure and evict failed preparation entries. |
| #82 fractional sample loops interpolated outside the loop | Wrap interpolation sample centres across fractional seams while preserving loop duration. |
| #83 suspension stranded native voices and polling | Immediately stop and disconnect on a frozen audio clock; resume requires fresh input. This renderer now lives in the lab. |

The older #79 wall-clock/MIDI issue was also backported from the downstream fix so that #79 is independently correct. Prepared-bank ownership is additionally serialized, held banks stay pinned, retirement remains charged until acknowledged, and preparation cache ownership is released after installation or fallback.

## CodeStrip behavior and #84's patch

#84 preserves unchanged document ranges and widget identity, coalesces source/presentation publication, and removes redundant production deep traversal. It still derives the complete notation; this is not an incremental notation engine.

Only widgets with a nonzero intersection with the actual editor viewport subscribe to hue phase and playback redraw work. Clipped widgets defer drawing until they return, then show the latest state. Hidden pages stop motion. Reduced Motion retains current visible playback state with static hue. One observer belongs to each editor, and teardown releases its subscriptions. Controlled style-guide examples stay isolated from production clocks.

Long-line follow uses CodeMirror's native reveal when a target has not been materialized. The reveal runs after the measure/write lock is released, coalesces requests, and cancels stale document/view work. Smooth follow stops at rounded or clamped scroll positions while preserving transport follow.

The exact `@codemirror/view@6.40.0` patch moves an existing blurred editable/tabbable no-op before an unnecessary native Selection read. Focused, pointer and non-tabbable read-only behavior are preserved. It is a pinned dependency patch, not a claim that a general upgrade fixes the issue.

The complete initial focused viewport run had a 502 ms append task against the unchanged 500 ms ceiling and exposed nested editor-update warnings. Both failures remain recorded. The deferred reveal then passed a functional browser smoke with zero warnings. A profile also identified synchronous persistence traversal; the new serializer keeps the existing JSON shape and write cadence, with actual Pinia hydration/edit/save equivalence tests. It introduces no debounce or crash-loss window. The final focused timing run is still pending.

See [recording/viewport evidence](../../audio-lab/pattern-growth.md) and the [desktop/phone guide receipt](../../evidence/codestrip-viewport-20260920/guide-check.json). The 500 ms ceiling is a regression guard, not an assertion that a half-second musical-input stall feels acceptable. Physical device and ROLI validation remains outside this desktop lab run.

## Landing receipt

| PR | State |
| --- | --- |
| [#76](https://github.com/beejsbj/emotitone-solfrege/pull/76) | Merged, independently reviewed at `b8fcc8e`. |
| [#79](https://github.com/beejsbj/emotitone-solfrege/pull/79) | Merged, independently reviewed at `23c849e`. |
| [#82](https://github.com/beejsbj/emotitone-solfrege/pull/82) | Merged, independently reviewed at `1e70dd0`. |
| [#83](https://github.com/beejsbj/emotitone-solfrege/pull/83) | Staged; notification-backlog validation and final published review pending. |
| [#84](https://github.com/beejsbj/emotitone-solfrege/pull/84) | Staged; final timing capture and published review pending. |
