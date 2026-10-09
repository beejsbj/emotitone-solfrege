import * as dough from 'superdough';

const RATE = 48000, SECONDS = 1.7, LIMIT = 64;
const START = 1, REPLACEMENT = 1.09, HOLD = .5, RETIRE = .01;
const ADSR = { attack: .001, decay: .001, sustain: 1, release: .1 };
const HOLD_WINDOW = [1.04, 1.08], SILENCE_FROM = 1.105;
const RMS_TOLERANCE = .01, SILENCE_PEAK = 1e-7;

function measure(buffer, from, to) {
  let energy = 0, peak = 0, finite = true, count = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const pcm = buffer.getChannelData(channel);
    for (let i = Math.ceil(from * RATE); i < Math.ceil(to * RATE); i++) {
      const value = pcm[i];
      finite &&= Number.isFinite(value);
      energy += value * value;
      peak = Math.max(peak, Math.abs(value));
      count++;
    }
  }
  return { rms: Math.sqrt(energy / count), peak, finite };
}

async function render(name, initialCount, replacements) {
  dough.resetGlobalEffects();
  const context = new OfflineAudioContext(2, RATE * SECONDS, RATE);
  dough.setAudioContext(context);
  dough.setSuperdoughAudioController(null);
  const sources = [], scheduled = [];
  const createOscillator = context.createOscillator;
  // Observe actual browser sources, never substitute nodes, clocks, or audio.
  // Finite voices intentionally do not appear in Superdough's hasVoice map.
  context.createOscillator = function (...args) {
    const oscillator = createOscillator.apply(this, args);
    const source = { starts: [], stops: [] };
    const start = oscillator.start, stop = oscillator.stop;
    oscillator.start = function (at = 0) { source.starts.push(at); return start.call(this, at); };
    oscillator.stop = function (at = 0) { source.stops.push(at); return stop.call(this, at); };
    sources.push(source);
    return oscillator;
  };
  try {
    await dough.initAudio({ disableWorklets: true, maxPolyphony: LIMIT });
    dough.registerSynthSounds();
    const attack = async (at, gain) => {
      const before = sources.length;
      await dough.superdough({ s: 'sine', note: 69, gain, ...ADSR }, at, HOLD, 1);
      scheduled.push({ at, gain, sourceIndices: sources.slice(before).map((_, i) => before + i) });
    };
    for (let i = 0; i < initialCount; i++) await attack(START, i === 0 ? .8 : 0);
    for (const at of replacements) await attack(at, 0);
    const schedulingClock = context.currentTime;
    const voiceLimit = dough.maxPolyphony;
    const buffer = await context.startRendering();
    const started = event => event.sourceIndices.length === 1
      && sources[event.sourceIndices[0]].starts.length === 1
      && Math.abs(sources[event.sourceIndices[0]].starts[0] - event.at) <= 1 / RATE;
    return {
      name, initialCount, replacements, voiceLimit, schedulingClock, scheduled,
      sources: sources.map(source => ({ starts: [...source.starts], stops: [...source.stops] })),
      expectedZeroGainSources: initialCount - 1 + replacements.length,
      zeroGainSourcesStarted: scheduled.filter(event => event.gain === 0 && started(event)).length,
      allSourcesStarted: sources.length === scheduled.length && scheduled.every(started),
      hold: measure(buffer, ...HOLD_WINDOW),
      fade: measure(buffer, REPLACEMENT, REPLACEMENT + RETIRE),
      afterRetirement: measure(buffer, SILENCE_FROM, SECONDS),
      whole: measure(buffer, 0, SECONDS),
    };
  } finally {
    context.createOscillator = createOscillator;
    dough.resetGlobalEffects();
    dough.setSuperdoughAudioController(null);
  }
}

/**
 * Browser-only real-package PCM regression. Run sequentially AFTER other parity
 * renders and only once the installed bundle is frozen; this resets Superdough's
 * global graph and leaves its context pointing at the completed offline render.
 * Runner integration: append returned checks and retain evidence in the receipt;
 * include this module in the runner's watched hashes. No automatic invocation.
 *
 * At t=0 queue 64 finite voices for t=1, then pressure at t=1.09. Only the oldest
 * victim is audible. It must retain the control's 1.04–1.08 RMS, then be silent
 * after 1.105. Retiring at scheduling time instead of onset erases that hold.
 * Twelve staggered retirements must not evict the oldest graph at t=0 either.
 * The final zero-gain replacements can outlive this 1.7s capture; teardown is
 * explicit, so this tests audible retirement timing, not natural-end cleanup.
 */
export async function runVoiceBudgetParity() {
  const previousLimit = dough.maxPolyphony;
  try {
    const control = await render('single-voice-control', 1, []);
    const cases = [await render('one-future-retirement', LIMIT, [REPLACEMENT]),
      await render('twelve-staggered-retirements', LIMIT,
        Array.from({ length: 12 }, (_, i) => REPLACEMENT + i * .02))];
    // Independent amplitude guard: native sine gain is .3, fixture gain is .8.
    // A 40ms window spans 17.6 cycles; its RMS differs from the ideal by <1%.
    const expectedRms = .8 * .3 / Math.sqrt(2);
    const checks = [{ name: 'voice-budget/control amplitude',
      passed: control.whole.finite && Math.abs(control.hold.rms / expectedRms - 1) <= RMS_TOLERANCE }];
    for (const row of [control, ...cases]) {
      checks.push({ name: `voice-budget/${row.name}/real sources started`,
        passed: row.voiceLimit === LIMIT && row.schedulingClock === 0 && row.allSourcesStarted
          && row.zeroGainSourcesStarted === row.expectedZeroGainSources });
    }
    for (const row of cases) {
      row.holdRmsRatio = row.hold.rms / control.hold.rms;
      checks.push({ name: `voice-budget/${row.name}/victim audible before retirement`,
        passed: row.whole.finite && Math.abs(row.holdRmsRatio - 1) <= RMS_TOLERANCE });
      checks.push({ name: `voice-budget/${row.name}/silent after retirement`,
        passed: row.afterRetirement.finite && row.afterRetirement.peak <= SILENCE_PEAK });
    }
    return { checks, evidence: { sampleRate: RATE, renderSeconds: SECONDS, maxPolyphony: LIMIT,
      sound: 'sine', pitch: 69, gateSeconds: HOLD, articulation: ADSR,
      holdWindow: HOLD_WINDOW, silenceFrom: SILENCE_FROM, retirementSeconds: RETIRE,
      expectedControlRms: expectedRms, rmsRelativeTolerance: RMS_TOLERANCE,
      silencePeakLimit: SILENCE_PEAK, control, cases } };
  } finally { dough.setMaxPolyphony(previousLimit); }
}
