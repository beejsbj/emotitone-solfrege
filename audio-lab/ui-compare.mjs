/** Summarize matched real-App receipts without flattening their limitations. */
import { readFile } from 'node:fs/promises';
const paths = process.argv.slice(2);
if(paths.length!==2) throw new Error('Usage: node audio-lab/ui-compare.mjs native.json worklet.json');
const [native,worklet] = await Promise.all(paths.map(path=>readFile(path,'utf8').then(JSON.parse)));
const summarize = values => {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length) return null;
  const middle=Math.floor(sorted.length/2);
  return {count:sorted.length,median:sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2,min:sorted[0],max:sorted.at(-1)};
};
const conditions = [...new Set([...native.trials,...worklet.trials].map(row=>`${row.mode}/${row.inputType}/${row.condition}`))];
const select = (run,key) => run.trials.filter(row=>`${row.mode}/${row.inputType}/${row.condition}`===key);
const inputs = conditions.map(condition=>({condition,
  native:summarize(select(native,condition).map(row=>row.inputToPcmMs)),
  worklet:summarize(select(worklet,condition).map(row=>row.inputToPcmMs))}));
const runSummary = run => ({revision:run.revision,backend:run.backend,originalPcmBytes:run.bank.originalPcmBytes,
  contexts:run.environment.contexts.length,checks:run.checks,
  stress:run.stress.map(row=>({scenario:row.scenario,stallDurationMs:row.stallDurationMs,
    detectedFirst3s:row.detectedFirst3s,expectedFirst3s:row.expectedFirst3s,maxIntervalDeviationMs:row.maxIntervalDeviationMs,
    requiredContinuity:row.requireRhythmContinuity,expectedOnsets:row.expectedOnsets,onsets:row.onsets.length,
    finitePcm:row.finitePcm,final100msPeak:row.final100msPeak,capacitySummary:row.capacitySummary}))});
const summary={sourcesMatch:JSON.stringify(native.sourceHashes)===JSON.stringify(worklet.sourceHashes),
  dependencyMatches:native.superdoughSha256===worklet.superdoughSha256,
  scope:'Three software trials per matched condition; render-quantized AudioContext timestamps, no physical-device latency claim. Long-stall native discontinuity is retained explicitly.',
  inputs,native:runSummary(native),worklet:runSummary(worklet)};
console.log(JSON.stringify(summary,null,2));
if(!summary.sourcesMatch || !summary.dependencyMatches) process.exitCode=1;
