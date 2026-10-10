import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../dist/manifest.json', import.meta.url), 'utf8'));
const initial = new Set();
function visit(key) {
  if (initial.has(key)) return;
  assert.ok(manifest[key], `Missing manifest entry ${key}`);
  initial.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
for (const [key, entry] of Object.entries(manifest)) if (entry.isEntry) visit(key);
const surfaces = [
  'src/style-guide/StyleGuide.vue',
  'src/components/ConfigPanel.vue',
  'src/components/InstrumentSelector.vue',
  'node_modules/@strudel/soundfonts/dist/index.mjs',
];
const files = new Set();
for (const key of surfaces) {
  // Vite 4 omits src for the guide's shared facade; its dynamic entry keeps
  // the output name. Inspect the emitted graph in either representation.
  const resolvedKey = key === "src/style-guide/StyleGuide.vue" && !manifest[key]
    ? Object.keys(manifest).find(candidate => /^assets\/StyleGuide-[^/]+\.js$/.test(manifest[candidate].file))
    : key;
  const entry = manifest[resolvedKey];
  assert.ok(entry?.isDynamicEntry, `${key} must be a dynamic entry`);
  assert.ok(!initial.has(resolvedKey), `${key} is imported at startup`);
  assert.ok(!files.has(entry.file), `${key} shares another surface's chunk`);
  files.add(entry.file);
  console.log(`lazy chunk: ${key} → ${entry.file}`);
}
