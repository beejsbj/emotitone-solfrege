/** Exercise the actual CodeStrip editor/transport; never call an audio renderer. */
export async function exercisePatternUi({ call, evaluate, delay }) {
  const click = async selector => {
    const point = await evaluate(`(()=>{
      const node=document.querySelector(${JSON.stringify(selector)});
      if(!node) throw new Error('Missing actual UI control: '+${JSON.stringify(selector)});
      node.scrollIntoView({block:'center'});const rect=node.getBoundingClientRect();
      return {x:rect.x+Math.min(rect.width/2,30),y:rect.y+rect.height/2};
    })()`);
    await call('Input.dispatchMouseEvent', { type:'mousePressed',...point,button:'left',clickCount:1 });
    await call('Input.dispatchMouseEvent', { type:'mouseReleased',...point,button:'left',clickCount:1 });
  };
  const key = async (key,code,keyCode,modifiers=0) => {
    await call('Input.dispatchKeyEvent', {type:'keyDown',key,code,windowsVirtualKeyCode:keyCode,modifiers});
    await call('Input.dispatchKeyEvent', {type:'keyUp',key,code,windowsVirtualKeyCode:keyCode,modifiers});
  };
  const edit = async text => {
    await click('.code-strip-bar .cm-content');
    if(!await evaluate("Boolean(document.activeElement?.closest('.cm-content'))")) throw new Error('CodeMirror did not receive focus');
    await key('a','KeyA',65,2);
    await call('Input.insertText',{text});
  };
  const capture = async milliseconds => {
    await evaluate('window.__audioUiLab.begin()',true);
    await delay(milliseconds);
    return evaluate('window.__audioUiLab.finish()',true);
  };
  const originalCode = await evaluate("document.querySelector('.code-strip-bar .cm-content')?.innerText ?? ''");
  const firstCode = 'note("c4*4").s("piano").gain(0.2).release(0.03).cpm(60)';
  const editedCode = 'note("e4*4").s("piano").gain(0.2).release(0.03).cpm(60)';
  await evaluate("window.__audioUiLab.configure({});window.__uiMusic.setPlayMode('together')");
  await edit(firstCode);
  await evaluate('window.__audioUiLab.begin()',true);
  await click('.code-strip-bar [aria-label="Play"]');
  await delay(1800);
  const first = await evaluate('window.__audioUiLab.finish()',true);
  const playingBeforeEdit = await evaluate('Boolean(document.querySelector(\'.code-strip-bar [aria-label="Stop"]\'))');
  await evaluate('window.__audioUiLab.begin()',true);
  await edit(editedCode);
  await key('Enter','Enter',13,2);
  await delay(1600);
  const edited = await evaluate('window.__audioUiLab.finish()',true);
  const playingAfterEdit = await evaluate('Boolean(document.querySelector(\'.code-strip-bar [aria-label="Stop"]\'))');
  // Silence at the shared master must silence authored patterns as well as live
  // voices; this detects an accidentally separate output/context graph.
  const originalGain = await evaluate(`(()=>{const master=window.__uiAudio.getSuperdoughMasterGain();
    if(!master) throw new Error('Shared master unavailable');const gain=master.gain.value;
    master.gain.setValueAtTime(0,master.context.currentTime);return gain;})()`);
  let muted;
  try { await delay(100); muted=await capture(700); }
  finally { await evaluate(`(()=>{const master=window.__uiAudio.getSuperdoughMasterGain();master.gain.setValueAtTime(${originalGain},master.context.currentTime)})()`); }
  await delay(100);
  const restored = await capture(900);
  await click('.code-strip-bar [aria-label="Stop"]');
  await delay(1500);
  const stopped = await capture(700);
  const stoppedUi = await evaluate('Boolean(document.querySelector(\'.code-strip-bar [aria-label="Play"]\'))');
  const contextCount = await evaluate('window.__audioUiLab.contexts.length');
  return {
    scenario:'Actual CodeStrip text edit, Play, live Ctrl+Enter edit, common master mute/restore, Stop',
    originalCode,firstCode,editedCode,playingBeforeEdit,playingAfterEdit,stoppedUi,contextCount,
    first,edited,muted,restored,stopped,
    passed:playingBeforeEdit && playingAfterEdit && stoppedUi && contextCount===1
      && first.finitePcm && edited.finitePcm && first.peak>0.001 && edited.peak>0.001
      && muted.peak<0.001 && restored.peak>0.001 && stopped.peak<0.001,
  };
}
