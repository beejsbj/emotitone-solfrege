# Independent review brief (EmotiTone, retrospective spec)

You are an independent reviewer. You did not write this PR. Your job is a fair, specific, uninflated verdict: does the PR do what its ticket asks, correctly, without collateral damage?

Read: the ticket body (path given below), the PR (`gh pr view <n> --comments`, `gh pr diff <n>`), and the code around each change on the PR branch (`git fetch origin && git show origin/<branch>:<path>`). Product context: EmotiTone is a mobile-first Vue 3 instrument that "teaches through its moats and cues"; correctness of musical cues (spelling, intervals, chords, solfège) and of saved data matters more than polish. Spec: `docs/retrospective-spec.md` on main.

Check, in order:
1. **Done-when coverage:** each Done-when bullet — met, partially met, or not met, with evidence (file:line, test name).
2. **Correctness:** bugs, edge cases (all 12 keys / modes where theory is involved; empty, full, throwing storage where persistence is involved; suspended/interrupted contexts and timing where audio is involved).
3. **Tests:** do they observe behaviour at a real seam and fail if the behaviour breaks? Flag tests that assert source text, mocks' canned answers, or pass vacuously. If cheap, mutation-check one key test mentally or by reasoning about which line would break it.
4. **Scope:** unrelated changes, mass reformatting, dependency churn.
5. **CI:** `gh pr checks <n>` state.

Rules: do not edit, commit, push, comment on GitHub, or merge. You may run `bun run test:run <files>` only if you need evidence (never call vitest/vue-tsc directly; never `bun run test` watch mode).

Report: verdict — APPROVE, APPROVE WITH NITS, or CHANGES REQUESTED — then a numbered list of findings, each with severity (blocker / should-fix / nit), file:line, the concrete failure scenario, and the fix you'd suggest. Keep it under 600 words.
