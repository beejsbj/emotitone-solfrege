# Verification and test scope

The [2026-09-23 test-value audit](testing-audit/2026-09-23/README.md) inventories the remaining suite and records specific pruning, replacement, and harness recommendations. Those recommendations are separate from the resource controls already implemented below.

Use `bun install --frozen-lockfile`, then the package commands. Node 22 and Git are required by the verification launcher and its subprocess checks.

| Task | Command |
|---|---|
| Focused regression checks | `bun run test:run src/__tests__/services/recordedTiming.test.ts` |
| Full runtime suite, once | `bun run test:run` or `bun run test` |
| Pure logic/audio-core project | `bun run test:node` |
| DOM/component project | `bun run test:dom` |
| Typecheck without bundling | `bun run type-check` |
| Typecheck and production bundle | `bun run build` |
| Launcher concurrency/cancellation checks | `bun run test:verify` |
| Explicit interactive mode | `bun run test:watch` or `bun run test:ui` |
| Browser-rendered audio checks | `bun run test:audio-browser` (see `audio-lab/README.md`) |
| Pattern serialization benchmark | `bun run bench:persistence` |

`test` and `test:run` exit after one run. `build` already runs a typecheck, so a separate typecheck immediately before it repeats work. Use focused runtime tests during editing and a full check at a coherent checkpoint. The launcher and Vitest check different things; keep their results distinct.

## Shared-host budget

`scripts/verify.mjs` holds a lock in the real Git common directory for typechecks, builds, and Vitest commands. The lock covers every worktree attached to that checkout. Waiting jobs actually execute after acquiring it; they do not reuse another job's result. A failed check retains its nonzero status. Normal cancellation forwards the signal to the owned child process group and releases the lock after the group has exited.

Watch/UI sessions hold the lock until closed. A waiting command reports the lock path and stops with an error after 15 minutes. If a launcher dies, a later invocation can recover a known dead owner whose child group also exited. An unknown/corrupt lock or interrupted launch is retained for inspection. Follow the printed path, inspect `owner.json` and the recorded processes, and remove a stale lock only after confirming no verification child is still running.

The default compiler heap is 1536 MiB of V8 old-space. This is **not a total RSS cap**. A legitimately larger project can use `EMOTITONE_TYPECHECK_HEAP_MB=<positive integer>` on a host with sufficient headroom. Compiler failure under this budget is visible; the launcher never silently skips checking. Vitest defaults to two workers, trading some elapsed time for lower peak memory. A dedicated CI host can explicitly override that worker count.

Direct `vue-tsc`, `vitest`, `bunx`, and separate Git clones bypass this repository lock. `bun test` invokes Bun's own runner; use `bun run test` for this project's Vitest suite. Browser audio measurements have their own runner; schedule them separately from CPU-heavy verification. This code coordinates cooperating project commands, not every process on the host.

## What each test proves

The `node` project exercises pure calculations, real audio-core rendering, and adapter-driven logic without DOM globals or application setup. The `dom` project uses happy-dom plus browser/API shims and external-effect mocks. Music theory, catalog/config data, and normal DOM events remain real by default. Tests needing a controlled event sink or a particular dependency mock declare it in that suite and restore it afterward.

Add a test for an observable behavior, failure boundary, resource lifetime, or meaningful architecture contract. Prefer changing an existing regression test when it already owns that behavior. Audio timing, voice budgets, cleanup, recording fidelity, actual persistence, and rendered output deserve protection. Assertions about a source comment, a variable's spelling, duplicate shell presence, or a mock's canned answer usually do not. Missing prerequisites must fail, not return successfully before any assertion.

The retired `test:e2e` collection used happy-dom, mocked shells, and direct store calls. It did not exercise multiple browsers. Its useful behavior is covered by current component/store tests and the separately named browser audio lab. Old palette suites and their scaffolding were retired with their removed production APIs; Git retains the history. Canvas lifetime tests use current APIs alongside the existing harmonic and pixel-rendering suites.

## Incident behind the limits

The 2026-09-23 investigation recorded four concurrent `vue-tsc` processes in one bjslab worktree, totaling approximately 5.17 GiB RSS. T3 exceeded its 7 GiB cgroup memory-high threshold and its local HTTP endpoint timed out. After those exact compiler processes were stopped in the authorized incident session, cgroup usage fell by approximately 4.51 GiB and the local endpoint returned HTTP 401 in 2–3 ms. This supports aggregate resource pressure from concurrent checks; it does not establish one 5 GiB compiler or a compiler leak.

Separate isolated checks used approximately 744–756 MiB on bjslab. Runtime tests were excluded from the compiler program. On the Mac, the pre-cleanup suite's sampled aggregate RSS was 1654.5 MiB with default workers versus 971.3 MiB with two workers (40.05 versus 63.71 seconds). These are measurements from those runs, not universal ceilings. The locking change addresses overlapping verification, while the worker limit and test cleanup address runtime test cost and signal quality.

The cleanup's final Mac run passed 1,661 runtime tests across 148 files, with one intentionally skipped benchmark and no failures or collection errors. `bun run test:verify` passed all four subprocess checks. `bun run build` passed, including the bounded typecheck; existing bundle-size and stale Browserslist warnings remain. The full runtime run took 30.54 seconds and peaked at 864.0 MiB sampled aggregate RSS; the build took 16.53 seconds and peaked at 1128.0 MiB. Process-tree RSS was sampled every 200 ms and can double-count shared pages or miss brief peaks. These were practical runs, not a cache-controlled benchmark. Validation and changes were local; the bjslab checkout was not updated by this work.
