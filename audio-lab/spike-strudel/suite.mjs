import {expressionTrial} from './expression.mjs';
import {tempoTrial} from './tempo.mjs';
import {heldTrial} from './held.mjs';
import {getSuperdoughAudioController} from 'superdough';
import {core,transpiler,getAudioContext,initScope,measuredPhrases,parsePhrase,member,sourceCode,
  createSpikeTransport,boundaryPattern,safeBoundary,sleep,stats,number} from './transport.mjs';

function check(name,passed,detail){return {name,passed,detail};}
const absoluteError=(a,b)=>Math.abs(a-b)*1000;
function match(expected,actual,tolerance=.003){
  const remaining=[...actual], errors=[],missing=[];
  for(const e of expected){const i=remaining.findIndex(a=>Math.abs(a-e)<=tolerance);
    if(i<0)missing.push(e);else errors.push(absoluteError(remaining.splice(i,1)[0],e));}
  return {expected:expected.length,actual:actual.length,missing,doubledOrUnexpected:remaining,errorMs:stats(errors)};
}
function expectedCycles(phrase,options,start,end){
  const {rate=1,offset=0}=options;
  const period=phrase.bars/rate;
  const values=[];
  for(let k=Math.floor((start-offset)/period)-1;k<=Math.ceil((end-offset)/period)+1;k++)
    for(const n of phrase.notes){const c=offset+k*period+(n.pressTime-phrase.notes[0].pressTime)/(240000/phrase.bpm)/rate;
      if(c>=start-1e-8&&c<end-1e-8)values.push(c);}
  return values.sort((a,b)=>a-b);
}
async function semanticChecks(parts){
  const lengths=parts.map(p=>{
    const pat=member(p,{pinned:true});const actual=pat.queryArc(0,12).filter(h=>h.hasOnset());
    const expected=expectedCycles(p.phrase,{},0,12);
    const timing=match(expected,actual.map(h=>number(h.whole.begin)),.000001);
    const pitchMismatches=actual.filter((h,i)=>h.value.note!==p.phrase.notes[i%p.phrase.notes.length].note).length;
    return {id:p.phrase.id,bars:p.phrase.bars,...timing,pitchMismatches};
  });
  const offsets=parts.flatMap(p=>[.5,1,2].map(rate=>{
    const pat=member(p,{offset:.375,rate});
    return {id:p.phrase.id,rate,offset:.375,...match(expectedCycles(p.phrase,{offset:.375,rate},0,12),
      pat.queryArc(0,12).filter(h=>h.hasOnset()).map(h=>number(h.whole.begin)),.000001)};
  }));
  const bends=parts.map(p=>{const c=member(p,{key:'C',mode:'major'}).queryArc(0,p.phrase.bars);
    const d=member(p,{key:'D',mode:'minor'}).queryArc(0,p.phrase.bars);
    const pin1=member(p,{pinned:true,key:'C'}).queryArc(0,p.phrase.bars);
    const pin2=member(p,{pinned:true,key:'D',mode:'minor'}).queryArc(0,p.phrase.bars);
    return {id:p.phrase.id,C:c.map(h=>h.value.note),Dminor:d.map(h=>h.value.note),pinned:pin1.map(h=>h.value.note),
      pinUnchanged:JSON.stringify(pin1.map(h=>h.value.note))===JSON.stringify(pin2.map(h=>h.value.note)),
      locationsRetained:d.every(h=>h.context.locations?.length>0)};});
  const expressionPhrase={...parts[0].phrase,bars:4,duration:8000,notes:parts[0].phrase.notes.map((n,i)=>({...n,
    pressTime:i*1000,releaseTime:i*1000+700,duration:700,
    articulation:{attack:.002+i*.001,decay:.01,sustain:.5,release:.02},
    pitchExpression:Array.from({length:25},(_,j)=>({timeMs:j*25,cents:30*Math.sin(j*Math.PI/2)})),
    gainExpression:Array.from({length:25},(_,j)=>({timeMs:j*25,gain:1+.2*Math.sin(j*Math.PI/2)}))}))};
  const expressionPart=await parsePhrase(expressionPhrase);
  const base=member(expressionPart).queryArc(0,1).filter(h=>h.hasOnset())[0];
  const fast=member(expressionPart,{rate:2}).queryArc(0,1).filter(h=>h.hasOnset())[0];
  const borrowed={...parts[0].phrase,notes:[{...parts[0].phrase.notes[0],note:'G#4',scaleIndex:-1,isBorrowed:true}]};
  const borrowedCode=sourceCode(borrowed);
  const absolute=await parsePhrase(parts[0].phrase,true);
  return {lengths,offsets,bends,expression:{code:expressionPart.code,base:base.value,fast:fast.value,
    baseDuration:number(base.duration),fastDuration:number(fast.duration)},
    borrowedFallsBackToAbsolute:borrowedCode.includes('.as("note'),absoluteFirst:member(absolute).queryArc(0,1)[0].value.note};
}
async function benchmark(parts){
  const realistic=Array.from({length:8},(_,i)=>{
    const p=parts[i%4].phrase;
    return {...p,id:`cost-${i}`,bars:8,duration:16000,notes:Array.from({length:64},(_,j)=>({...p.notes[j%p.notes.length],
      id:`cost-${i}-${j}`,pressTime:j*250,releaseTime:j*250+160,duration:160,
      articulation:{attack:.002+(j%4)*.001,decay:.01,sustain:.5,release:.02}}))};
  });
  const cached=await Promise.all(realistic.map(async p=>{console.log(`SPIKE caching ${p.id}`);const r=await parsePhrase(p);console.log(`SPIKE cached ${p.id}`);return r;}));
  const results=[];
  for(const count of [1,4,8]){
    console.log(`SPIKE cost ${count}`);
    const code=`stack(${realistic.slice(0,count).map(p=>sourceCode(p,{bare:false})).join(',\n')})`;
    const compile=[],parse=[],execute=[],build=[];
    for(let trial=0;trial<15;trial++){
      if(trial%10===0)console.log(`SPIKE cost ${count} trial ${trial}`);
      const t=performance.now();const compiled=transpiler(code);const mid=performance.now();
      await core.evaluate(code,()=>compiled);const end=performance.now();
      const c=performance.now();core.stack(...cached.slice(0,count).map(p=>member(p)));const d=performance.now();
      if(trial>=3){parse.push(mid-t);execute.push(end-mid);compile.push(end-t);build.push(d-c);}

    }
    results.push({count,notes:count*64,chars:code.length,trials:12,transpileMs:stats(parse),evaluateAfterTranspileMs:stats(execute),totalMs:stats(compile),cachedStackMs:stats(build)});
  }
  return results;
}
export async function captureOrbits(){
  const context=getAudioContext();await context.audioWorklet.addModule('/audio-lab/processors.js');
  const captures=Array.from({length:4},(_,i)=>{
    const node=new AudioWorkletNode(context,'lab-capture');
    const mute=context.createGain();mute.gain.value=0;node.connect(mute).connect(context.destination);
    const orbit=getSuperdoughAudioController().getOrbit(i+10,[0,1]);orbit.output.connect(node);
    return {node,mute,orbit};
  });
  function request(node,message,type){return new Promise(resolve=>{const listener=({data})=>{if(data.type===type){node.port.removeEventListener('message',listener);resolve(data);}};node.port.addEventListener('message',listener);node.port.start();node.port.postMessage(message);});}
  return {async begin(){await Promise.all(captures.map(c=>request(c.node,'start','started')));},
    async end(){return Promise.all(captures.map(async(c,i)=>{
      const {pcm,startFrame}=await request(c.node,'stop','pcm');
      const onsets=[],silentRuns=[];let silent=Infinity;
      for(let j=0;j<pcm.length;j++){
        if(Math.abs(pcm[j])<.0005)silent++;else {if(silent>=context.sampleRate*.01){onsets.push((startFrame+j)/context.sampleRate);if(Number.isFinite(silent))silentRuns.push([(startFrame+j-silent)/context.sampleRate,(startFrame+j)/context.sampleRate]);}silent=0;}
      }
      return {phrase:`p${i}`,onsets,silentRuns,frames:pcm.length};
    }));},close(){for(const c of captures){c.orbit.output.disconnect(c.node);c.node.disconnect();c.mute.disconnect();}}};
}
async function until(scheduler,cycle){while(scheduler.now()<cycle)await sleep(8);}
function fullCode(parts,bpm,ids,options){return `stack(${ids.map(i=>`${sourceCode(parts[i].phrase,{bare:false,bpm}).replace(/\.scale\(\"[^\"]*\"\)/,`.scale("${options[i]?.pinned?parts[i].phrase.key:'C'}4:${options[i]?.pinned?parts[i].phrase.mode:'major'}")`)}.gain(0.12).fast(${options[i]?.rate??1}).late(${options[i]?.offset??0}).orbit(${i+10}).withContext(c=>({...c,spikePhrase:'p${i}'}))`).join(',')})`;}
async function trial(parts,capture,strategy,bpm,repetition){
  const events=[],frames=[],swaps=[];
  const options=[{},{offset:.375,pinned:true},{rate:.5},{rate:2}];
  const pat=ids=>core.stack(...ids.map(i=>member(parts[i],options[i]).orbit(i+10)));
  const transport=createSpikeTransport(document.querySelector('#editor'),{bpm,events,frames});
  const s=transport.mirror.repl.scheduler;
  let played=0,released=0;const onPlayed=()=>played++,onReleased=()=>released++;
  window.addEventListener('note-played',onPlayed);window.addEventListener('note-released',onReleased);
  await capture.begin();
  transport.setDesk(parts[0]);
  await transport.set(pat([0]));
  const anchor=events[0]?.t;
  if(anchor===undefined)throw Error('No first scheduled hap');
  const segments=[{from:0,to:Infinity,ids:[0]}];
  function segment(from,ids){segments.at(-1).to=from;segments.push({from,to:Infinity,ids});}
  async function change(ids,requested){
    const requestedAudio=getAudioContext().currentTime;
    let before,after,ms,boundary;
    if(strategy==='evaluate'){
      before={audio:getAudioContext().currentTime,cycle:s.now(),lastEnd:s.lastEnd};const start=performance.now();
      transport.mirror.setCode(fullCode(parts,bpm,ids,options));await transport.mirror.evaluate();
      ms=performance.now()-start;after={audio:getAudioContext().currentTime,cycle:s.now(),lastEnd:s.lastEnd};
    }else if(strategy==='timer-boundary'){
      boundary=safeBoundary(s);await until(s,boundary);({before,after,ms}=await transport.swap(pat(ids)));
    }else if(strategy==='boundary'||strategy==='mute-solo'){
      boundary=safeBoundary(s);({before,after,ms}=await transport.swap(pat(ids),boundary));
    }else{({before,after,ms}=await transport.swap(pat(ids)));}
    const effective=strategy==='boundary'||strategy==='mute-solo'||strategy==='timer-boundary'?boundary:after.lastEnd;
    segment(effective,ids);swaps.push({requested,before,after,ms,boundary,effective,
      phaseResidual:after.cycle-before.cycle-(after.audio-before.audio)*s.cps,
      requestedAudio,drawCursorToFrontierMs:(effective-requested)/s.cps*1000,
      audibleChangeDelayMs:(anchor+effective/(bpm/240)-requestedAudio)*1000});
  }
  await until(s,.53+repetition*.03);
  if(strategy==='mute-solo')await change([0,1,2,3],s.now());else await change([0,1],s.now());
  await until(s,1.13+repetition*.03);
  if(strategy==='mute-solo')await change([1],s.now());else await change([0,2,3],s.now());
  if(strategy==='mute-solo'){await until(s,2.13);await change([0,1,2,3],s.now());}
  const finalCycle=strategy==='mute-solo'?3.4:2.6;
  await until(s,finalCycle);
  // Drain future output and releases without more scheduler queries.
  s.stop();await sleep(600);
  const pcm=await capture.end();
  const end=finalCycle-.08;const start=.1;
  const perPhrase=parts.map((p,i)=>{
    const cycles=segments.flatMap(seg=>seg.ids.includes(i)?expectedCycles(p.phrase,options[i],Math.max(start,seg.from),Math.min(end,seg.to)):[]);
    const expected=cycles.map(c=>anchor+c/(bpm/240));
    const actual=events.filter(e=>e.phrase===p.phrase.id&&e.cycle>=start&&e.cycle<end);
    const acoustic=pcm[i].onsets.filter(t=>t>=anchor+start/(bpm/240)&&t<anchor+end/(bpm/240));
    return {phrase:p.phrase.id,haps:match(expected,actual.map(e=>e.t)),pcm:match(expected,acoustic,.012)};
  });
  const highlights=parts.map(p=>{
    transport.setDesk(p);
    const i=parts.indexOf(p);
    const time=(options[i].offset??0)+(.375+.025)/(options[i].rate??1);
    const haps=pat([0,1,2,3]).queryArc(time,time+.001).filter(h=>h.isActive(time));
    transport.mirror.highlight(haps,time);
    const actual=transport.mirror.editor.dom.querySelectorAll('[style*="outline:"]').length;
    const expected=new Set(haps.filter(h=>h.context.spikePhrase===p.phrase.id).flatMap(h=>h.context.locations?.map(l=>`${l.start}:${l.end}`)??[])).size;
    return {phrase:p.phrase.id,expected,actual};
  });
  const result={strategy,bpm,repetition,anchor,swaps,segments,perPhrase,highlights,
    output:{played,released,errors:transport.errors,pending:transport.pending},
    ui:{frameBackwards:transport.frameBackwards,generations:[...new Set(frames.map(f=>f.generation))]},
    leadMs:stats(events.map(e=>e.leadMs)),events,frames};
  await transport.stop();window.removeEventListener('note-played',onPlayed);window.removeEventListener('note-released',onReleased);
  console.log(`SPIKE ${strategy} ${bpm} #${repetition}: haps missing ${perPhrase.reduce((s,p)=>s+p.haps.missing.length,0)}, PCM missing ${perPhrase.reduce((s,p)=>s+p.pcm.missing.length,0)}`);
  return result;
}
window.runStrudelSpike=async(smoke=false,skipCost=false,onlyStrategy)=>{
  console.log("SPIKE init");await initScope();console.log("SPIKE parse");const phrases=measuredPhrases();const parts=await Promise.all(phrases.map(p=>parsePhrase(p)));
  console.log("SPIKE semantics");const semantics=await semanticChecks(parts);console.log("SPIKE cost");const cost=skipCost?[]:await benchmark(parts);window.spikePartial={semantics,benchmark:cost};console.log("SPIKE capture");const capture=await captureOrbits();console.log("SPIKE trials");
  const trials=[],tempos=[],held=[],expressions=[];window.spikePartial={semantics,benchmark:cost,trials,tempos,held,expressions};
  try{for(const bpm of smoke?[150]:[90,150])for(const strategy of smoke?[onlyStrategy??'boundary']:['evaluate','direct','boundary','timer-boundary','mute-solo'])
    for(let repetition=0;repetition<(smoke?1:3);repetition++)trials.push(await trial(parts,capture,strategy,bpm,repetition));
    if(!smoke){for(const bpm of [90,150]){for(const mode of ['setCps','evaluate-setCps','cpm-only'])for(let repetition=0;repetition<3;repetition++)tempos.push(await tempoTrial(parts,capture,mode,bpm,repetition));
    for(let repetition=0;repetition<3;repetition++)held.push(await heldTrial(parts,capture,bpm,repetition));
    for(const rate of [1,2])expressions.push(await expressionTrial(parts,capture,bpm,rate));}}
  }finally{capture.close();}
  const summary=[...new Set(trials.map(t=>t.strategy))].map(strategy=>{
    const group=trials.filter(t=>t.strategy===strategy);const measures=group.flatMap(t=>t.perPhrase);
    const errs=group.flatMap(t=>t.events.filter(e=>e.cycle>.1&&e.cycle<2.5).map(e=>absoluteError(e.t,t.anchor+e.cycle/(t.bpm/240))));
    return {strategy,trials:group.length,hapMissing:measures.reduce((s,p)=>s+p.haps.missing.length,0),hapUnexpected:measures.reduce((s,p)=>s+p.haps.doubledOrUnexpected.length,0),
      pcmMissing:measures.reduce((s,p)=>s+p.pcm.missing.length,0),pcmUnexpected:measures.reduce((s,p)=>s+p.pcm.doubledOrUnexpected.length,0),
      hapGridErrorMs:stats(errs),pcmMaxErrorMs:Math.max(...measures.map(p=>p.pcm.errorMs.max)),
      phaseResidualMax:Math.max(...group.flatMap(t=>t.swaps.map(s=>Math.abs(s.phaseResidual)))),swapMs:stats(group.flatMap(t=>t.swaps.map(s=>s.ms))),
      changeDelayMs:stats(group.flatMap(t=>t.swaps.map(s=>s.audibleChangeDelayMs))),frameBackwards:group.reduce((s,t)=>s+t.ui.frameBackwards,0)};
  });
  const checks=[
    check('Independent whole-bar periods and pitch order',semantics.lengths.every(p=>!p.missing.length&&!p.doubledOrUnexpected.length&&!p.pitchMismatches)),
    check('Offsets and half/double-time arithmetic grid',semantics.offsets.every(p=>!p.missing.length&&!p.doubledOrUnexpected.length)),
    check('Shared tempo retiming keeps independent grids',tempos.filter(t=>t.mode==='setCps').every(t=>t.results.every(p=>!p.missing.length&&!p.unexpected.length&&!p.pcmMissing.length&&!p.pcmUnexpected.length))),
    check('Anchored UIBeat is continuous through tempo changes',tempos.filter(t=>t.mode==='setCps').every(t=>!t.uiBackwards)),
    check('Long held note survives joins and removals',held.every(t=>t.p0Onsets===1&&!t.sustainGaps.length)),
    check('Recorded expression reaches real audio output',expressions.every(t=>t.controlsPreserved&&!t.missing.length&&!t.unexpected.length&&!t.outputErrors.length)),
    check('Pinned key remains unchanged',semantics.bends.every(p=>p.pinUnchanged)),
    check('Future-boundary haps and PCM have no losses or doubles',summary.filter(s=>s.strategy==='boundary'||s.strategy==='mute-solo').every(s=>!s.hapMissing&&!s.hapUnexpected&&!s.pcmMissing&&!s.pcmUnexpected)),
    check('Cached swaps preserve cycle position',summary.filter(s=>s.strategy==='boundary').every(s=>s.phaseResidualMax<1e-5)),
    check('Production Stage note events and output complete',trials.every(t=>!t.output.errors.length&&!t.output.pending&&t.output.played===t.events.length&&t.output.released===t.output.played)),
    check('Desk highlight selects just one phrase',trials.every(t=>t.highlights.every(h=>h.expected===h.actual))),
    check('UIBeat generation and cursor continuous at membership swaps',trials.every(t=>t.ui.generations.length===1&&!t.ui.frameBackwards)),
  ];
  return {environment:{userAgent:navigator.userAgent,sampleRate:getAudioContext().sampleRate,baseLatency:getAudioContext().baseLatency,outputLatency:getAudioContext().outputLatency},semantics,benchmark:cost,summary,checks,trials,tempos,held,expressions};
};
window.runStrudelSpikeCost=async()=>{
  await initScope();const parts=await Promise.all(measuredPhrases().map(p=>parsePhrase(p)));
  const benchmarkResult=await benchmark(parts);
  return {environment:{userAgent:navigator.userAgent,sampleRate:getAudioContext().sampleRate},benchmark:benchmarkResult,
    checks:[check('All 1/4/8-phrase cost cells completed',benchmarkResult.length===3)]};
};
