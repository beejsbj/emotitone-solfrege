import test from 'node:test'
import assert from 'node:assert/strict'
import { install } from './install-hooks.mjs'
import { plan } from './pre-commit.mjs'

const names = files => plan(files, () => true).map(step => step.name)

test('a docs-only commit skips every check', () => {
  assert.deepEqual(names(['README.md', 'docs/testing.md']), [])
})

test('a code commit runs lint, type-check and the tests related to what changed', () => {
  assert.deepEqual(names(['src/stage.ts', 'src/__tests__/stage.test.ts']), ['lint', 'type-check', 'related tests'])
  const steps = plan(['src/stage.ts', 'README.md'], () => true)
  assert.deepEqual(steps.at(-1).args.slice(-1), ['src/stage.ts'])
  assert.ok(steps.at(-1).args.includes('--passWithNoTests'))
})

test('config-only commits still lint and type-check but have no related tests', () => {
  assert.deepEqual(names(['package.json', 'tsconfig.json']), ['lint', 'type-check'])
})

test('related tests skip files that no longer exist on disk', () => {
  assert.deepEqual(plan(['src/gone.ts'], () => false).map(step => step.name), ['lint', 'type-check'])
})

function fakeGit(config) {
  const calls = []
  const git = (...args) => {
    calls.push(args.join(' '))
    if (args[0] === 'config' && args[1] === '--get') { if (config.hooksPath) return config.hooksPath; throw new Error('unset') }
    return ''
  }
  return { git, calls }
}

test('installing points git at .githooks once, and leaves another hooksPath alone', () => {
  let fake = fakeGit({})
  assert.equal(install({ env: {}, git: fake.git, exists: () => true }), 'installed')
  assert.ok(fake.calls.includes('config core.hooksPath .githooks'))
  fake = fakeGit({ hooksPath: '.githooks' })
  assert.equal(install({ env: {}, git: fake.git, exists: () => true }), 'already installed')
  fake = fakeGit({ hooksPath: '/somewhere/else' })
  assert.match(install({ env: {}, git: fake.git, exists: () => true }), /already \/somewhere\/else/)
  assert.ok(!fake.calls.some(call => call.startsWith('config core.hooksPath')))
})

test('installing does nothing when the checkout has no .githooks', () => {
  const fake = fakeGit({})
  assert.equal(install({ env: {}, git: fake.git, exists: () => false }), 'skipped: no .githooks')
  assert.deepEqual(fake.calls, [])
})

test('installing does nothing in CI', () => {
  const fake = fakeGit({})
  assert.equal(install({ env: { CI: 'true' }, git: fake.git, exists: () => true }), 'skipped: CI')
  assert.deepEqual(fake.calls, [])
})
