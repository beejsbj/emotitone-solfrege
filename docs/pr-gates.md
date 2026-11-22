# Checks, hooks and PR gates

What runs where, so a change is checked before it merges and a PR carries its evidence.

| Where | What runs | Source |
|---|---|---|
| `git commit` (pre-commit hook) | `lint`, `type-check`, and the tests related to the staged files. Docs-only commits skip all three. | `.githooks/pre-commit`, `scripts/pre-commit.mjs` |
| Every PR and push to `main` | `type-check`, full `test` (plus `test:verify`), `lint`, `bundle` | `.github/workflows/ci.yml` |
| Every PR | `verification-section`, `test-integrity` (re-run when the description is edited) | `.github/workflows/pr-gates.yml`, `scripts/pr-gates/` |

## The hook

`bun install` runs `prepare`, which sets `core.hooksPath=.githooks` (`scripts/install-hooks.mjs`). The setting lives in the repository's shared git config, so every worktree of the checkout gets the hook once it has installed dependencies. A commit in a worktree with no `node_modules` fails with an instruction to run `bun install --frozen-lockfile`; it does not skip quietly. The installer does nothing in CI, on Vercel, outside a git checkout, or when `core.hooksPath` is already set to something else.

The hook runs the same commands as the package scripts through `node` (no `bun` needed on PATH). `type-check` and the tests take the shared verify lock (see [testing.md](testing.md)), so a commit may wait behind another worktree's job. The tests are the ones Vitest finds related to the staged files (`vitest related`); CI runs the whole suite. Skip once with `git commit --no-verify`; CI is the backstop and will run the same checks.

## Gate 1: a Verification section

The PR description must contain a `## Verification` section with at least 30 characters that are not a placeholder: the commands you ran and what they showed, or `Not run: <why>`. The PR template (`.github/pull_request_template.md`) has the heading. An empty section, `TODO`, `n/a`, or only the template's comment fails.

## Gate 2: tests deleted, skipped or loosened

The check diffs every test file (`*.test.*`, `*.spec.*`, anything under `__tests__/`) against the PR's merge-base and fails when it finds, without a stated reason:

| Finding | Meaning |
|---|---|
| `deleted-file` | a test file was deleted |
| `skipped` | an added `.skip`, `.skipIf`, `.todo`, `.only`, `.fails` (also `it.concurrent.skip`), `xit`, `fit`, `this.skip()`, `{ skip: true }`, at the start of a line |
| `removed-tests` | a test case title that was in the file and is gone (a close rewording counts as a rename), or fewer cases than before. Commented-out tests count as removed, and deleting one test while adding another in the same file is still seen |
| `removed-assertions` | fewer `expect(...)` calls in a file than before (comment lines are not counted) |
| `weakened` | on the same subject, a stricter matcher became a weaker one (`toBe` to `toBeTruthy`, `toEqual` to `toContain`), a bound moved the lenient way (`toBeLessThan(0.3)` to `toBeLessThan(0.6)`, `<` to `<=`), `toBeCloseTo` lost digits, or a loose `expect.any(...)` replaced a value |
| `widened` | a number grew on a line naming a tolerance (`EPSILON`, `tolerance`, `atol`, `rtol`, `TOL...`; not `threshold` or `margin`, whose direction is ambiguous) |

A stated reason is one line in the PR description: `Test change: <why this is right>` (20 or more characters; `n/a` and `<why>` do not count). One line covers every finding in the PR; the job summary lists what it covered, so the reviewer can see it. Tightening and re-baselining (`toBeLessThanOrEqual(136)` to `72`, a new expected value at the same precision) are not findings.

**Limits.** The checks are line-based heuristics tuned on this repository's history (about two PRs in five trip one: 23 of the last 60 on `main`, nearly all removing or replacing real test cases; the reason line is the cost). They miss: a skip written mid-line (`describe('a', () => { it.skip(...) })`, `it.each(table).skip`), a loosening spread over several lines, an assertion that is not `expect(...).matcher(...)` (`assert.*`, chai), a weaker assertion in a helper, a mock that now returns what the test expects, a raised timeout, coverage or exclude settings in `vitest.config.ts`, and tests moved out of a test glob. They guard against accidents, not adversaries: a PR can edit `scripts/pr-gates/`, so review of that directory matters. Tests for the gates themselves, including real past hunks from this repository, are `scripts/pr-gates/pr-gates.test.mjs` (`bun run test:verify`).

## Making the checks required

A workflow that fails does not block a merge on its own. Merging is blocked by branch protection on `main`, which today requires `type-check`, `test`, `lint`, `bundle` and `review-evidence`. `verification-section` and `test-integrity` must be added to that list by a repository admin (issue #196) before they block; until then they report but do not stop a merge.
