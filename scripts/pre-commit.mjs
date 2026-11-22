#!/usr/bin/env node
// Pre-commit: lint, type-check, and the tests related to the staged files.
// Same commands as the package scripts (they are thin wrappers over these), run
// with node so the hook works where bun is not on PATH. type-check and test take
// the shared verify lock, so a hook may wait behind another worktree's job.
import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CODE = /\.(?:vue|[cm]?[jt]sx?)$/
const NOT_CODE = /\.(?:md|mdx|txt|png|jpe?g|svg|webp|ico|woff2?)$|^docs\/|^licenses\/|^LICENSE$|^NOTICE$/

export function stagedFiles() {
  return execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean)
}

/** The checks to run for a set of staged files, in order. Empty when nothing code-like is staged. */
export function plan(files, exists = path => existsSync(resolve(root, path))) {
  // Deleted files count: removing a module can break its importers, and lint/type-check see that.
  if (!files.some(file => !NOT_CODE.test(file))) return []
  const related = files.filter(file => CODE.test(file) && exists(file))
  const node = args => ({ command: process.execPath, args })
  return [
    { name: 'lint', ...node(['lint/run.mjs']) },
    { name: 'type-check', ...node(['scripts/verify.mjs', 'type-check']) },
    ...(related.length ? [{ name: 'related tests', ...node(['scripts/verify.mjs', 'test', 'related', '--run', '--passWithNoTests', ...related]) }] : []),
  ]
}

function main() {
  const steps = plan(stagedFiles())
  if (!steps.length) { console.log('pre-commit: nothing staged, or only docs/assets: skipping checks.'); return 0 }
  if (!existsSync(resolve(root, 'node_modules'))) {
    console.error('pre-commit: node_modules is missing, so the checks cannot run. Run `bun install --frozen-lockfile` (or skip once with `git commit --no-verify`; CI will still run them).')
    return 1
  }
  for (const step of steps) {
    console.log(`\npre-commit: ${step.name}`)
    const started = Date.now()
    const result = spawnSync(step.command, step.args, { cwd: root, stdio: 'inherit' })
    if (result.status !== 0) {
      console.error(`\npre-commit: ${step.name} failed (exit ${result.status ?? result.signal}). Fix it, or skip once with \`git commit --no-verify\` (CI will still run it).`)
      return result.status ?? 1
    }
    console.log(`pre-commit: ${step.name} passed in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main()
