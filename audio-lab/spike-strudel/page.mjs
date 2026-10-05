import {core,initScope,phonePhrases,parsePhrase,member,createSpikeTransport,safeBoundary,getAudioContext} from './transport.mjs';
const status=document.querySelector('#status');
const phrases=phonePhrases();
const state=new Map(phrases.map(p=>[p.id,{joined:false,muted:false,pinned:false,rate:1,offset:0}]));
let transport,parts,solo;
let bpm=120,key='C',mode='major';
const desk=document.querySelector('#desk');
for(const p of phrases){
  desk.add(new Option(p.name,p.id));
  const row=document.createElement('p');
  row.append(`${p.name} (${p.bars} bars) `);
  for(const [label,prop] of [['Join / leave','joined'],['Mute','muted'],['Pin','pinned']]){
    const b=document.createElement('button');b.textContent=label;
    b.onclick=async()=>{state.get(p.id)[prop]=!state.get(p.id)[prop];b.setAttribute('aria-pressed',String(state.get(p.id)[prop]));await rebuild();};row.append(b,' ');
  }
  const b=document.createElement('button');b.textContent='Solo';b.onclick=async()=>{solo=solo===p.id?undefined:p.id;await rebuild();};row.append(b,' ');
  const rate=document.createElement('select');for(const n of [.5,1,2])rate.add(new Option(`${n}×`,n));rate.value=1;
  rate.onchange=async()=>{state.get(p.id).rate=Number(rate.value);await rebuild();};row.append(rate,' ');
  const offset=document.createElement('select');for(const n of [0,.25,.5,1])offset.add(new Option(`Offset ${n} bar`,n));
  offset.onchange=async()=>{state.get(p.id).offset=Number(offset.value);await rebuild();};row.append(offset);
  document.querySelector('#phrases').append(row);
}
let queue=Promise.resolve();
async function rebuild(){
  queue=queue.then(async()=>{
    if(!transport)return;
    const selected=parts.filter(p=>{const s=state.get(p.phrase.id);return s.joined&&!s.muted&&(!solo||solo===p.phrase.id);});
    const pattern=core.stack(...selected.map(p=>member(p,{...state.get(p.phrase.id),key,mode})));
    const boundary=document.querySelector('#policy').value==='bar'?safeBoundary(transport.mirror.repl.scheduler):undefined;
    await transport.swap(pattern,boundary);
    status.textContent=boundary===undefined?`${selected.length} phrases; already queued notes finish, new membership starts at the next query window.`:`${selected.length} phrases; change committed for bar ${boundary+1}.`;
  }).catch(e=>status.textContent=String(e));
  return queue;
}
document.querySelector('#start').onclick=async()=>{
  try{
    if(transport)return;
    status.textContent='Preparing synths…';await initScope();parts=await Promise.all(phrases.map(p=>parsePhrase(p)));
    transport=createSpikeTransport(document.querySelector('#editor'),{bpm});
    transport.setDesk(parts.find(p=>p.phrase.id===desk.value));
    await transport.set(core.stack(...parts.filter(p=>state.get(p.phrase.id).joined).map(p=>member(p,{...state.get(p.phrase.id),key,mode}))));
    status.textContent='Clock running. Join a phrase.';
  }catch(e){status.textContent=String(e);}
};
document.querySelector('#stop').onclick=async()=>{await queue;const old=transport;transport=undefined;await old?.stop();status.textContent='Stopped';};
desk.onchange=()=>transport?.setDesk(parts.find(p=>p.phrase.id===desk.value));
document.querySelector('#key').onchange=async e=>{key=e.target.value;await rebuild();};
document.querySelector('#mode').onchange=async e=>{mode=e.target.value;await rebuild();};
document.querySelector('#tempo').onchange=e=>{bpm=Number(e.target.value);if(transport){transport.setTempo(bpm);status.textContent=`Tempo ${bpm}; already queued notes finish at the old tempo.`;}};
setInterval(()=>{document.querySelector('#position').textContent=transport?`Bar position ${Math.max(0,transport.barAtAudioTime(getAudioContext().currentTime)).toFixed(3)} · raw cycle ${transport.mirror.repl.scheduler.now().toFixed(3)}`:'Stopped';},100);
