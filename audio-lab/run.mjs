/** node audio-lab/run.mjs [output.json]; CHROME_BIN and LAB_SUPERDOUGH optional. */
import { createServer } from 'vite';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { validateResults } from './validate.mjs';

const directory = await mkdtemp(join(tmpdir(), 'emotitone-audio-lab-'));
const packagePath = process.env.LAB_SUPERDOUGH || resolve('node_modules/superdough/dist/index.mjs');
const packageBytes = await readFile(packagePath);
const packageHash = createHash('sha256').update(packageBytes).digest('hex');
const packageSnapshot = join(directory, 'superdough.mjs');
await writeFile(packageSnapshot, packageBytes);
const vite = await createServer({ configFile: false, root: process.cwd(),
  cacheDir: join(directory, 'vite-cache'), optimizeDeps: { entries: ['audio-lab/index.html'] },
  resolve: { alias: { '@/services/superdoughAudio': resolve('audio-lab/audio-boundary.mjs'),
    '@': resolve('src'), superdough: packageSnapshot, nanostores: resolve('node_modules/nanostores/index.js') } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [process.cwd(), directory] } },
});
await vite.listen();
const port = vite.httpServer.address().port;
const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const debugPort = await new Promise((resolvePort, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome failed to expose DevTools')), 15000);
    let output = '';
    chrome.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); resolvePort(Number(match[1])); }
    });
    chrome.on('error', reject);
  });
  const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveSocket, reject) => { socket.onopen = resolveSocket; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const warnings = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve: done, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(message.params));
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      warnings.push(message.params.args.map((arg) => arg.value || arg.description).join(' '));
    }
  };
  const call = (method, params = {}) => new Promise((resolveCall, reject) => {
    pending.set(++id, { resolve: resolveCall, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  await call('Runtime.enable');
  await call('Page.navigate', { url: `http://127.0.0.1:${port}/audio-lab/` });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await call('Runtime.evaluate', { expression: 'typeof window.runAudioLab === "function"', returnByValue: true });
    if (result.result.value) { ready = true; break; }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!ready) throw new Error('Audio lab page did not initialize');
  const run = await call('Runtime.evaluate', { expression: 'window.runAudioLab()', awaitPromise: true, returnByValue: true, timeout: 120000 });
  if (run.exceptionDetails) throw new Error(JSON.stringify(run.exceptionDetails));
  const results = { recordedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    superdoughSha256: packageHash, warnings, ...run.result.value };
  results.checks = validateResults(results, { legacySuperdough: Boolean(process.env.LAB_SUPERDOUGH) });
  const output = process.argv[2] || 'audio-lab/results/current.json';
  await writeFile(output, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ output, attacks: results.attacks, sequences: results.sequences, cleanup: results.cleanup, prototypeLifecycle: results.prototypeLifecycle }, null, 2));
  if (results.checks.some((check) => !check.passed)) { console.error('Audio assertions failed:', results.checks.filter((check) => !check.passed)); process.exitCode = 1; }
} finally {
  socket?.close(); chrome.kill(); await vite.close();
  await new Promise((resolveExit) => chrome.exitCode !== null || chrome.signalCode !== null ? resolveExit() : chrome.once('exit', resolveExit));
  // Chrome's subprocesses can finish profile writes just after its parent exits.
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
