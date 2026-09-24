#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process'
import { constants } from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const POLL_MS = 150
const WAIT_MS = 15 * 60 * 1000

export function lockDirectoryFor(root) {
  const common = execFileSync('git', ['-C', root, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim()
  if (!common) throw new Error('Could not resolve Git common directory')
  return join(realpathSync(resolve(root, common)), 'emotitone-verify.lock')
}

function writeOwner(lockDir, owner) {
  const temporary = join(lockDir, `owner-${owner.token}.tmp`)
  writeFileSync(temporary, JSON.stringify(owner))
  renameSync(temporary, join(lockDir, 'owner.json'))
}

function readOwner(lockDir) {
  let owner
  try { owner = JSON.parse(readFileSync(join(lockDir, 'owner.json'), 'utf8')) } catch { return null }
  if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 ||
      !['idle', 'spawning', 'running'].includes(owner.phase) ||
      typeof owner.token !== 'string' ||
      (owner.phase === 'running' && (!Number.isSafeInteger(owner.childGroup) || owner.childGroup <= 0))) return null
  return owner
}

/** Every process as { pid, pgid, state }, or null when the table cannot be read. */
function processTable() {
  try {
    if (process.platform === 'linux') {
      return readdirSync('/proc').filter(name => /^\d+$/.test(name)).flatMap(name => {
        try {
          // Fields after the parenthesised command: state, ppid, pgrp, ...
          const stat = readFileSync(`/proc/${name}/stat`, 'utf8')
          const [state, , pgid] = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
          return [{ pid: Number(name), pgid: Number(pgid), state }]
        } catch { return [] }
      })
    }
    return execFileSync('ps', ['-A', '-o', 'pid=,pgid=,stat='], { encoding: 'utf8' }).trim().split('\n')
      .map(line => line.trim().split(/\s+/))
      .map(([pid, pgid, state]) => ({ pid: Number(pid), pgid: Number(pgid), state }))
  } catch { return null }
}

/**
 * A zombie answers kill(0) until its parent reaps it. Container PID 1s often
 * never reap reparented children, so a finished group can look alive forever.
 * Treat a pid or group whose only members are zombies as gone.
 */
export function onlyZombies(pid, group, table) {
  if (!table) return false
  const members = table.filter(row => (group ? row.pgid : row.pid) === pid)
  return members.every(row => row.state.startsWith('Z'))
}

function alive(pid, group = false, table = processTable) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try { process.kill(group && process.platform !== 'win32' ? -pid : pid, 0) } catch (error) {
    if (error.code === 'ESRCH') return false
    return true // Permission denied is not proof that the process is gone.
  }
  return process.platform === 'win32' || !onlyZombies(pid, group, table())
}

function stale(owner) {
  return !alive(owner.pid) &&
    (owner.phase === 'idle' || (owner.phase === 'running' && !alive(owner.childGroup, true)))
}

function lockError(lockDir, detail) {
  return new Error(`${detail}: ${lockDir}. Inspect owner.json and the child process group before manually removing this lock.`)
}

function recoverStale(lockDir) {
  const recovery = `${lockDir}.recovery`
  try { mkdirSync(recovery) } catch (error) {
    if (error.code === 'EEXIST') return false
    throw error
  }
  try {
    if (!existsSync(lockDir)) return true
    const owner = readOwner(lockDir)
    if (!owner || !stale(owner)) return false
    const moved = `${lockDir}.stale-${randomUUID()}`
    renameSync(lockDir, moved)
    rmSync(moved, { recursive: true, force: true })
    return true
  } finally {
    rmSync(recovery, { recursive: true, force: true })
  }
}

