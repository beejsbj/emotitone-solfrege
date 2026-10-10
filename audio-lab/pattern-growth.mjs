/** Sequential recorded-history responsiveness. Run one Chrome job at a time.
 * LAB_UI_REF selects a git revision; LAB_PATTERN_RESULT chooses the JSON receipt.
 * Trusted-key dispatch and browser input queue times are NOT acoustic latency.
 */
import { createServer } from 'vite';
import { nativeBackendPlugin } from './native-backend.mjs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const labRoot = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(process.env.LAB_PATTERN_RESULT || '/tmp/pattern-growth.json');
const mode = process.env.LAB_PATTERN_APPEND_ONLY === '1' ? 'append-only'
  : process.env.LAB_PATTERN_VIEWPORT_SMOKE === '1' ? 'viewport-smoke'
  : process.env.LAB_PATTERN_PROFILE_APPEND === '1' ? 'append-profile'
  : process.env.LAB_PATTERN_FOCUSED === '1' ? 'focused' : 'full';
const repoRoot = resolve(labRoot, '..');
const directory = await mkdtemp(join(tmpdir(), 'emotitone-ui-audio-'));
const revision = execFileSync('git', ['rev-parse', process.env.LAB_UI_REF || 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
let appRoot = repoRoot;
if (process.env.LAB_UI_REF) {
  appRoot = join(directory, 'app'); await mkdir(appRoot);
  const archive = execFileSync('git', ['archive', revision], { cwd: repoRoot, maxBuffer: 100 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', appRoot], { input: archive });
  // A reference must also use its own dependency patches, especially CodeMirror.
  execFileSync('bun', ['install', '--frozen-lockfile'], { cwd: appRoot, stdio: 'pipe' });
}
const requestedBackend = process.env.LAB_UI_BACKEND;
if (requestedBackend && !['native', 'worklet'].includes(requestedBackend)) throw new Error('LAB_UI_BACKEND must be native or worklet');
// Include new, uncommitted architecture modules as well as tracked source.
const sourcePaths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src', 'audio-lab/reference'],
  { cwd: repoRoot, encoding: 'utf8' }).trim().split('\n'))].sort();
async function hashSources() {
  return Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [path,
    await readFile(join(appRoot, path)).then(data => createHash('sha256').update(data).digest('hex')).catch(error => {
      if(error.code === 'ENOENT') return null; throw error;
    })])));
}
const sourceHashesBefore = await hashSources();
const sourceTreeSha256 = createHash('sha256').update(JSON.stringify(sourceHashesBefore)).digest('hex');
const dependencyHashes = Object.fromEntries(await Promise.all([
  '@codemirror/view/dist/index.js', 'superdough/dist/index.mjs',
].map(async path => [path, await readFile(join(appRoot, 'node_modules', path)).then(data => createHash('sha256').update(data).digest('hex')).catch(error => {
    if (error.code === 'ENOENT' && path.startsWith('@codemirror/')) return null;
    throw error;
  })])));
