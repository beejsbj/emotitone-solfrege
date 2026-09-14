(async () => {
  const { LiveAudioCore } = await import('/src/audio/live/core.ts');
  const { prepareSampleMipmaps } = await import('/src/audio/live/resampler.ts');
  const cases = [];
  for (const stereo of [false, true]) {
    const core = new LiveAudioCore(48000, () => {});
    const left = Float32Array.from({length:4096}, (_, i) => Math.sin(i * .01) * .001);
    const channels = stereo ? [left, Float32Array.from(left, value => value * .8)] : [left];
    core.command({type:'prepare',requestId:1,instrument:{kind:'sample-bank',instrumentId:'bench',zoneSelection:'nearest-root',gain:1,attack:0,decay:0,sustain:1,release:.01,zones:[{id:'z',rootMidi:60,sampleRate:48000,channels,mipmaps:prepareSampleMipmaps(channels,0,left.length),loopStartFrame:0,loopEndFrame:left.length}]}},0);
    for(let i=0;i<128;i++) core.command({type:'press',ownerId:String(i),notes:[{pitch:48+i%36,instrumentId:'bench'}]},0);
    const output=[new Float32Array(128),new Float32Array(128)];
    const times=[];
    for(let block=0;block<600;block++) {const start=performance.now();core.render(output,block*128);if(block>100)times.push(performance.now()-start);}
    times.sort((a,b)=>a-b);
    cases.push({stereo,voices:core.voiceCount,quantumMs:128/48,p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)});
  }
  return cases;
})()
