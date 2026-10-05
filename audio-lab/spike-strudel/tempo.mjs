import {core,createSpikeTransport,member,sourceCode,sleep,getAudioContext,number,stats} from './transport.mjs';
const until=async(s,c)=>{while(s.now()<c)await sleep(8);};
export async function tempoTrial(parts,capture,mode,bpm,repetition){
  const events=[],frames=[];const transport=createSpikeTransport(document.querySelector('#editor'),{bpm,events,frames});
  const s=transport.mirror.repl.scheduler;const nextBpm=bpm===90?150:90;
  const settings=[{},{offset:.375,pinned:true},{rate:.5},{rate:2}];
  const make=(key,scale)=>core.stack(...parts.map((p,i)=>member(p,{...settings[i],key,mode:scale}).orbit(i+10)));
  transport.setDesk(parts[0]);await capture.begin();await transport.set(make('C','major'));
  const anchor=events[0].t;
  await until(s,.53);
  const boundary=Math.ceil(s.lastEnd+.001);
  const swap=await transport.swap(make('D','minor'),boundary);
  await until(s,1.13);
  const front=s.lastEnd;const at=s.lastTick+s.clock.duration+s.latency;
  const before=s.now();const started=performance.now();let change;
  if(mode==='cpm-only'||mode==='evaluate-setCps'){
    if(mode==='evaluate-setCps')change=transport.setTempo(nextBpm);
    const code=`stack(${parts.map((p,i)=>sourceCode(p.phrase,{bare:false,bpm:nextBpm})+`.fast(${settings[i].rate??1}).late(${settings[i].offset??0}).orbit(${i+10}).withContext(c=>({...c,spikePhrase:'p${i}'}))`).join(',')})`;
    transport.mirror.setCode(code);await transport.mirror.evaluate();
  }else change=transport.setTempo(nextBpm);
  const after=s.now();const ms=performance.now()-started;
  await until(s,2.7);s.stop();await sleep(600);const pcm=await capture.end();
  const target=c=>c<front?anchor+c/(bpm/240):at+(c-front)/(nextBpm/240);
  const end=2.55;
  const results=parts.map((p,i)=>{
    const rate=settings[i].rate??1,offset=settings[i].offset??0,period=p.phrase.bars/rate;
    const cycles=[];
    for(let k=-1;k<8;k++)for(const n of p.phrase.notes){const c=offset+k*period+n.pressTime/(240000/p.phrase.bpm)/rate;if(c>=.1&&c<end)cycles.push(c);}
    cycles.sort((a,b)=>a-b);
    const expected=cycles.map(target),actual=events.filter(e=>e.phrase===p.phrase.id&&e.t>=target(.1)&&e.t<target(end));
    const actualTimes=[...actual.map(e=>e.t)];const errors=[],missing=[];
    for(const t of expected){const j=actualTimes.findIndex(a=>Math.abs(a-t)<.003);if(j<0)missing.push(t);else errors.push(Math.abs(actualTimes.splice(j,1)[0]-t)*1000);}
    const acoustic=pcm[i].onsets.filter(t=>t>=target(.1)&&t<target(end)),pcmErrors=[],pcmMissing=[];
    for(const t of expected){const j=acoustic.findIndex(a=>Math.abs(a-t)<.012);if(j<0)pcmMissing.push(t);else pcmErrors.push(Math.abs(acoustic.splice(j,1)[0]-t)*1000);}
    const notesBefore=events.filter(e=>e.phrase===p.phrase.id&&e.cycle<boundary).map(e=>e.note);
    const notesAfter=events.filter(e=>e.phrase===p.phrase.id&&e.cycle>=boundary&&e.cycle<front).map(e=>e.note);
    return {phrase:p.phrase.id,missing,unexpected:actualTimes,errorMs:stats(errors),pcmMissing,pcmUnexpected:acoustic,pcmErrorMs:stats(pcmErrors),notesBefore,notesAfter};
  });
  const uiBackwards=frames.filter((f,i)=>i&&f.barPosition<frames[i-1].barPosition-1e-6).length;
  const result={mode,bpm,nextBpm,repetition,anchor,bendBoundary:boundary,swap,frontier:front,tempoAt:at,beforeRaw:before,afterRaw:after,change,ms,
    results,rawBackwards:transport.frameBackwards,uiBackwards,events,frames,outputErrors:transport.errors};
  await transport.stop();console.log(`SPIKE tempo ${mode} ${bpm} #${repetition}: missing ${results.reduce((s,p)=>s+p.missing.length,0)}, raw backwards ${result.rawBackwards}, UI backwards ${uiBackwards}`);
  return result;
}
