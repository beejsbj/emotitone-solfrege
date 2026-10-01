# Architecture assessment and remaining findings

This records the September 7, 2026 architecture review across seven PR heads and five investigation tracks: general architecture, color, Stage/Canvas, performance, and Strudel/CodeMirror. It preserves the eight findings that were not dispatched as independent architecture PRs during that review. This documentation PR does not implement them.

Read the [full consolidated report](review-2026-09-07.html) in a browser for source links pinned to the inspected commits, ownership diagrams, alternatives, and evidence. GitHub displays HTML as source; this index is the reviewable Markdown entry point. The HTML uses CDN-hosted Tailwind and Mermaid for presentation and diagrams.

## Scope and freshness

The review inspected separate branch heads; it did **not** validate a combined tree containing all seven PRs. The findings are a historical assessment, not a claim that all eight remain unresolved on current main. PR status was refreshed on September 12, 2026.

Subsequent work materially changes the baseline:

- [#59 — Music Color](https://github.com/beejsbj/emotitone-solfrege/pull/59), merged, introduces a renderer-neutral numeric OKLCH authority and adapters. This overlaps directly with finding 3; do not reopen the old HSLA proposal without checking the new implementation.
- [#63 — Stage and Config](https://github.com/beejsbj/emotitone-solfrege/pull/63), merged, changes the Stage renderers and controls. Revalidate findings 4–7 against that implementation.
- [#50 — Loading screen](https://github.com/beejsbj/emotitone-solfrege/pull/50) and [#60 — UIBeat protocol](https://github.com/beejsbj/emotitone-solfrege/pull/60), both merged, are additional baseline changes to consider when revisiting startup and playback projection.

These are overlap notices based on PR scope, not a fresh correctness audit or an assertion that the findings are fixed.

## The seven independent architecture PRs

| Area | PR | Status on September 12 |
| --- | --- | --- |
| Recorded pattern timing | [#33](https://github.com/beejsbj/emotitone-solfrege/pull/33) | Open |
| Visual configuration rules | [#34](https://github.com/beejsbj/emotitone-solfrege/pull/34) | Open |
| Held-note ownership | [#35](https://github.com/beejsbj/emotitone-solfrege/pull/35) | Open |
| Instrument catalog | [#38](https://github.com/beejsbj/emotitone-solfrege/pull/38) | Closed, not merged |
| Knob interaction | [#39](https://github.com/beejsbj/emotitone-solfrege/pull/39) | Closed, not merged |
| MIDI session | [#40](https://github.com/beejsbj/emotitone-solfrege/pull/40) | Open |
| CodeStrip transport | [#41](https://github.com/beejsbj/emotitone-solfrege/pull/41) | Closed, not merged |

The consolidated report retains the original inspected-head manifest. An implementation existing on a PR branch is distinct from it being present on main.

## Eight findings retained for follow-up

### 1. Musical context ownership — strong structural candidate

Key and mode live in the music store and a mutable music-theory singleton. Setters, computed reads, and hydration synchronization require callers to know their ordering; Strudel visual-note resolution reads the singleton separately. Consolidate context resolution behind one owner while retaining the theory implementation. No new user-visible failure was reproduced in this scan.

Evidence and proposed boundary: [musical context](review-2026-09-07.html#musical-context).

### 2. Startup and recovery ownership — needs behavioral evidence

LoadingSplash coordinates enable/retry phases while useAppLoading owns shared progress, timeouts, completion watchers, and reset. Reset does not clearly retire outstanding work, and the relevant tests replace the orchestrator with mocks. Establish the real retry and cancellation contract before extracting it. Preserve lazy loading and warmup behavior. This was a source-level risk, not a reproduced retry failure.

Evidence and alternatives: [startup](review-2026-09-07.html#startup).

### 3. Numeric color projection — historical defect, now overlaps #59

The historical music color service emitted fractional HSLA values, but the keyboard adjustment parser accepted integers only. A real default C-major Do output failed that parser, silently skipping adjustments. Other consumers parsed or round-tripped color strings separately. Keep numeric color information until renderer or hardware output; a narrow parser repair was also a valid option at the time. Preserve musical mapping, off-scale behavior, and output-specific policies. Reconcile this finding with the merged OKLCH authority before proposing further work.

Evidence and alternatives: [color projection](review-2026-09-07.html#color-projection).

### 4. Ambient gradient cache ownership — narrow correctness candidate

Ambient resolves colors, but the generic canvas cache key omitted resolved color/configuration. A controlled renderer probe changed saturation from 0.8 to 0.3 and retained the original 80% gradient. Correct the key, remove the cache with an explicit allocation tradeoff, or move cache ownership to its consumer. This shares color data with finding 3 and renderer ownership with finding 5; it need not become a separate refactor.

Evidence and alternatives: [ambient cache](review-2026-09-07.html#ambient-cache).

### 5. Live canvas lifetime — strong ownership candidate

The historical host destructured a Pinia boolean into a nonreactive snapshot; a Vue/Pinia probe confirmed that toggling the store did not change that snapshot. Initialization, frame scheduling, listeners, resize, and cleanup were split across owners. String layout retained initial width while resize updated other geometry. Consolidate the host lifecycle contract and test enable/disable, resize, and unmount together. Preserve render ordering and separate CSS visual behavior. Recheck the current Stage implementation first.

Evidence and alternatives: [canvas lifetime](review-2026-09-07.html#canvas-lifetime).

### 6. Hilbert audio tap lifetime — concrete lifecycle defect in the inspected source

A controlled audio/DOM probe retained one master-to-gain edge after cleanup. Cleanup during pending initialization also produced a null `connect` failure. Give the tap ownership of its exact graph edges and pending initialization; cleanup must retire both. This is separable from the broader canvas refactor, but shares its lifecycle boundary. The probe does not establish real-browser audio retention or audible impact.

Evidence and alternatives: [Hilbert lifetime](review-2026-09-07.html#hilbert-lifetime).

### 7. Private string simulation state — promising, browser validation required

The inspected renderer traversed deeply reactive string state in the drawing loop and repeatedly allocated held-note snapshots. A controlled experiment replacing a deep ref with a shallow ref preserved all 2,121 sampled coordinates. Median CPU timings improved from 11.39 to 1.21 ms for idle frames and 16.94 to 2.74 ms for chord frames in that experiment. These are noisy Node measurements with controlled canvas, music, and animation adapters, not browser frame-rate guarantees. Start with private simulation state and a once-per-frame note snapshot; the latter optimization was not benchmarked. Keep geometry and clock changes separate.

Method, ranges, and evidence: [string simulation](review-2026-09-07.html#string-simulation).

### 8. CodeStrip source-revision projection — concrete identity mismatch

With an evaluated `n("< [ 0 1 ] >")`, inserting `2 ` before `0` without reevaluating made a historical custom highlight associate the old event offset with the wrong visible note. Installed native Strudel highlighting mapped the range through the same CodeMirror transaction correctly. Give custom projection an evaluated-source identity and an explicit mapping or invalidation policy. Suppressing custom progress after edits is a smaller alternative with a live-feedback tradeoff. Keep this distinct from transport ownership and recording timing.

Parser limitations and draft-versus-generated-code replacement are adjacent concerns, not additional approved refactors. The experiment used controlled events in CodeMirror state, without mounted EditorView or live audio.

Evidence and alternatives: [source revision](review-2026-09-07.html#strudel-source-revision).

## Evidence and limits

The [evidence directory](evidence/) preserves the original probe scripts, outputs, and performance manifest. Scripts retain their original checkout paths and adapter assumptions as historical records; they are not portable tests or part of the application test suite. Reproduction requires the inspected source revisions and dependencies, and adjusting those paths. No new runtime verification was performed for this documentation PR.

The source report provides commit-pinned locations rather than pretending the findings refer to today's line numbers. Archived measurements must not be used as a current performance baseline without rerunning them in the browser and on representative devices.

## Next architectural map

The next useful artifact is a repository-backed map that reconciles these overlapping findings with the code actually on main. It should cover module responsibilities and dependencies; end-to-end input, recording, playback, and visual flows; state and resource ownership; data representations; and test/performance coverage. Clearly distinguish implemented behavior, changes existing only in PRs, and proposed boundaries.

That map has not been completed by this assessment. Before dispatching more refactors, refresh the affected findings, group them by owner, and choose the smallest change with a concrete behavior or maintenance benefit. The eight entries are investigation records, not eight equally urgent implementation tickets.