const vite = await createServer({ root: appRoot, configFile: join(appRoot, 'vite.config.ts'),
  plugins: [nativeBackendPlugin(requestedBackend, appRoot)],
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
    if (attempt % 20 === 19) {
      const loadingText=await evaluate('document.body.innerText.slice(-800)');
      console.log(loadingText);
      // A fresh Vite dependency optimisation can leave the initial module
      // navigation empty. Retry once before collecting any measurements.
      if(attempt===19 && !loadingText.trim())await call('Page.reload',{ignoreCache:true});
    }
    await delay(1000);
  }
  if (!ready) throw new Error(`Application never became ready: ${warnings.slice(-8).join('\n')}`);
  if (!process.env.LAB_UI_REF) console.log('Pre-entry backend:', JSON.stringify(await evaluate("import('/src/services/livePlayback.ts').then(module=>module.getLivePlaybackDiagnostics('piano'))", true)));
  console.log('Pre-entry warnings:', JSON.stringify(warnings));
  const bank = await evaluate("import('/audio-lab/ui-inspect.ts').then(module=>module.inspectPianoBank())", true);
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

  await evaluate(`(()=>{
    const stores=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s;
    window.phrases=stores.get('phrases');
    window.ps=phrases ? {
      get loggedNotes(){return phrases.takeNotes},
      get currentWorkingNotes(){return phrases.takeNotes},
    } : stores.get('patterns');
    if(!ps)throw new Error('Missing recording store');
    window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask'});
    window.frames=[];let last=performance.now();function frame(t){frames.push({start:last,duration:t-last});last=t;requestAnimationFrame(frame)}requestAnimationFrame(frame);
    window.inputLog=[];for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(e.code==='KeyA')inputLog.push({type,at:performance.now(),trusted:e.isTrusted,eventTime:e.timeStamp})},true);
    window.__uiMusic.setPlayMode('together');window.__audioUiLab.configure({});document.activeElement?.blur();
  })()`);
  const key = async type => {const t=performance.now();await call('Input.dispatchKeyEvent',{type,key:'a',code:'KeyA',windowsVirtualKeyCode:65});return performance.now()-t};
  await key('keyDown');await delay(90);await key('keyUp');await delay(350);
  console.log('Initial note',await evaluate('JSON.parse(JSON.stringify(ps.loggedNotes.at(-1)))'));
  await evaluate(`window.template=JSON.parse(JSON.stringify(ps.loggedNotes.at(-1)));if(!template)throw new Error('No recorded key note');
    window.seed=async(n,logging=true)=>{
      const end=Date.now()-150;
      const notes=Array.from({length:n},(_,i)=>({...template,id:'fixture-'+i,pressTime:i*125,releaseTime:i*125+90,duration:90,isStartingNewPattern:i===0}));
      if(phrases){
        phrases.isRecordingEnabled=logging;
        phrases.take.notes=notes;
        phrases.take.duration=notes.at(-1)?.releaseTime??0;
        Object.assign(phrases.book.recorder,{origin:'fresh',liveNoteIds:notes.map(note=>note.id),
          wallOrigin:end-phrases.take.duration,lastReleaseWall:end,edited:true,baseDuration:0});
      }else{
        ps.isLoggingEnabled=logging;ps.loadedBaseNotes=[];ps.loadedBaseMeta=null;ps.loadedBasePatternId=null;ps.isStripCleared=false;
        ps.loggedNotes=notes.map(note=>({...note,pressTime:end-n*125+note.pressTime,releaseTime:end-n*125+note.releaseTime}));
      }
      await new Promise(r=>setTimeout(r,250));longTasks=[];frames=[];inputLog=[];
    }`);

  await evaluate(`window.refreshTimes=()=>{
    if(phrases){const r=phrases.book.recorder;const shift=Date.now()-50-r.lastReleaseWall;r.wallOrigin+=shift;r.lastReleaseWall+=shift;return}
    const notes=ps.loggedNotes.__v_raw;if(!notes.length)return;const shift=Date.now()-50-notes.at(-1).releaseTime;for(const n of notes){n.pressTime+=shift;n.releaseTime+=shift}
  };
  window.stripScroller=()=>document.querySelector('.code-strip-bar .highlight-strip__scroller, .code-strip-bar .cm-scroller');
  window.domStats=()=>{
    const strip=stripScroller();if(!strip)throw new Error('Missing strip scroller');
    let stripNodes=1;const walker=document.createTreeWalker(strip,NodeFilter.SHOW_ALL);while(walker.nextNode())stripNodes++;
    return {notes:document.querySelectorAll('.note').length,codeNotes:strip.querySelectorAll('.note').length,
      widgets:strip.querySelectorAll('.highlight-strip-event, .cm-code-strip-event').length,
      stripElements:strip.querySelectorAll('*').length,stripNodes,
      loopArcs:document.querySelectorAll('.loop-dial__arc').length,elements:document.querySelectorAll('*').length};
  };
  window.appendObservations=[];
  let appendStart, expectedNotes;
  window.addEventListener('keyup',event=>{
    if(event.code!=='KeyA')return;
    appendStart=performance.now();expectedNotes=window.nextAppendCount??ps.loggedNotes.length+1;
  },true);
  new MutationObserver(()=>{
    if(appendStart===undefined || ps.loggedNotes.length!==expectedNotes)return;
    // Read layout after Vue's published DOM changes. This is end-to-end
    // keyup-to-DOM latency, not isolated CPU time or acoustic latency.
    const width=stripScroller().scrollWidth;
    appendObservations.push({notes:expectedNotes,domMs:performance.now()-appendStart,scrollWidth:width});
    appendStart=undefined;
  }).observe(stripScroller(),{childList:true,subtree:true});`);
  await evaluate(`window.visibleCodeNote=note=>{
    const r=note.getBoundingClientRect(), s=stripScroller().getBoundingClientRect();
    return Math.min(r.right,s.right,innerWidth)>Math.max(r.left,s.left,0) &&
      Math.min(r.bottom,s.bottom,innerHeight)>Math.max(r.top,s.top,0);
  };
  window.probeCodeColors=async()=>{
    const notes=[...document.querySelectorAll('.code-strip-bar .note')];
    const visible=notes.filter(visibleCodeNote),hidden=notes.filter(note=>!visibleCodeNote(note));
    const live=document.querySelector('.keyboard__row--main .note');
    if(!visible.length || !live) throw new Error('Missing visible note color probes');
    const before=new Map([...notes,live].map(note=>[note,note.getAttribute('style')]));
    await new Promise(r=>setTimeout(r,250));
    const changed=note=>before.get(note)!==note.getAttribute('style');
    return {visibleCount:visible.length,hiddenCount:hidden.length,
      visibleChanged:visible.some(changed),hiddenChanged:hidden.some(changed),liveChanged:changed(live)};
  }`);

  const hueRows=[];
  const conditions = mode === 'append-only' ? [{n:512,hue:false,logging:true},{n:512,hue:true,logging:true}]
    : mode === 'viewport-smoke' ? [{n:512,hue:true,logging:true}]
    : mode === 'append-profile' ? [{n:512,hue:false,logging:true}] : mode === 'focused'
    ? [{n:16,hue:true,logging:false},{n:512,hue:true,logging:false},{n:512,hue:false,logging:true},{n:512,hue:true,logging:true}]
    : [{n:16,hue:true,logging:false},{n:128,hue:true,logging:false},{n:512,hue:true,logging:false},{n:2048,hue:true,logging:false},{n:16,hue:true,logging:false},{n:512,hue:false,logging:false},{n:512,hue:false,logging:true},{n:512,hue:true,logging:false},{n:512,hue:true,logging:true}];
  for(const spec of conditions){
    await delay(1400);await evaluate(`__uiVisual.config.dynamicColors.hueMotionEnabled=${spec.hue};seed(${spec.n},${spec.logging})`,true);
    await delay(1200);
    const colors = mode==='append-only' ? null : await evaluate('probeCodeColors()',true);
    if(mode==='append-only') await evaluate('stripScroller().scrollIntoView({block:"center"})');
    const domBefore=await evaluate('domStats()');
    if(!domBefore.codeNotes)throw new Error('Missing rendered history notes');
    await evaluate('longTasks=[];frames=[];inputLog=[];appendObservations=[]');
    if(mode==='append-profile') {
      await call('Profiler.enable');
      await call('Profiler.setSamplingInterval',{interval:1000});
      await call('Profiler.start');
    }
    const samples=[];
    for(let i=0;i<6;i++){
      if(spec.logging)await evaluate('refreshTimes()');
      if(mode==='append-only')await evaluate(`window.nextAppendCount=${spec.n+i+1}`);
      const downMs=await key('keyDown');await delay(90);const upMs=await key('keyUp');
      if(mode==='append-only')await evaluate(`new Promise((done,reject)=>{
        const start=performance.now();function check(){
          if(appendObservations.some(sample=>sample.notes===${spec.n+i+1}))return done();
          if(performance.now()-start>10000)return reject(new Error('Append DOM publication timed out at ${spec.n+i+1}'));
          requestAnimationFrame(check);
        }check();
      })`,true);
      await delay(180);samples.push({downMs,upMs});
    }
    // Drain delayed release publication and include its trailing LongTasks.
    await delay(1500);
    if(mode==='append-profile') {
      const {profile}=await call('Profiler.stop');
      await writeFile(outputPath+'.cpuprofile',JSON.stringify(profile));
      await call('Profiler.disable');
    }
    const data=await evaluate('({logged:ps.loggedNotes.length,pending:ps.pendingNotes?.size,working:ps.currentWorkingNotes.length,hue:__uiVisual.config.dynamicColors.hueMotionEnabled,longTasks,frames,appendObservations,inputLog,...domStats()})');
    const row={...spec,samples,colors,domBefore,...data};hueRows.push(row);console.log('FINAL',JSON.stringify(row));
    await writeFile(outputPath,JSON.stringify({revision,mode,state,sourceTreeSha256,sourceHashes:sourceHashesBefore,dependencyHashes,rows:hueRows,warnings},null,2));
    if (mode==='append-only' && (data.appendObservations.length!==6 || data.appendObservations.some((sample,index)=>sample.notes!==spec.n+index+1))) {
      throw new Error('Missing consecutive append DOM observations');
    }
    if (data.working !== spec.n + (spec.logging ? 6 : 0)) {
      throw new Error(`Fixture crossed a take boundary: expected ${spec.n + (spec.logging ? 6 : 0)}, got ${data.working}`);
    }
  }
  if(mode!=='append-only') {
  await evaluate('__uiVisual.config.dynamicColors.hueMotionEnabled=true;seed(512,false)',true);
  await delay(1200);
  const viewport = await evaluate(`(async()=>{
    const scroller=stripScroller();
    if(scroller.scrollWidth<=scroller.clientWidth*2) throw new Error('Fixture must scroll horizontally');
    scroller.scrollLeft=0;await new Promise(r=>setTimeout(r,500));
    const before=await probeCodeColors();
    const note=[...scroller.querySelectorAll('.note')].find(visibleCodeNote);
    scroller.scrollLeft=scroller.clientWidth*2;await new Promise(r=>setTimeout(r,500));
    const clipped=!note.isConnected || !visibleCodeNote(note);
    const style=note.getAttribute('style');
    await new Promise(r=>setTimeout(r,250));
    const clippedChanged=note.getAttribute('style')!==style;
    const afterScroll=await probeCodeColors();
    scroller.scrollLeft=0;await new Promise(r=>setTimeout(r,500));
    const resumed=await probeCodeColors();
    return {before,clipped,clippedChanged,afterScroll,resumed};
  })()`,true);
  await evaluate(`window.__patternMotionQuery=matchMedia('(prefers-reduced-motion: reduce)');
    window.__patternMotionEvents=[];__patternMotionQuery.addEventListener('change',event=>__patternMotionEvents.push(event.matches));`);
  await evaluate(`import('/src/composables/useMusicColorClock.ts').then(module=>{
    window.__patternClockProbe=module.useMusicColorClock(()=>false,()=>1);
  })`,true);
  await call('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))',true);
  await delay(400);
  viewport.reducedMotion=await evaluate('probeCodeColors()',true);
  viewport.reducedMotion.media=await evaluate(`({current:matchMedia('(prefers-reduced-motion: reduce)').matches,
    original:__patternMotionQuery.matches,events:__patternMotionEvents.slice(),clock:__patternClockProbe.reducedMotion.value})`);
  await call('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))',true);
  await delay(400);
  viewport.motionResumed=await evaluate('probeCodeColors()',true);
  console.log('VIEWPORT',JSON.stringify(viewport));
  await evaluate('seed(16,false)',true);
  await delay(1000);
  const clickTransport = async label => {
    const point=await evaluate(`(()=>{const el=document.querySelector('.code-strip-bar [aria-label="${label}"]');if(!el)throw new Error('Missing transport ${label}');const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  };
  await clickTransport('Play');
  await delay(1200);
  const replay=await evaluate(`({playing:!!document.querySelector('.code-strip-bar [aria-label="Stop"]'),richNotes:document.querySelectorAll('.code-strip-bar .note').length,active:document.querySelectorAll('.cm-code-strip-event--active, .highlight-strip-event--active').length})`);
  if(!replay.playing || !replay.richNotes) throw new Error('Rich generated-pattern replay failed: '+JSON.stringify(replay));
  await clickTransport('Stop');
  replay.stopped=await evaluate(`!!document.querySelector('.code-strip-bar [aria-label="Play"]')`);
  if(!replay.stopped) throw new Error('Transport did not stop');
  console.log('REPLAY',JSON.stringify(replay));
  await writeFile(outputPath,JSON.stringify({revision,mode,state,sourceTreeSha256,sourceHashes:sourceHashesBefore,dependencyHashes,rows:hueRows,viewport,replay,warnings},null,2));
  }
} finally {
  if (JSON.stringify(sourceHashesBefore) !== JSON.stringify(await hashSources())) {
    console.error('Application source changed during benchmark; discard this receipt.');
    process.exitCode = 1;
  }
  socket?.close(); chrome.kill(); await vite.close();
  await new Promise((done) => chrome.exitCode !== null || chrome.signalCode !== null ? done() : chrome.once('exit', done));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
