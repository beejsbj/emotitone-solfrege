# Strudel Looper transport spike

Throwaway slice 1. See `docs/research/looper-strudel-transport.md` for the decision.
This directory is isolated from `src/main.ts` and the production playback service.
The Vite build has a separate HTML entry; Vercel maps `/spike/strudel-transport`
to it. Locally open `/audio-lab/spike-strudel.html` after `bun run dev`.

The phone page uses Twinkle, Midnight Dorian, Highland Reel and Cyber Pulse
from `src/data/patterns.ts`, with independent 3/4-bar periods,
played on synths to avoid sample downloads. Start enables audio, Join/leave
changes membership, Mute/solo gates members, Pin preserves the source scale,
and rate/offset select relative speed and shared-bar displacement. Select Desk
to highlight one separately compiled phrase while the full stack plays.
Choose an immediate cached swap (effective at the next query window) or a
future bar beyond the scheduler's already queried frontier.

## Measurements

```sh
bun install
bun run test:spike-strudel
# Faster transport rerun, excluding the intentionally expensive compiler bench:
SPIKE_SKIP_COST=1 bun run test:spike-strudel audio-lab/results/spike-strudel-trials.json
# Compiler-only receipt:
SPIKE_COST_ONLY=1 bun run test:spike-strudel audio-lab/results/spike-strudel-cost.json
# One development smoke cell:
SPIKE_SMOKE=1 SPIKE_SKIP_COST=1 bun run test:spike-strudel audio-lab/results/spike-strudel-smoke.json
```

Node and Chrome (`CHROME_BIN` override) are required. The runner uses the existing
`audio-lab/run.mjs` approach: Vite + Chrome DevTools Protocol, a real AudioContext,
real Strudel packages, real `StrudelNotation`, and real `emotitoneStrudelOutput`.
It does not alias/mock the audio output. Four independent Superdough orbit taps
feed the existing `lab-capture` AudioWorklet, so PCM attacks can be attributed
to phrases. These are software render-graph times, not speaker loopback.

The measurements run separately from expensive package verification. Haps are
matched against an independent arithmetic grid from source note times, bar
period, offset and rate. PCM threshold crossings use amplitude 0.0005 after
10 ms silence, with 12 ms matching tolerance. Hap matching tolerance is 3 ms;
raw events, cycle snapshots and all match errors are retained in receipts.
Known failing strategies are experimental controls, not passing assertions.
The runner exits nonzero if the recommended path fails its checks.

The benchmark uses 64-note phrases with varying recorded articulation, 1/4/8
members, three warmups and twelve measured trials per size. It reports
transpilation (including mini source locations), evaluation of already
transpiled JS (including mini parsing), and rebuilding a stack from cached
Pattern objects. This is elapsed main-thread time on this host, not phone CPU.

`source-scout.md` records an independent source inspection; the research verdict
reconciles it with measurements. No production service seam was changed.
