// node audio-lab/spike-strudel/run.mjs [receipt.json]; SPIKE_SMOKE=1 for one cell.
// Uses the repo's CDP/headless-Chrome approach; never redirects production output.
import {createServer} from 'vite';
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hashes={};for(const path of ['node_modules/@strudel/core/cyclist.mjs','node_modules/@strudel/core/dist/index.mjs','node_modules/superdough/dist/index.mjs','audio-lab/spike-strudel/transport.mjs','audio-lab/spike-strudel/suite.mjs','audio-lab/spike-strudel/tempo.mjs','audio-lab/spike-strudel/held.mjs'])hashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
const directory=resolve('audio-lab/spike-strudel/.chrome');
await mkdir(directory,{recursive:true});
const vite=await createServer({configFile:false,root:process.cwd(),cacheDir:resolve('node_modules/.vite-spike-strudel'),
  optimizeDeps:{entries:['audio-lab/spike-strudel.html']},resolve:{alias:{'@':resolve('src')}},
  server:{host:'127.0.0.1',port:0,hmr:false}});
await vite.listen();
const chrome=spawn(process.env.CHROME_BIN||'/usr/bin/google-chrome',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run',
  '--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling',
  '--remote-debugging-port=0',`--user-data-dir=${directory}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let socket;
try{
  const port=await new Promise((done,fail)=>{let output='';const timeout=setTimeout(()=>fail(Error('No DevTools')),15000);
    chrome.stderr.on('data',chunk=>{output+=chunk;const m=output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timeout);done(Number(m[1]));}});chrome.on('error',fail);});
  const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((done,fail)=>{socket.onopen=done;socket.onerror=fail;});
  let id=0;const pending=new Map(),warnings=[];
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')console.error(JSON.stringify(m.params));
    if(m.method==='Runtime.consoleAPICalled'){
      const line=m.params.args.map(a=>a.value??a.description).join(' ');
      if(['warning','error'].includes(m.params.type))warnings.push(line);
      if(line.startsWith('SPIKE'))console.log(line);
    }};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  await call('Runtime.enable');await call('Page.bringToFront');await call('Page.navigate',{url:`http://127.0.0.1:${vite.httpServer.address().port}/audio-lab/spike-strudel/suite.html`});
  let ready=false;for(let i=0;i<200;i++){const r=await call('Runtime.evaluate',{expression:'typeof window.runStrudelSpike === "function"',returnByValue:true});if(r.result.value){ready=true;break;}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw Error('Spike failed to initialize');
  const r=await call('Runtime.evaluate',{expression:process.env.SPIKE_COST_ONLY?"window.runStrudelSpikeCost()":`window.runStrudelSpike(${!!process.env.SPIKE_SMOKE},${!!process.env.SPIKE_SKIP_COST})`,awaitPromise:true,returnByValue:true,timeout:900000});
  if(r.exceptionDetails){const partial=await call("Runtime.evaluate",{expression:"window.spikePartial",returnByValue:true});await writeFile((process.argv[2]||"audio-lab/results/spike-strudel-transport.json")+".partial.json",JSON.stringify({warnings,...partial.result.value,error:r.exceptionDetails},null,2)+"\n");throw Error(JSON.stringify(r.exceptionDetails));}
  const output=process.argv[2]||'audio-lab/results/spike-strudel-transport.json';
  const receipt={recordedAt:new Date().toISOString(),revision,hashes,warnings,...r.result.value};
  await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({output,benchmark:receipt.benchmark,summary:receipt.summary,checks:receipt.checks,warnings},null,2));
  if(receipt.checks.some(c=>!c.passed))process.exitCode=1;
}finally{
  socket?.close();chrome.kill();await vite.close();await new Promise(r=>chrome.exitCode!==null||chrome.signalCode!==null?r():chrome.once('exit',r));
  await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
