/** Real application input-to-render benchmark. LAB_UI_REF=cdaccef freezes baseline. */
import { createServer } from 'vite';
import { mkdtemp, readFile, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const labRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(labRoot, '..');
const directory = await mkdtemp(join(tmpdir(), 'emotitone-ui-audio-'));
const revision = process.env.LAB_UI_REF || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
let appRoot = repoRoot;
if (process.env.LAB_UI_REF) {
  appRoot = join(directory, 'app'); await mkdir(appRoot);
  const archive = execFileSync('git', ['archive', revision], { cwd: repoRoot, maxBuffer: 100 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', appRoot], { input: archive });
  await symlink(join(repoRoot, 'node_modules'), join(appRoot, 'node_modules'));
}
const sourcePaths = ['src/services/superdoughAudio.ts', 'src/stores/music.ts', 'src/components/compounds/Keyboard.vue',
  'src/services/livePlayback.ts', 'src/services/preparedLiveInstrument.ts', 'src/audio/live/core.ts', 'src/audio/live/processor.ts', 'src/audio/live/resampler.ts'];
async function hashSources() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [path,
    await readFile(join(appRoot, path)).then(data => createHash('sha256').update(data).digest('hex')).catch(error => {
      if(error.code === 'ENOENT') return null; throw error;
    })])));
}
const sourceHashesBefore = await hashSources();
const vite = await createServer({ root: appRoot, configFile: join(appRoot, 'vite.config.ts'),
  plugins:[{name:'lab-blank',configureServer(server){server.middlewares.use('/audio-lab/probe.html',(_req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><title>Audio CPU probe</title>')})}}],
  cacheDir: join(directory, 'vite-cache'), optimizeDeps: { entries: [join(appRoot, 'index.html')] },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [repoRoot, directory] } },
});
await vite.listen();
const port = vite.httpServer.address().port;
const chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--window-size=1280,1000',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--remote-debugging-port=0', `--user-data-dir=${join(directory, 'chrome')}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
try {
  const debugPort = await new Promise((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000);
    let output = '';
    chrome.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); done(Number(match[1])); }
    });
    chrome.on('error', reject);
  });
  const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map(), warnings = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { done, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') warnings.push(message.params.exceptionDetails.exception?.description || JSON.stringify(message.params));
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      warnings.push(message.params.args.map((arg) => arg.value || arg.description).join(' '));
    }
  };
  const call = (method, params = {}) => new Promise((done, reject) => {
    pending.set(++serial, { done, reject }); socket.send(JSON.stringify({ id: serial, method, params }));
  });
  const evaluate = async (expression, awaitPromise = false) => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, timeout: 180000 });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.navigate', {url:`http://127.0.0.1:${port}/audio-lab/probe.html`});
  await delay(300);
  const cases = await evaluate(await readFile(join(labRoot, 'ui-core-benchmark.js'), 'utf8'), true);
  const sourceHashesAfter=await hashSources();
  const result={sourceHashesAfter,sourcesStable:JSON.stringify(sourceHashesBefore)===JSON.stringify(sourceHashesAfter),scope:'Actual Chrome V8 CPU benchmark of production LiveAudioCore.render; not AudioWorklet deadline or PCM continuity proof',revision,sourceHashesBefore,cases};
  console.log(JSON.stringify(result));
  await writeFile(process.argv[2] || join(labRoot,'results/ui-core-cpu.json'),JSON.stringify(result,null,2)+'\n');
} finally {
  socket?.close(); chrome.kill(); await vite.close();
  await new Promise((done) => chrome.exitCode !== null || chrome.signalCode !== null ? done() : chrome.once('exit', done));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
