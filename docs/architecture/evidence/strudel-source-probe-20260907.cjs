const fs=require('fs'),vm=require('vm'),{createRequire}=require('module');
const root='/home/admin/.t3/worktrees/emotitone-solfrege/t3code-48955534';
const req=createRequire(root+'/package.json');
const ts=req('typescript'),cm=req('@codemirror/state');
const source=fs.readFileSync(root+'/src/components/uniques/CodeStrip/strudelExtension.ts','utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exposed={}; const native={};
const nativeSource=fs.readFileSync(root+'/node_modules/@strudel/codemirror/highlight.mjs','utf8');
vm.runInNewContext(ts.transpileModule(nativeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,allowJs:true}}).outputText,{exports:native,require:req});
const showMiniLocations=native.showMiniLocations;
const scale={mode:'major',degreeCount:7,intervals:[0,2,4,5,7,9,11],intervalNames:['1P','2M','3M','4P','5P','6M','7M']};
vm.runInNewContext(output,{exports:exposed,require:(id)=>{
if(id==='@strudel/codemirror')return {showMiniLocations};
if(id==='@/data')return {CHROMATIC_NOTES:['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],getScaleForMode:()=>scale,normalizeScaleIndex:(_,n)=>((n%7)+7)%7,getSolfegeNameForMode:()=> 'Do'};
if(id==='@/services/musicColor')return {getScaleDegreeIndexForPitchClass:()=>0};
if(id.endsWith('.vue'))return {};
return req(id);
}});
(async()=>{
const mini=await import(root+'/node_modules/@strudel/mini/krill-parser.js');
for(const body of ['< [ 0 1 ] >','< [ 0*2 1 ] >','< [0 1]>','< [ 0 [1 2] ] >','< [ 0 ~ ] >']){
const code='n("'+body+'")';
let extension;
try{const state=cm.EditorState.create({doc:code,extensions:exposed.codeStripStrudelExtension});extension=exposed.parseCodeStripEvents(state.doc).map(e=>({kind:e.kind,text:code.slice(e.from,e.to),notes:e.notes.map(n=>n.text)}));}catch(e){extension={error:e.message};}
const haps=mini.parse('"'+body+'"');
const atoms=[]; function walk(n){if(!n||typeof n!=='object')return;if(n.type_==='element' && n.source_?.type_==='atom')atoms.push({note:n.source_.source_,operators:n.options_.ops.map(o=>o.type_)});if(Array.isArray(n.source_))n.source_.forEach(walk);else walk(n.source_);} walk(haps); console.log(JSON.stringify({code,extension,installedMini:atoms}));
}
})();

let state=cm.EditorState.create({doc:'n("< [ 0 1 ] >")',extensions:[exposed.codeStripStrudelExtension,native.highlightExtension]});
const before=exposed.parseCodeStripEvents(state.doc), oldSecond=before[1].notes[0];
function dispatch(spec){state=state.update(spec).state;}
dispatch({effects:native.setMiniLocations.of(before.flatMap(e=>e.notes.map(n=>[n.from,n.to])))});
exposed.setCodeStripPlaying({dispatch},true);
dispatch({changes:{from:before[0].from,insert:'2 '}});
dispatch({effects:showMiniLocations.of({atTime:.75,haps:[{context:{locations:[{start:oldSecond.from,end:oldSecond.to}]},whole:{begin:.5,duration:.5}}]})});
const active=[],nativeHighlights=[];
for(const decs of state.facet(req('@codemirror/view').EditorView.decorations)){
if(typeof decs==='function') continue;
for(let it=decs.iter();it.value;it.next()) {if(it.value.spec.attributes?.style?.startsWith('outline:'))nativeHighlights.push(state.doc.sliceString(it.from,it.to));const w=it.value.spec.widget;if(w?.active) active.push({source:state.doc.sliceString(it.from,it.to),label:w.token.rawPitch,progress:w.token.progress});}
}
console.log(JSON.stringify({scenario:'insert 2 before 0 while old pattern plays note 1',editedSource:state.doc.toString(),oldHapRange:oldSecond,active,nativeHighlights}));