function pause(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function acquire(lockDir, owner, interrupted, waitMs) {
  const deadline = Date.now() + waitMs
  let missingSince = 0
  let waitingLogged = false
  while (true) {
    if (interrupted()) return false
    try {
      mkdirSync(lockDir)
      try { writeOwner(lockDir, owner) } catch (error) {
        rmSync(lockDir, { recursive: true, force: true })
        throw error
      }
      return true
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
    if (!waitingLogged) {
      console.error(`verify: waiting for existing verification lock ${lockDir}; watch/UI runs hold it until stopped`)
      waitingLogged = true
    }
    if (Date.now() >= deadline) {
      const recovery = `${lockDir}.recovery`
      const detail = `Timed out after ${waitMs} ms waiting for verification. Stop an existing watch/UI run if one is active.${existsSync(recovery) ? ` Recovery marker ${recovery} exists; inspect it before manual cleanup.` : ''}`
      throw lockError(lockDir, detail)
    }
    const ownerNow = readOwner(lockDir)
    if (!ownerNow) {
      missingSince ||= Date.now()
      if (Date.now() - missingSince < 1_000) { await pause(POLL_MS); continue }
      throw lockError(lockDir, 'Lock owner is missing or corrupt')
    }
    missingSince = 0
    if (!alive(ownerNow.pid) && ownerNow.phase === 'spawning') {
      throw lockError(lockDir, 'Owner died while launching a child; child identity is unknown')
    }
    if (stale(ownerNow)) {
      if (!recoverStale(lockDir)) await pause(POLL_MS)
      continue
    }
    await pause(POLL_MS)
  }
}

function signalGroup(child, signal) {
  if (!child?.pid) return
  try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal) } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

async function waitForGroup(child, interruptedAt) {
  const deadline = Date.now() + 30_000
  while (alive(child.pid, true)) {
    const cancelledAt = interruptedAt()
    if (cancelledAt) signalGroup(child, Date.now() - cancelledAt > 5_000 ? 'SIGKILL' : 'SIGTERM')
    if (Date.now() >= deadline) {
      throw new Error(`Child process group ${child.pid} survived its leader; retaining verification lock`)
    }
    await pause(POLL_MS)
  }
}

export async function runLocked({ lockDir, steps, cwd = repoRoot, env = process.env, waitMs = WAIT_MS }) {
  const owner = { token: createHash('sha256').update(randomUUID()).digest('hex').slice(0, 16), pid: process.pid, phase: 'idle' }
  let interrupted = null
  let interruptedAt = 0
  let child = null
  let acquired = false
  const onInt = () => { interrupted = 'SIGINT'; interruptedAt ||= Date.now(); signalGroup(child, 'SIGINT') }
  const onTerm = () => { interrupted = 'SIGTERM'; interruptedAt ||= Date.now(); signalGroup(child, 'SIGTERM') }
  process.on('SIGINT', onInt)
  process.on('SIGTERM', onTerm)
  try {
    acquired = await acquire(lockDir, owner, () => interrupted, waitMs)
    if (!acquired) return interrupted === 'SIGINT' ? 130 : 143
    for (const { command, args = [] } of steps) {
      if (interrupted) return interrupted === 'SIGINT' ? 130 : 143
      owner.phase = 'spawning'
      delete owner.childGroup
      writeOwner(lockDir, owner)
      if (interrupted) return interrupted === 'SIGINT' ? 130 : 143
      child = spawn(command, args, { cwd, env, stdio: 'inherit', detached: process.platform !== 'win32' })
      if (child.pid) {
        owner.phase = 'running'
        owner.childGroup = child.pid
        writeOwner(lockDir, owner)
      }
      const escalation = setInterval(() => {
        if (interruptedAt && Date.now() - interruptedAt > 5_000) signalGroup(child, 'SIGKILL')
      }, 200)
      escalation.unref()
      let result
      try {
        result = await new Promise((resolveResult, reject) => {
          child.once('error', reject)
          child.once('close', (code, signal) => resolveResult({ code, signal }))
        })
      } finally { clearInterval(escalation) }
      await waitForGroup(child, () => interruptedAt)
      child = null
      owner.phase = 'idle'
      delete owner.childGroup
      writeOwner(lockDir, owner)
      if (interrupted) return interrupted === 'SIGINT' ? 130 : 143
      if (result.signal) return 128 + (constants.signals[result.signal] ?? 1)
      if (result.code !== 0) return result.code ?? 1
    }
    return 0
  } finally {
    process.off('SIGINT', onInt)
    process.off('SIGTERM', onTerm)
    if (acquired && (!child?.pid || !alive(child.pid, true))) rmSync(lockDir, { recursive: true, force: true })
  }
}

function heapMb() {
  const value = process.env.EMOTITONE_TYPECHECK_HEAP_MB ?? '1536'
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('EMOTITONE_TYPECHECK_HEAP_MB must be a positive integer')
  }
  return value
}

function installed(relative) {
  const path = join(repoRoot, 'node_modules', relative)
  if (!existsSync(path)) throw new Error(`Missing ${path}; install project dependencies first`)
  return path
}

async function main() {
  const [kind, ...args] = process.argv.slice(2)
  if (!['type-check', 'build', 'test'].includes(kind)) throw new Error('Usage: node scripts/verify.mjs type-check|build|test [args...]')
  const typecheck = { command: process.execPath, args: [`--max-old-space-size=${heapMb()}`, installed('vue-tsc/bin/vue-tsc.js'), '--noEmit'] }
  const steps = kind === 'type-check' ? [{ ...typecheck, args: [...typecheck.args, ...args] }]
    : kind === 'build' ? [typecheck, { command: process.execPath, args: [installed('vite/bin/vite.js'), 'build', ...args] }]
      : [{ command: process.execPath, args: [installed('vitest/vitest.mjs'), ...args] }]
  process.exitCode = await runLocked({ lockDir: lockDirectoryFor(repoRoot), steps })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`verify: ${error.message}`); process.exitCode = 1 })
}
