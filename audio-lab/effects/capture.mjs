/** Invoked through the effect tests; CHROME_BIN optional. */
import { createServer } from 'vite';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';


const root = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'emotitone-parity-'));
const packagePath = resolve('node_modules/superdough/dist/index.mjs');
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const watched = [packagePath, ...['helpers.mjs', 'reverbGen.mjs', 'reverb.mjs', 'feedbackdelay.mjs'].map(name => resolve('node_modules/superdough', name))];
const hashes = Object.fromEntries(await Promise.all(watched.map(async path => [path, await digest(path)])));
let vite, chrome, socket;
try {
  vite = await createServer({ configFile: false, root, cacheDir: join(directory, 'vite-cache'),
    optimizeDeps: { entries: ['audio-lab/effects/index.html'] },
    resolve: { alias: { '@': resolve('src'), superdough: packagePath } },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
  });
  await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-networking',
    '--remote-debugging-port=0', `--user-data-dir=${join(directory, 'chrome')}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const debugPort = await new Promise((done, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome did not expose DevTools')), 15000);
    let stderr = '';
    chrome.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); done(Number(match[1])); }
    });
    chrome.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
  const pending = new Map(), warnings = [], exceptions = [], blockedRequests = [];
  let id = 0;
  const call = (method, params = {}, timeoutMs = 90000) => new Promise((done, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timed out: ${method}`)); }, timeoutMs);
    pending.set(requestId, { done, reject, timeout });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data), request = pending.get(message.id);
    if (request) {
      clearTimeout(request.timeout); pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.done(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(message.params.type)) {
      warnings.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
    }
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request: { url } } = message.params;
      const local = url.startsWith(`${origin}/`) || /^(blob:|data:)/.test(url);
      if (!local) blockedRequests.push(url);
      void call(local ? 'Fetch.continueRequest' : 'Fetch.failRequest',
        local ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch(error => exceptions.push(String(error)));
    }
  };
  await call('Runtime.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await call('Page.navigate', { url: `${origin}/audio-lab/effects/` });
  const functionName = process.argv[3] === 'engine' ? 'runEngineEffects' : process.argv[3] === 'listening' ? 'renderEffectListening' : 'runEffectReference';
  let ready = false;
  // Cold dependency transforms can exceed 20 seconds on the shared lab host.
  for (let attempt = 0; attempt < 600; attempt++) {
    const result = await call('Runtime.evaluate', { expression: `typeof window.${functionName} === "function"`, returnByValue: true });
    if (result.result.value) { ready = true; break; }
    if (exceptions.length) break;
    await new Promise(done => setTimeout(done, 100));
  }
  if (!ready) throw new Error(`Parity page did not initialize: ${JSON.stringify({ exceptions, warnings, blockedRequests })}`);
  const result = await call('Runtime.evaluate', { expression: `window.${functionName}()`, awaitPromise: true, returnByValue: true, timeout: 90000 });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  const changes = (await Promise.all(watched.map(async path => await digest(path) !== hashes[path] ? path : null))).filter(Boolean);
  const receipt = { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), hashes,
    warnings, exceptions, blockedRequests, filesChangedDuringRun: changes, ...result.result.value };
  if (exceptions.length || blockedRequests.length || changes.length) throw new Error(JSON.stringify(receipt));
  await writeFile(process.argv[2], JSON.stringify(receipt) + '\n');
  console.log(`Effect reference saved to ${process.argv[2]}`);

} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
    await new Promise(done => chrome.once('exit', done));
  }
  await vite?.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
