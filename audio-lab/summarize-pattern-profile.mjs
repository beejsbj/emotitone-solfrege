/** Offline Chrome CPU-profile attribution; does not run a browser or certify timing.
 * Usage: node audio-lab/summarize-pattern-profile.mjs <file.cpuprofile[.gz]>
 * Inclusive categories overlap. The native/program bucket has no JS attribution.
 */
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const path = process.argv[2];
if (!path) throw new Error('Pass a Chrome .cpuprofile or .cpuprofile.gz path');
const bytes = await readFile(path);
const profile = JSON.parse(path.endsWith('.gz') ? gunzipSync(bytes).toString() : bytes.toString());
if (profile.samples?.length !== profile.timeDeltas?.length) throw new Error('Missing aligned samples/timeDeltas');
const nodes = new Map(profile.nodes.map(node => [node.id, node]));
const parents = new Map(profile.nodes.flatMap(node => (node.children || []).map(id => [id, node.id])));
const categories = {
  editorDispatch: frame => frame.functionName === 'dispatch' && /chunk-|codemirror/.test(frame.url),
  selectionReads: frame => frame.functionName === 'readSelectionRange',
  notation: frame => frame.url.includes('/services/StrudelNotation.ts'),
  recordingTokens: frame => frame.url.includes('/CodeStrip/recordingTokens.ts'),
  persistence: frame => frame.functionName === 'persistState',
  serialization: frame => frame.functionName === 'serialize' && frame.url.includes('persistedstate'),
  vueDeepTraversal: frame => frame.functionName === 'traverse',
  stageDrawing: frame => frame.url.includes('/composables/canvas/'),
  blobDrawing: frame => frame.url.includes('/canvas/useBlobFieldRenderer.ts'),
  hilbertDrawing: frame => frame.url.includes('/canvas/useHilbertScopeRenderer.ts'),
  ambientDrawing: frame => frame.url.includes('/canvas/useAmbientRenderer.ts'),
  nativeProgram: frame => frame.functionName === '(program)',
};
const inclusive = Object.fromEntries(Object.keys(categories).map(name => [name, 0]));
const self = new Map();
for (let index = 0; index < profile.samples.length; index++) {
  const id = profile.samples[index], ms = profile.timeDeltas[index] / 1000;
  const stack = [];
  for (let current = id; current !== undefined; current = parents.get(current)) {
    const node = nodes.get(current);
    if (!node) throw new Error(`Missing profile node ${current}`);
    stack.push(node.callFrame);
  }
  for (const [name, matches] of Object.entries(categories)) {
    if (stack.some(matches)) inclusive[name] += ms;
  }
  const frame = stack[0];
  const key = JSON.stringify([frame.functionName || '(anonymous)', frame.url.split('?')[0], frame.lineNumber + 1]);
  self.set(key, (self.get(key) || 0) + ms);
}
const round = value => Math.round(value * 10) / 10;
console.log(JSON.stringify({
  profile: path,
  sampledMs: round(profile.timeDeltas.reduce((sum, value) => sum + value, 0) / 1000),
  note: 'Inclusive categories overlap; this sampled window does not identify an individual LongTask owner or satisfy the unprofiled timing gate.',
  inclusiveMs: Object.fromEntries(Object.entries(inclusive).map(([key, value]) => [key, round(value)])),
  topSelfFrames: [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([key, ms]) => {
    const [functionName, url, line] = JSON.parse(key);
    return { selfMs: round(ms), functionName, url, line };
  }),
}, null, 2));
