const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { mkdir, writeFile } from 'node:fs/promises';
const out=process.env.OUTPUT_DIR || '/tmp/blob-material-motion';
await mkdir(out,{recursive:true});
await mkdir(`${out}/frames`,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/google-chrome-stable',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:550}});
await page.goto(`${process.env.APP_URL || 'http://127.0.0.1:5187'}/style-guide/stage`,{waitUntil:'networkidle'});
await page.evaluate(async()=>{
 const {useBlobFieldRenderer}=await import('/src/composables/canvas/useBlobFieldRenderer.ts');
 const {useBlobRenderer}=await import('/src/composables/canvas/useBlobRenderer.ts');
 const {DEFAULT_CONFIG}=await import('/src/data/visual-config-metadata.ts');
 const {MAJOR_SOLFEGE}=await import('/src/data/index.ts');
 const host=document.createElement('div');host.id='comparison';host.style='position:fixed;inset:0;z-index:99999;background:#080706;display:flex;color:#eee;font:18px monospace';document.body.append(host);
 const bodies=useBlobRenderer();
 const blobs=[[95,90],[455,140],[340,360]].map(([x,y],i)=>({x,y,note:MAJOR_SOLFEGE[i*2],frequency:[261.63,329.63,392][i],startTime:0,baseRadius:32,opacity:.85,isFadingOut:false,driftVx:0,driftVy:0,vibrationPhase:i*.8,scale:1,renderScale:1,renderOpacity:.85,mode:'major',key:'C',octave:4}));
 const renderers=['merge','web'].map(mode=>{
  const panel=document.createElement('div');panel.style='width:50%;padding:20px';host.append(panel);
  const title=document.createElement('p');title.textContent=mode==='merge'?'MERGE · filled, soft, organic':'WEB · rooted, tapering strands';panel.append(title);
  const canvas=document.createElement('canvas');canvas.width=550;canvas.height=450;panel.append(canvas);
  return {mode,canvas,renderer:useBlobFieldRenderer()};
 });
 window.drawMaterial=(elapsed,motion=true)=>{
  const config={...DEFAULT_CONFIG.blobs,vibrationAmplitude:motion?DEFAULT_CONFIG.blobs.vibrationAmplitude:0};
  const frames=blobs.map((blob,i)=>({...bodies.createFixtureFrame(String(i),blob,config,elapsed),primaryColor:['#008e79','#b97a06','#ae4bca'][i]}));
  const points=frames.map(f=>({blob:f.blob,note:{noteId:f.key},x:f.blob.x,y:f.blob.y}));
  const scene={points,orderedPoints:points,boundaryEdges:[[0,1],[1,2],[0,2]].map(([a,b])=>({fromNoteId:String(a),toNoteId:String(b)})),interiorEdges:[]};
  for(const {mode,canvas,renderer} of renderers){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,550,450);renderer.renderBlobField(ctx,frames,{...config,connectionMode:mode},scene);}
  return renderers.map(({canvas})=>canvas.toDataURL());
 };
});
const samples=[];
for(let i=0;i<32;i++){
 samples.push(await page.evaluate(t=>window.drawMaterial(t),1+i/16));
 await page.screenshot({path:`${out}/frames/frame-${String(i).padStart(3,'0')}.png`});
 if(i===0)await page.screenshot({path:`${out}/organic-material-comparison.png`});
}
const stillA=await page.evaluate(()=>window.drawMaterial(1,false));
const stillB=await page.evaluate(()=>window.drawMaterial(30,false));
const result={mergeMotion:samples[0][0]!==samples[8][0],webMotion:samples[0][1]!==samples[8][1],motionOffStill:stillA.every((a,i)=>a===stillB[i]),source:'real prepared Blob contours and field renderer; fixed color and position fixture'};
await writeFile(`${out}/material-motion-checks.json`,JSON.stringify(result,null,2));console.log(result);await browser.close();
