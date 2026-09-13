# UIBeat whole-scene capacity capture

This directory prepares the remaining UIBeat capacity gate without changing the accepted consumer distribution or source architecture. The capture compares the same sounding production scene with UIBeat on, off, then on again. It records foreground-tab frame callback intervals, Chromium performance-counter deltas, Long Animation Frame entries, and selected browser-pipeline trace events. Each short diagnostic trace follows its untraced frame-callback window so trace collection does not contaminate the primary pacing sample. Selected raw trace events are stored in a gzip sidecar with its SHA-256 in the verification report; event-name counts remain inline for review.

These sources answer different questions:

- `requestAnimationFrame` intervals show how often the foreground page receives an animation opportunity while the whole production scene runs. They are broader than timing the UIBeat subscriber callback, but they do not prove that a hardware panel displayed every callback.
- Long Animation Frame and CDP performance counters attribute main-thread script, style, and layout work. They are diagnostic data, not whole-frame presentation evidence by themselves.
- CDP trace events expose browser compositor/presentation stages where the browser build reports them. They still do not independently observe physical display scanout.
- A capacity-closing result therefore also requires a named physical device, its native browser window visibly foregrounded for the full run, native viewport/display metadata, and an operator observation. Software rendering, Xvfb, headless browsers, and emulated viewports stay explicitly ineligible.

## Physical capture procedure

1. Check out and build the exact revision under test, then serve it on port `5183`. Use the hosted exact-revision deployment when the device cannot reach the local server.
2. Open production in a dedicated native Chrome profile on the named physical desktop or phone. Keep the window and tab visible, unobscured, focused, and awake for the entire capture. Do not resize it between samples.
3. Expose that existing Chrome session through a local CDP endpoint. On Android this can be an `adb forward` to Chrome's debugging socket; on desktop use the browser's supported remote-debugging launch route. Do not substitute device emulation or a virtual display.
4. Copy `metadata.example.json`, fill every field from the actual device and display, and keep `evidenceClass` as `physical-native-visible` only when the conditions above are true.
5. Run:

   ```sh
   node src/style-guide/evidence/uibeat-capacity-2026-09-13/capture.mjs \
     --cdp http://127.0.0.1:9222 \
     --target emotitone \
     --metadata /tmp/uibeat-device.json \
     --output src/style-guide/evidence/uibeat-capacity-2026-09-13/<device>-verification.json
   ```

The script refuses a hidden or unfocused document, starts a five-note sounding production pattern when playback is not already running, keeps the Config Global panel open so the accepted high-density control scene is present, and records equal-duration on/off/on windows. When it finds existing playback, it reuses and records that scene rather than pretending it created a fresh one. It records any blur or visibility change during each window, times out a suspended sample, validates transport plus running/still consumer state, and restores the original UI Rhythm value afterward. Use a dedicated profile because the app persists configuration locally.

Review the result rather than treating `capacityClosureEligible: true` as an automatic verdict. Compare both on windows against the middle off window, inspect all raw intervals and long-frame entries, confirm the accepted consumer counts, and account for device refresh rate, thermal state, power mode, browser warnings, and visible interruptions. A physical desktop result and a physical mobile result are both required by the current gate.

Consumer counts are recorded by current source family and by viewport visibility. They describe the exact captured scene; an older receipt may have had different panels or controls open.

## Current evidence status

The committed `software-rendered-verification.json` exercises this procedure in a visible Xvfb Chrome window. It is useful for validating the capture path and checking for a gross UIBeat regression. It cannot close the named physical-device or native displayed-frame gate.
