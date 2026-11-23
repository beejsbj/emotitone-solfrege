// The pre-push hook (.githooks/pre-push) run against a throwaway repository with fake remote-tracking
// refs: it must scan only the commits no remote has yet, so a branch that merged main is not blamed
// for main's own authors and lines, while a leak in a new commit still fails.
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
// Joined from pieces so this file holds no personal-looking value itself.
const PERSON = ['practice.person', 'practice-mail.net'].join('@')
const BOT = ['41+practice-bot[bot]', 'users.noreply.github.com'].join('@')
const HOME_PATH = ['', 'home', 'practice-user', 'notes.txt'].join('/')
const ZERO = '0'.repeat(40)

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'pre-push-test-'))
  const fakeHome = join(dir, 'home') // no ~/.config/privacy-scan/patterns from the real machine
  const repo = join(dir, 'repo')
  mkdirSync(join(repo, 'scripts', 'privacy'), { recursive: true })
  mkdirSync(fakeHome)
  copyFileSync(join(root, 'scripts/privacy/privacy-scan.mjs'), join(repo, 'scripts/privacy/privacy-scan.mjs'))
  writeFileSync(join(repo, 'LICENSE'), 'Practice licence text for this throwaway repository.\n')
  const env = { ...process.env, HOME: fakeHome, PRIVACY_PATTERNS: '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }
  const as = email => ({ ...env, GIT_AUTHOR_NAME: 'Practice', GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: 'Practice', GIT_COMMITTER_EMAIL: email })
  const git = (args, email = BOT) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: repo, env: as(email), encoding: 'utf8' }).trim()
  const commit = (file, text, email = BOT) => { writeFileSync(join(repo, file), text); git(['add', '-A'], email); git(['commit', '-q', '-m', `edit ${file}`], email); return git(['rev-parse', 'HEAD']) }
  const push = (local, remote) => spawnSync('sh', [join(root, '.githooks/pre-push')], {
    cwd: repo, env, encoding: 'utf8', input: `refs/heads/x ${local} refs/heads/x ${remote}\n`,
  })
  git(['init', '-q', '-b', 'main'])
  return { dir, git, commit, push }
}

test('a pushed branch that merges main is not blamed for main\'s own commits; a new leak still fails', () => {
  const { dir, git, commit, push } = sandbox()
  try {
    commit('a.md', 'start\n')
    git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
    git(['switch', '-q', '-c', 'feature'])
    const pushed = commit('b.md', 'feature work\n')
    git(['update-ref', 'refs/remotes/origin/feature', pushed])
    // main moves on with a commit whose author and lines the scanner would flag: already public.
    git(['switch', '-q', 'main'])
    commit('c.md', `kept at ${HOME_PATH}\n`, PERSON)
    git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
    git(['switch', '-q', 'feature'])
    git(['merge', '-q', '--no-edit', 'origin/main'])
    const merged = git(['rev-parse', 'HEAD'])

    const clean = push(merged, pushed)
    assert.equal(clean.status, 0, clean.stdout + clean.stderr)

    const leaked = commit('d.md', `see ${HOME_PATH}\n`)
    const fail = push(leaked, pushed)
    assert.equal(fail.status, 1, fail.stdout + fail.stderr)
    assert.match(fail.stderr + fail.stdout, /home-path/)

    // A later commit that removes the value does not undo the push of the one that added it.
    const removed = commit('d.md', 'see the notes\n')
    assert.equal(push(removed, pushed).status, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a new branch is scanned from where it leaves the remotes, and a new author email fails', () => {
  const { dir, git, commit, push } = sandbox()
  try {
    commit('a.md', 'start\n', PERSON) // on the remote already
    git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
    git(['switch', '-q', '-c', 'other'])
    const clean = commit('b.md', 'other work\n')
    const ok = push(clean, ZERO)
    assert.equal(ok.status, 0, ok.stdout + ok.stderr)

    const byPerson = commit('c.md', 'more work\n', PERSON)
    const fail = push(byPerson, ZERO)
    assert.equal(fail.status, 1, fail.stdout + fail.stderr)
    assert.match(fail.stderr + fail.stdout, /email/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
