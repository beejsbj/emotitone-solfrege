/** Browser integration: node audio-lab/finger-expression.mjs [receipt.json]. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const directory = await mkdtemp(join(tmpdir(), 'emotitone-expression-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const vite = await createServer({ cacheDir: join(directory, 'vite'), server: {
  host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: () => true },
} });
let chrome;
let socket;
try {
  await vite.listen();
  const port = vite.httpServer.address().port;
  chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--window-size=1280,1000', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--remote-debugging-port=0',
    `--user-data-dir=${join(directory, 'profile')}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const debugPort = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 15000);
    chrome.on('error', error => { clearTimeout(timer); reject(error); });
    chrome.stderr.on('data', data => {
      output += data;
      const match = output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
  });
  const page = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  const errors = [];
  let serial = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id); clearTimeout(request.timer);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
      }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true, timeout: 45000 });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await call('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    ready = await evaluate('!!document.querySelector("[aria-label=\\"Play EmotiTone\\"]")');
    if (ready) break;
    await delay(250);
  }
  assert(ready, 'App must initialize');
  // The loading screen animates its entry button. Enter semantically so that
  // its moving hit box cannot make the subsequent touch checks flaky.
  await evaluate(`document.querySelector('[aria-label="Play EmotiTone"]').click()`);
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate('!!document.querySelector(".keyboard__row--main [data-key-id]")')) break;
    await delay(100);
  }
  await evaluate(`(async()=>{
    const pinia=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    window.expressionMusic=(await import('/src/stores/music.ts')).useMusicStore(pinia);
    window.expressionInstrument=(await import('/src/stores/instrument.ts')).useInstrumentStore(pinia);
    window.expressionPatterns=(await import('/src/stores/patterns.ts')).usePatternsStore(pinia);
    await expressionInstrument.setInstrument('triangle');expressionMusic.setPlayMode('together');
    window.expressionEvents=[];
    for(const type of ['note-played','note-expression','note-released'])window.addEventListener(type,e=>expressionEvents.push({type,...e.detail}));
    const audio=await import('/src/services/superdoughAudio.ts');
    window.expressionMaster=audio.getSuperdoughMasterGain();
    window.expressionAnalyser=audio.getAudioContext().createAnalyser();expressionAnalyser.fftSize=2048;
    expressionMaster.connect(expressionAnalyser);
    window.expressionScope=null;
    const paths=new WeakMap(),p=CanvasRenderingContext2D.prototype;
    const begin=p.beginPath,move=p.moveTo,line=p.lineTo,stroke=p.stroke;
    p.beginPath=function(...a){paths.set(this,[]);return begin.apply(this,a)};
    p.moveTo=function(x,y){paths.get(this)?.push([x,y]);return move.call(this,x,y)};
    p.lineTo=function(x,y){paths.get(this)?.push([x,y]);return line.call(this,x,y)};
    p.stroke=function(...a){const path=paths.get(this);if(path?.length===1024)expressionScope={width:Math.max(...path.map(p=>p[0]))-Math.min(...path.map(p=>p[0])),time:performance.now()};return stroke.apply(this,a)};
    window.expressionCapture=()=>{const samples=new Float32Array(2048);expressionAnalyser.getFloatTimeDomainData(samples);return JSON.parse(JSON.stringify({rms:Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length),scope:expressionScope,notes:expressionMusic.getActiveNotes(),events:expressionEvents}))};
  })()`);
  const keyPoint = selector => evaluate(`(()=>{const k=document.querySelector(${JSON.stringify(selector)});if(!k)throw new Error('Key missing: '+document.body.innerText);const r=k.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const touch = (type, points = []) => call('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, index) => ({ id: index + 1, radiusX: 4, radiusY: 4, force: 1, ...p })) });
  const capture = async () => {
    const requestedAt = await evaluate('performance.now()');
    // Allow the stage's entrance/layout smoothing to settle, then require a
    // fresh drawing instead of accidentally comparing a previous canvas frame.
    await delay(600);
    for (let attempt = 0; attempt < 30; attempt++) {
      const result = await evaluate('expressionCapture()');
      if (result.scope?.time > requestedAt + 200) return result;
      await delay(100);
    }
    throw new Error('Scope did not draw a fresh frame');
  };
  const melody = await keyPoint('.keyboard__row--main [data-key-id]');
  await touch('touchStart', [melody]);
  const neutral = await capture();
  assert.equal(neutral.notes.length, 1);
  await touch('touchMove', [{ x: melody.x + 20, y: melody.y + 20 }]);
  const quiet = await capture();
  assert.equal(quiet.notes[0].pitchBendCents, 43);
  assert(quiet.rms / neutral.rms > .45 && quiet.rms / neutral.rms < .7, 'Vertical gesture must reduce actual master audio');
  assert(quiet.scope.width / neutral.scope.width < .8, 'Hilbert drawing must shrink with actual audio gain');
  await touch('touchMove', [{ x: melody.x + 20, y: melody.y - 20 }]);
  const loud = await capture();
  assert(loud.rms / neutral.rms > 1.2 && loud.rms / neutral.rms < 1.65, 'Upward displacement must sustain higher gain');
  assert.equal(loud.events.filter(e => e.type === 'note-played').length, 1, 'Expression must not retrigger');
  await touch('touchEnd');
  await delay(200);
  const recorded = await evaluate('JSON.parse(JSON.stringify(expressionPatterns.loggedNotes))');
  assert(recorded[0]?.pitchExpression?.some(p => p.cents > 0));
  assert(recorded[0]?.gainExpression?.some(p => p.gain < 1));
  assert(recorded[0]?.gainExpression?.some(p => p.gain > 1));

  // Two physical contacts must keep independent expression owners.
  await evaluate('expressionEvents=[]');
  const other = await keyPoint('.keyboard__row--main [data-key-id="2_4"]');
  await touch('touchStart', [melody, other]);
  const pairNeutral = await capture();
  assert.equal(pairNeutral.notes.length, 2);
  await touch('touchMove', [melody, { x: other.x - 20, y: other.y + 20 }]);
  const pairBent = await capture();
  const movingNote = pairBent.notes.find(n => n.noteId === pairNeutral.notes[1].noteId);
  const steadyNote = pairBent.notes.find(n => n.noteId === pairNeutral.notes[0].noteId);
  assert.equal(movingNote.pitchBendCents, -42);
  assert.equal(steadyNote.pitchBendCents ?? 0, 0);
  assert(pairBent.events.filter(e => e.type === 'note-expression').every(e => e.noteId === movingNote.noteId));
  assert.equal(pairBent.events.filter(e => e.type === 'note-played').length, 2);
  await touch('touchEnd');
  await delay(200);

  // The same gesture on a chord must reach each voice and release every member.
  await evaluate('expressionEvents=[]');
  const chord = await keyPoint('[data-chord-id]');
  await touch('touchStart', [chord]);
  const chordNeutral = await capture();
  assert(chordNeutral.notes.length >= 3, 'Chord must produce its member notes');
  await touch('touchMove', [{ x: chord.x + 15, y: chord.y + 10 }]);
  const chordBent = await capture();
  assert(chordBent.notes.every(n => n.pitchBendCents === 30), 'Chord bend must apply to every member');
  for (const note of chordBent.notes) {
    assert(chordBent.events.some(e => e.type === 'note-expression' && e.noteId === note.noteId && e.gain < 1), 'Chord gain must reach every member');
  }
  assert.equal(chordBent.events.filter(e => e.type === 'note-played').length, chordNeutral.notes.length);
  await touch('touchCancel');
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await evaluate('expressionMusic.getActiveNotes().length === 0')) break;
    await delay(100);
  }
  assert.equal(await evaluate('expressionMusic.getActiveNotes().length'), 0, 'Cancelled chord must release completely');
  await evaluate('expressionMaster.disconnect(expressionAnalyser);expressionAnalyser.disconnect()');
  assert.deepEqual(errors, []);
  const receipt = { neutralRms: neutral.rms, quietRms: quiet.rms, loudRms: loud.rms,
    neutralScopeWidth: neutral.scope.width, quietScopeWidth: quiet.scope.width,
    chordMembers: chordNeutral.notes.length, recordedPitchPoints: recorded[0].pitchExpression.length,
    recordedGainPoints: recorded[0].gainExpression.length, errors };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(receipt, null, 2) + '\n');
  console.log('PASS: browser gestures -> per-note audio -> Hilbert -> recording; chord expression and cancellation', receipt);
} finally {
  socket?.close();
  chrome?.kill();
  await vite.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) await new Promise(resolve => chrome.once('exit', resolve));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
