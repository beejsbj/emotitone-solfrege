import { pure } from '@strudel/core';
import { Note } from '@tonaljs/tonal';
import { getScaleForMode } from '@/data/scales';
import { createPatternEditor, disposePatternEditor, getLooperPlaybackPort, getPatternPlaybackDiagnostics } from '@/services/patternPlayback';
import { createLooperTransport, buildLooperPhrase, prepareLooperPhrase } from '@/services/looperTransport';
import { getAudioContext, initSynthOnlyAudio, getActiveStrudelStageNotes } from '@/services/superdoughAudio';
import { createLiveAudioClock } from '@/services/liveAudioClock';
import { UIBeatClock } from '@/composables/useUIBeat';
import { captureOrbits, expectedNotes, match, phrases, sleep, stats, until } from './helpers.mjs';

const browserErrors = [];
window.addEventListener('error', e => browserErrors.push({ type: 'error', message: e.message, stack: e.error?.stack }));
window.addEventListener('unhandledrejection', e => browserErrors.push({ type: 'unhandledrejection', message: String(e.reason), stack: e.reason?.stack }));
// Cyclist logs this when its tick ran after the window it should have queried
// (main-thread starvation); every onset in that window is dropped for all members.
const schedulerSkips = [];
const consoleLog = console.log.bind(console);
console.log = (...args) => {
  if (args[0] === 'skip query: too late') schedulerSkips.push({ audioTime: getAudioContext().currentTime, wallMs: performance.now() });
  consoleLog(...args);
};
const check = (name, passed, detail) => ({ name, passed, ...(detail === undefined ? {} : { detail }) });
const settings = [{}, { offsetBars: .375, pinned: true }, { rate: .5 }, { rate: 2 }];
const cleanSnapshot = snapshot => ({ ...snapshot, members: snapshot.members.map(cleanMember), effectiveMembers: snapshot.effectiveMembers.map(cleanMember) });
const cleanMember = ({ phraseId, lengthBars, rate, offsetBars, pinned, muted }) => ({ phraseId, lengthBars, rate, offsetBars, pinned, muted });
const schedulerSnapshot = s => ({ audioTime: getAudioContext().currentTime, cycle: s.now(), cps: s.cps,
  lastBegin: s.lastBegin, lastEnd: s.lastEnd, lastTick: s.lastTick, started: s.started });

// Only lab gain/orbit routing is added. Production builds, scales, stretches,
// composes, queries and submits every Pattern through its own editor and output.
function prepare(phrase, index) {
  const built = buildLooperPhrase(phrase);
  return route(built, index);
}
function route(built, index) {
  const route = pattern => pattern.gain(pure(.12)).orbit(pure(index + 10));
  return { ...built, base: route(built.base), degrees: route(built.degrees) };
}

function freshPhrase(source, size, id) {
  return { ...source, id, duration: size * 250,
    notes: Array.from({ length: size }, (_, i) => ({ ...source.notes[i % source.notes.length],
      id: `${id}-${i}`, pressTime: i * 250, releaseTime: i * 250 + 160, duration: 160,
      articulation: { attack: .002 + i % 4 * .001, decay: .01, sustain: .5, release: .02 } })) };
}
async function benchmark() {
  const source = phrases()[0], results = [];
  for (const size of [64, 256, 512]) {
    const elapsed = [], asyncElapsed = [], slices = [], cells = [];
    for (let trial = 0; trial < 15; trial++) {
      // Fresh input, unique identity and new note objects on every measured build.
      const input = freshPhrase(source, size, `sync-${size}-${trial}`);
      const before = performance.now(); const built = buildLooperPhrase(input); const ms = performance.now() - before;
      if (built.notes.length !== size) throw Error('Builder lost source notes');
      const asyncInput = freshPhrase(source, size, `async-${size}-${trial}`), trialSlices = [];
      const asyncBefore = performance.now();
      const prepared = await prepareLooperPhrase(asyncInput, { sliceMs: 2, onSlice(ms) { trialSlices.push(ms); } });
      const asyncMs = performance.now() - asyncBefore;
      if (prepared.notes.length !== size) throw Error('Async builder lost source notes');
      if (trial >= 3) {
        elapsed.push(ms); asyncElapsed.push(asyncMs); slices.push(...trialSlices);
        cells.push({ trial: trial - 3, syncMs: ms, asyncMs, slicesMs: trialSlices, lengthBars: built.lengthBars });
      }
    }
    results.push({ notes: size, warmups: 3, trials: 12, sliceBudgetMs: 2,
      syncBuildMs: stats(elapsed), asyncElapsedMs: stats(asyncElapsed), asyncSliceMs: stats(slices), cells });
  }
  return results;
}

