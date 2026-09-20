# Worklet lifecycle backlog diagnosis

The matched receipts show a queue-delivery problem amplified by separate
application updates, rather than duplicated lifecycle events or slow synchronous
lifecycle callbacks. A single CPU diagnostic supports batching incoming responses
before application delivery. It does not yet verify that repair.

| 220 BPM three-key / 650 ms stall | Native2000 | Worklet |
| --- | ---: | ---: |
| Unique lifecycle events | 300 | 326 |
| Musical event span | 3.464 s | 3.730 s |
| Application delivery span | 3.544 s | 23.946 s |
| Median near-synchronous delivery group | 3 events | 1 event |
| Median interdelivery gap | 0.9 ms | 18.3 ms |
| p95 interdelivery gap | 2.5 ms | 359.3 ms |
| Maximum queue lag before worklet callback begins | — | 20.409 s |
| Total observed worklet application callback time | — | 250.2 ms |
| Median / p95 callback time | — | 0.7 / 1.2 ms |

The counts differ because actual release delivery ends the gestures at different
audio times. Every captured event ID/phase is unique; counts fit the sounding
three-key sixteenth-note workload. Two-millisecond grouping is a descriptive
proxy, not direct browser task identity. The worklet arrival trace is installed
before the bridge's handler; the lab lifecycle observer runs after the real app
listener. Their difference isolates that synchronous callback path. The large
queue lag already exists before it runs.

The code explains the contrast. `LivePlaybackProcessor` posts each response from
`LiveAudioCore` independently. Attacks and releases therefore arrive as individual
MessagePort tasks. `bridge.ts` immediately dispatches each one to `livePerformance`,
which updates active-note state and sends recording events. Release recording
splices the history and changes pending notes; Vue's watchers publish notation,
widgets, persistence and visual state. There is a microtask/render opportunity
between incoming port tasks. Native `flush()` calls several event callbacks
synchronously in one task, allowing reactive work to coalesce. Plan emission is
controlled by `planDirty`; the receipts do not establish a lifecycle explosion.

One additional diagnostic ran only the 220 BPM / 650 ms case, after normal piano
preparation, with Chrome's CPU profiler sampling at 1 ms. Its 28.43-second window
had these inclusive attributions (categories overlap):

- Stage drawing: 2.97 s.
- CodeMirror selection reads: 2.33 s; editor dispatch: 0.70 s.
- Vue deep traversal: 0.98 s; persistence: 0.39 s.
- Native/program samples without a JavaScript owner: 14.53 s.

The selection-read stack is `DOMObserver.flush → readSelectionRange`, including
scroll-triggered `forceFlush → measure`. It is outside the existing patch's
`DocView.updateSelection` early return. This finding does not imply that the
patch stopped working. The profile identifies repeated work across the backlog,
not one 20-second callback. Its native/program bucket cannot safely be called
entirely layout, painting, or JavaScript.

The narrow repair candidate is a FIFO bridge inbox that drains queued responses
in one posted task. Preserve every event, plan, owner-ended response and
preparation acknowledgement in order; stop and clear the inbox on disposal.
A MessageChannel drain avoids dependence on animation frames or clamped timers.
Browser evidence must verify that it actually groups queued delivery: task-source
ordering must not be assumed. After repair, check precise recording/MIDI ownership,
PCM continuity, release silence, and the last event's delivery lag. Do not claim
the unprofiled matched group passed or substitute profiled timing for it.

Evidence: [delivery counters](results/native-comparison/delivery-summary.json),
[CPU diagnostic receipt](results/native-comparison/worklet-backlog-profile.json),
[profile](results/native-comparison/worklet-backlog.cpuprofile.gz),
[profile attribution](results/native-comparison/worklet-backlog-profile-summary.json).
Generate counters with `node audio-lab/summarize-native-delivery.mjs`; generate CPU
attribution with `node audio-lab/summarize-pattern-profile.mjs audio-lab/results/native-comparison/worklet-backlog.cpuprofile.gz`.

The opt-in diagnostic command is:

```sh
LAB_UI_BACKEND=worklet LAB_NATIVE_COMPARE=1 LAB_NATIVE_PROFILE=1 LAB_NATIVE_PROFILE_PATH=audio-lab/results/native-comparison/worklet-backlog.cpuprofile.gz LAB_UI_STARTUP_SECONDS=60 LAB_UI_TRIALS=0 LAB_UI_FILTER='^$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/worklet-backlog-profile.json
```

The committed profile is from unrepaired production runtime `d52d29e` (native
worker revision `52f5910` includes the matched receipts but unchanged source).
Diagnostic instrumentation is laboratory-only. No additional renderer comparison
or production change was made for this diagnosis.

Before exercising the inbox repair, the follow-up protocol adds an explicit
settlement bound: final lifecycle and owner notifications must complete within
1,000 ms after the last **delivered trusted keyup**. The injected stall occurs
earlier in the held gesture. Every owner must close exactly once, all lifecycle
pairs must remain unique and ordered, every fully held beat must contain all
three expected pitches, and recorded note count must match completed pairs with
no active musical notes left.

The repaired tail fixture uses that recorded keyup's audio timestamp plus 100 ms.
It no longer asks CDP for a later clock reading. This correction also applies to
future full runs; the original four receipts and their failed zero-sample tail
probes are preserved unchanged. The targeted run does not enable the CPU profiler:

```sh
LAB_UI_BACKEND=worklet LAB_NATIVE_COMPARE=1 LAB_NATIVE_TARGETED=1 LAB_UI_STARTUP_SECONDS=60 LAB_UI_TRIALS=0 LAB_UI_FILTER='^$' node audio-lab/ui-run.mjs audio-lab/results/native-comparison/worklet-inbox-targeted.json
```

The first unprofiled inbox follow-up at native-worker `f381e4a` (source/harness
matching root `9b07188`) improved delivery substantially but **failed the declared
settlement bound**. [Its raw receipt](results/native-comparison/worklet-inbox-targeted.json)
remains unchanged. All other checks pass: 44/44 PCM windows; all three pitches on
every fully held beat; 286 unique, ordered lifecycle events; 143 completed and
recorded notes with valid timelines; exactly three owners closed; no active
musical notes; and exact PCM silence starting 100 ms after the actual last keyup.
There were no browser warnings and external event-loop slip was 2.0 ms.

Final owner/lifecycle settlement took **1,947.5 ms** after final trusted release,
against the predeclared 1,000 ms bound. This must not be described as a pass or
fixed by relaxing the bound after measurement.

Batching itself worked. Grouping by consecutive interdelivery gaps of at most
3 ms gives ten groups, including groups of 87 and 75 events. (The earlier
2 ms-from-group-start statistic subdivides a long batch; neither statistic is a
direct browser task identifier.) Residual work delayed messages before they even
entered the inbox: the last lifecycle arrivals occurred about 4.896 seconds after
first input for an audio edge at 3.289 seconds; the last drain completed at 5.237
seconds. Arrival bursts were also followed by long application/browser tasks
before inbox draining, for example arrival at 2.181 seconds, a 265 ms long task,
and drain at 2.467 seconds. After the final arrival, 235 ms and 81 ms tasks preceded
the last drain. Other post-command tasks reached 454/561 ms. A second posted-task
hop has no demonstrated reason to fix that remaining application task starvation.
No second target or full follow-up was run after this failed acceptance attempt.
