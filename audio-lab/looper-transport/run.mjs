// Needed package script: "test:looper-transport": "node audio-lab/looper-transport/run.mjs"
// LOOPER_SMOKE=1: one 150 BPM cell. LOOPER_ONLY=direct|boundary|mute-solo|tempo|held|expression|cold-join.
// LOOPER_REPEATS=3 (default), LOOPER_COST_ONLY=1. Writes only the designated receipt.
import { createServer } from 'vite';
import { mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
if (process.cwd() !== root) throw Error(`Run from the designated worktree: ${root}`);
const receiptPath = resolve(root, 'audio-lab/results/looper-transport.json');
const runtime = resolve(root, 'audio-lab/looper-transport/.runtime');
const configuration = { smoke: process.env.LOOPER_SMOKE === '1', only: process.env.LOOPER_ONLY || null,
  repeats: Number(process.env.LOOPER_REPEATS ?? 3), costOnly: process.env.LOOPER_COST_ONLY === '1' };
if (!Number.isInteger(configuration.repeats) || configuration.repeats < 1) throw Error('LOOPER_REPEATS must be a positive integer');
if (configuration.only && !['direct', 'boundary', 'mute-solo', 'tempo', 'held', 'expression', 'cold-join'].includes(configuration.only)) throw Error('Unknown LOOPER_ONLY');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '__tests__') continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (/\.(?:ts|vue|js|mjs|json|html|css)$/.test(path)) files.push(path);
  }
  return files;
}
const packages = ['@strudel/core', '@strudel/mini', '@strudel/tonal', '@strudel/transpiler', '@strudel/codemirror', '@strudel/webaudio', 'superdough'];
// Follow the harness's production imports, including type imports and barrels.
// Unrelated components and specimens are deliberately outside this receipt.
async function productionImports(seeds) {
  const seen = new Set();
  async function visit(path) {
    if (seen.has(path)) return;
    seen.add(path);
    const source = await readFile(resolve(root, path), 'utf8');
    for (const [, specifier] of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g)) {
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
      const clean = specifier.split('?')[0];
      const target = clean.startsWith('@/') ? resolve(root, 'src', clean.slice(2)) : resolve(root, dirname(path), clean);
      let found;
      for (const candidate of [target, `${target}.ts`, `${target}.js`, `${target}.mjs`, resolve(target, 'index.ts')]) {
        try { if ((await stat(candidate)).isFile()) { found = relative(root, candidate); break; } }
        catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
      }
      if (!found) throw Error(`Cannot hash imported production module: ${path} -> ${specifier}`);
      await visit(found);
    }
  }
  for (const seed of seeds) await visit(seed);
  return [...seen];
}
const harnessFiles = await filesUnder('audio-lab/looper-transport');
const productionFiles = await productionImports(['src/services/patternPlayback.ts', 'src/services/looperTransport.ts',
  'src/services/superdoughAudio.ts', 'src/services/liveAudioClock.ts', 'src/composables/useUIBeat.ts', 'src/data/patterns.ts']);
const paths = [...productionFiles, ...harnessFiles,
  'audio-lab/processors.js', 'docs/research/looper-strudel-transport.md', 'package.json',
  'node_modules/@strudel/core/cyclist.mjs', 'patches/superdough@1.3.0.patch',
  ...packages.flatMap(p => [`node_modules/${p}/package.json`, `node_modules/${p}/dist/index.mjs`])];
