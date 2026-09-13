# UIBeat whole-scene capacity capture

This directory prepares the remaining UIBeat capacity gate without changing the accepted consumer distribution or source architecture. The capture compares the same sounding production scene with UIBeat on, off, then on again. It records foreground-tab frame callback intervals, Chromium performance-counter deltas, Long Animation Frame entries, and selected browser-pipeline trace events. Each short diagnostic trace follows its untraced frame-callback window so trace collection does not contaminate the primary pacing sample. Selected raw trace events are stored in a gzip sidecar with its SHA-256 in the verification report; event-name counts remain inline for review.

These sources answer different questions:

- `requestAnimationFrame` intervals show how often the foreground page receives an animation opportunity while the whole production scene runs. The first interval begins at sample start, so an initial stall is retained, and samples with fewer than two callbacks or less than the requested coverage are invalid. A bounded MutationObserver also records distinct inline `scale` changes for every visible UIBeat consumer during on windows. Every target must change throughout the window without a start, middle, or end idle gap longer than two beat periods, with a conservative 2-second floor, and each window must span at least two such allowances. This rejects retained `running` attributes, briefly active clocks that freeze, and captures too short to demonstrate sustained cadence. The MutationObserver plus per-frame retained-node connection, binding, state, and visibility checks add main-thread and layout observation work that can affect measured pacing. Neither signal proves that a hardware panel displayed every callback.
- Long Animation Frame and CDP performance counters attribute main-thread script, style, and layout work. They are diagnostic data, not whole-frame presentation evidence by themselves.
- CDP trace events expose browser compositor/presentation stages where the browser build reports them. They still do not independently observe physical display scanout.
- A capacity-closing result therefore also requires a named physical device, its native browser window visibly foregrounded for the full run, native viewport/display metadata, and an operator observation. Software rendering, Xvfb, headless browsers, and emulated viewports stay explicitly ineligible.

## Physical capture procedure

The harness requires Node.js 22 or newer with the built-in global `fetch` and `WebSocket` APIs. It checks these prerequisites before opening metadata or contacting Chrome and reports the detected runtime when they are missing. The checked development host runs Node.js 24.13.1 with both APIs available.

1. Check out and build the exact revision under test, then serve it on port `5183`. Use the hosted exact-revision deployment when the device cannot reach the local server.
2. Open production in a dedicated native Chrome profile on the named physical desktop or phone. Keep the window and tab visible, unobscured, focused, and awake for the entire capture. Do not resize it between samples.
3. Expose that existing Chrome session through a local CDP endpoint. On Android this can be an `adb forward` to Chrome's debugging socket; on desktop use the browser's supported remote-debugging launch route. Keep exactly one page whose title or URL matches `--target`; the harness rejects zero or ambiguous matches. Do not substitute device emulation or a virtual display.
4. Copy `metadata.example.json`, fill every field from the actual device and display, including pre-run power, thermal, and operator observations. Keep `evidenceClass` as `physical-native-visible` only when the conditions above are true.
5. Run:

   ```sh
   node src/style-guide/evidence/uibeat-capacity-2026-09-13/capture.mjs \
     --cdp http://127.0.0.1:9222 \
     --target emotitone \
     --metadata /tmp/uibeat-device.json \
     --output src/style-guide/evidence/uibeat-capacity-2026-09-13/<device>-verification.json
   ```

The script refuses a hidden or unfocused document, begins interruption monitoring before scene preparation, starts a five-note sounding production pattern when playback is not already running, opens Config without closing an already-open panel, explicitly selects Global, and records equal-duration on/off/on windows. When it finds existing playback, it reuses and records that scene rather than pretending it created a fresh one. It records blur, focus, visibility, and resize events across scene preparation, pacing, warmup, trace, and restoration; includes the initial animation-frame delay; drains queued terminal long-frame/task entries; rejects insufficient callback coverage and any change to the recorded CodeStrip, performance controls (including BPM and Harmony), instrument, or Global Config values across all scene boundaries. UI Rhythm is omitted from that fingerprint because the harness intentionally toggles it. The first on window retains the exact visible consumer nodes through the full sequence. Each on window requires those connected nodes to remain bound, running, visible, and changing scale, with the same visible per-family inventory at both boundaries and across both on windows. The off window requires the same connected nodes to remain visible and unbound with no inline scale writes. The harness releases those temporary references when monitoring ends, restores the original UI Rhythm value, and fails finalization if restoration fails alongside any earlier capture error. It inspects both initial and final renderer identities, rejects changes, and rejects known software-renderer names even without a matching trace event. Use a dedicated profile because the app persists configuration locally.

For a `physical-native-visible` capture, the command pauses after measurement and asks the observing operator to record visible interruptions or stutter and the final thermal state. This fresh post-run observation is included before eligibility and report hashing. A physical run cannot finalize unattended. Software-rendered and emulated rehearsals remain unattended because they are never eligible for closure.

Review the result rather than treating `capacityClosureEligible: true` as an automatic verdict. Compare both on windows against the middle off window, inspect all raw intervals and long-frame entries, confirm the accepted consumer counts, and account for device refresh rate, thermal state, power mode, browser warnings, and visible interruptions. A physical desktop result and a physical mobile result are both required by the current gate.

Consumer counts are recorded by current source family and by viewport visibility. They describe the exact captured scene; an older receipt may have had different panels or controls open.

## Current evidence status

The committed `software-rendered-verification.json` exercises this procedure in a visible Xvfb Chrome window. It is useful for validating the capture path and checking for a gross UIBeat regression. It cannot close the named physical-device or native displayed-frame gate. Reports captured before the post-run-observation schema remain legacy rehearsal evidence and are not eligible for physical closure.
