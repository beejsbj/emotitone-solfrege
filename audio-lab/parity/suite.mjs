import * as dough from 'superdough';
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { evaluate } from '@strudel/transpiler';
import { LiveAudioCore } from '../../src/audio/live/core';
import { prepareLiveInstrument } from '../../src/services/preparedLiveInstrument';
import { getLiveArticulation } from '../../src/services/liveArticulation';
import { logNotesToStrudel } from '../../src/services/StrudelNotation';
import { comparePcm, parityChecks } from './metrics.mjs';
import { createFixtureWav } from './fixtures.mjs';
import { registerSoundfonts, setSoundfontUrl } from '@strudel/soundfonts';
import { runVoiceBudgetParity } from './voice-budget.mjs';

const RATE = 48000, START = .05, HOLD = .4;
const SOUNDS = ['piano', 'sine', 'triangle', 'square', 'sawtooth'];
const all = checks => Object.values(checks).every(Boolean);

async function createContext(length) {
  dough.resetGlobalEffects();
  const context = new OfflineAudioContext(2, Math.ceil(RATE * length), RATE);
  dough.setAudioContext(context);
  dough.setSuperdoughAudioController(null);
  await dough.initAudio({ disableWorklets: true });
  return context;
}

async function render(sound, code, fixture = {}) {
  const pitch = fixture.pitch ?? 69, hold = fixture.hold ?? HOLD;
  const notes = fixture.notes ?? [{ at: 0, hold, style: 'together' }];
  const lastEnd = Math.max(...notes.map(note => note.at + note.hold));
  const length = Math.max(2.5, lastEnd + 2);
  let context = await createContext(length);
  const prepared = await prepareLiveInstrument(context, sound);
  const nativeFallback = sound === 'square' || sound === 'sawtooth';
  if (nativeFallback ? prepared.kind !== 'unsupported' : !['sample-bank', 'oscillator'].includes(prepared.kind)) {
    throw new Error(`Unexpected renderer selection: ${JSON.stringify(prepared)}`);
  }
  const events = [], live = new LiveAudioCore(RATE, message => {
    if (message.type === 'event') events.push(message.event);
  });
  let reference;
  const nativeScheduled = [];
  if (nativeFallback) {
    // Exercise the actual native held-voice path, independently of finite
    // notation playback. These are scheduled API edges, not store/UI captures.
    for (const [index, note] of notes.entries()) {
      const voiceId = `parity-held-${sound}-${index}`;
      const articulation = { ...getLiveArticulation(sound),
        ...(note.style === 'repeat' || note.style.startsWith('arp') ? { release: .03 } : {}) };
      const value = { s: sound, note: pitch, gain: .8, ...articulation, voiceId, sustainUntilRelease: true };
      const start = START + note.at, release = start + note.hold;
      const armedAt = await dough.superdough(value, start, .25, 1);
      if (!Number.isFinite(armedAt) || Math.abs(armedAt - start) > 1 / RATE) {
        throw new Error(`Unexpected native held onset: ${armedAt}, expected ${start}`);
      }
      if (!dough.releaseVoice(voiceId, release)) throw new Error(`Native voice was not registered: ${voiceId}`);
      nativeScheduled.push({ value, start: armedAt, release });
      for (const [phase, at] of [['attack', armedAt], ['release', release]]) {
        events.push({ phase, at, noteId: voiceId, ownerId: `key-${index}`, pitch,
          instrumentId: sound, style: note.style, articulation });
      }
    }
    reference = (await context.startRendering()).getChannelData(0);
    context = await createContext(length);
  } else {
    live.command({ type: 'prepare', requestId: 1, instrument: prepared }, 0);
    reference = new Float32Array(Math.ceil(RATE * length));
    const commands = notes.flatMap((note, index) => [
      { at: Math.round((START + note.at) * RATE), command: { type: 'configure', config: { style: note.style, bpm: 120, rate: 4 } } },
      { at: Math.round((START + note.at) * RATE), command: { type: 'press', ownerId: `key-${index}`, notes: [{ pitch, instrumentId: sound }] } },
      { at: Math.round((START + note.at + note.hold) * RATE), command: { type: 'release', ownerId: `key-${index}` } },
    ]);
    const edges = [...new Set([0, ...commands.map(command => command.at), reference.length])].sort((a, b) => a - b);
    for (let j = 0; j < edges.length - 1; j++) {
      const from = edges[j], to = edges[j + 1];
      commands.filter(command => command.at === from).forEach(({ command }) => live.command(command, from));
      for (let at = from; at < to; at += 128) {
        const left = reference.subarray(at, Math.min(at + 128, to));
        live.render([left, new Float32Array(left.length)], at);
      }
    }
  }
  const recorded = events.filter(event => event.phase === 'attack').map(attack => {
    const release = events.find(event => event.phase === 'release' && event.noteId === attack.noteId);
    if (!release) throw new Error(`Live fixture failed to release ${attack.noteId}`);
    return { id: attack.noteId, note: `A${Math.floor(pitch / 12) - 1}`, octave: Math.floor(pitch / 12) - 1,
      scaleIndex: 5, key: 'C', mode: 'major', instrument: sound, articulation: attack.articulation,
      pressTime: Math.round((attack.at - START) * 1e6) / 1000,
      releaseTime: Math.round((release.at - START) * 1e6) / 1000,
      duration: Math.round((release.at - attack.at) * 1e6) / 1000 };
  });
  if (recorded.length !== notes.length) throw new Error(`Expected ${notes.length} reference notes, got ${recorded.length}`);
  code ??= logNotesToStrudel(recorded, { sound, bpm: 120, sourceBpm: 120 });
  if (fixture.forceClipOne) code += '.clip(1)';
  // Core .cpm() converts the generated source tempo into a 1-cps query clock.
  // Query one recorded phrase only; loop-tail/retrigger behavior belongs to the
  // notation tests. Pass the real hap value and duration to installed Superdough.
  const { pattern } = await evaluate(code);
  const haps = pattern.queryArc(0, lastEnd).filter(hap => hap.hasOnset());
  if (haps.length !== notes.length) throw new Error(`Expected ${notes.length} generated notes, got ${haps.length}: ${code}`);
  const scheduled = haps.map(hap => ({ value: { ...hap.value }, start: Number(hap.whole.begin),
    duration: Number(hap.duration), structuralDuration: Number(hap.whole.duration) }));
  for (const hap of scheduled) await dough.superdough({ ...hap.value }, START + hap.start, hap.duration, 1);
  const rendered = await context.startRendering();
  const actual = rendered.getChannelData(0);
  const metrics = comparePcm(reference, actual, { rate: RATE, frequency: 440 * 2 ** ((pitch - 69) / 12),
    // Short-gate checks compare the release segment because no sustain plateau
    // exists. Both paths must begin release from the same partial attack level.
    steadyStart: START + (hold < .1 ? .015 : .12), steadyEnd: START + (hold < .1 ? .08 : .32) });
  const checks = parityChecks(metrics);
  checks.gates = scheduled.every((hap, i) => Math.abs(hap.start * 1000 - recorded[i].pressTime) < .25
    && Math.abs(hap.duration * 1000 - recorded[i].duration) < .25);
  return { code, scheduled, recorded, liveEvents: events, fixture: { pitch, notes },
    referenceRenderer: nativeFallback ? 'native-held-voice-api' : 'LiveAudioCore',
    preparation: { kind: prepared.kind, reason: prepared.reason, gain: prepared.gain },
    nativeScheduled,
    metrics, checks };
}

