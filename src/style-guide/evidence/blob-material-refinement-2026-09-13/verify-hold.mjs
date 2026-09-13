const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve(process.env.OUTPUT_DIR || '/tmp/blob-hold-verification');
await mkdir(output, { recursive: true });
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable',headless:true});
const phone=process.env.PHONE==='1';const instrument=process.env.INSTRUMENT;
const page=await browser.newPage({hasTouch:process.env.INPUT==='touch', viewport:phone?{width:390,height:844}:{width:1440,height:900}});
await page.addInitScript(()=>{
 localStorage.setItem('emotitone-visual-config',JSON.stringify({config:{},stagePreferences:{newLookOnLaunch:false}}));
 window.noteTrace=[];for(const type of ['note-played','note-released'])window.addEventListener(type,e=>window.noteTrace.push({type,time:performance.now(),id:e.detail.noteId,note:e.detail.noteName}));
});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(90000);
await page.goto(process.env.APP_URL || 'http://127.0.0.1:5187/',{waitUntil:'networkidle'});
await page.getByRole('button',{name:'Play EmotiTone',exact:true}).click();
await page.getByRole('button',{name:'B diminished chord',exact:true}).waitFor();
await page.evaluate(async()=>{
 const p=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
 const {useVisualConfigStore}=await import('/src/stores/visualConfig.ts');window.v=useVisualConfigStore(p);
 const {useMusicStore}=await import('/src/stores/music.ts');window.m=useMusicStore(p);
 for(const layer of ['ambient','particles','hilbertScope'])window.v.config[layer].isEnabled=false;
 // Public Presence/Response own idle/active Strings after the retired master migration.
 window.v.updateStageControl('stringPresence',0);window.v.updateStageControl('stringResponse',0);
});
if(instrument)await page.evaluate(async instrument=>{const {useInstrumentStore}=await import('/src/stores/instrument.ts');const p=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;await useInstrumentStore(p).setInstrument(instrument);},instrument);
const sample=()=>page.evaluate(()=>{
 const c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 let n=0,alpha=0,max=0;for(let i=0;i<data.length;i+=4){const val=Math.max(data[i],data[i+1],data[i+2])*data[i+3]/255;if(val>10)n++;alpha+=data[i+3];max=Math.max(max,val);}
 return {time:performance.now(),active:[...window.m.activeNotes.values()].map(n=>({id:n.noteId,note:n.noteName})),pixels:n,alpha,max,events:window.noteTrace.slice()};
});
await page.evaluate(()=>{window.v.updateStageControl('bodySize',.05);window.v.config.blobs.connectionMode='merge';window.noteTrace=[];});
const key=page.getByRole('button',{name:'Fa, scale degree four, F four, main octave',exact:true});const box=await key.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
const touch = process.env.INPUT === 'touch' ? await page.context().newCDPSession(page) : null;
const press = () => touch ? touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, radiusX: 4, radiusY: 4, force: 1, id: 1 }] }) : page.mouse.down();
const release = () => touch ? touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) : page.mouse.up();
const baseline=await sample();await press();const results=[];
for(const delay of [400,600,2000,2000]){await page.waitForTimeout(delay);results.push({mode:'merge',sample:await sample()});}
await page.screenshot({path:`${output}/hold-merge.png`});
await page.evaluate(()=>window.v.config.blobs.connectionMode='web');await page.waitForTimeout(600);results.push({mode:'web-held',sample:await sample()});await page.screenshot({path:`${output}/hold-web.png`});
await release();await page.waitForTimeout(1800);results.push({mode:'web-released',sample:await sample()});
await page.evaluate(()=>window.v.config.blobs.connectionMode='merge');
for(let i=0;i<3;i++){await press();await page.waitForTimeout(400);results.push({mode:'merge-tap',sample:await sample()});await release();await page.waitForTimeout(1800);}
const data={identity:process.env.SOURCE_REVISION || 'current worktree',input:process.env.INPUT || 'mouse',baseline,config:await page.evaluate(()=>window.v.config),results,errors};await writeFile(`${output}/hold-checks.json`,JSON.stringify(data,null,2));
console.log(JSON.stringify(results.map(r=>({mode:r.mode,time:r.sample.time,pixels:r.sample.pixels,max:r.sample.max,alpha:r.sample.alpha,active:r.sample.active.length,events:r.sample.events}))));await browser.close();
const failures=results.filter(r=>r.mode!=='web-released'&&(r.sample.active.length!==1||r.sample.pixels<20)); if(errors.length || results.find(r=>r.mode==='web-released')?.sample.active.length!==0) failures.push({error:'runtime or release failure'});console.log(failures.length?'FAIL: held note missing in Merge minimum size':'PASS: minimum-size held note visible');process.exitCode=failures.length?1:0;
