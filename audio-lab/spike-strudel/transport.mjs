// Throwaway slice-1 spike. Never imported by the application entry point.
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import * as webaudio from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';
import { StrudelMirror, updateMiniLocations, highlightMiniLocations } from '@strudel/codemirror';
import { logNotesToStrudel } from '@/services/StrudelNotation';
import { defaultPatterns } from '@/data/patterns';
import { getAudioContext, initSynthOnlyAudio, emotitoneStrudelOutput, stopStrudelVisuals } from '@/services/superdoughAudio';
import { UIBeatClock } from '@/composables/useUIBeat';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const number = x => Number(x);
export const stats = values => {
  const sorted = [...values].sort((a,b) => a-b);
  return { count: values.length, mean: values.reduce((a,b)=>a+b,0)/(values.length || 1),
    max: sorted.at(-1) ?? 0, p95: sorted[Math.floor((sorted.length-1)*.95)] ?? 0 };
};

// Synthetic timing variants keep pitches from the real library, make independent
// 1/2/3/4-bar periods, and leave a positive authored tail (no default extra beat).
export function measuredPhrases() {
  return [1,2,3,4].map((bars, i) => {
    const source = defaultPatterns[i];
    const count = bars * 8;
    const notes = Array.from({length: count}, (_, j) => {
      const n = source.notes[j % source.notes.length];
      return { ...n, id: `spike-${i}-${j}`, key: source.key, mode: source.mode,
        instrument: 'sine', pressTime: j*250, releaseTime: j*250+100, duration:100,
        sessionId:'spike', solfege:{name:'spike'},
        articulation:{attack:.001, decay:.01, sustain:.5, release:.01} };
    });
    return {id:`p${i}`,name:`${source.name} (${bars} bars)`,notes,key:source.key,
      mode:source.mode,bpm:120,bars,duration:bars*2000};
  });
}
export function phonePhrases() {
  return defaultPatterns.slice(0,4).map((p,i) => {
    const barMs = 240000/p.bpm;
    const end = Math.max(...p.notes.map(n=>n.pressTime+n.duration));
    // Include positive tail even when the final held note ends on a bar line.
    const bars = Math.ceil((end + 1)/barMs);
    return {...p,id:`p${i}`,bars,duration:bars*barMs,notes:p.notes.map(n=>({...n,key:p.key,mode:p.mode,
      instrument:'sine',sessionId:'spike',solfege:{name:'spike'}}))};
  });
}
export async function initScope() {
  const resumed=getAudioContext().resume();
  await core.evalScope(core, mini, tonal, webaudio);
  await resumed;
  await initSynthOnlyAudio();
}
export function sourceCode(phrase, {bare = true, absolute = false, bpm = 120} = {}) {
  const code = logNotesToStrudel(phrase.notes, {sourceBpm:phrase.bpm,bpm,beatsPerBar:4,
    precision:6,notationType:absolute?'absolute':'relative',scaleKey:phrase.key,
    scaleMode:phrase.mode,scaleOctave:4,sound:'sine',patternDurationMs:phrase.duration});
  return bare ? code.replace(/\.cpm\([^)]*\)$/, '').replace(/\.scale\("[^"]*"\)/, '') : code;
}
export async function parsePhrase(phrase, absolute = false) {
  const code = sourceCode(phrase,{absolute});
  const result = await core.evaluate(code, transpiler);
  if (!core.isPattern(result.pattern)) throw new Error('Phrase compilation returned no pattern');
  return {...result,code,phrase,absolute};
}
export function member(part, {offset=0,rate=1,pinned=false,key='C',mode='major',gain=.12} = {}) {
  let pattern = part.pattern;
  if (!part.absolute) pattern = pattern.scale(`${pinned?part.phrase.key:key}4:${pinned?part.phrase.mode:mode}`);
  // Rate is applied before offset: offset stays in shared bars, not phrase bars.
  return pattern.fast(rate).late(offset).gain(gain)
    .withContext(context=>({...context,spikePhrase:part.phrase.id}));
}
export function boundaryPattern(old, next, boundary) {
  // Restrict whole onsets, not parts: an existing long note is never retriggered.
  return core.stack(old.filterHaps(h=>h.whole && number(h.whole.begin)<boundary),
    next.filterHaps(h=>h.whole && number(h.whole.begin)>=boundary));
}
export function safeBoundary(scheduler) { return Math.ceil(scheduler.lastEnd + .001); }
export function audioBarPosition(scheduler) {
  // Scheduler.now() is the Drawer cursor, 50ms ahead of the audible cursor in
  // this pinned Cyclist. Use the query/audio anchor for measured bar position.
  return scheduler.lastBegin + (getAudioContext().currentTime-scheduler.lastTick-scheduler.latency)*scheduler.cps;
}
export function createSpikeTransport(root, {bpm=120,events=[],frames=[]} = {}) {
  const beat = new UIBeatClock({observeEnvironment:false,documentVisible:()=>true,reducedMotion:()=>false});
  const generation = beat.arm({mappingAvailable:true,bpm,meter:{beatsPerBar:4,beatUnit:4}});
  let desk;
  const tempoAnchors=[];
  const barAtAudioTime=time=>{const anchor=[...tempoAnchors].reverse().find(a=>a.time<=time)??tempoAnchors[0];
    return anchor?anchor.cycle+(time-anchor.time)*anchor.cps:0;};
  let outputPending = 0;
  let outputErrors = [];
  let lastFrame = -Infinity;
  let frameBackwards = 0;
  const mirror = new StrudelMirror({root,initialCode:'silence',solo:true,bgFill:false,
    transpiler,getTime:()=>getAudioContext().currentTime,prebake:async()=>{},
    defaultOutput: async (hap,deadline,duration,cps,t) => {
      const submittedAt=getAudioContext().currentTime;
      if(!tempoAnchors.length)tempoAnchors.push({time:t,cycle:number(hap.whole.begin),cps});
      events.push({phrase:hap.context.spikePhrase,cycle:number(hap.whole.begin),t,submittedAt,
        leadMs:(t-submittedAt)*1000,duration,cps,note:hap.value.note,value:hap.value,
        locations:hap.context.locations});
      outputPending++;
      try { await emotitoneStrudelOutput(hap,deadline,duration,cps,t); }
      catch (error) { outputErrors.push(String(error)); }
      finally { outputPending--; }
    },
    onDraw: (_haps,time) => {
      if (time<lastFrame-.000001) frameBackwards++;
      lastFrame=time;
      const barPosition=Math.max(0,barAtAudioTime(getAudioContext().currentTime));
      beat.publish(generation,{rawPosition:time,barPosition});
      frames.push({audio:getAudioContext().currentTime,raw:time,barPosition,generation:beat.snapshot.generation});
    },
  });
  // Local source locations from cached compilation overlap between phrases.
  // Filter by identity before feeding the stock CodeMirror highlighter.
  mirror.highlight=(haps,time)=>highlightMiniLocations(mirror.editor,time,
    haps.filter(h=>h.context.spikePhrase===desk?.phrase.id));
  mirror.repl.scheduler.setCps(bpm/240);
  return {mirror,beat,generation,events,frames,
    barAtAudioTime,
    setTempo(bpm){const s=mirror.repl.scheduler;const before=s.now();
      const frontier=s.lastEnd;const time=s.lastTick+s.clock.duration+s.latency;
      const beforeBar=barAtAudioTime(getAudioContext().currentTime);
      tempoAnchors.push({time,cycle:frontier,cps:bpm/240});
      s.setCps(bpm/240);beat.retime(generation,bpm);
      return {frontier,time,beforeRaw:before,afterRaw:s.now(),beforeBar,afterBar:barAtAudioTime(getAudioContext().currentTime)};},
    get errors(){return outputErrors;}, get pending(){return outputPending;},
    get frameBackwards(){return frameBackwards;},
    setDesk(part){ desk=part; mirror.setCode(part.code);
      updateMiniLocations(mirror.editor,part.meta.miniLocations); mirror.miniLocations=part.meta.miniLocations;
      if(mirror.repl.scheduler.pattern)mirror.drawer.invalidate(mirror.repl.scheduler); },
    async set(pattern){await mirror.repl.setPattern(pattern);const s=mirror.repl.scheduler;
      if(!tempoAnchors.length)tempoAnchors.push({time:s.lastTick+s.latency,cycle:s.lastBegin,cps:s.cps});
      mirror.drawer.invalidate(s);},
    async swap(pattern,boundary){const scheduler=mirror.repl.scheduler;
      const before={audio:getAudioContext().currentTime,cycle:scheduler.now(),lastEnd:scheduler.lastEnd};
      const started=performance.now();
      await mirror.repl.setPattern(boundary===undefined?pattern:boundaryPattern(scheduler.pattern,pattern,boundary));
      mirror.drawer.invalidate(scheduler);
      const after={audio:getAudioContext().currentTime,cycle:scheduler.now(),lastEnd:scheduler.lastEnd};
      return {before,after,ms:performance.now()-started,boundary};},
    async stop(){mirror.stop();stopStrudelVisuals();beat.stop(generation);
      await sleep(450);mirror.clear();mirror.editor.destroy();beat.destroy();},
  };
}
export {core,transpiler,getAudioContext,defaultPatterns};
