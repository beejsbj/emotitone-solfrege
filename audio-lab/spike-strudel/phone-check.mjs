// Production-bundle smoke in a 390px desktop viewport, including PWA routing.
// This does not simulate phone CPU or physical audio latency.
import {preview} from 'vite';
import {mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const directory=resolve('audio-lab/spike-strudel/.chrome-phone');await mkdir(directory,{recursive:true});
const server=await preview({configFile:false,preview:{host:'127.0.0.1',port:0}});
// Equivalent to the committed Vercel rewrite; retain the public pathname.
server.middlewares.stack.unshift({route:'',handle(req,_res,next){if(req.url==='/spike/strudel-transport')req.url='/audio-lab/spike-strudel.html';next();}});
const chrome=spawn(process.env.CHROME_BIN||'/usr/bin/google-chrome',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling','--remote-debugging-port=0',`--user-data-dir=${directory}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let socket;
try{
  const port=await new Promise((done,fail)=>{let output='';const timer=setTimeout(()=>fail(Error('No DevTools')),15000);
    chrome.stderr.on('data',c=>{output+=c;const m=output.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);done(Number(m[1]));}});chrome.on('error',fail);});
  const page=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map(),warnings=[];
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')warnings.push(JSON.stringify(m.params));
    if(m.method==='Runtime.consoleAPICalled'&&['warning','error'].includes(m.params.type))warnings.push(m.params.args.map(a=>a.value??a.description).join(' '));};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async expression=>{for(let i=0;i<300;i++){if(await evaluate(expression))return;await sleep(100);}
    console.error(await evaluate('({title:document.title,url:location.href,controlled:!!navigator.serviceWorker.controller,html:document.body.innerHTML.slice(0,2000)})'),warnings);
    throw Error(`Timed out: ${expression}`);};
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call('Page.bringToFront');
  const url=`http://127.0.0.1:${server.httpServer.address().port}/spike/strudel-transport`;
  await call('Page.navigate',{url});await waitFor('typeof document.querySelector("#start")?.onclick === "function"');
  await evaluate('navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(()=>true)');
  await waitFor('!!navigator.serviceWorker.controller');
  // Wait for the new document, rather than accidentally reading the old page
  // while the asynchronous reload is still beginning.
  const loaded=new Promise(resolve=>socket.addEventListener('message',function onLoad({data}){
    if(JSON.parse(data).method==='Page.loadEventFired'){socket.removeEventListener('message',onLoad);resolve();}
  }));
  // A forced reload bypasses the service worker. Use normal navigation to
  // actually exercise Workbox's navigation fallback.
  await call('Page.reload',{ignoreCache:false});await loaded;
  await waitFor('typeof document.querySelector("#start")?.onclick === "function" && !!navigator.serviceWorker.controller');
  const pwa=await evaluate('({title:document.title,pathname:location.pathname,controlled:!!navigator.serviceWorker.controller})');
  await evaluate('window.phoneEvents=[];window.addEventListener("note-played",e=>window.phoneEvents.push(e.detail));document.querySelector("#start").click()');
  await waitFor('!!document.querySelector("#editor .cm-editor")');
  await evaluate('document.querySelectorAll("#phrases p")[0].querySelector("button").click();document.querySelectorAll("#phrases p")[1].querySelector("button").click()');
  await waitFor('window.phoneEvents.length >= 3');
  const select=async(id,value)=>evaluate(`(()=>{const el=document.getElementById(${JSON.stringify(id)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change'));})()`);
  await select('desk','p1');await select('key','D');await select('mode','minor');await select('tempo','150');
  await evaluate('document.querySelectorAll("#phrases p")[1].querySelectorAll("button")[2].click()');
  await sleep(800);
  await evaluate('document.querySelectorAll("#phrases p")[0].querySelectorAll("button")[1].click();document.querySelectorAll("#phrases p")[1].querySelectorAll("button")[3].click()');
  await sleep(800);
  await select('policy','bar');await select('desk','p0');
  const diagnostics=await evaluate('window.getSpikePhoneDiagnostics()');
  const state=await evaluate('({readout:document.querySelector("#position").textContent,status:document.querySelector("#status").textContent,played:window.phoneEvents.length,localStorageKeys:Object.keys(localStorage)})');
  const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile('audio-lab/results/spike-strudel-phone.png',Buffer.from(shot.data,'base64'));
  await evaluate('document.querySelector("#stop").click()');await waitFor('!document.querySelector("#editor .cm-editor")');
  const checks=[
    {name:'Built phone entry survives installed PWA navigation',passed:pwa.controlled&&pwa.title==='Spike: Strudel Looper transport'},
    {name:'Real note events sound after join and controls',passed:state.played>=3&&!diagnostics.errors.length},
    {name:'Every phrase repeats at its whole-bar ribbon period',passed:diagnostics.phrases.every(p=>p.onsets.includes(p.bars)&&p.onsets.includes(p.bars*2))},
    {name:'Stop destroys the one editor',passed:true},
    {name:'No browser warnings or exceptions',passed:!warnings.length},
  ];
  const html=await readFile('dist/audio-lab/spike-strudel.html');
  const result={recordedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),htmlSha256:createHash('sha256').update(html).digest('hex'),viewport:{width:390,height:844},pwa,state,diagnostics,warnings,checks};
  await writeFile('audio-lab/results/spike-strudel-phone.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checks,pwa,state,warnings},null,2));
  if(checks.some(c=>!c.passed))process.exitCode=1;
}finally{socket?.close();chrome.kill();await new Promise(r=>server.httpServer.close(r));await new Promise(r=>chrome.exitCode!==null||chrome.signalCode!==null?r():chrome.once('exit',r));await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
