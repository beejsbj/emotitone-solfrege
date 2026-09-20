# Native lookahead comparison — 2026-09-20

This document preserves the original four-way comparison. The subsequent
[repaired worklet follow-ups](worklet-repaired-results.md) resolve its notification
backlog and document the separate Together-articulation fixture correction.

**The worklet and a two-second native queue both preserve the measured rhythm.
Neither currently earns a complete performance pass.** Native2000 exceeds the
predeclared synchronous-operation limit; worklet lifecycle delivery falls behind
by approximately 18–20 seconds in the dense cases. That backlog requires diagnosis
before this evidence can justify shipping the worklet as the complete solution.

All four runs used revision `37666eaa070aa194f96364ffc9896f1181559e68`, whose
production source matches integrated root `d52d29e`. Application and harness
hashes match across the four runs and remained unchanged during every capture.
The Superdough dependency hash matches too. All four have zero browser warnings,
trusted inputs, one AudioContext, valid chord submission timing, PCM covering
every delivered release, and external event-loop slip below the declared 250 ms
limit. The actual maxima were 4.0, 2.7, 12.0 and 2.9 ms respectively.

The earlier empty-startup, CodeMirror-reentrancy and host-stalled exploratory
receipts are excluded. No final run was repeated to obtain a pass.

| Observed measure | Native400 | Native1200 | Native2000 | Worklet |
| --- | ---: | ---: | ---: | ---: |
| 60 BPM, one key, 300 ms stall: audible PCM windows | 11/12 | 12/12 | 12/12 | 12/12 |
| 60 BPM, one key, 650 ms stall | 11/12 | 12/12 | 12/12 | 12/12 |
| 220 BPM, three keys, 300 ms stall | 29/44 | 33/44 | 44/44 | 44/44 |
| 220 BPM, three keys, 650 ms stall | 24/44 | 31/44 | 44/44 | 44/44 |
| Largest synchronous renderer operation, ms; limit 25 | 23.3 | 12.6 | **84.7** | 0.2 |
| Largest synchronous press, ms | 4.5 | 12.6 | **56.7** | 0.1 |
| Peak newly retained browser source/gain nodes; limit 256 | 36 | 110 | 180 | 0* |
| Retained source/gain nodes after cleanup | 0 | 0 | 0 | 0* |
| Maximum lifecycle callback delivery lag, ms | 790 | 1,346 | 1,516 | **20,411** |
| Additional prepared PCM, MiB | 0 | 0 | 0 | **138.42** |
| Removed arpeggio pitch stays removed | Pass | Pass | Pass | Pass |
| Tempo-edit grid | Fail: missed steps | Pass | Pass | Pass |
| Complete committed protocol | Fail | Fail | Fail | **Fail** |

\* Worklet uses its existing persistent node and internal voices. Zero newly
created browser source/gain nodes does not mean zero voices, zero memory or zero
rendering work. Its 64-voice cap is covered separately by renderer tests.

All 48 warm inputs produced distinct stereo piano audio. Each renderer had a
5.58 ms median across its 12 observations; ranges were 5.58–14.29, 5.58–17.19,
5.58–14.29 and 5.58–14.29 ms. These are small software measurements, not physical
input-to-speaker latency or a claim of identical device performance. The original
Superdough piano buffers occupy 144,462,704 bytes in every case; the worklet adds
145,147,392 bytes. Neither number is total process memory.

Native2000's worst 84.7 ms operation was a release; its worst press was 56.7 ms.
These measurements include the real manager, renderer and synchronous application
lifecycle/plan callbacks. They do not isolate browser-node creation or audio DSP.
Worklet command calls mainly post messages; its later callback costs are outside
that synchronous-command measurement. Comparing only 84.7 ms with 0.2 ms would
hide the newly discovered worklet delivery backlog.

The worklet's two 220 BPM cases fail the committed combined check because the
post-release CDP clock query ran after the recorder's 12-second capacity had been
filled. Consequently `measured.tail.samples` is zero and `rms` is null. This is an
**invalid dedicated tail measurement**, not a demonstrated sounding tail. Actual
last key releases occurred approximately 3.5/3.9 seconds into capture; PCM extended
another 8.47/8.12 seconds beyond them and its final 100 ms is exact silence. Both
cases retain finite PCM and every expected rhythmic window. The raw failed checks
remain unchanged; they must not be rewritten as an all-green result.

The delay itself is substantive: the worklet's last release events have correct
audio timestamps but reach the application roughly 18–20 seconds later. The
maximum browser long tasks in those cases were 382/650 ms and external event-loop
slip was only 2.9 ms. This is not the earlier host-suspension failure. Delivery lag
here is calculated against each capture's initial trusted input's performance and
audio clocks; it is approximate and includes both queue delay and any callback
work before the lab listener runs. Small clock quantization cannot explain a
multi-second backlog. Native2000's corresponding maximum was 1.52 seconds.

The bounded comparison therefore establishes the tradeoff, without selecting an
unqualified winner: 400/1200 ms native queues are insufficient; 2000 ms buys
continuity with expensive synchronous interaction; worklet preserves continuity
with cheap command submission but an unacceptable callback/UI backlog. Keep the
worklet as the audio candidate while diagnosing that backlog. Do not erase the
native reference or claim the complete performance gate passed.

Raw receipts: [native400](results/native-comparison/native400.json),
[native1200](results/native-comparison/native1200.json),
[native2000](results/native-comparison/native2000.json),
[worklet](results/native-comparison/worklet.json).
[Machine summary](results/native-comparison/final-summary.json) is generated with
`node audio-lab/summarize-native-comparison.mjs` from the repository root.

Source-map digest: `3e9b4e165f0b1f74302b7f9852b3aba4e166a3c7a29cc6fa5ee2f99dad8379a8`.
Harness-map digest: `c2f8705fb16b52c412fe1172c97dab376afcbf9fc404ef3723ce5a8614df63f5`.
Superdough SHA-256: `ece72628e518c3259223717aa4d7a4e4fe1e11e5e2c2ece5021d6b01c9bcb6fb`.
The first two are SHA-256 of the corresponding JSON hash maps in each receipt.