for (const lock of ['bun.lock', 'bun.lockb']) {
  try { await readFile(resolve(root, lock)); paths.push(lock); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function hashes() {
  const result = {};
  for (const path of paths.sort()) result[path] = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
  return result;
}
const provenance = { revision: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  worktree: root, hashScope: 'Transitive imports of production transport, output, clock and fixture data; harness and installed packages',
  hashes: await hashes(), packages: {} };
for (const name of packages) provenance.packages[name] = JSON.parse(await readFile(resolve(root, `node_modules/${name}/package.json`))).version;
await mkdir(runtime, { recursive: true });
const vite = await createServer({ configFile: false, root, cacheDir: resolve(runtime, 'vite'),
  optimizeDeps: { entries: ['audio-lab/looper-transport/suite.html'] }, resolve: { alias: { '@': resolve(root, 'src') } },
  server: { host: '127.0.0.1', port: 0, hmr: false } });
let chrome, socket, result, failure;
const warnings = [], exceptions = [], consoleEvents = [];
const startupAttempts = [];
let measuredWarningStart = 0, measuredExceptionStart = 0;
try {
  await vite.listen();
  chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', ['--headless=new', '--no-sandbox',
    '--disable-dev-shm-usage', '--no-first-run', '--disable-extensions', '--disable-background-networking',
    '--disable-component-update', '--no-proxy-server', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=0',
    `--user-data-dir=${resolve(runtime, 'chrome')}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const debuggingPort = await new Promise((done, fail) => {
    let output = '';
    const timeout = setTimeout(() => fail(Error('Chrome DevTools did not start')), 15000);
    chrome.stderr.on('data', chunk => {
      output += chunk;
      const found = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (found) { clearTimeout(timeout); done(Number(found[1])); }
    });
    chrome.once('error', error => { clearTimeout(timeout); fail(error); });
    chrome.once('exit', code => { clearTimeout(timeout); fail(Error(`Chrome exited before DevTools: ${code}`)); });
  });
  const page = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let id = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      clearTimeout(waiter.timeout);
      message.error ? waiter.reject(Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') { exceptions.push(message.params); console.error('LOOPER browser exception', JSON.stringify(message.params)); }
    if (message.method === 'Runtime.consoleAPICalled') {
      const line = message.params.args.map(a => a.value ?? a.description).join(' ');
      consoleEvents.push({ type: message.params.type, timestamp: message.params.timestamp, message: line });
      if (['warning', 'error'].includes(message.params.type)) warnings.push(line);
      if (line.startsWith('LOOPER')) console.log(line);
    }
    if (message.method === 'Log.entryAdded' && ['warning', 'error'].includes(message.params.entry.level)) warnings.push(message.params.entry);
  };
  socket.onclose = () => { for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(Error('Chrome CDP socket closed')); } pending.clear(); };
  const call = (method, params = {}, timeoutMs = 30000) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { pending.delete(requestId); reject(Error(`CDP timeout: ${method}`)); }, timeoutMs);
    pending.set(requestId, { resolve, reject, timeout }); socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  await call('Runtime.enable'); await call('Log.enable'); await call('Page.bringToFront');
  let ready = false;
  const pageUrl = `http://127.0.0.1:${vite.httpServer.address().port}/audio-lab/looper-transport/suite.html`;
  for (let load = 0; load < 3 && !ready; load++) {
    const warningStart = warnings.length, exceptionStart = exceptions.length;
    await call('Page.navigate', { url: pageUrl });
    for (let attempt = 0; attempt < 300; attempt++) {
      const response = await call('Runtime.evaluate', { expression: 'typeof window.runLooperTransport === "function"', returnByValue: true });
      if (response.result.value) { ready = true; break; }
      if (warnings.slice(warningStart).some(w => typeof w === 'object' && w.text?.includes('ERR_NETWORK_CHANGED'))) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    startupAttempts.push({ attempt: load + 1, ready, warnings: warnings.slice(warningStart), exceptions: exceptions.slice(exceptionStart) });
    if (!ready) {
      const recoverable = startupAttempts.at(-1).warnings.some(w => typeof w === 'object' && w.text?.includes('ERR_NETWORK_CHANGED'));
      if (!recoverable) break;
      console.log(`LOOPER startup ${load + 1}: local network changed, reloading before measurements`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      measuredWarningStart = warningStart; measuredExceptionStart = exceptionStart;
    }
  }
  if (!ready) throw Error('Looper browser suite failed to load');
  const response = await call('Runtime.evaluate', { expression: `window.runLooperTransport(${JSON.stringify(configuration)})`,
    awaitPromise: true, returnByValue: true, timeout: 900000 }, 920000);
  if (response.exceptionDetails) {
    const partial = await call('Runtime.evaluate', { expression: 'window.looperPartial', returnByValue: true });
    result = partial.result.value;
    throw Error(JSON.stringify(response.exceptionDetails));
  }
  result = response.result.value;
} catch (error) {
  failure = { message: String(error), stack: error.stack };
  console.error('LOOPER blocked:', error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
    await new Promise(resolve => { const timer = setTimeout(() => { chrome.kill('SIGKILL'); resolve(); }, 5000);
      chrome.once('exit', () => { clearTimeout(timer); resolve(); }); });
  }
  await vite.close();
  const endHashes = await hashes();
  const changedInputs = Object.keys(provenance.hashes).filter(path => provenance.hashes[path] !== endHashes[path]);
  const receipt = { recordedAt: new Date().toISOString(), status: failure ? 'blocked' : 'completed', provenance,
    changedInputs, ...(changedInputs.length ? { hashesAtEnd: endHashes } : {}), startupAttempts, warnings, exceptions, consoleEvents,
    ...result, ...(failure ? { failure } : {}), checks: [...(result?.checks ?? []),
      { name: 'Browser suite completed', passed: !failure },
      { name: 'No browser warnings or uncaught CDP exceptions in the successful load and measurements',
        passed: !warnings.slice(measuredWarningStart).length && !exceptions.slice(measuredExceptionStart).length },
      { name: 'Measured code and package inputs stayed unchanged during run', passed: !changedInputs.length }] };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${compactReceipt(receipt)}\n`);
  await rm(runtime, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log(JSON.stringify({ output: relative(root, receiptPath), status: receipt.status,
    benchmark: receipt.benchmark?.map(b => ({ notes: b.notes, syncBuildMs: b.syncBuildMs,
      asyncElapsedMs: b.asyncElapsedMs, asyncSliceMs: b.asyncSliceMs })),
    summary: receipt.summary, checks: receipt.checks, warnings, changedInputs }, null, 2));
  if (receipt.checks.some(check => !check.passed)) process.exitCode = 1;
}

// One raw event or summary cell per line; trial containers remain navigable.
function compactReceipt(value, depth = 0, key = '') {
  const pad = '  '.repeat(depth), next = '  '.repeat(depth + 1);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return `[\n${value.map(item => next + (key === 'trials' ? compactReceipt(item, depth + 1) : JSON.stringify(item))).join(',\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, child]) => child !== undefined);
    if (!entries.length) return '{}';
    return `{\n${entries.map(([name, child]) => `${next}${JSON.stringify(name)}: ${compactReceipt(child, depth + 1, name)}`).join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}
