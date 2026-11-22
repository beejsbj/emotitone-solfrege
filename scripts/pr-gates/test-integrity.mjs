#!/usr/bin/env node
// PR gate: a diff may not delete, skip or loosen a test unless the PR body says why.
//   BASE_SHA / HEAD_SHA  the PR's base and head commits (default: origin/main...HEAD)
//   PR_BODY              the PR description; a "Test change: <reason>" line accepts the findings
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { analyzeTestDiff, formatFindings, statedTestReason, TEST_FILE } from './lib.mjs'

/** The unified=0 diff of test files between merge-base(base, head) and head. */
export function testDiff(base, head, cwd = process.cwd()) {
  const names = execFileSync('git', ['diff', '--name-only', '--find-renames', `${base}...${head}`], { cwd, encoding: 'utf8' })
    .split('\n').filter(Boolean).filter(path => TEST_FILE.test(path))
  if (!names.length) return ''
  return execFileSync('git', ['diff', '--unified=0', '--find-renames', `${base}...${head}`, '--', ...names],
    { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
}

export function run({ base, head, body, cwd } = {}) {
  base ??= process.env.BASE_SHA || 'origin/main'
  head ??= process.env.HEAD_SHA || 'HEAD'
  body ??= process.env.PR_BODY ?? ''
  const findings = analyzeTestDiff(testDiff(base, head, cwd))
  const lines = formatFindings(findings)
  const reason = statedTestReason(body)
  let summary
  let code = 0
  if (!findings.length) {
    summary = 'No test was deleted, skipped or loosened.'
  } else if (reason) {
    summary = `${findings.length} test change(s), accepted with the stated reason: ${reason}\n\n${lines.map(l => `- ${l}`).join('\n')}`
  } else {
    code = 1
    summary = `${findings.length} test change(s) with no stated reason:\n\n${lines.map(l => `- ${l}`).join('\n')}\n\n` +
      'Fix the code instead, or add a line to the PR description: "Test change: <why this is right>" (20+ characters).'
    for (const finding of findings) console.log(`::error file=${finding.file},title=Test ${finding.kind}::${finding.detail}`)
  }
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Test integrity\n${summary}\n`)
  return code
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = run()
