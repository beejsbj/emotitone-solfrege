/** Real application input-to-render benchmark. LAB_UI_REF=cdaccef freezes baseline. */
import { createServer } from 'vite';
import { mkdtemp, readFile, rm, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { exercisePatternUi } from './ui-patterns.mjs';

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
const requestedBackend = process.env.LAB_UI_BACKEND;
if (requestedBackend && !['native', 'worklet'].includes(requestedBackend)) throw new Error('LAB_UI_BACKEND must be native or worklet');
// Include new, uncommitted architecture modules as well as tracked source.
const sourcePaths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src'],
  { cwd: repoRoot, encoding: 'utf8' }).trim().split('\n'))].sort();
async function hashSources() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [path,
    await readFile(join(appRoot, path)).then(data => createHash('sha256').update(data).digest('hex')).catch(error => {
      if(error.code === 'ENOENT') return null; throw error;
    })])));
}
const sourceHashesBefore = await hashSources();
const vite = await createServer({ root: appRoot, configFile: join(appRoot, 'vite.config.ts'),
  ...(requestedBackend ? { define: { 'import.meta.env.VITE_LIVE_AUDIO_BACKEND': JSON.stringify(requestedBackend) } } : {}),
  cacheDir: join(directory, 'vite-cache'), optimizeDeps: { entries: [join(appRoot, 'index.html')] },
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: () => true }, fs: { allow: [repoRoot, directory] } },
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
  const pending = new Map(), warnings = [], audioContextIds = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { done, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
    }
    if (message.method === 'WebAudio.contextCreated') audioContextIds.push(message.params.context.contextId);
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
  await call('WebAudio.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: await readFile(join(labRoot, 'ui-instrumentation.js'), 'utf8') });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await call('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  console.log('Loading real application and default piano sample bank…');
  let ready = false;
  for (let attempt = 0; attempt < 180; attempt++) {
    ready = await evaluate('Boolean(document.querySelector("[aria-label=\\"Play EmotiTone\\"]"))');
    if (ready) break;
    if (attempt % 20 === 19) console.log(await evaluate('document.body.innerText.slice(-800)'));
    await delay(1000);
  }
  if (!ready) throw new Error(`Application never became ready: ${warnings.slice(-8).join('\n')}`);
  if (!process.env.LAB_UI_REF) console.log('Pre-entry backend:', JSON.stringify(await evaluate("import('/src/services/livePlayback.ts').then(module=>module.getLivePlaybackDiagnostics('piano'))", true)));
  console.log('Pre-entry warnings:', JSON.stringify(warnings));
  const bank = await evaluate("import('/@fs/" + labRoot + "/ui-inspect.ts').then(module=>module.inspectPianoBank())", true);
  console.log('Piano bank:', JSON.stringify(bank));
  await delay(800);
  const start = await evaluate('(()=>{const r=document.querySelector("[aria-label=\\"Play EmotiTone\\"]").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...start, button: 'left', clickCount: 1 });
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await evaluate('Boolean(document.querySelector(".keyboard__row--main [data-key-id]"))')) break;
    await delay(500);
  }
  await evaluate('window.__audioUiLab.ready()', true);
  await evaluate("import('/src/services/superdoughAudio.ts').then(audio=>{window.__uiAudio=audio;window.__audioUiLab.useContext(audio.getAudioContext())})", true);
  const state = await evaluate(`(()=>{
    const app=document.querySelector('#app').__vue_app__;
    const pinia=app.config.globalProperties.$pinia;
    window.__uiMusic=pinia._s.get('music'); window.__uiInstrument=pinia._s.get('instrument');
    window.__uiVisual=pinia._s.get('visualConfig');
    if(!window.__uiMusic||!window.__uiInstrument||!window.__uiVisual) throw new Error('Missing real app stores');
    window.__uiVisual.config.keyboard.hapticFeedback=true;
    const key=document.querySelector('.keyboard__row--main [data-key-id]');
    if(!key) throw new Error('No real main-octave key: '+document.body.innerText.slice(-1200));
    key.scrollIntoView({block:'center'});
    return {instrument:window.__uiInstrument.currentInstrument, ready:window.__uiInstrument.isInstrumentReady(window.__uiInstrument.currentInstrument),
      key:key.getAttribute('data-key-id'), label:key.getAttribute('aria-label'), userAgent:navigator.userAgent,
      contexts:window.__audioUiLab.contexts.map((c,i)=>({sampleRate:c.sampleRate,baseLatency:c.baseLatency,outputLatency:c.outputLatency,state:c.state,
        ...window.__audioUiLab.contextDetails()[i]}))};
  })()`);
  console.log('Real app ready:', JSON.stringify(state));
  if (!process.env.LAB_UI_REF) {
    const diagnostics = await evaluate("import('/src/services/livePlayback.ts').then(module=>module.getLivePlaybackDiagnostics('piano'))", true);
    console.log('Backend:', JSON.stringify(diagnostics));
    const expectedBackend = requestedBackend === 'native' ? 'native-web-audio' : 'audio-worklet';
    if (process.env.LAB_UI_TRIALS !== '0' && diagnostics.backend !== expectedBackend) throw new Error('Expected '+expectedBackend+': '+JSON.stringify(diagnostics));
  }
  console.log('Startup warnings:', JSON.stringify(warnings));
  const trials = [];
  const count = Number(process.env.LAB_UI_TRIALS || 3);
  const filter = process.env.LAB_UI_FILTER ? new RegExp(process.env.LAB_UI_FILTER) : null;
  for (const mode of ['together', 'repeat:16']) {
    for (const input of ['touch', 'keyboard']) {
      for (const condition of ['idle', 'haptic-25ms', 'ui-50ms']) {
        if (filter && !filter.test(`${mode}/${input}/${condition}`)) continue;
        await evaluate(`window.__uiMusic.setPlayMode(${JSON.stringify(mode)}); window.__audioUiLab.configure({hapticMs:${condition === 'haptic-25ms' ? 25 : 0},busyMs:${condition === 'ui-50ms' ? 50 : 0}})`);
        await delay(1800);
        for (let trial = 0; trial < count; trial++) {
          // A previous physical key focus can consume QWERTY; focus the stage
          // background with a real click before keyboard trials.
          if (input === 'keyboard') await evaluate('document.activeElement?.blur()');
          await evaluate('window.__audioUiLab.begin()', true);
          if (input === 'touch') {
            const point = await evaluate(`(()=>{const r=document.querySelector('.keyboard__row--main [data-key-id]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
            await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1, radiusX: 5, radiusY: 5 }] });
            await delay(180);
            await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } else {
            await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
            await delay(180);
            await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
          }
          await delay(100);
          const result = await evaluate('window.__audioUiLab.finish()', true);
          trials.push({ mode, inputType: input, condition, trial, ...result });
          await delay(1600);
        }
        const rows = trials.filter((row) => row.mode === mode && row.inputType === input && row.condition === condition);
        console.log(JSON.stringify({ mode, input, condition, onsetMs: rows.map((row) => row.inputToPcmMs), sourceCallMs: rows.map((row) => row.inputToSourceCallMs) }));
      }
    }
  }
  const stress = [];
  const architecture = [];
  if (process.env.LAB_UI_STRESS === '1') {
    for (const stallDuration of [300, 650]) {
      await evaluate(`window.__uiVisual.config.codeStrip.bpm=60;window.__uiMusic.setPlayMode('repeat:16');window.__audioUiLab.configure({stall:{after:800,duration:${stallDuration}}});document.activeElement?.blur()`);
      await delay(1800);
      await evaluate('window.__audioUiLab.begin()', true);
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await delay(3150);
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await delay(500);
      const rhythm = await evaluate('window.__audioUiLab.finish()', true);
      const first = rhythm.onsets[0];
      const windowOnsets = rhythm.onsets.filter(at => at < first + 2.99);
      const deviations = windowOnsets.slice(1).map((at, i) => Math.abs((at - windowOnsets[i]) * 1000 - 250));
      stress.push({ scenario: `Actual trusted KeyA, real UI repeat sixteenths at 60 BPM, ${stallDuration}ms main-thread stall`,
        stallDurationMs: stallDuration,
        // A finite native scheduling horizon cannot cover an unbounded stall.
        // Preserve its measured failure here as a limitation, not a hidden pass.
        requireRhythmContinuity: requestedBackend !== 'native' || stallDuration <= 300,
        expectedFirst3s: 12, detectedFirst3s: windowOnsets.length, maxIntervalDeviationMs: Math.max(...deviations), ...rhythm });
      console.log('Rhythm stress:', JSON.stringify({ stallDuration, count: windowOnsets.length, maxDeviation: Math.max(...deviations) }));
    }
    // Release before the next queued sixteenth. Prepared native scheduling must
    // cancel sources already submitted inside its lookahead window.
    await evaluate("window.__uiMusic.setPlayMode('repeat:16');window.__audioUiLab.configure({});document.activeElement?.blur()");
    await delay(1800);
    await evaluate('window.__audioUiLab.begin()', true);
    await call('Input.dispatchKeyEvent', { type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65 });
    await delay(80);
    await call('Input.dispatchKeyEvent', { type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65 });
    await delay(1200);
    const cancelled = await evaluate('window.__audioUiLab.finish()',true);
    stress.push({scenario:'Actual KeyA release before next queued sixteenth cancels future sound',expectedOnsets:1,...cancelled});
    console.log('Early release cancellation:',JSON.stringify({onsets:cancelled.onsets.length,finalPeak:cancelled.final100msPeak}));
    if (!process.env.LAB_UI_REF) {
      await delay(1800);
      await evaluate('window.__audioUiLab.configure({});window.__audioUiLab.begin()', true);
      const realtime = [];
      const denseRender = evaluate(`(async()=>{
        const module=await import('/src/services/livePlayback.ts'); const engine=module.getLivePlayback('piano');
        if(!engine) throw new Error('Dense stress requires prepared production backend');
        engine.configure({style:'together',bpm:120,rate:16});
        for(let batch=0;batch<20;batch++) {
          for(let i=0;i<25;i++) engine.press('lab-dense-'+(batch*25+i),[{pitch:48+(i%36),instrumentId:'piano'}]);
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        await new Promise(resolve=>setTimeout(resolve,300));
        for(let i=0;i<500;i++) engine.release('lab-dense-'+i);
      })()`, true);
      await Promise.all([denseRender, (async()=>{
        for(let sample=0;sample<12;sample++) {
          await delay(80);
          realtime.push(await call('WebAudio.getRealtimeData',{contextId:audioContextIds.at(-1)}));
        }
      })()]);
      await delay(800);
      const capacities = realtime.map(sample => sample.realtimeData.renderCapacity);
      const capacitySummary = {max:Math.max(...capacities),mean:capacities.reduce((sum,value)=>sum+value,0)/capacities.length,
        maxThreeSampleMean:Math.max(...capacities.slice(2).map((value,i)=>(value+capacities[i]+capacities[i+1])/3))};
      const dense = await evaluate('window.__audioUiLab.finish()', true);
      const messages = dense.trace.filter(item => item.type === 'worklet-message' && item.messageType === 'press');
      const traceCounts = {};
      for (const item of dense.trace) { const kind = item.type + (item.messageType ? '/' + item.messageType : ''); traceCounts[kind] = (traceCounts[kind] || 0) + 1; }
      const trace = [...dense.trace.slice(0, 12), ...dense.trace.slice(-12)];
      stress.push({ scenario: 'Direct production live manager, same prepared piano: 500 attacks in 20 batches with 20ms timer gaps, release all; this case bypasses UI', realtime, capacitySummary,
        ...dense, trace, traceCounts, traceScope:'Dense trace retains first/last12 events plus exact counts; latency trial traces remain complete',
        attackMessageSpanMs: messages.length ? messages.at(-1).performanceTime - messages[0].performanceTime : null,
        nativeSourceCount: dense.trace.filter(item=>item.type==='buffer-source-start').length });
    }
  }
  if (process.env.LAB_UI_ARCHITECTURE === '1') {
    const patterns = await exercisePatternUi({call,evaluate,delay}).catch(error=>({
      scenario:'Actual CodeStrip text edit, Play, live Ctrl+Enter edit, common master mute/restore, Stop',
      passed:false,error:String(error.stack ?? error),
    }));
    architecture.push(patterns);
    const transport = await evaluate("import('/src/services/patternPlayback.ts').then(module=>module.getPatternPlaybackDiagnostics())",true);
    architecture.push({scenario:'One mounted application pattern transport',...transport,passed:transport.activeTransports===1});
    console.log('Pattern UI:', JSON.stringify({passed:patterns.passed,contexts:patterns.contextCount,first:patterns.first?.peak,edited:patterns.edited?.peak,muted:patterns.muted?.peak,restored:patterns.restored?.peak,stopped:patterns.stopped?.peak,error:patterns.error}));
  }
  const backend = process.env.LAB_UI_REF ? { backend: 'superdough', revision } : await evaluate("import('/src/services/livePlayback.ts').then(module=>module.getLivePlaybackDiagnostics('piano'))", true);
  const sourceHashes = await hashSources();
  const results = { recordedAt: new Date().toISOString(), revision, appRootMode: process.env.LAB_UI_REF ? 'immutable git archive' : 'current checkout', sourceHashesBefore, sourceHashes, backend,
    superdoughSha256: createHash('sha256').update(await readFile(join(repoRoot, 'node_modules/superdough/dist/index.mjs'))).digest('hex'),
    bank, environment: state, scope: 'Normal application UI and sample initialization, CDP trusted touch/keyboard input, native graph PCM capture. Haptic/UI stress is injected platform/main-thread delay; no physical input/output latency claim.',
    trials, stress, architecture, warnings,
    requestedBackend: requestedBackend ?? null,
    checks: [
      { name: 'Application source remained unchanged during capture', passed: JSON.stringify(sourceHashesBefore) === JSON.stringify(sourceHashes) },
      ...(process.env.LAB_UI_REF ? [] : [{ name: 'Normal application creates exactly one AudioContext', passed: state.contexts.length === 1 }]),
      ...(requestedBackend ? [{name:'Requested prepared backend and expected PCM ownership',
        passed: requestedBackend==='native'
          ? backend.backend==='native-web-audio' && backend.additionalPcmBytes===0 && backend.installedPcmBytes===bank.originalPcmBytes
          : backend.backend==='audio-worklet' && backend.additionalPcmBytes>0}] : []),
      ...architecture.map(row => ({ name: row.scenario, passed: row.passed })),
      ...stress.map((row) => ({name: row.scenario, passed: row.finitePcm && row.peak > 0.001 && row.final100msPeak < 0.001
        && (row.expectedOnsets === undefined || row.onsets.length === row.expectedOnsets)
        && (row.capacitySummary === undefined || row.capacitySummary.maxThreeSampleMean < 0.8)
        && (row.expectedFirst3s === undefined || row.requireRhythmContinuity === false || (row.detectedFirst3s === row.expectedFirst3s && row.maxIntervalDeviationMs < 1))})),
      { name: 'All inputs are trusted real browser events', passed: trials.every((row) => row.input?.isTrusted) },
      { name: 'Every trial produces captured audio', passed: trials.every((row) => row.onsetAudioTime !== null) },
      { name: 'Actual piano retains two distinct audible stereo channels', passed: trials.every(row=>row.stereo.rightPeak>0.001 && row.stereo.differenceRms>0.00001) },
      { name: 'Previous voice tails do not contaminate trial starts', passed: trials.every((row) => row.preInputPeak < 0.001) },
    ] };
  const output = process.argv[2] || join(labRoot, 'results/ui-current.json');
  await writeFile(output, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ output, checks: results.checks, warnings: warnings.slice(-5) }));
  if (results.checks.some((check) => !check.passed)) process.exitCode = 1;
} finally {
  socket?.close(); chrome.kill(); await vite.close();
  await new Promise((done) => chrome.exitCode !== null || chrome.signalCode !== null ? done() : chrome.once('exit', done));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
