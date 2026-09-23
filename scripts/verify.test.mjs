import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { lockDirectoryFor } from './verify.mjs'

const moduleUrl = pathToFileURL(join(import.meta.dirname, 'verify.mjs')).href

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'emotitone-verify-test-'))
  const child = join(dir, 'child.mjs')
  const runner = join(dir, 'runner.mjs')
  const log = join(dir, 'events.log')
  writeFileSync(child, `import { appendFileSync } from 'node:fs';
const [log,id,delay,code] = process.argv.slice(2);
appendFileSync(log, 'start ' + id + '\\n');
setTimeout(() => { appendFileSync(log, 'end ' + id + '\\n'); process.exit(Number(code)); }, Number(delay));
`)
  writeFileSync(runner, `import { runLocked, lockDirectoryFor } from ${JSON.stringify(moduleUrl)};
const [root,child,log,id,delay,code,waitMs] = process.argv.slice(2);
process.exitCode = await runLocked({lockDir:lockDirectoryFor(root),steps:[{command:process.execPath,args:[child,log,id,delay,code]}],waitMs:Number(waitMs)});
`)
  execFileSync('git', ['init', '-q', dir])
  execFileSync('git', ['-C', dir, 'config', 'user.email', 'verify@example.invalid'])
  execFileSync('git', ['-C', dir, 'config', 'user.name', 'Verify Test'])
  execFileSync('git', ['-C', dir, 'commit', '-q', '--allow-empty', '-m', 'fixture'])
  const peer = join(dir, 'peer')
  execFileSync('git', ['-C', dir, 'worktree', 'add', '-q', '-b', 'verify-peer', peer])
  return { dir, peer, child, runner, log, clean: () => rmSync(dir, { recursive: true, force: true }) }
}

function launch(f, root, id, delay = 200, code = 0, waitMs = 3000) {
  const proc = spawn(process.execPath, [f.runner, root, f.child, f.log, id, String(delay), String(code), String(waitMs)], { stdio: 'ignore' })
  const done = new Promise((resolve, reject) => {
    proc.once('error', reject)
    proc.once('close', (exitCode, signal) => resolve({ exitCode, signal }))
  })
  return { proc, done }
}

async function waitFor(f, event, timeout = 3000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (existsSync(f.log) && readFileSync(f.log, 'utf8').includes(event)) return
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  throw new Error(`Timed out waiting for ${event}`)
}

test('separate worktrees serialize full child executions and each run executes', async () => {
  const f = fixture()
  try {
    assert.equal(lockDirectoryFor(f.dir), lockDirectoryFor(f.peer))
    const first = launch(f, f.dir, 'first', 350)
    await waitFor(f, 'start first')
    const second = launch(f, f.peer, 'second', 80)
    assert.deepEqual(await first.done, { exitCode: 0, signal: null })
    assert.deepEqual(await second.done, { exitCode: 0, signal: null })
    assert.deepEqual(readFileSync(f.log, 'utf8').trim().split('\n'),
      ['start first', 'end first', 'start second', 'end second'])
    assert.equal(existsSync(lockDirectoryFor(f.dir)), false)
  } finally { f.clean() }
})

test('cancellation and child failure propagate status and release the lock', async () => {
  const f = fixture()
  try {
    const cancelled = launch(f, f.dir, 'cancelled', 3000)
    await waitFor(f, 'start cancelled')
    cancelled.proc.kill('SIGTERM')
    assert.deepEqual(await cancelled.done, { exitCode: 143, signal: null })
    assert.equal(existsSync(lockDirectoryFor(f.dir)), false)
    const failed = launch(f, f.peer, 'failed', 40, 7)
    assert.deepEqual(await failed.done, { exitCode: 7, signal: null })
    assert.equal(existsSync(lockDirectoryFor(f.dir)), false)
  } finally { f.clean() }
})

test('a crashed owner cannot release a still-running orphan child', async () => {
  const f = fixture()
  try {
    const orphaned = launch(f, f.dir, 'orphan', 1300)
    await waitFor(f, 'start orphan')
    orphaned.proc.kill('SIGKILL')
    assert.equal((await orphaned.done).signal, 'SIGKILL')
    const contender = launch(f, f.peer, 'contender', 40, 0, 300)
    assert.equal((await contender.done).exitCode, 1)
    assert.equal(readFileSync(f.log, 'utf8').includes('start contender'), false)
    await waitFor(f, 'end orphan')
    const recovered = launch(f, f.peer, 'recovered', 40)
    assert.equal((await recovered.done).exitCode, 0)
    assert.equal(existsSync(lockDirectoryFor(f.dir)), false)
  } finally { f.clean() }
})

test('stuck recovery marker times out without spinning or starting a child', async () => {
  const f = fixture()
  try {
    const lock = lockDirectoryFor(f.dir)
    mkdirSync(lock)
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ token: 'stale', pid: 999999999, phase: 'idle' }))
    mkdirSync(`${lock}.recovery`)
    const started = Date.now()
    const proc = spawn(process.execPath,
      [f.runner, f.peer, f.child, f.log, 'blocked', '40', '0', '350'],
      { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.setEncoding('utf8')
    proc.stderr.on('data', chunk => { stderr += chunk })
    const guard = setTimeout(() => proc.kill('SIGKILL'), 2500)
    let result
    try {
      result = await new Promise((resolve, reject) => {
        proc.once('error', reject)
        proc.once('close', (exitCode, signal) => resolve({ exitCode, signal }))
      })
    } finally { clearTimeout(guard) }
    assert.deepEqual(result, { exitCode: 1, signal: null })
    assert.ok(Date.now() - started < 2000)
    assert.match(stderr, /waiting for existing verification lock/)
    assert.match(stderr, /Stop an existing watch\/UI run/)
    assert.ok(stderr.includes(`${lock}.recovery`))
    assert.equal(existsSync(f.log), false)
    assert.equal(existsSync(lock), true)
    assert.equal(existsSync(`${lock}.recovery`), true)
  } finally { f.clean() }
})
