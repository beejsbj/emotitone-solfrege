/** Exercise the read-only HighlightStrip through real input and transport controls. */
export const PATTERN_UI_SCENARIO = 'Actual HighlightStrip recording, Strudel handoff, Play, common master mute/restore, Stop, Delete and Return';

export async function exercisePatternUi({ call, evaluate, delay }) {
  const click = async selector => {
    const point = await evaluate(`(()=>{
      const node=document.querySelector(${JSON.stringify(selector)});
      if(!node || node.disabled) throw new Error('Missing or disabled UI control: '+${JSON.stringify(selector)});
      node.scrollIntoView({block:'center'});const rect=node.getBoundingClientRect();
      return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    })()`);
    await call('Input.dispatchMouseEvent', { type:'mousePressed',...point,button:'left',clickCount:1 });
    await call('Input.dispatchMouseEvent', { type:'mouseReleased',...point,button:'left',clickCount:1 });
  };
  const control = label => `.code-strip-bar [aria-label="${label}"]`;
  const snapshot = () => evaluate(`(()=>{
    const strip=document.querySelector('.code-strip-bar .highlight-strip');
    if(!strip) throw new Error('Missing HighlightStrip');
    return {
      noteCount:strip.querySelectorAll('.code-strip__note').length,
      events:[...strip.querySelectorAll('[data-event-index]')].map(node=>node.textContent.trim()),
      empty:!!strip.querySelector('.highlight-strip__empty'),
      readOnly:!!strip.querySelector('[role="group"][aria-label="Pattern code, read-only"]')
        && !strip.querySelector('textarea,input,[contenteditable="true"],[role="textbox"]'),
      canOpen:!!strip.querySelector('[aria-label="Open in Strudel"]'),
      playing:!!document.querySelector('.code-strip-bar [aria-label="Stop"]'),
      playDisabled:document.querySelector('.code-strip-bar [aria-label="Play"]')?.disabled ?? false,
    };
  })()`);
  // Intercept only the external navigation boundary. The real Button builds
  // the URL; no Strudel tab, remote editor or audio renderer is driven here.
  const handoff = async () => {
    await evaluate(`window.__labOriginalOpen=window.open;window.__labHandoff=null;
      window.open=(url,target,features)=>{window.__labHandoff={url,target,features};return null}`);
    try {
      await click(control('Open in Strudel'));
      const result = await evaluate('window.__labHandoff');
      if (!result) throw new Error('Open in Strudel did not hand off code');
      const url = new URL(result.url);
      return { ...result, code: Buffer.from(decodeURIComponent(url.hash.slice(1)), 'base64').toString('utf8'),
        valid: url.origin === 'https://strudel.cc' && result.target === '_blank'
          && result.features.split(',').includes('noopener') };
    } finally {
      await evaluate('window.open=window.__labOriginalOpen;delete window.__labOriginalOpen;delete window.__labHandoff');
    }
  };
  const capture = async milliseconds => {
    await evaluate('window.__audioUiLab.begin()',true);
    await delay(milliseconds);
    return evaluate('window.__audioUiLab.finish()',true);
  };

  await evaluate("window.__audioUiLab.configure({});window.__uiMusic.setPlayMode('together');window.__uiVisual.config.codeStrip.bpm=120");
  if ((await snapshot()).playing) await click(control('Stop'));
  console.log('Pattern UI: starting a fresh take');
  await click(control('Return'));
  await delay(100);
  const initial = await snapshot();
  await evaluate('document.activeElement?.blur()');
  const inputs = [['a','KeyA',65], ['d','KeyD',68], ['g','KeyG',71]];
  for (const [key, code, windowsVirtualKeyCode] of inputs) {
    await call('Input.dispatchKeyEvent', {type:'keyDown',key,code,windowsVirtualKeyCode});
    await delay(220);
    await call('Input.dispatchKeyEvent', {type:'keyUp',key,code,windowsVirtualKeyCode});
    await delay(100);
  }
  await delay(1500); // Let live-note release tails end before measuring playback.
  const recorded = await snapshot();
  console.log('Pattern UI: recorded', JSON.stringify(recorded));
  const exported = await handoff();
  console.log('Pattern UI: exported code; starting playback');
  // Play resumes an idle context before the capture worklet waits for a reply.
  await click(control('Play'));
  await evaluate('window.__audioUiLab.begin()',true);
  const activeEvents = new Set();
  for (let sample = 0; sample < 36; sample++) {
    await delay(50);
    const active = await evaluate("[...document.querySelectorAll('.code-strip-bar [data-active=\"true\"]')].map(node=>node.dataset.eventIndex)");
    active.forEach(index => activeEvents.add(index));
  }
  const playback = await evaluate('window.__audioUiLab.finish()',true);
  const playing = await snapshot();
  console.log('Pattern UI: captured playback', JSON.stringify({peak:playback.peak,activeEvents:[...activeEvents]}));
  // Silence at the shared master must also silence pattern playback.
  const originalGain = await evaluate(`(()=>{const master=window.__uiAudio.getSuperdoughMasterGain();
    if(!master) throw new Error('Shared master unavailable');const gain=master.gain.value;
    master.gain.setValueAtTime(0,master.context.currentTime);return gain;})()`);
  let muted;
  try { await delay(100); muted=await capture(900); }
  finally { await evaluate(`(()=>{const master=window.__uiAudio.getSuperdoughMasterGain();master.gain.setValueAtTime(${originalGain},master.context.currentTime)})()`); }
  await delay(100);
  const restored = await capture(1200);
  await click(control('Stop'));
  await delay(1500);
  const stopped = await capture(700);
  const stoppedUi = await snapshot();
  await click(control('Delete last event'));
  await delay(100);
  const deleted = await snapshot();
  const afterDeleteExport = await handoff();
  await click(control('Return'));
  await delay(100);
  const returned = await snapshot();
  const contextCount = await evaluate('window.__audioUiLab.contexts.length');
  const checks = [
    {name:'Return starts an empty take',passed:initial.empty && initial.playDisabled},
    {name:'Keyboard recording renders read-only events',passed:recorded.readOnly && recorded.noteCount===inputs.length && !recorded.empty},
    {name:'Open in Strudel hands off recorded code',passed:exported.valid && !!exported.code.trim()},
    {name:'Play sounds and lights multiple recorded events',passed:playing.playing && activeEvents.size>=2 && playback.finitePcm && playback.peak>0.001},
    {name:'Patterns use one shared audio context and master',passed:contextCount===1 && muted.finitePcm && muted.peak<0.001 && restored.finitePcm && restored.peak>0.001},
    {name:'Stop silences playback',passed:!stoppedUi.playing && !stoppedUi.playDisabled && stopped.finitePcm && stopped.peak<0.001},
    {name:'Delete updates events and exported code',passed:deleted.noteCount===inputs.length-1 && deleted.events.length<recorded.events.length && afterDeleteExport.valid && afterDeleteExport.code!==exported.code},
    {name:'Return restores the empty prompt and disables Play',passed:returned.empty && returned.events.length===0 && returned.playDisabled && !returned.canOpen},
  ];
  return {
    scenario:PATTERN_UI_SCENARIO, inputs:inputs.map(([key])=>key), contextCount,
    initial,recorded,exported,playing,activeEvents:[...activeEvents],stoppedUi,deleted,afterDeleteExport,returned,
    playback,muted,restored,stopped,checks,passed:checks.every(check=>check.passed),
  };
}
