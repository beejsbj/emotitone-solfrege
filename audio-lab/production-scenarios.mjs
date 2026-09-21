import { createPlayStyleEngine } from '../src/services/playStyles.ts';
import { createScheduledLiveVoice } from '../src/services/scheduledLiveVoice.ts';
import { LIVE_AUDIO_SCHEDULING_LEAD_MS } from '../src/services/liveAudioTiming.ts';
import { createLiveAudioClock } from '../src/services/liveAudioClock.ts';
import { admittedVoices } from './audio-boundary.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const note = (pitch) => ({ pitch, value: ({ 69: 'A4', 72: 'C5', 76: 'E5' })[pitch] });
const round = (value) => Math.round(value * 1000) / 1000;

export async function runProductionScenarios({ dough, context, begin, finish, timing, sampleUrl }) {
  await dough.samples({ lab_pitched: { A4: [sampleUrl] } });
  const scenarios = [];
  let serial = 0;
  for (const name of ['stable-stall', 'held-changes', 'tempo-boundary']) {
    const published = [], ended = [], errors = [];
    const created = [];
    const clock = createLiveAudioClock(() => context);
    const engine = createPlayStyleEngine({
      now: clock.now, schedulingLeadMs: 20, initialLeadMs: LIVE_AUDIO_SCHEDULING_LEAD_MS,
      start(noteName, at) {
        const noteId = `production-${++serial}`;
        created.push({ noteId, at });
        return createScheduledLiveVoice({ noteId, noteName, instrument: 'lab_pitched', at,
          now: clock.now, clock, releaseSeconds: 0.03,
          onStart: () => published.push(noteId), onEnd: () => ended.push(noteId), onError: (error) => errors.push(String(error)),
        });
      },
    });
    engine.configure({ style: name === 'stable-stall' ? 'repeat' : 'arp-up', rate: 16, bpm: 120 });
    await begin();
    engine.press('a', [note(69)]);
    let stallObservedMs = 0;
    if (name === 'stable-stall') {
      await sleep(450);
      const before = performance.now();
      while (performance.now() - before < 100) {}
      stallObservedMs = performance.now() - before;
      await sleep(900); // Last audible pulse at ~1380ms; next queued pulse cancels.
    } else if (name === 'held-changes') {
      await sleep(180);
      engine.press('c', [note(72)]);
      await sleep(80);
      engine.press('e', [note(76)]);
      await sleep(40);
      engine.release('c');
      await sleep(450);
    } else {
      await sleep(310);
      engine.configure({ bpm: 60 });
      await sleep(880);
    }
    engine.clear();
    await sleep(150);
    const rendered = await finish();
    const expected = published.map((id) => admittedVoices.get(id).startedAt);
    const remaining = created.filter(({ noteId }) => dough.hasVoice(noteId)).length;
    scenarios.push({ name, ...timing(rendered.onsets, expected), published: published.length, ended: ended.length,
      expectedMusicalPulses: name === 'stable-stall' ? 12 : name === 'tempo-boundary' ? 7 : null,
      publishedNotes: published.map((id) => admittedVoices.get(id).noteName),
      onsetIntervalsMs: expected.slice(1).map((at, i) => round((at - expected[i]) * 1000)),
      renderedOnsetIntervalsMs: rendered.onsets.slice(1).map((at, i) => round((at - rendered.onsets[i]) * 1000)),
      maxMusicalIntervalDeviationMs: name === 'stable-stall'
        ? round(Math.max(...rendered.onsets.slice(1).map((at, i) => Math.abs((at - rendered.onsets[i]) * 1000 - 125)))) : null,
      maxOngoingIntervalDeviationMs: name === 'stable-stall'
        ? round(Math.max(...rendered.onsets.slice(2).map((at, i) => Math.abs((at - rendered.onsets[i + 1]) * 1000 - 125)))) : null,
      scheduledVoicesIncludingRevisions: created.length, remainingVoices: remaining, errors,
      stallObservedMs: round(stallObservedMs) });
    clock.dispose();
  }
  return scenarios;
}

export async function runDenseLifecycle({ dough, context }) {
  const ids = [];
  let peakRegistered = 0;
  let admitted = 0;
  const preparation = [];
  const start = performance.now();
  // 50 chords: without stealing, 1s gates + 500ms tails at ten notes/75ms
  // exceed the 128-voice budget. Loops keep actual sources sounding throughout.
  for (let chord = 0; chord < 50; chord++) {
    const at = context.currentTime + 0.005;
    const before = performance.now();
    await Promise.all(Array.from({ length: 10 }, async (_, index) => {
      const voiceId = `dense-${chord}-${index}`;
      ids.push(voiceId);
      await dough.superdough({ s: 'lab_sample', voiceId, sustainUntilRelease: true, loop: 1, gain: 0.01,
        attack: 0.001, release: 0.5 }, at, 0.25, 1);
      if (dough.hasVoice(voiceId)) admitted++;
      dough.releaseVoice(voiceId, at + 1);
    }));
    preparation.push(performance.now() - before);
    peakRegistered = Math.max(peakRegistered, ids.filter((id) => dough.hasVoice(id)).length);
    await sleep(75);
  }
  await sleep(1700);
  const sorted = preparation.sort((a, b) => a - b);
  return { attacks: ids.length, admitted, durationMs: round(performance.now() - start), peakRegistered,
    activeVoiceBudget: 128, retirementAllowance: 8,
    remainingRegistered: ids.filter((id) => dough.hasVoice(id)).length,
    chordPreparationMs: { p50: round(sorted[24]), p95: round(sorted[47]), max: round(sorted.at(-1)) },
    scope: 'Real browser looped sources and voice registry; 1s gates/500ms releases at 10 notes/75ms exceed the 128-voice budget. Not a heap or CPU utilization measurement.' };
}
