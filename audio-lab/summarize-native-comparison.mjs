import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const names=['native400','native1200','native2000','worklet'];
const runs=await Promise.all(names.map(async name=>({name, data:JSON.parse(await readFile(`audio-lab/results/native-comparison/${name}.json`,'utf8'))})));
const rows=runs.map(({name,data:x})=>({name,revision:x.revision,
 sourceDigest:createHash('sha256').update(JSON.stringify(x.sourceHashes)).digest('hex'),harnessDigest:createHash('sha256').update(JSON.stringify(x.comparisonHashes)).digest('hex'),dependency:x.superdoughSha256,
 coreCaptureValid:x.checks.filter(c=>/PCM capture includes|intended chord|External runner|harness remained|source remained|exactly one AudioContext|Requested prepared|All inputs are trusted/.test(c.name)).every(c=>c.passed),
 externalSlipMs:x.comparison.worstExternalEventLoopSlipMs,warnings:x.warnings.length,
 rhythm:x.comparison.cases.slice(0,4).map(c=>`${c.measured.grid.filter(g=>g.rms>.001).length}/${c.measured.grid.length}`),
 maxOperationMs:Math.max(...x.comparison.cases.flatMap(c=>c.measured.operations.map(o=>o.duration))),
 maxPressMs:Math.max(...x.comparison.cases.flatMap(c=>c.measured.operations.filter(o=>o.method==='press').map(o=>o.duration))),
 maxReleaseMs:Math.max(...x.comparison.cases.flatMap(c=>c.measured.operations.filter(o=>o.method==='release').map(o=>o.duration))),
 peakNodes:Math.max(...x.comparison.cases.map(c=>c.measured.peakRetainedNodes)),retainedNodes:Math.max(...x.comparison.cases.map(c=>c.measured.retainedNodes)),
 pcmBytes:x.backend.additionalPcmBytes,originalPcmBytes:x.bank.originalPcmBytes,
 inputValues:x.trials.map(t=>t.inputToPcmMs).sort((a,b)=>a-b),
 costsPass:x.comparison.cases.every(c=>c.measured.operations.every(o=>o.duration<=25)),
 releaseSilence:x.comparison.cases.some(c=>c.measured.tail?.samples===0)?null:x.comparison.cases.every(c=>c.measured.tail===null||c.measured.tail.peak<.001),
 finalRecordedSilence:x.comparison.cases.every(c=>c.pcm.final100msPeak===0),
 maxCallbackLagMs:Math.max(...x.comparison.cases.flatMap(c=>{const input=c.measured.input[0];return c.measured.lifecycle.map(e=>e.deliveredAt-input.time-(e.at-input.audioTime)*1000)})),
 removedPitch:x.checks.find(c=>c.name.startsWith('Removed arpeggio'))?.passed,
 tempo:x.checks.find(c=>c.name.startsWith('Tempo edit'))?.passed,
 allChecks:x.checks.every(c=>c.passed),failedChecks:x.checks.filter(c=>!c.passed).map(c=>c.name)
}));
const summary={sourcesMatch:new Set(rows.map(r=>r.sourceDigest)).size===1,harnessesMatch:new Set(rows.map(r=>r.harnessDigest)).size===1,dependenciesMatch:new Set(rows.map(r=>r.dependency)).size===1,rows};
await writeFile('audio-lab/results/native-comparison/final-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
