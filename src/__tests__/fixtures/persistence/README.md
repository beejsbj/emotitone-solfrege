# Captured persistence payloads

Exact bytes as a store wrote them to `localStorage`, before any codec. Never
edit a capture by hand; add a new file instead.

- `instrument.v0.store-capture.json` — `emotitone-instrument` as written by
  the real instrument store and today's serializer (`JSON.stringify` through
  `pinia-plugin-persistedstate`), driven over realistic state: four shaped
  instruments, piano selected. Captured 2026-10-10 on origin/main 10717555.
- `instrument.v0.headless-chrome.json` — `emotitone-instrument` read out of
  a real Chrome profile's Local Storage after an audio-lab run (default state).

Still wanted: a payload from Burooj's own devices (`localStorage.getItem("emotitone-instrument")`
in the console on his phone and laptop), added beside these.