function pitch(phrase, note, member, key, mode) {
  if (member.pinned) return Note.midi(note.note);
  const oldScale = getScaleForMode(phrase.context.mode), nextScale = getScaleForMode(mode);
  const distance = Note.midi(note.note) - Note.midi(`${phrase.context.key}${phrase.context.octave}`);
  const octave = Math.floor(distance / 12), chroma = distance - octave * 12;
  const degree = oldScale.intervals.indexOf(chroma);
  if (degree < 0) throw Error('Timing fixture contains a borrowed pitch; supply a separate pitch oracle');
  return Note.midi(`${key}${phrase.context.octave}`) + octave * 12 + nextScale.intervals[Math.min(degree, nextScale.degreeCount - 1)];
}

async function trial(capture, inputs, strategy, bpm, repetition, expressionRate = 1) {
  const events = [], draws = [], frames = [], swaps = [], changes = [], stage = [], errors = [], toggles = [], segments = [], anchors = [];
  let coldPreparation;
  const context = getAudioContext();
  const skipsBefore = schedulerSkips.length;
  const beat = new UIBeatClock({ observeEnvironment: false, documentVisible: () => true, reducedMotion: () => false });
  const clock = createLiveAudioClock(getAudioContext);
  let service, editor, port, capturing = false, disposed = false;
  const onStage = event => {
    if (event.detail.source === 'strudel-playback') stage.push({ type: event.type, submittedAt: context.currentTime, ...event.detail });
  };
  window.addEventListener('note-played', onStage); window.addEventListener('note-released', onStage);
  const unsubscribe = beat.subscribe(snapshot => {
    if (snapshot.status === 'running' && snapshot.barPosition !== null)
      frames.push({ audioTime: context.currentTime, ...snapshot });
  });
  const recordSegment = boundary => {
    const snapshot = cleanSnapshot(service.snapshot());
    while (segments.length && segments.at(-1).from >= boundary - 1e-9) segments.pop();
    if (segments.length) segments.at(-1).to = boundary;
    segments.push({ from: boundary, to: null, key: snapshot.key, mode: snapshot.mode, members: snapshot.members, soloId: snapshot.soloId });
  };
  const timeAt = cycle => {
    const anchor = [...anchors].reverse().find(a => cycle >= a.cycle - 1e-9) ?? anchors[0];
    return anchor.time + (cycle - anchor.cycle) / anchor.cps;
  };
  async function change(name, action) {
    const before = schedulerSnapshot(port.scheduler), snapshotBefore = cleanSnapshot(service.snapshot());
    const receipt = await action();
    const after = schedulerSnapshot(port.scheduler), snapshotAfter = cleanSnapshot(service.snapshot());
    changes.push({ name, before, after, receipt, snapshotBefore, snapshotAfter,
      changeDelayMs: (receipt.boundaryAudioTime - receipt.requestedAudioTime) * 1000 });
    recordSegment(receipt.boundaryBar);
    return receipt;
  }
  try {
    editor = createPatternEditor({ root: document.querySelector('#editor'), initialCode: 'silence',
      onDraw(haps, rawPosition) {
        draws.push({ audioTime: context.currentTime, rawPosition, barPosition: service?.position() ?? 0,
          haps: haps.map(h => ({ phraseId: h.context?.phraseId, noteId: h.context?.noteId,
            begin: h.whole ? Number(h.whole.begin) : null, end: h.whole ? Number(h.whole.end) : null })) });
      },
      onToggle(started) { toggles.push({ audioTime: context.currentTime, started }); },
      onEvalError(error) { errors.push({ audioTime: context.currentTime, message: String(error), stack: error?.stack }); },
      onOutput(hap, deadline, duration, cps, t) {
        events.push({ phraseId: hap.context.phraseId, noteId: hap.context.noteId, cycle: Number(hap.whole.begin),
          endCycle: Number(hap.whole.end), deadline, duration, cps, t, submittedAt: context.currentTime,
          leadMs: (t - context.currentTime) * 1000, value: { ...hap.value }, context: { ...hap.context } });
      },
    });
    port = getLooperPlaybackPort(editor);
    // Observe actual replacements, including retirement, without owning scheduling.
    const measuredPort = { ...port, async setPattern(pattern, autostart) {
      const before = schedulerSnapshot(port.scheduler), started = performance.now();
      const result = await port.setPattern(pattern, autostart);
      const after = schedulerSnapshot(port.scheduler);
      swaps.push({ before, after, autostart, ms: performance.now() - started,
        phaseResidual: after.cycle - before.cycle - (after.audioTime - before.audioTime) * before.cps });
      return result;
    } };
    service = createLooperTransport({ playback: measuredPort, audioContext: getAudioContext, clock, beat, bpm, key: 'C', mode: 'major' });
    const cached = inputs.map((phrase, i) => strategy === 'cold-join' && i === 1 ? null : prepare(phrase, i));
    const initialIds = ['tempo', 'mute-solo'].includes(strategy) ? [0, 1, 2, 3] : [0];
    for (const i of initialIds) await service.join(cached[i], strategy === 'expression' ? { rate: expressionRate } : settings[i]);
    await capture.begin(); capturing = true;
    await service.start();
    const s = port.scheduler;
    anchors.push({ cycle: s.lastBegin, time: s.lastTick + s.latency, cps: bpm / 240 });
    recordSegment(0);
    await until(() => events.length || s.now() > .2, 'first submitted output');
    if (!events.length) throw Error('No submitted haps: PatternEditorOptions.onOutput observer is required (do not capture draw queries)');
    const singleton = getPatternPlaybackDiagnostics().activeTransports;
    const wait = cycle => until(() => s.now() >= cycle, `transport bar ${cycle}`);
    const policy = strategy === 'direct' || strategy === 'held' ? 'immediate' : 'bar';
    let finalCycle = 2.6;
    if (['direct', 'boundary'].includes(strategy)) {
      await wait(.53 + repetition * .03);
      await change('join offset pinned', () => service.join(cached[1], settings[1], policy));
      await wait(1.13 + repetition * .03);
      const explicit = policy === 'bar' ? { bar: Math.floor(s.lastEnd) + 1 } : policy;
      await change('leave offset pinned', () => service.leave('p1', explicit));
      await change('join half time', () => service.join(cached[2], settings[2], explicit));
      await change('join double time', () => service.join(cached[3], settings[3], explicit));
    } else if (strategy === 'mute-solo') {
      finalCycle = 3.4;
      await wait(.53 + repetition * .03);
      await change('mute pinned', () => service.update('p1', { muted: true }, 'bar'));
      await wait(1.13 + repetition * .03);
      await change('solo pinned', () => service.solo('p1', 'bar'));
      await change('unmute pinned', () => service.update('p1', { muted: false }, 'bar'));
      await wait(2.13);
      await change('restore all', () => service.solo(null, 'bar'));
    } else if (strategy === 'tempo') {
      finalCycle = 2.7;
      await wait(.53 + repetition * .03);
      await change('D minor bend with pin', () => service.setKeyMode('D', 'minor', 'bar'));
      await wait(1.13 + repetition * .03);
      const before = schedulerSnapshot(s), frontier = s.lastEnd, at = s.lastTick + s.clock.duration + s.latency;
      const nextBpm = bpm === 90 ? 150 : 90, started = performance.now();
      const receipt = await service.setTempo(nextBpm);
      anchors.push({ cycle: frontier, time: at, cps: nextBpm / 240 });
      changes.push({ name: 'tempo', before, after: schedulerSnapshot(s), receipt, nextBpm, ms: performance.now() - started,
        anchorResidual: receipt.boundaryAudioTime - at, frontierResidual: receipt.boundaryBar - frontier });
    } else if (strategy === 'cold-join') {
      await wait(.53 + repetition * .03);
      const before = schedulerSnapshot(s), allocationStarted = performance.now();
      inputs[1] = freshPhrase(inputs[1], 512, 'p1');
      const inputAllocationMs = performance.now() - allocationStarted;
      const slices = [], started = performance.now(); let yields = 0;
      const prepared = await prepareLooperPhrase(inputs[1], { sliceMs: 2,
        onSlice(ms) { slices.push({ ms, audioTime: context.currentTime, frontier: s.lastEnd }); },
        async yieldToScheduler() { yields++; await sleep(0); } });
      coldPreparation = { notes: 512, sliceBudgetMs: 2, inputAllocationMs, elapsedMs: performance.now() - started,
        sliceMs: stats(slices.map(slice => slice.ms)), yields, before, after: schedulerSnapshot(s), slices };
      await change('join freshly prepared 512 notes', () => service.join(route(prepared, 1), settings[1]));
      finalCycle = Math.max(2.6, s.now() + 1);
    } else if (strategy === 'held') {
      finalCycle = 1.8;
      await wait(.4 + repetition * .02);
      await change('join beside held gate', () => service.join(cached[1], settings[1]));
      await wait(1.2);
      await change('leave beside held gate', () => service.leave('p1'));
    } else if (strategy === 'expression') finalCycle = 1.25 / expressionRate;
    else throw Error(`Unknown strategy ${strategy}`);
    await wait(finalCycle);
    const snapshotBeforeStop = cleanSnapshot(service.snapshot());
    await service.stop();
    const drainUntil = Math.max(context.currentTime + .6, ...events.map(e => e.t + e.duration + .1));
    await sleep(Math.max(0, drainUntil - context.currentTime) * 1000);
    const pcm = await capture.end(); capturing = false;
    const start = ['held', 'expression'].includes(strategy) ? 0 : .1;
    const end = strategy === 'expression' ? 1.1 / expressionRate : finalCycle - .08;
    const perPhrase = inputs.map((phrase, i) => {
      const expected = segments.flatMap(seg => {
        const member = seg.members.find(m => m.phraseId === phrase.id);
        if (!member || member.muted || seg.soloId && seg.soloId !== phrase.id) return [];
        return expectedNotes(phrase, member, Math.max(start, seg.from), Math.min(end, seg.to ?? end))
          .map(e => ({ cycle: e.cycle, noteId: e.note.id, midi: pitch(phrase, e.note, member, seg.key, seg.mode), t: timeAt(e.cycle) }));
      });
      const actual = events.filter(e => e.phraseId === phrase.id && e.cycle >= start - 1e-8 && e.cycle < end - 1e-8);
      const attacks = pcm[i].onsets.filter(t => t >= timeAt(start) - .003 && t < timeAt(end) - 1e-8);
      const pitchMismatches = actual.filter(e => {
        const wanted = expected.find(n => n.noteId === e.noteId && Math.abs(n.cycle - e.cycle) < 1e-6);
        return wanted && wanted.midi !== Note.midi(String(e.value.note));
      });
      return { phraseId: phrase.id, expected, pitchMismatches,
        haps: match(expected.map(e => e.t), actual.map(e => e.t), .003),
        cycles: match(expected.map(e => e.cycle), actual.map(e => e.cycle), 1e-6),
        pcm: match(expected.map(e => e.t), attacks, .012) };
    });
    const ui = { generations: [...new Set(frames.map(f => f.generation))], frames: frames.length,
      backwards: frames.filter((f, i) => i && f.barPosition < frames[i - 1].barPosition - 1e-6).length,
      rawBackwards: draws.filter((f, i) => i && f.rawPosition < draws[i - 1].rawPosition - 1e-6).length };
    const played = stage.filter(e => e.type === 'note-played');
    const identityMismatches = events.flatMap((e, i) => {
      const actual = played[i];
      return actual && actual.phraseId === e.phraseId && actual.sourceNoteId === e.noteId &&
        Note.midi(actual.noteName) === Note.midi(String(e.value.note)) && actual.key === e.context.looperKey && actual.mode === e.context.looperMode
        ? [] : [{ event: e, stage: actual }];
    });
    const output = { played: played.length, identityMismatches,
      released: stage.filter(e => e.type === 'note-released').length, activeStageNotes: getActiveStrudelStageNotes().length, errors };
    const held = strategy === 'held' ? {
      submittedOnsets: events.filter(e => e.phraseId === 'p0' && e.cycle < 1.8).length,
      pcmOnsets: pcm[0].onsets.filter(t => t >= timeAt(0) - .003 && t < timeAt(1.8)),
      sustainGaps: pcm[0].silentRuns.filter(([a, b]) => a < timeAt(1.5) && b > timeAt(.2)) } : undefined;
    let expression;
    if (strategy === 'expression') {
      const totalRate = bpm / inputs[0].context.bpm * expressionRate;
      const deviations = events.filter(e => {
        const note = inputs[0].notes.find(n => n.id === e.noteId);
        const expected = { attack: note.articulation.attack / totalRate, decay: .01 / totalRate, release: .02 / totalRate,
          vib: 10 * totalRate, vibmod: .3, tremolo: 10 * totalRate, tremolodepth: .333 };
        return Object.entries(expected).some(([key, value]) => Math.abs(e.value[key] - value) > 1e-6 || !Number.isFinite(e.value[key]));
      });
      expression = { rate: expressionRate, totalRate, deviations };
    }
    await service.dispose(); await disposePatternEditor(editor); disposed = true;
    const cleanup = { schedulerStarted: s.started, activeTransports: getPatternPlaybackDiagnostics().activeTransports,
      activeStageNotes: getActiveStrudelStageNotes().length, beatStatus: beat.snapshot.status };
    const result = { strategy, bpm, repetition, ...(expression ? { expression } : {}), ...(held ? { held } : {}),
      ...(coldPreparation ? { coldPreparation } : {}),
      window: { startBar: start, endBar: end, startAudioTime: timeAt(start), endAudioTime: timeAt(end) },
      schedulerSkips: schedulerSkips.slice(skipsBefore), singleton, anchors, segments, changes, swaps, perPhrase, ui, output, cleanup, snapshotBeforeStop,
      leadMs: stats(events.map(e => e.leadMs)), events, stage, draws, frames, toggles, pcm };
    window.looperPartial.trials.push(result);
    console.log(`LOOPER ${strategy} ${bpm} #${repetition}${expression ? ` ${expressionRate}x` : ''}: haps ${perPhrase.reduce((sum, p) => sum + p.haps.missing.length, 0)} missing, PCM ${perPhrase.reduce((sum, p) => sum + p.pcm.missing.length, 0)} missing`);
    return result;
  } catch (error) {
    window.looperPartial.failedTrial = { strategy, bpm, repetition, events, draws, frames, swaps, changes, stage, errors, message: String(error) };
    throw error;
  } finally {
    if (!disposed) { await service?.dispose(); if (editor) await disposePatternEditor(editor); }
    if (capturing) await capture.end();
    unsubscribe(); beat.destroy(); clock.dispose();
    window.removeEventListener('note-played', onStage); window.removeEventListener('note-released', onStage);
  }
}

