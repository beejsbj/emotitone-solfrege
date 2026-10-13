/**
 * node audio-lab/loader/run.mjs [receipt.json] [--only=name,name] [--skip-sweep] [--skip-piano]
 * BJS-488 receipts in headless Chrome (CHROME_BIN optional): catalog parity,
 * every selectable instrument through the app loader, and the piano's load
 * (long tasks, input round-trips, renderer memory) owned vs legacy-equivalent.
 * Fetches real sample and soundfont data from the upstream hosts.
 */
import { createServer } from 'vite';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const output = args.find(arg => !arg.startsWith('--'));
const only = args.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
const skipSweep = args.includes('--skip-sweep');
const skipPiano = args.includes('--skip-piano');
const FONT_PARITY = process.env.FONT_PARITY?.split(',') ?? ['gm_piano', 'gm_violin', 'gm_flute', 'gm_acoustic_guitar_nylon', 'gm_pad_warm'];
const root = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'emotitone-loader-'));
let vite, chrome, socket;

async function rendererMemoryKiB() {
  // Sum resident plus swapped memory of this Chrome's renderer processes (the page and its AudioWorklet thread).
  let total = 0;
  for (const name of await readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const cmdline = await readFile(`/proc/${name}/cmdline`, 'utf8');
      if (!cmdline.includes('--type=renderer') || !cmdline.includes(directory)) continue;
      const status = await readFile(`/proc/${name}/status`, 'utf8');
      // The shared host swaps under pressure: count swapped-out pages as resident.
      total += Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] ?? 0) + Number(/VmSwap:\s+(\d+)/.exec(status)?.[1] ?? 0);
    } catch { /* process exited */ }
  }
  return total || null;
}

try {
  vite = await createServer({ configFile: false, root, cacheDir: join(directory, 'vite-cache'),
    optimizeDeps: { entries: ['audio-lab/loader/index.html'] },
    resolve: { alias: { '@': resolve('src') } },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } },
  });
  await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-networking',
    '--renderer-process-limit=1', '--remote-debugging-port=0', `--user-data-dir=${join(directory, 'chrome')}`, 'about:blank',
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
  const pending = new Map(), exceptions = [];
  let id = 0;
  const call = (method, params = {}, timeoutMs = 600000) => new Promise((done, reject) => {
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
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description);
  };
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails));
    return result.result.value;
  };
  const load = async () => {
    await call('Page.navigate', { url: `${origin}/audio-lab/loader/` });
    for (let attempt = 0; attempt < 900; attempt++) {
      if (await evaluate('window.loaderReady === true').catch(() => false)) return;
      await new Promise(done => setTimeout(done, 100));
    }
    throw new Error(`Loader page did not initialize: ${JSON.stringify(exceptions)}`);
  };
  const settledRss = async () => {
    await call('HeapProfiler.collectGarbage');
    await new Promise(done => setTimeout(done, 1500));
    await call('HeapProfiler.collectGarbage');
    await new Promise(done => setTimeout(done, 500));
    return rendererMemoryKiB();
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('HeapProfiler.enable');

  const piano = {};
  for (const mode of skipPiano ? [] : ['owned', 'legacy']) {
    await load();
    const before = await settledRss();
    const result = await evaluate(`window.piano(${JSON.stringify(mode)})`);
    const after = await settledRss();
    piano[mode] = { ...result, rendererMemoryBeforeKiB: before, rendererMemoryAfterKiB: after,
      rendererMemoryDeltaMiB: before && after ? Number(((after - before) / 1024).toFixed(1)) : null };
    console.error(`piano ${mode}:`, JSON.stringify(piano[mode]));
  }

  await load();
  const catalog = await evaluate('window.catalog()');
  const names = only ?? catalog.selectableNow;
  const sweep = [];
  if (!skipSweep) for (let index = 0; index < names.length; index += 8) {
    const chunk = names.slice(index, index + 8);
    sweep.push(...await evaluate(`window.sweep(${JSON.stringify(chunk)})`));
    console.error(`swept ${Math.min(index + 8, names.length)}/${names.length}`);
  }
  // Five fonts against @strudel/soundfonts while it is still installed: zones, PCM and a pattern note.
  const fontParity = skipSweep ? [] : await evaluate(`window.fontParity(${JSON.stringify(FONT_PARITY)}${process.env.PARITY_PITCHES ? `, [${process.env.PARITY_PITCHES}], ${Number(process.env.PARITY_HOLD ?? .8)}` : ''})`);
  const receipt = { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    recordedAt: new Date().toISOString(), host: 'shared desktop host, headless Chrome', exceptions, piano, catalog, sweep, fontParity };
  if (output) await writeFile(output, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ piano, catalog: { ...catalog.registered, selectableToday: catalog.selectableToday.length,
    selectableNow: catalog.selectableNow.length }, swept: sweep.length, fontParity, exceptions }, null, 2));
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
    await new Promise(done => chrome.once('exit', done));
  }
  await vite?.close();
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
