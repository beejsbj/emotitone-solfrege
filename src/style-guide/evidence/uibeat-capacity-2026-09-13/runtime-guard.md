# Runtime workload and Stage guard

`runtime-guard.mjs` supplies a dependency-free browser function for the CDP capture. Install it in the measured page's main execution context after scene preparation and keep it installed through the complete on/off/on run. `runtimeGuardInstallerExpression(options)` returns the expression to assign to a page-global handle.

For each measured window, call `start({ label, expectedDurationMs, maximumCanvasIdleMs })`, run the sample, then call `snapshot()`. Call `stop()` in capture cleanup and retain its report even when an earlier step failed. A usable capture requires every window and the final session report to be valid.

The guard synchronously subscribes to the production Pinia workload and watches semantic DOM changes for CodeStrip and stable workload controls. It retains changed-then-restored values, including transient effective Stage Looks. Only `effectiveConfig.uiBeat.isEnabled` and its Global control are excluded because the capture deliberately changes UI Rhythm. Style/class animation, same-text markup churn, active notes, playback progress, and other ordinary motion do not alter the fingerprint.

The Stage heartbeat wraps only `clearRect` on the retained `.unified-canvas` 2D context. It counts a heartbeat after a successful full-canvas clear, matching the entry of `useUnifiedCanvas`'s production render frame. Every window must cover its requested duration with at least two successful clears and no leading, internal, or trailing gap above `maximumCanvasIdleMs`. Canvas replacement, disconnection, context replacement, `contextlost`/`contextrestored`, or a context reporting itself lost invalidates the window.

The wrapper adds one timestamp append and four argument comparisons to each successful production clear while a window is active. It preserves the original receiver, arguments, result, and thrown errors. `stop()` restores the exact prior own property descriptor, or removes the owned instance wrapper when the method was inherited. If another actor replaces the wrapper, cleanup reports lost ownership and leaves that replacement untouched.

This heartbeat proves continued entry into the production Stage render loop and its successful canvas clear. It does not prove that every effect painted content, that Chromium composited each frame, or that a physical panel displayed it; the capture's pacing, renderer, trace, and operator evidence remain responsible for those claims.