window.runPlaybackParity = async () => {
  await core.evalScope(core, mini, tonal);
  dough.registerSynthSounds();
  setSoundfontUrl(`${location.origin}/audio-lab/parity/font-fixture`);
  registerSoundfonts();
  const url = URL.createObjectURL(new Blob([createFixtureWav(RATE)], { type: 'audio/wav' }));
  await dough.samples({ piano: { A4: [url] }, parity_sample: { A4: [url] } });
  const results = [];
  try {
    for (const sound of SOUNDS) {
      const envelope = getLiveArticulation(sound);
      const source = "`< A4@0.2 ~@0.25 >`.as('note').sound('" + sound + "').cpm(120 / 4)";
      const matched = `${source}.clip(1).attack(${envelope.attack}).decay(0.001).sustain(1).release(${envelope.release})`;
      results.push({ sound, scenario: 'matched-controls', ...await render(sound, matched) });
      results.push({ sound, scenario: 'generated', ...await render(sound) });
      if (sound === 'piano') {
        // Isolate the old sample gate bug from envelope policy. Without an
        // explicit release/clip/loop the sampler chooses the full 2-second file.
        results.push({ sound, scenario: 'negative-missing-gate', ...await render(sound, source) });
        results.push({ sound, scenario: 'explicit-release-without-clip', ...await render(sound, matched.replace('.clip(1)', '')) });
      }
      if (sound === 'sine') results.push({ sound, scenario: 'negative-default-envelope', ...await render(sound, `${source}.clip(1)`) });
    }
    for (const pitch of [57, 81]) results.push({ sound: 'piano', scenario: `generated-sample-A${Math.floor(pitch / 12) - 1}`,
      ...await render('piano', undefined, { pitch }) });
    for (const sound of ['square', 'sawtooth']) for (const pitch of [57, 81, 93, 105]) {
      results.push({ sound, scenario: `generated-oscillator-A${Math.floor(pitch / 12) - 1}`,
        ...await render(sound, undefined, { pitch }) });
    }
    results.push({ sound: 'parity_sample', scenario: 'generated-5ms-gate-10ms-attack',
      ...await render('parity_sample', undefined, { hold: .005 }) });
    results.push({ sound: 'piano', scenario: 'generated-mixed-release-30ms-200ms',
      ...await render('piano', undefined, { notes: [{ at: 0, hold: .4, style: 'repeat' }, { at: .8, hold: .4, style: 'together' }] }) });
    const microGap = { notes: [{ at: 0, hold: .1, style: 'together' }, { at: .12, hold: .1, style: 'together' }] };
    results.push({ sound: 'piano', scenario: 'generated-20ms-silent-gap', ...await render('piano', undefined, microGap) });
    results.push({ sound: 'piano', scenario: 'negative-overwritten-gate-ratio',
      ...await render('piano', undefined, { ...microGap, forceClipOne: true }) });
    results.push({ sound: 'gm_piano', scenario: 'generated-soundfont-loop',
      ...await render('gm_piano', undefined, { hold: 1.3 }) });
  } finally { URL.revokeObjectURL(url); }
  const checks = results.filter(row => row.scenario === 'matched-controls' || row.scenario.startsWith('generated'))
    .map(row => ({ name: `${row.sound}/${row.scenario}`, passed: all(row.checks) }));
  const gate = results.find(row => row.scenario === 'negative-missing-gate');
  const envelope = results.find(row => row.scenario === 'negative-default-envelope');
  checks.push({ name: 'negative sample gate detected', passed: !gate.checks.offset });
  checks.push({ name: 'negative synth envelope detected', passed: !envelope.checks.rms && !envelope.checks.envelope });
  checks.push({ name: 'negative overwritten gate ratio detected',
    passed: !results.find(row => row.scenario === 'negative-overwritten-gate-ratio').checks.gates });
  const voiceBudget = await runVoiceBudgetParity();
  checks.push(...voiceBudget.checks);
  return { environment: { userAgent: navigator.userAgent, sampleRate: RATE,
    scope: 'Finite generated Superdough PCM versus LiveAudioCore or square/saw native held-voice API; no devices, catalog downloads, or UI/store latency',
    phasePolicy: 'Hann-window harmonic magnitudes and energy envelope; waveform phase is not compared pointwise' },
    results, voiceBudget: voiceBudget.evidence, checks };
};
