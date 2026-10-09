# Spike: the Looper transport on the worklet clock (BJS-484, not for merge)

Throwaway. The design and the numbers live in `docs/research/worklet-engine.md`
on the BJS-484 doc PR. This branch exists so the numbers can be reproduced.

## What it is

- `src/audio/live/transport.ts`: an audio-thread transport. One bar grid owned
  by the render clock (a piecewise tempo map in frames), members as plain event
  tables (bars within a rate-1 period), join/leave/update/solo/tempo changes
  applied at the next render quantum or at an exact future bar.
- `src/audio/live/core.ts`: the production live core, with the transport
  collected once per render quantum and its notes started at exact frames
  through the existing voice path. Voices carry member identity; a member can
  render to its own output bus so the lab can capture members separately.
  Mute and solo fade a member's sounding voices over 10 ms
  (`VOICE_RETIRE_SECONDS`).
- `audio-lab/worklet-transport/`: #140's receipt checks, ported. The same four
  fixtures, the same arithmetic oracle (raw notes, never the transport's table),
  the same PCM onset detector (0.0005 after 10 ms silence, 12 ms match), the
  same 90/150 BPM matrix. No Strudel and no superdough are loaded.

## Run

```sh
bun run test:worklet-transport            # full matrix, ~7 minutes
SPIKE_ONLY=stall SPIKE_REPEATS=1 bun run test:worklet-transport
```

One headless Chrome, closed on exit. Writes `audio-lab/results/worklet-transport.json`
with the host's load average and free memory before and after.

## Limits

Desktop headless Chrome render graph on bjslab under shared load. Sine voices
only. No speaker loopback, no touch, no phone. Device numbers come from the
phone gate (BJS-494).