window.runLooperTransport = async ({ smoke = false, only = null, repeats = 3, costOnly = false } = {}) => {
  window.looperPartial = { benchmark: [], trials: [], browserErrors, checks: [] };
  console.log('LOOPER synth init');
  await initSynthOnlyAudio(); await getAudioContext().resume();
  window.looperPartial.benchmark = await benchmark();
  console.log(`LOOPER benchmark ${JSON.stringify(window.looperPartial.benchmark.map(b => ({ notes: b.notes,
    syncMeanMs: b.syncBuildMs.mean, syncMaxMs: b.syncBuildMs.max, asyncMeanMs: b.asyncElapsedMs.mean,
    asyncMaxMs: b.asyncElapsedMs.max, maxSliceMs: b.asyncSliceMs.max })))}`);
  const trials = window.looperPartial.trials;
  if (!costOnly) {
    const inputs = phrases(), capture = await captureOrbits();
    try {
      for (const bpm of smoke ? [150] : [90, 150]) {
        for (const strategy of only ? [only] : smoke ? ['direct'] : ['direct', 'boundary', 'mute-solo', 'tempo', 'held', 'expression', 'cold-join']) {
          for (let repeat = 0; repeat < (smoke ? 1 : strategy === 'expression' ? 1 : strategy === 'cold-join' ? Math.min(2, repeats) : repeats); repeat++) {
            for (const rate of strategy === 'expression' ? [1, 2] : [1]) {
              const fixture = structuredClone(inputs);
              if (strategy === 'held') {
                fixture[0].duration = 4000;
                fixture[0].notes = [{ ...fixture[0].notes[0], pressTime: 0, releaseTime: 3400, duration: 3400 }];
              }
              if (strategy === 'expression') {
                fixture[0].duration = 2000;
                fixture[0].notes = [0, 1].map(i => ({ ...fixture[0].notes[i], pressTime: i * 1000, releaseTime: i * 1000 + 700, duration: 700,
                  articulation: { attack: .002 + i * .001, decay: .01, sustain: .5, release: .02 },
                  pitchExpression: Array.from({ length: 25 }, (_, j) => ({ timeMs: j * 25, cents: 30 * Math.sin(j * Math.PI / 2) })),
                  gainExpression: Array.from({ length: 25 }, (_, j) => ({ timeMs: j * 25, gain: 1 + .2 * Math.sin(j * Math.PI / 2) })) }));
              }
              await trial(capture, fixture, strategy, bpm, repeat, rate);
            }
          }
        }
      }
    } finally { capture.close(); }
  }
  const summary = [...new Set(trials.map(t => `${t.strategy}/${t.bpm}`))].map(cell => {
    const group = trials.filter(t => `${t.strategy}/${t.bpm}` === cell), measures = group.flatMap(t => t.perPhrase);
    return { cell, trials: group.length, hapMissing: measures.reduce((s, p) => s + p.haps.missing.length, 0),
      hapUnexpected: measures.reduce((s, p) => s + p.haps.unexpected.length, 0), pcmMissing: measures.reduce((s, p) => s + p.pcm.missing.length, 0),
      pcmUnexpected: measures.reduce((s, p) => s + p.pcm.unexpected.length, 0), pitchMismatches: measures.reduce((s, p) => s + p.pitchMismatches.length, 0),
      cycleErrorMax: Math.max(...measures.map(p => p.cycles.errorMs.max)) / 1000,
      hapErrorMaxMs: Math.max(...measures.map(p => p.haps.errorMs.max)), pcmErrorMaxMs: Math.max(...measures.map(p => p.pcm.errorMs.max)),
      phaseResidualMax: Math.max(0, ...group.flatMap(t => t.swaps.filter(s => !s.autostart).map(s => Math.abs(s.phaseResidual)))),
      swapMs: stats(group.flatMap(t => t.swaps.filter(s => !s.autostart).map(s => s.ms))),
      changeDelayMs: stats(group.flatMap(t => t.changes.filter(c => c.changeDelayMs !== undefined).map(c => c.changeDelayMs))),
      uiBackwards: group.reduce((s, t) => s + t.ui.backwards, 0),
      schedulerSkipsInWindow: group.reduce((s, t) => s + t.schedulerSkips.filter(k => k.audioTime >= t.window.startAudioTime - .3 && k.audioTime < t.window.endAudioTime).length, 0) };
  });
  const checks = [check('Fresh 64/256/512-note service builds completed', window.looperPartial.benchmark.length === 3)];
  if (!costOnly) {
    checks.push(
      check('Requested cells completed', trials.length === (smoke ? only === 'expression' ? 2 : 1 : only ? only === 'expression' ? 4 : only === 'cold-join' ? Math.min(2, repeats) * 2 : repeats * 2 : repeats * 10 + 4 + Math.min(2, repeats) * 2)),
      check('Zero missing or extra submitted haps and PCM attacks', summary.every(s => !s.hapMissing && !s.hapUnexpected && !s.pcmMissing && !s.pcmUnexpected)),
      check('Independent offset and rate grid retained', trials.every(t => t.perPhrase.every(p => !p.cycles.missing.length && !p.cycles.unexpected.length)) && summary.every(s => s.cycleErrorMax < 1e-6)),
      check('Cached replacements have zero cycle residual', summary.every(s => s.phaseResidualMax < 1e-5)),
      check('Pinned and bent pitches reach real output', summary.every(s => !s.pitchMismatches)),
      check('UIBeat generation and anchored cursor remain continuous', trials.every(t => t.ui.frames > 0 && t.ui.generations.length === 1 && !t.ui.backwards)),
      check('Real Stage output balances and reports no evaluation errors', trials.every(t => t.events.length > 0 && !t.output.errors.length && t.output.played === t.events.length && t.output.released === t.output.played && !t.output.activeStageNotes)),
      check('Stage identity, pitch and shared key/mode follow submitted haps', trials.every(t => !t.output.identityMismatches.length)),
      check('One scheduler owner and clean disposal per cell', trials.every(t => t.singleton === 1 && !t.cleanup.schedulerStarted && !t.cleanup.activeTransports && !t.cleanup.activeStageNotes && t.cleanup.beatStatus === 'idle')),
    );
    if (trials.some(t => t.strategy === 'tempo')) checks.push(check('Tempo changes use the committed frontier anchor',
      trials.filter(t => t.strategy === 'tempo').every(t => t.changes.filter(c => c.name === 'tempo').every(c => Math.abs(c.anchorResidual) < 1e-9 && Math.abs(c.frontierResidual) < 1e-9))));
    if (trials.some(t => t.held)) checks.push(check('Held gates survive joins and leaves',
      trials.filter(t => t.held).every(t => t.held.submittedOnsets === 1 && t.held.pcmOnsets.length === 1 && !t.held.sustainGaps.length)));
    if (trials.some(t => t.expression)) checks.push(check('Captured expression stretches into real output',
      trials.filter(t => t.expression).every(t => !t.expression.deviations.length)));
    if (trials.some(t => t.coldPreparation)) checks.push(check('Cold 512-note preparation yields while surviving audio keeps every attack',
      trials.filter(t => t.coldPreparation).every(t => t.coldPreparation.yields > 0 && t.coldPreparation.sliceMs.count > 1 &&
        t.perPhrase.every(p => !p.haps.missing.length && !p.haps.unexpected.length && !p.pcm.missing.length && !p.pcm.unexpected.length))));
  }
  checks.push(check('No uncaught browser errors or rejections', !browserErrors.length));
  const context = getAudioContext();
  return { environment: { userAgent: navigator.userAgent, sampleRate: context.sampleRate, baseLatency: context.baseLatency, outputLatency: context.outputLatency },
    configuration: { smoke, only, repeats, costOnly, hapToleranceSeconds: .003, pcmToleranceSeconds: .012,
      pcmThreshold: .0005, pcmSilenceSeconds: .01, scope: 'Desktop synth render graph; no physical latency or phone claims',
      outputCapture: 'Read-only onOutput observer after real emotitoneStrudelOutput invocation',
      tailPolicy: 'Submitted gates and release tails finish; stop clears production visuals',
      buildTiming: 'Fresh note data; sync and async preparation only, no parsing or export; three warmups and twelve measured builds per size; async 2 ms slices' },
    fixtures: phrases(), benchmark: window.looperPartial.benchmark, summary, checks, trials, browserErrors };
};
