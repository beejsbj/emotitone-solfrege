import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

// One cold Chrome profile and a production server, both closed on success/failure.
// The onset measurement observes PCM on the main thread, not speaker latency.
const root = process.cwd();
await readFile(join(root, 'dist/index.html'));
const manifest = JSON.parse(await readFile(join(root, 'dist/manifest.json'), 'utf8'));
const deferredFiles = new Set(Object.values(manifest)
  .filter(entry => /assets\/StyleGuide-[^/]+\.js$/.test(entry.file)
    || entry.src === 'node_modules/@strudel/soundfonts/dist/index.mjs')
  .map(entry => `/${entry.file}`));
const savedInstrument = process.env.SAVED_INSTRUMENT || 'piano';
const profile = await mkdtemp(join(tmpdir(), 'emotitone-startup-'));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = join(root, 'dist', path === '/' || !extname(path) ? 'index.html' : path);
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
  // The shared host's proxy CA is absent from Chrome's disposable profile.
  '--ignore-certificate-errors', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
const requests = [], failures = [], exceptions = [];
try {
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 15000);
    chrome.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    chrome.on('error', reject);
  });
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(new Error(JSON.stringify(message.error)));
      else waiter?.resolve(message.result);
    }
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
    if (message.method === 'Network.loadingFailed') failures.push(message.params);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
  };
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression, ms = 90000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out: ${expression}; ${await evaluate('document.body.innerText.slice(0,2000)')}`);
  };
  const click = async selector => {
    const box = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Missing control');
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
  };
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Page.enable');
  await call('Network.setCacheDisabled', { cacheDisabled: true });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.setItem('emotitone-instrument', JSON.stringify({
      currentInstrument: ${JSON.stringify(savedInstrument)}, instrumentShapes: {},
    }));
    window.__probe = {};
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('.keyboard__key')) window.__probe.noteAt = performance.now();
    }, true);
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(target, ...args) {
      if (target instanceof AudioDestinationNode && !window.__probe.analyser) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 256;
        connect.call(this, analyser);
        window.__probe.analyser = analyser;
        const data = new Float32Array(256);
        setInterval(() => {
          analyser.getFloatTimeDomainData(data);
          if (window.__probe.noteAt && !window.__probe.onsetAt && data.some(value => Math.abs(value) > 0.001)) {
            window.__probe.onsetAt = performance.now();
          }
        }, 1);
      }
      return connect.call(this, target, ...args);
    };
  ` });
  await call('Page.navigate', { url: origin });
  await waitFor(`!!document.querySelector('[aria-label="Play EmotiTone"]:not([disabled])')`);
  // Let the worker finish installation. CDP's page target omits worker fetches;
  // CacheStorage supplies those precached URLs for the lazy-download check.
  await new Promise(resolve => setTimeout(resolve, 3000));
  const preGestureRequests = [...requests];
  const cachedBeforeGesture = await evaluate(`(async () => {
    const names = await caches.keys();
    return (await Promise.all(names.map(async name =>
      (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
  })()`);
  const audioFiles = url => /\.(wav|mp3|ogg|flac)([?#]|$)|webaudiofontdata/.test(url);
  assert.deepEqual(preGestureRequests.filter(audioFiles), [], 'Audio downloaded before first gesture');
  assert.deepEqual([...preGestureRequests, ...cachedBeforeGesture]
    .filter(url => deferredFiles.has(new URL(url).pathname)), [], 'A deferred surface downloaded during startup');

  await evaluate('window.__probe.playAt = performance.now()');
  await click('[aria-label="Play EmotiTone"]');
  await waitFor(`!document.querySelector('[aria-label="EmotiTone loading screen"]')`);
  const readyAt = await evaluate('performance.now()');
  const selectedInstrument = await evaluate(`document.querySelector('[data-testid="instrument-selector-trigger"]').textContent.trim()`);
  assert.equal(selectedInstrument, savedInstrument.replace(/^gm_/, ''), 'Selected sound fell back unexpectedly');
  await click(process.env.NOTE_SELECTOR || '.keyboard__key');
  await waitFor('!!window.__probe.onsetAt', 15000);
  const probe = await evaluate(`({ playAt: window.__probe.playAt, noteAt: window.__probe.noteAt, onsetAt: window.__probe.onsetAt })`);
  const beforeDrawers = [...requests];
  const offlinePanels = process.env.OFFLINE_PANELS === '1';
  if (offlinePanels) {
    await waitFor('!!navigator.serviceWorker.controller');
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  }
  await click('[data-testid="config-panel-trigger"]');
  await waitFor(`!!document.querySelector('[data-testid="global-public-controls"]')`);
  await click('[data-testid="instrument-selector-trigger"]');
  await waitFor(`!!document.querySelector('[data-testid="instrument-search"]')`);
  if (!offlinePanels) {
    await evaluate(`(() => {
      const search = document.querySelector('[data-testid="instrument-search"]');
      search.value = 'epiano1';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await waitFor(`!!document.querySelector('[data-testid="instrument-option-gm_epiano1"]')`);
  } else {
    await waitFor(`!!document.querySelector('[data-testid="instrument-option-triangle"]')`);
  }
  assert.deepEqual(exceptions, [], 'Uncaught browser exceptions');
  console.log(JSON.stringify({ savedInstrument, selectedInstrument, offlinePanels, preGestureRequests, cachedBeforeGesture,
    beforeDrawers, requests, failures, exceptions, probe,
    playToReadyMs: readyAt - probe.playAt, noteToOnsetMs: probe.onsetAt - probe.noteAt }, null, 2));
} finally {
  socket?.close();
  chrome.kill();
  await new Promise(resolve => chrome.exitCode !== null || chrome.signalCode !== null ? resolve() : chrome.once('exit', resolve));
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
