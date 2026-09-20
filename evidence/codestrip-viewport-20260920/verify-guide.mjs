import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { collectGuideBrowserErrors, writeGuideReceipt } from './guide-receipt.mjs';
const out=dirname(fileURLToPath(import.meta.url));
const root=resolve(out,'../..');
const tmp=await mkdtemp('/tmp/emotitone-codestrip-guide-');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await mkdir(out,{recursive:true});
const server=await createServer({root,cacheDir:tmp+'/vite',server:{host:'127.0.0.1',port:0,hmr:false,watch:{ignored:()=>true}}});
await server.listen();
const browser=spawn('/usr/bin/google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--window-size=1280,900','--remote-debugging-port=0','--user-data-dir='+tmp+'/chrome','about:blank'],{stdio:['ignore','ignore','pipe']});
let socket;
try {
 const port=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome timed out')),15000);browser.stderr.on('data',chunk=>{log+=chunk;const m=log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}})});
 const target=await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 const pending=new Map();let serial=0;const errors=[];
 socket.onmessage=({data})=>{const message=JSON.parse(data);if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);if(message.error)reject(Error(JSON.stringify(message.error)));else resolve(message.result)}collectGuideBrowserErrors(errors,message)};
 const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++serial,{resolve,reject});socket.send(JSON.stringify({id:serial,method,params}))});
 const evaluate=async(expression,awaitPromise=false)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value};
 await call('Runtime.enable');await call('Page.enable');
 await call('Page.navigate',{url:`http://127.0.0.1:${server.httpServer.address().port}/style-guide/performance-deck`});
 for(let i=0;i<90;i++){if(await evaluate(`document.querySelectorAll('.code-strip-bar .note').length>0`))break;await wait(400)}
 const results=[];
 for(const [label,width,height] of [['desktop',1280,900],['phone',390,844]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:label==='phone'});await wait(500);
  const state=await evaluate(`(async()=>{const notes=[...document.querySelectorAll('.code-strip-bar .note')],scroller=document.querySelector('.code-strip-bar .cm-scroller');if(!notes.length||!scroller)throw Error('Missing real CodeStrip');const box=scroller.getBoundingClientRect();const styles=notes.map(n=>n.getAttribute('style'));await new Promise(r=>setTimeout(r,300));return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,noteCount:notes.length,visible:notes.filter(n=>{const r=n.getBoundingClientRect();return Math.min(r.right,box.right,innerWidth)>Math.max(r.left,box.left,0)&&Math.min(r.bottom,box.bottom,innerHeight)>Math.max(r.top,box.top,0)}).length,staticColors:notes.every((n,i)=>n.getAttribute('style')===styles[i]),scroller:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},labels:notes.map(n=>n.getAttribute('aria-label'))}})()`,true);
  if(!state.visible||!state.staticColors||state.documentWidth>state.width)throw Error('Guide contract failed '+JSON.stringify(state));
  results.push({label,...state});
  const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(out+'/guide-'+label+'.png',Buffer.from(shot.data,'base64'));
 }
 await call('Emulation.setEmulatedMedia',{media:'screen',features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))',true);
 const reducedMotion=await evaluate(`({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,transitions:[...document.querySelectorAll('.code-strip__note .note__surface')].map(el=>getComputedStyle(el,'::before').transitionDuration)})`);
 if(!reducedMotion.matches||reducedMotion.transitions.some(value=>value!=='0s'))throw Error('Guide motion contract failed '+JSON.stringify(reducedMotion));
 const report={revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),route:'/style-guide/performance-deck',results,reducedMotion,errors};
 await writeGuideReceipt(out+'/guide-check.json',report);console.log(JSON.stringify(report));
}finally{
 socket?.close();browser.kill();await server.close();await new Promise(resolve=>browser.exitCode!==null||browser.signalCode!==null?resolve():browser.once('exit',resolve));await rm(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
