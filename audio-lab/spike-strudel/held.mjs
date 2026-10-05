import {core,parsePhrase,member,createSpikeTransport,safeBoundary,sleep} from './transport.mjs';
const until=async(s,c)=>{while(s.now()<c)await sleep(8);};
export async function heldTrial(parts,capture,bpm,repetition){
  const original=parts[0].phrase;
  const phrase={...original,bars:2,duration:4000,notes:[{...original.notes[0],pressTime:0,releaseTime:3400,duration:3400}]};
  const part=await parsePhrase(phrase);
  const events=[];const transport=createSpikeTransport(document.querySelector('#editor'),{bpm,events});
  const s=transport.mirror.repl.scheduler;const sustained=member(part).orbit(10);
  await capture.begin();await transport.set(sustained);const anchor=events[0].t;
  await until(s,.4+repetition*.02);const join=await transport.swap(core.stack(sustained,member(parts[1]).orbit(11)),safeBoundary(s));
  await until(s,1.2);const leave=await transport.swap(sustained);await until(s,1.8);
  s.stop();await sleep(450);const pcm=await capture.end();
  const begin=anchor+.2/(bpm/240),end=anchor+1.5/(bpm/240);
  const sustainGaps=pcm[0].silentRuns.filter(([a,b])=>a<end&&b>begin);
  const result={bpm,repetition,join,leave,p0Onsets:events.filter(e=>e.phrase==='p0'&&e.cycle<1.8).length,
    pcmOnsets:pcm[0].onsets,sustainGaps,events,errors:transport.errors};
  await transport.stop();console.log(`SPIKE held ${bpm} #${repetition}: ${result.p0Onsets} onset, ${sustainGaps.length} sustain gaps`);return result;
}
