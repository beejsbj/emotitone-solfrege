/** Run with node; malformed synthetic fixtures must not earn browser acceptance. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { collectGuideBrowserErrors, writeGuideReceipt } from '../evidence/codestrip-viewport-20260920/guide-receipt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const checker = process.env.PATTERN_CHECKER_PATH || resolve(root, 'audio-lab/check-pattern-growth.mjs');
const focused = JSON.parse(await readFile(new URL('./results/pattern-growth-viewport-repaired-20260920.json', import.meta.url), 'utf8'));
const directory = await mkdtemp(join(tmpdir(), 'emotitone-receipt-guards-'));
const run = async receipt => {
  const path = join(directory, 'pattern.json');
  await writeFile(path, JSON.stringify(receipt));
  return spawnSync(process.execPath, [checker, path], { encoding: 'utf8' });
};
try {
  assert.equal((await run(focused)).status, 0, 'retained real focused receipt still passes');
  const tuples = [[16,true,false],[128,true,false],[512,true,false],[2048,true,false],
    [16,true,false],[512,false,false],[512,false,true],[512,true,false],[512,true,true]];
  const full = { ...structuredClone(focused), mode: 'full', rows: tuples.map(([n,hue,logging]) => {
    const row = structuredClone(focused.rows.find(row => row.hue === hue && row.logging === logging)
      ?? focused.rows.find(row => row.hue === hue));
    return { ...row, n, hue, logging, working: n + (logging ? 6 : 0) };
  }) };
  assert.equal((await run(full)).status, 0, 'complete synthetic nine-condition matrix passes');
  assert.equal((await run({ ...full, rows: [...full.rows].reverse() })).status, 0, 'row order does not change matrix completeness');
  for (const [missing, substitute] of [[1,0],[3,2],[5,2]]) {
    const invalid = structuredClone(full);
    invalid.rows[missing] = structuredClone(invalid.rows[substitute]);
    const result = await run(invalid);
    assert.notEqual(result.status, 0, `nine rows missing condition ${tuples[missing]} must fail`);
    assert.match(result.stderr, /Incomplete benchmark/);
  }
  const path = join(directory, 'guide.json');
  const successful = { results: [{ visible: 3 }], errors: [] };
  await writeGuideReceipt(path, successful);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), successful);
  // Simulate the CDP listener receiving an asynchronous exception after the
  // visual assertions, before the success receipt is published.
  const lateFailure = structuredClone(successful);
  await Promise.resolve().then(() => lateFailure.errors.push('Uncaught asynchronous guide error'));
  await assert.rejects(writeGuideReceipt(path, lateFailure), /Guide captured 1 browser error/);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), successful, 'a failed run cannot overwrite a success receipt');
  await assert.rejects(writeGuideReceipt(join(directory, 'never-created.json'), lateFailure), /Guide captured/);
  await assert.rejects(readFile(join(directory, 'never-created.json')), { code: 'ENOENT' });
  for (const type of ['error', 'warning']) {
    const report = structuredClone(successful);
    collectGuideBrowserErrors(report.errors, { method: 'Runtime.consoleAPICalled', params: { type,
      args: [{ value: 'Vue caught an exception' }, { description: 'Error: broken guide' }] } });
    assert.equal(report.errors.length, 1);
    assert.match(report.errors[0], /Vue caught an exception Error: broken guide/);
    await assert.rejects(writeGuideReceipt(path, report), /Guide captured 1 browser error/);
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), successful);
  }
  const collected = [];
  collectGuideBrowserErrors(collected, { method: 'Runtime.exceptionThrown', params: { exceptionDetails: { text: 'Uncaught' } } });
  assert.deepEqual(collected, ['Uncaught']);
  collectGuideBrowserErrors(collected, { method: 'Runtime.consoleAPICalled', params: { type: 'log', args: [{ value: 'normal log' }] } });
  collectGuideBrowserErrors(collected, { id: 1, result: {} });
  assert.deepEqual(collected, ['Uncaught'], 'ordinary logs and CDP replies are not failures');
  console.log('PASS: exact focused/full condition matrices and asynchronous guide-error publication guards');
} finally {
  await rm(directory, { recursive: true, force: true });
}
