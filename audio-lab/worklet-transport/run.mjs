// SPIKE (BJS-484, not for merge). `bun run test:worklet-transport`
// SPIKE_REPEATS=3 (default), SPIKE_ONLY=direct|boundary|mute-solo|tempo|held|cold-join|stall|mute-latency.
// One headless Chrome, closed on exit. Writes audio-lab/results/worklet-transport.json.
import { createServer } from 'vite';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const receiptPath = resolve(root, 'audio-lab/results/worklet-transport.json');
const runtime = resolve(root, 'audio-lab/worklet-transport/.runtime');
const configuration = { repeats: Number(process.env.SPIKE_REPEATS ?? 3), only: process.env.SPIKE_ONLY || null };
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const host = () => ({ hostname: os.hostname(), loadavg: os.loadavg(), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model,
  freeMemMiB: Math.round(os.freemem() / 2 ** 20), totalMemMiB: Math.round(os.totalmem() / 2 ** 20), at: new Date().toISOString() });
const provenance = { revision: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), dirty: git('status', '--porcelain') !== '' };
const hostBefore = host();
await mkdir(runtime, { recursive: true });
const vite = await createServer({ configFile: false, root, cacheDir: resolve(runtime, 'vite'), logLevel: 'warn',
  optimizeDeps: { entries: ['audio-lab/worklet-transport/suite.html'] }, resolve: { alias: { '@': resolve(root, 'src') } },
  server: { host: '127.0.0.1', port: 0, hmr: false } });
let chrome, socket, result, failure;
const warnings = [], exceptions = [];
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
      message.error ? waiter.reject(Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails?.text);
    if (message.method === 'Runtime.consoleAPICalled') {
      const line = message.params.args.map(a => a.value ?? a.description).join(' ');
      if (['warning', 'error'].includes(message.params.type)) warnings.push(line);
      if (line.startsWith('SPIKE')) console.log(line);
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id; pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  await call('Runtime.enable'); await call('Page.bringToFront');
  await call('Page.navigate', { url: `http://127.0.0.1:${vite.httpServer.address().port}/audio-lab/worklet-transport/suite.html` });
  let ready = false;
  for (let attempt = 0; attempt < 600 && !ready; attempt++) {
    const response = await call('Runtime.evaluate', { expression: 'typeof window.runWorkletTransport === "function"', returnByValue: true });
    ready = response.result.value;
    if (!ready) await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw Error('Spike suite failed to load');
  const response = await call('Runtime.evaluate', { expression: `window.runWorkletTransport(${JSON.stringify(configuration)})`,
    awaitPromise: true, returnByValue: true, timeout: 1500000 });
  if (response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
  result = response.result.value;
} catch (error) {
  failure = { message: String(error) };
  console.error('SPIKE blocked:', error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill();
    await new Promise(r => { const t = setTimeout(() => { chrome.kill('SIGKILL'); r(); }, 5000); chrome.once('exit', () => { clearTimeout(t); r(); }); });
  }
  await vite.close();
  const receipt = { recordedAt: new Date().toISOString(), status: failure ? 'blocked' : 'completed', provenance,
    host: { before: hostBefore, after: host(), note: 'bjslab, shared with other workers; load average is the whole host' },
    warnings, exceptions, ...result, ...(failure ? { failure } : {}),
    checks: [...(result?.checks ?? []), { name: 'Browser suite completed', passed: !failure },
      { name: 'No browser warnings or uncaught exceptions', passed: !warnings.length && !exceptions.length }] };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 1)}\n`);
  await rm(runtime, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  console.log(JSON.stringify({ output: relative(root, receiptPath), status: receipt.status, host: receipt.host,
    summary: receipt.summary, checks: receipt.checks, warnings }, null, 1));
  if (receipt.checks.some(c => !c.passed)) process.exitCode = 1;
}
