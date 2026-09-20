# Repaired worklet follow-up — 2026-09-20

The full follow-up passes **63 of 64 raw checks**. All four rhythm captures,
notification ownership/order, recording retention, tempo/chord edits, and the
unchanged 1,000 ms final-settlement bound pass. The remaining failure is a fixture
error: the newly extended 100 ms tail assertion for Together contradicts its
existing 200 ms piano release articulation. The failed receipt remains unchanged;
it is not an all-green run.

The [raw receipt](results/native-comparison/worklet-repaired-final.json) and
[derived summary](results/native-comparison/worklet-repaired-final-summary.json)
come from `fb5e227`, matching root `bf26759` source and harness. Source/harness
hashes remained unchanged, browser warnings were empty, and external event-loop
slip was 7.72 ms. All twelve warm touch/keyboard inputs produced distinct stereo
piano audio: median 5.58 ms, range 5.58–17.19 ms. These are software capture
measurements, not physical input-to-speaker latency.

| Case | Audible PCM windows | Completed/recorded notes | Owners closed | Final settlement, ms | PCM from final keyup +100 ms |
| --- | ---: | ---: | ---: | ---: | --- |
| 60 BPM, one key, 300 ms stall | 12/12 | 13/13 | 1/1 | 347.8 | Silent |
| 60 BPM, one key, 650 ms stall | 12/12 | 13/13 | 1/1 | 496.5 | Silent |
| 220 BPM, three keys, 300 ms stall | 44/44 | 146/146 | 3/3 | 748.8 | Silent |
| 220 BPM, three keys, 650 ms stall | 44/44 | 142/142 | 3/3 | 694.1 | Silent |
| Immediate rhythmic release | — | 4/4 | 3/3 | 281.8 | Silent |
| Arpeggio chord/tempo edits | — | 36/36 | 4/4 | 852.8 | Silent |
| Eight fast Together chords | — | 24/24 | 24/24 | 629.2 | Nonzero; fixture contradicts articulation |

Every lifecycle arrival was delivered in exact FIFO order; every attack/release
pair was unique and complete; every pressed owner closed once; every recorded
timeline was valid; no active musical notes remained. The removed arpeggio pitch
stayed removed and the edited tempo produced its 125 ms grid. Largest synchronous
renderer operation was 1.1 ms, below 25 ms. Maximum in-gesture lifecycle delivery
lag was still 2.31 seconds, so the final-settlement result is not a general
sub-second callback guarantee.

The worklet retains its measured memory cost: 145,147,392 additional prepared PCM
bytes (138.42 MiB), alongside 144,462,704 bytes of original Superdough piano
buffers. Production source did not change during this full capture. The original
four-way comparison and failed first inbox target remain preserved separately.

The Together tail assertion was wrong. `getLiveArticulation('piano')` in
`src/services/liveArticulation.ts` specifies a 0.2 second release. The worklet
core preserves that release for notes without a finite duration, including
Together; rhythmic pulses use 0.03 seconds. The existing core regression
`preserves30ms rhythmic releases while Together retains instrument articulation`
expressly tests this distinction.

The final three keyups and audio release edges in the failed Together capture
have identical audio times: 86.970340, 86.990658, and 87.002268 seconds. Their
synchronous release calls followed trusted keyup by 0.1 ms. The failed probe
begins at 87.102268 seconds, halfway through the last intended 200 ms fade. It
contains a 0.09815 peak and 0.005817 RMS. The final 100 ms of the capture is exactly
silent, but the receipt retained statistics rather than the PCM waveform, so its
precise decay endpoint cannot be recovered. This establishes a contradictory
fixture; it does not establish silence exactly at the legitimate release bound.
A single narrow fast-chord follow-up will measure that existing contract and
retain the 100 ms subwindow as an informational observation. No production change
or full-run retry is justified by this fixture correction.

The narrow fixture observes the envelope actually posted in the prepared piano
instrument and checks that it matches `getLiveArticulation('piano').release`,
currently 200 ms. Its silence window begins after the final audio release edge,
that envelope length, and one 128-frame render quantum (2.90 ms at 44.1 kHz).
Trusted keyup timestamps and the old keyup-plus-100-ms observation remain in the
receipt. It also retains short stereo float32 PCM around the final release,
25 ms decay-window statistics, and the exact last nonzero sample time. No audio
or application code changes. Run only this case, with no warm or other cases:

```sh
LAB_UI_BACKEND=worklet LAB_NATIVE_COMPARE=1 LAB_NATIVE_FAST_CHORD=1 LAB_UI_STARTUP_SECONDS=60 LAB_UI_TRIALS=0 LAB_UI_FILTER='^$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/worklet-together-articulation.json
```
