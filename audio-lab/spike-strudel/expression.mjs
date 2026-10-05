import {parsePhrase,member,createSpikeTransport,sleep,stats} from './transport.mjs';
export async function expressionTrial(parts,capture,bpm,rate){
  const base=parts[0].phrase;
  const phrase={...base,bars:1,duration:2000,notes:[0,1].map((i)=>({...base.notes[i],
    pressTime:i*1000,releaseTime:i*1000+700,duration:700,
    articulation:{attack:.002+i*.001,decay:.01,sustain:.5,release:.02},
    pitchExpression:Array.from({length:25},(_,j)=>({timeMs:j*25,cents:30*Math.sin(j*Math.PI/2)})),
    gainExpression:Array.from({length:25},(_,j)=>({timeMs:j*25,gain:1+.2*Math.sin(j*Math.PI/2)}))}))};
  const part=await parsePhrase(phrase);const events=[];
  const transport=createSpikeTransport(document.querySelector('#editor'),{bpm,events});
  const scheduler=transport.mirror.repl.scheduler;
  await capture.begin();await transport.set(member(part,{rate}).orbit(10));const anchor=events[0].t;
  while(scheduler.now()<1.25/rate)await sleep(8);
  scheduler.stop();await sleep(1200);const pcm=await capture.end();
  const cycles=[0,.5,1].map(c=>c/rate),expected=cycles.map(c=>anchor+c/(bpm/240));
  const actual=pcm[0].onsets.filter(t=>t>=anchor-.01&&t<anchor+1.1/rate/(bpm/240));
  const errors=[],missing=[];
  for(const t of expected){const i=actual.findIndex(a=>Math.abs(a-t)<.012);if(i<0)missing.push(t);else errors.push(Math.abs(actual.splice(i,1)[0]-t)*1000);}
  const controlsPreserved=events.every(e=>e.value.vib===10&&e.value.vibmod===.3&&e.value.tremolo===10&&e.value.tremolodepth===.333);
  const result={bpm,rate,expected:expected.length,missing,unexpected:actual,errorMs:stats(errors),controlsPreserved,events,outputErrors:transport.errors};
  await transport.stop();console.log(`SPIKE expression ${bpm} ${rate}x: ${missing.length} missing, controls ${controlsPreserved}`);return result;
}
