/** Read-only delivery/task grouping evidence from existing matched captures. */
import { readFile } from 'node:fs/promises';
const quantile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*q)];
const rows=[];
for(const name of ['native2000','worklet']) {
  const run=JSON.parse(await readFile(`audio-lab/results/native-comparison/${name}.json`));
  for(const capture of run.comparison.cases.slice(2,4)) {
    const key=event=>`${event.noteId}:${event.phase}`;
    const arrival=new Map(capture.pcm.trace.filter(event=>event.type==='worklet-event').map(event=>[key(event),event]));
    const delivered=capture.measured.lifecycle.map(event=>event.deliveredAt);
    const groups=[];
    for(const time of delivered) {
      if(!groups.length || time-groups.at(-1).at>2) groups.push({at:time,count:1});
      else groups.at(-1).count++;
    }
    const costs=capture.measured.lifecycle.map(event=>arrival.has(key(event))?event.deliveredAt-arrival.get(key(event)).performanceTime:null).filter(time=>time!==null);
    const gaps=delivered.slice(1).map((time,index)=>time-delivered[index]);
    const first=capture.measured.input[0];
    rows.push({backend:name,scenario:capture.name,lifecycleEvents:delivered.length,uniqueEvents:new Set(capture.measured.lifecycle.map(key)).size,
      musicalSpanMs:(capture.measured.lifecycle.at(-1).at-capture.measured.lifecycle[0].at)*1000,
      deliverySpanMs:delivered.at(-1)-delivered[0],deliveryGroups:groups.length,
      groupMedian:quantile(groups.map(group=>group.count),.5),groupMax:Math.max(...groups.map(group=>group.count)),
      deliveryGapMedianMs:quantile(gaps,.5),deliveryGapP95Ms:quantile(gaps,.95),
      callbackCosts:costs.length?{sumMs:costs.reduce((a,b)=>a+b,0),medianMs:quantile(costs,.5),p95Ms:quantile(costs,.95),maxMs:Math.max(...costs)}:null,
      maxQueueLagBeforeCallbackMs:arrival.size?Math.max(...arrival.values().map(event=>event.performanceTime-first.time-(event.at-first.audioTime)*1000)):null,
      longTaskSumMs:capture.measured.longTasks.reduce((sum,task)=>sum+task.duration,0),longTaskCount:capture.measured.longTasks.length});
  }
}
console.log(JSON.stringify({scope:'Two-millisecond grouping is descriptive, not browser task identity. Worklet arrival trace runs before bridge callback; lab lifecycle observer runs afterward.',rows},null,2));
