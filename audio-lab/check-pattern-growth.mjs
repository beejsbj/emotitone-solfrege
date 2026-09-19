/** Regression criteria for pattern-growth.mjs. Timing reflects this host, not speaker latency. */
import { readFile } from 'node:fs/promises';

const receipt = JSON.parse(await readFile(process.argv[2] || '/tmp/pattern-growth.json', 'utf8'));
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) throw new Error('Missing benchmark samples');
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const focused = receipt.mode === 'focused';
if (receipt.rows.length !== (focused ? 4 : 9) || !receipt.replay?.playing || !receipt.replay?.stopped || !receipt.replay?.richNotes) {
  throw new Error('Incomplete benchmark or missing rich-pattern replay');
}
console.log(`Checking ${focused ? 'focused four-condition' : 'full nine-condition'} receipt.`);
const matched = n => receipt.rows.filter(row => row.n === n && row.hue && !row.logging);
const downMedian = rows => median(rows.flatMap(row => row.samples.map(sample => sample.downMs)));
const small = downMedian(matched(16));
const large = downMedian(matched(512));
let failed = large > 100 && large / small > 2;
console.log(`${failed ? 'FAIL' : 'PASS'}: hue-on pooled keydown medians: 16 notes ${small.toFixed(1)}ms; 512 notes ${large.toFixed(1)}ms (${(large / small).toFixed(2)}×). Criterion: >100ms and >2×.`);
for (const row of receipt.rows) {
  const start = Math.min(...row.inputLog.map(event => event.eventTime));
  const longest = Math.max(0, ...row.longTasks.filter(task => task.start >= start).map(task => task.duration));
  const queue = median(row.inputLog.filter(event => event.type === 'keydown').map(event => event.at - event.eventTime));
  console.log(`${row.n} notes; hue ${row.hue}; recording ${row.logging}: keydown ${downMedian([row]).toFixed(1)}ms, queue ${queue.toFixed(1)}ms, longest task ${longest}ms, rendered notes ${row.codeNotes}`);
  if (row.samples.length !== 6 || row.working !== row.n + (row.logging ? 6 : 0)) throw new Error('Invalid sequential fixture');
  if (row.logging && longest > 500) failed = true;
  if (row.colors.historyChanged || row.colors.liveChanged !== row.hue) {
    console.log('FAIL: expected static history and live-key hue following its setting.');
    failed = true;
  }
}
if (!receipt.rows.some(row => row.logging && row.hue) || !receipt.rows.some(row => row.logging && !row.hue)) {
  throw new Error('Need consecutive appends with hue enabled and disabled');
}
console.log(`${failed ? 'FAIL' : 'PASS'}: overall input-growth, <=500ms append LongTask, and animation-behavior criteria.`);
console.log('Trusted CDP input; fixed 90ms fixture duration / 125ms cadence; no CPU profiler. Host noise affects absolute times.');
process.exitCode = Number(failed);
