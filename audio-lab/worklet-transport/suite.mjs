// SPIKE (BJS-484, not for merge): #140's Looper receipt checks, run against the
// audio-thread transport in the production live worklet. No Strudel, no
// superdough: one AudioContext, the real processor module, per-member buses.
import processorUrl from '@/audio/live/processor.ts?worker&url';
import { Note } from '@tonaljs/tonal';
import { defaultPatterns } from '@/data/patterns';
import { getScaleForMode } from '@/data/scales';
import { UIBeatClock } from '@/composables/useUIBeat';

const browserErrors = [];
window.addEventListener('error', e => browserErrors.push({ type: 'error', message: e.message }));
window.addEventListener('unhandledrejection', e => browserErrors.push({ type: 'unhandledrejection', message: String(e.reason) }));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: values.reduce((a, b) => a + b, 0) / (values.length || 1),
    max: sorted.at(-1) ?? 0, p95: sorted[Math.floor((sorted.length - 1) * .95)] ?? 0 };
};
function match(expected, actual, tolerance) {
  const remaining = [...actual], errors = [], missing = [];
  for (const wanted of expected) {
    const i = remaining.findIndex(value => Math.abs(value - wanted) <= tolerance);
    if (i < 0) missing.push(wanted);
    else errors.push(Math.abs(remaining.splice(i, 1)[0] - wanted) * 1000);
  }
  return { expected: expected.length, actual: actual.length, missing, unexpected: remaining, errorMs: stats(errors) };
}
async function until(test, label, timeoutMs = 30000) {
  const end = performance.now() + timeoutMs;
  while (!test()) {
    if (performance.now() > end) throw Error(`Timed out: ${label}`);
    await sleep(4);
  }
}
const check = (name, passed, detail) => ({ name, passed, ...(detail === undefined ? {} : { detail }) });

// #140's fixtures: the first four library melodies at independent 1/2/3/4-bar lengths.
function phrases() {
  return [1, 2, 3, 4].map((bars, i) => {
    const source = defaultPatterns[i];
    return { id: `p${i}`, name: `${source.name} (${bars} bars)`,
      context: { key: source.key, mode: source.mode, octave: 4, bpm: 120 },
      duration: bars * 2000,
      notes: Array.from({ length: bars * 8 }, (_, j) => ({ ...source.notes[j % source.notes.length],
        id: `lab-${i}-${j}`, pressTime: j * 250, releaseTime: j * 250 + 100, duration: 100 })) };
  });
}
// #140's arithmetic oracle, unchanged: raw notes, never the transport's table.
function expectedNotes(phrase, settings, begin, end) {
  const { rate = 1, offsetBars = 0 } = settings;
  const barMs = 240000 / phrase.context.bpm;
  const origin = Math.min(...phrase.notes.map(n => n.pressTime));
  const bars = Math.max(1, Math.ceil(Math.max(phrase.duration,
    ...phrase.notes.map(n => n.pressTime - origin + n.duration)) / barMs));
  const period = bars / rate, events = [];
  for (let loop = Math.floor((begin - offsetBars) / period) - 1; loop <= Math.ceil((end - offsetBars) / period); loop++) {
    for (const note of phrase.notes) {
      const cycle = offsetBars + loop * period + (note.pressTime - origin) / barMs / rate;
      if (cycle >= begin - 1e-8 && cycle < end - 1e-8) events.push({ cycle, note });
    }
  }
  return events.sort((a, b) => a.cycle - b.cycle);
}
// Mode bending (#140's policy for in-scale fixtures). Shared by the table and
// the oracle, so this checks the transport swaps tables at the bar, not the remap.
function bentMidi(phrase, note, pinned, key, mode) {
  if (pinned) return Note.midi(note.note);
  const oldScale = getScaleForMode(phrase.context.mode), nextScale = getScaleForMode(mode);
  const distance = Note.midi(note.note) - Note.midi(`${phrase.context.key}${phrase.context.octave}`);
  const octave = Math.floor(distance / 12), chroma = distance - octave * 12;
  const degree = oldScale.intervals.indexOf(chroma);
  if (degree < 0) throw Error('Fixture contains a borrowed pitch');
  return Note.midi(`${key}${phrase.context.octave}`) + octave * 12 + nextScale.intervals[Math.min(degree, nextScale.degreeCount - 1)];
}

/** Main-thread member preparation: note data -> event table. No parser, no Pattern. */
function buildMember(phrase, settings, index, view = null) {
  const barMs = 240000 / phrase.context.bpm;
  const origin = Math.min(...phrase.notes.map(n => n.pressTime));
  const lengthBars = Math.max(1, Math.ceil(Math.max(phrase.duration,
    ...phrase.notes.map(n => n.pressTime - origin + n.duration)) / barMs));
  return { id: phrase.id, lengthBars, offsetBars: settings.offsetBars ?? 0, rate: settings.rate ?? 1,
    muted: settings.muted ?? false, bus: index + 1,
    notes: phrase.notes.map(n => ({ begin: (n.pressTime - origin) / barMs, duration: n.duration / barMs,
      pitch: view ? bentMidi(phrase, n, settings.pinned, view.key, view.mode) : Note.midi(n.note),
      instrumentId: 'sine', noteId: n.id })) };
}

async function createEngine() {
  const context = new AudioContext({ latencyHint: 'interactive' });
  await context.resume();
  await context.audioWorklet.addModule(processorUrl);
  await context.audioWorklet.addModule('/audio-lab/processors.js');
  const node = new AudioWorkletNode(context, 'emotitone-live', { numberOfInputs: 0, numberOfOutputs: 5,
    outputChannelCount: [2, 2, 2, 2, 2], processorOptions: { instanceId: 'spike' } });
  const silent = context.createGain(); silent.gain.value = 0; silent.connect(context.destination);
  node.connect(silent, 0, 0);
  const captures = Array.from({ length: 4 }, (_, i) => {
    const capture = new AudioWorkletNode(context, 'lab-capture');
    node.connect(capture, i + 1, 0); capture.connect(silent);
    return capture;
  });
  let requestId = 0, anchors = [], listener = null;
  const waiters = new Map();
  node.port.onmessage = ({ data }) => {
    const receivedAt = context.currentTime, receivedMs = performance.now();
    for (const response of Array.isArray(data) ? data : [data]) {
      if (response.type === 'transport-anchor') anchors = response.anchors;
      if (response.type === 'transport-applied' || response.type === 'prepared') {
        waiters.get(response.requestId)?.({ ...response, receivedAt, receivedMs }); waiters.delete(response.requestId);
      }
      listener?.(response, receivedAt);
    }
  };
  const post = (command) => {
    const id = ++requestId, requestedAt = context.currentTime, requestedMs = performance.now();
    const applied = new Promise(resolve => waiters.set(id, resolve));
    node.port.postMessage({ ...command, requestId: id });
    return { requestId: id, requestedAt, requestedMs, applied };
  };
  await post({ type: 'prepare', instrument: { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
    gain: .24, attack: .001, decay: .01, sustain: .5, release: .01 } }).applied;
  function request(node, message, type) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error(`Capture ${type} timeout`)), 5000);
      const handler = ({ data }) => {
        if (data.type !== type) return;
        clearTimeout(timeout); node.port.removeEventListener('message', handler); resolve(data);
      };
      node.port.addEventListener('message', handler); node.port.start(); node.port.postMessage(message);
    });
  }
  return {
    context, post,
    get anchors() { return anchors; },
    listen(fn) { listener = fn; },
    barAt(time) {
      const frame = time * context.sampleRate;
      const anchor = [...anchors].reverse().find(a => a.frame <= frame + 1e-6) ?? anchors[0];
      return anchor ? anchor.bar + (frame - anchor.frame) * anchor.bpm / 240 / context.sampleRate : 0;
    },
    timeAt(bar, list = anchors) {
      const anchor = [...list].reverse().find(a => a.bar <= bar + 1e-9) ?? list[0];
      return (anchor.frame + (bar - anchor.bar) * 240 * context.sampleRate / anchor.bpm) / context.sampleRate;
    },
    async captureBegin() { await Promise.all(captures.map(c => request(c, 'start', 'started'))); },
    async captureEnd() {
      return Promise.all(captures.map(async (c, i) => {
        const { pcm, startFrame } = await request(c, 'stop', 'pcm');
        const onsets = [], silentRuns = []; let silent = Infinity;
        for (let frame = 0; frame < pcm.length; frame++) {
          if (Math.abs(pcm[frame]) < .0005) silent++;
          else {
            if (silent >= context.sampleRate * .01) {
              onsets.push((startFrame + frame) / context.sampleRate);
              if (Number.isFinite(silent)) silentRuns.push([(startFrame + frame - silent) / context.sampleRate, (startFrame + frame) / context.sampleRate]);
            }
            silent = 0;
          }
        }
        if (Number.isFinite(silent) && silent >= context.sampleRate * .01)
          silentRuns.push([(startFrame + pcm.length - silent) / context.sampleRate, (startFrame + pcm.length) / context.sampleRate]);
        return { phraseId: `p${i}`, startFrame, frames: pcm.length, onsets, silentRuns };
      }));
    },
  };
}

const settings = [{}, { offsetBars: .375, pinned: true }, { rate: .5 }, { rate: 2 }];

async function trial(engine, inputs, strategy, bpm, repetition) {
  const { context, post } = engine;
  const events = [], changes = [], frames = [], stalls = [];
  let mirror = new Map(), soloId = null, view = { key: 'C', mode: 'major' }, segments = [], coldBuild;
  const pendingChanges = new Map();
  const beat = new UIBeatClock({ observeEnvironment: false, documentVisible: () => true, reducedMotion: () => false });
  const unsubscribe = beat.subscribe(s => { if (s.status === 'running' && s.barPosition !== null) frames.push({ audioTime: context.currentTime, ...s }); });
  let generation = null, lastBpm = bpm;
  const ticker = setInterval(() => {
    if (generation === null || !engine.anchors.length) return;
    const now = context.currentTime, active = [...engine.anchors].reverse().find(a => a.frame <= now * context.sampleRate) ?? engine.anchors[0];
    if (active.bpm !== lastBpm) { lastBpm = active.bpm; beat.retime(generation, active.bpm); }
    const bar = engine.barAt(now);
    beat.publish(generation, { rawPosition: bar, barPosition: bar });
  }, 16);
  const recordSegment = bar => {
    while (segments.length && segments.at(-1).from >= bar - 1e-9) segments.pop();
    if (segments.length) segments.at(-1).to = bar;
    segments.push({ from: bar, to: null, soloId, key: view.key, mode: view.mode,
      members: [...mirror.values()].map(({ id, offsetBars, rate, muted, pinned }) => ({ phraseId: id, offsetBars, rate, muted, pinned })) });
  };
  engine.listen((response, receivedAt) => {
    if (response.type === 'event' && response.event.memberId) events.push({ ...response.event, receivedAt });
    if (response.type === 'transport-applied' && pendingChanges.has(response.requestId)) {
      const { name, apply } = pendingChanges.get(response.requestId);
      apply();
      changes.push({ name, ...response });
      if (response.appliedBar !== null) recordSegment(response.appliedBar);
    }
  });
  // A change mirrors itself into the oracle only once the worklet says when it applied.
  const change = (name, transportChange, boundary, apply) => {
    const posted = post({ type: 'transport-change', change: transportChange, boundary });
    pendingChanges.set(posted.requestId, { name, apply });
    return posted.applied.then(applied => {
      const entry = changes.find(c => c.requestId === posted.requestId);
      Object.assign(entry, { requestedAt: posted.requestedAt, requestedMs: posted.requestedMs,
        changeDelayMs: (applied.appliedFrame / context.sampleRate - posted.requestedAt) * 1000,
        appliedNoticeMs: applied.receivedMs - posted.requestedMs });
      return entry;
    });
  };
  const join = (i, s, boundary = 'immediate', member = buildMember(inputs[i], s, i, s.pinned ? null : view)) =>
    change(`join ${inputs[i].id}`, { type: 'join', member }, boundary, () => mirror.set(inputs[i].id, { ...member, pinned: !!s.pinned }));
  const leave = (id, boundary = 'immediate') => change(`leave ${id}`, { type: 'leave', memberId: id }, boundary, () => mirror.delete(id));
  const update = (id, patch, boundary = 'immediate') => change(`update ${id} ${JSON.stringify(patch)}`, { type: 'update', memberId: id, patch }, boundary,
    () => Object.assign(mirror.get(id), patch));
  const solo = (id, boundary = 'immediate') => change(`solo ${id}`, { type: 'solo', memberId: id }, boundary, () => { soloId = id; });
  const barNow = () => engine.barAt(context.currentTime);
  const wait = bar => until(() => barNow() >= bar, `bar ${bar}`);
  const nextBar = () => ({ bar: Math.floor(barNow()) + 1 });

  const initial = ['tempo', 'mute-solo'].includes(strategy) ? [0, 1, 2, 3] : strategy === 'stall' ? [0, 1] : [0];
  for (const i of initial) await join(i, settings[i]);
  await engine.captureBegin();
  const started = post({ type: 'transport-start', bpm });
  const startResponse = await started.applied;
  generation = beat.arm({ mappingAvailable: true, bpm, meter: { beatsPerBar: 4, beatUnit: 4 } });
  recordSegment(0);
  let finalBar = 2.6;
  try {
    if (strategy === 'direct' || strategy === 'boundary') {
      const boundary = () => strategy === 'direct' ? 'immediate' : nextBar();
      await wait(.53 + repetition * .03);
      await join(1, settings[1], boundary());
      await wait(1.13 + repetition * .03);
      const b = boundary();
      await Promise.all([leave('p1', b), join(2, settings[2], b), join(3, settings[3], b)]);
    } else if (strategy === 'mute-solo') {
      finalBar = 3.4;
      await wait(.53 + repetition * .03);
      await update('p1', { muted: true }, nextBar());
      await wait(1.13 + repetition * .03);
      const b = nextBar();
      await Promise.all([solo('p1', b), update('p1', { muted: false }, b)]);
      await wait(2.13);
      await solo(null, nextBar());
    } else if (strategy === 'tempo') {
      finalBar = 2.7;
      await wait(.53 + repetition * .03);
      // Key/mode bend: unpinned members' tables are rebuilt on the main thread and swapped at the bar.
      const b = nextBar(), nextView = { key: 'D', mode: 'minor' };
      const swaps = [0, 1, 2, 3].map(i => {
        const member = buildMember(inputs[i], settings[i], i, settings[i].pinned ? null : nextView);
        return change(`bend ${inputs[i].id}`, { type: 'join', member }, b, () => { view = nextView; mirror.set(inputs[i].id, { ...member, pinned: !!settings[i].pinned }); });
      });
      await Promise.all(swaps);
      await wait(1.13 + repetition * .03);
      const before = engine.anchors.map(a => ({ ...a })), tb = nextBar(), nextBpm = bpm === 90 ? 150 : 90;
      const expectedFrame = before.at(-1).frame + (tb.bar - before.at(-1).bar) * 240 * context.sampleRate / before.at(-1).bpm;
      const applied = await change('tempo', { type: 'tempo', bpm: nextBpm }, tb, () => {});
      const anchor = engine.anchors.find(a => Math.abs(a.bar - tb.bar) < 1e-9);
      Object.assign(applied, { anchorFrameResidual: anchor ? anchor.frame - expectedFrame : null, anchorBarResidual: anchor ? anchor.bar - tb.bar : null, nextBpm });
    } else if (strategy === 'held') {
      finalBar = 1.8;
      await wait(.4 + repetition * .02);
      await join(1, settings[1]);
      await wait(1.2);
      await leave('p1');
    } else if (strategy === 'cold-join') {
      await wait(.53 + repetition * .03);
      const allocation = performance.now();
      // #140's cold fixture: fresh note objects, 512 notes, 250 ms apart, 160 ms gates.
      const fresh = { ...inputs[1], notes: Array.from({ length: 512 }, (_, j) => ({ ...inputs[1].notes[j % inputs[1].notes.length],
        id: `cold-${j}`, pressTime: j * 250, releaseTime: j * 250 + 160, duration: 160 })), duration: 512 * 250 };
      const buildStarted = performance.now();
      const member = buildMember(fresh, settings[1], 1, null);
      const buildMs = performance.now() - buildStarted;
      inputs[1] = fresh;
      const applied = await join(1, settings[1], 'immediate', member);
      coldBuild = { notes: 512, allocationMs: buildStarted - allocation, buildMs, appliedNoticeMs: applied.appliedNoticeMs, changeDelayMs: applied.changeDelayMs };
      finalBar = Math.max(2.6, barNow() + 1);
    } else if (strategy === 'stall') {
      finalBar = 3.4;
      const busy = ms => { const end = performance.now() + ms; while (performance.now() < end) { /* block the main thread */ } };
      for (const [at, ms] of [[.3, 250], [1.0, 500], [1.9, 1000]]) {
        await wait(at + repetition * .02);
        // A join posted immediately before a long stall still lands on time.
        if (ms === 500) join(2, settings[2]);
        const before = context.currentTime, wall = performance.now();
        busy(ms);
        stalls.push({ requestedMs: ms, wallMs: performance.now() - wall, audioAdvancedMs: (context.currentTime - before) * 1000 });
      }
    } else if (strategy === 'mute-latency') {
      finalBar = 1.6;
      await wait(.5 + repetition * .03);
      await update('p0', { muted: true });
    } else throw Error(`Unknown strategy ${strategy}`);
    await wait(finalBar);
  } finally {
    clearInterval(ticker);
  }
  const snapshotAnchors = engine.anchors.map(a => ({ ...a }));
  const stopped = post({ type: 'transport-stop' }); await stopped.applied;
  beat.stop(generation);
  await sleep(400);
  const pcm = await engine.captureEnd();
  const start = ['held', 'mute-latency'].includes(strategy) ? 0 : .1;
  const end = finalBar - .08;
  const timeAt = bar => engine.timeAt(bar, snapshotAnchors);
  const perPhrase = inputs.map((phrase, i) => {
    const expected = segments.flatMap(seg => {
      const member = seg.members.find(m => m.phraseId === phrase.id);
      if (!member || member.muted || (seg.soloId && seg.soloId !== phrase.id)) return [];
      return expectedNotes(phrase, member, Math.max(start, seg.from), Math.min(end, seg.to ?? end))
        .map(e => ({ cycle: e.cycle, noteId: e.note.id, midi: bentMidi(phrase, e.note, member.pinned, seg.key, seg.mode), t: timeAt(e.cycle) }));
    });
    const actual = events.filter(e => e.phase === 'attack' && e.memberId === phrase.id && e.bar >= start - 1e-8 && e.bar < end - 1e-8);
    const attacks = pcm[i].onsets.filter(t => t >= timeAt(start) - .003 && t < timeAt(end) - 1e-8);
    const pitchMismatches = actual.filter(e => {
      const wanted = expected.find(n => n.noteId === e.sourceNoteId && Math.abs(n.cycle - e.bar) < 1e-6);
      return !wanted || wanted.midi !== e.pitch;
    }).length;
    return { phraseId: phrase.id, expected: expected.length, pitchMismatches,
      events: match(expected.map(e => e.t), actual.map(e => e.at), .003),
      cycles: match(expected.map(e => e.cycle), actual.map(e => e.bar), 1e-6),
      pcm: match(expected.map(e => e.t), attacks, .012) };
  });
  const attacks = events.filter(e => e.phase === 'attack'), releases = new Set(events.filter(e => e.phase === 'release').map(e => e.noteId));
  const ui = { generations: [...new Set(frames.map(f => f.generation))], frames: frames.length,
    backwards: frames.filter((f, i) => i && f.barPosition < frames[i - 1].barPosition - 1e-6).length };
  let held, muteLatency;
  if (strategy === 'held') held = { onsets: pcm[0].onsets.filter(t => t < timeAt(1.8)).length,
    gaps: pcm[0].silentRuns.filter(([a, b]) => a < timeAt(1.5) && b > timeAt(.2)).length,
    submitted: attacks.filter(e => e.memberId === 'p0').length };
  if (strategy === 'mute-latency') {
    const muted = changes.find(c => c.name.startsWith('update p0'));
    const silence = pcm[0].silentRuns.find(([a]) => a >= muted.requestedAt - .05);
    muteLatency = { requestToAppliedMs: muted.changeDelayMs, requestToPcmSilenceMs: silence ? (silence[0] - muted.requestedAt) * 1000 : null,
      appliedToPcmSilenceMs: silence ? (silence[0] - muted.appliedFrame / context.sampleRate) * 1000 : null };
  }
  const result = { strategy, bpm, repetition, startFrame: startResponse.appliedFrame, anchors: snapshotAnchors, segments,
    changes, stalls, coldBuild, held, muteLatency, perPhrase, ui,
    stage: { attacks: attacks.length, releases: releases.size, unbalanced: attacks.filter(e => !releases.has(e.noteId)).length },
    eventArrivalLagMs: stats(attacks.map(e => (e.receivedAt - e.at) * 1000)) };
  unsubscribe(); beat.destroy();
  console.log(`SPIKE ${strategy} ${bpm} #${repetition}: events missing ${perPhrase.reduce((s, p) => s + p.events.missing.length, 0)}, PCM missing ${perPhrase.reduce((s, p) => s + p.pcm.missing.length, 0)}, extra ${perPhrase.reduce((s, p) => s + p.pcm.unexpected.length + p.events.unexpected.length, 0)}`);
  return result;
}

window.runWorkletTransport = async ({ repeats = 3, only = null } = {}) => {
  const engine = await createEngine();
  const trials = [];
  const strategies = only ? [only] : ['direct', 'boundary', 'mute-solo', 'tempo', 'held', 'cold-join', 'stall', 'mute-latency'];
  for (const bpm of [90, 150]) for (const strategy of strategies) {
    const count = ['cold-join', 'stall'].includes(strategy) ? Math.min(2, repeats) : repeats;
    for (let repeat = 0; repeat < count; repeat++) {
      const fixture = structuredClone(phrases());
      if (strategy === 'held' || strategy === 'mute-latency') {
        fixture[0].duration = 4000;
        fixture[0].notes = [{ ...fixture[0].notes[0], pressTime: 0, releaseTime: 3400, duration: 3400 }];
      }
      trials.push(await trial(engine, fixture, strategy, bpm, repeat));
    }
  }
  const cells = [...new Set(trials.map(t => `${t.strategy}/${t.bpm}`))];
  const summary = cells.map(cell => {
    const group = trials.filter(t => `${t.strategy}/${t.bpm}` === cell), m = group.flatMap(t => t.perPhrase);
    const sum = f => m.reduce((s, p) => s + f(p), 0);
    return { cell, trials: group.length, expected: sum(p => p.expected),
      eventMissing: sum(p => p.events.missing.length), eventUnexpected: sum(p => p.events.unexpected.length),
      pcmMissing: sum(p => p.pcm.missing.length), pcmUnexpected: sum(p => p.pcm.unexpected.length),
      pitchMismatches: sum(p => p.pitchMismatches),
      eventErrorMaxMs: Math.max(...m.map(p => p.events.errorMs.max)), pcmErrorMaxMs: Math.max(...m.map(p => p.pcm.errorMs.max)),
      pcmErrorMeanMs: stats(m.filter(p => p.pcm.errorMs.count).map(p => p.pcm.errorMs.mean)).mean,
      changeDelayMs: stats(group.flatMap(t => t.changes.map(c => c.changeDelayMs))),
      appliedNoticeMs: stats(group.flatMap(t => t.changes.map(c => c.appliedNoticeMs))),
      eventArrivalLagMs: stats(group.map(t => t.eventArrivalLagMs.max)),
      uiBackwards: group.reduce((s, t) => s + t.ui.backwards, 0) };
  });
  const by = s => trials.filter(t => t.strategy === s);
  const clean = p => !p.events.missing.length && !p.events.unexpected.length && !p.pcm.missing.length && !p.pcm.unexpected.length;
  const checks = [
    check('Requested cells completed', trials.length === (only ? (['cold-join', 'stall'].includes(only) ? Math.min(2, repeats) : repeats) * 2 : repeats * 12 + Math.min(2, repeats) * 4)),
    check('Zero missing or extra worklet attacks and PCM attacks', summary.every(s => !s.eventMissing && !s.eventUnexpected && !s.pcmMissing && !s.pcmUnexpected)),
    check('Independent offset and rate grid retained', trials.every(t => t.perPhrase.every(p => !p.cycles.missing.length && !p.cycles.unexpected.length))),
    check('Membership changes leave the bar grid continuous (one anchor unless tempo changes)', trials.every(t => t.strategy === 'tempo' ? t.anchors.length === 2 : t.anchors.length === 1)),
    check('Pinned and bent pitches reach real output', summary.every(s => !s.pitchMismatches)),
    check('UIBeat generation and anchored cursor remain continuous', trials.every(t => t.ui.frames > 0 && t.ui.generations.length === 1 && !t.ui.backwards)),
    check('Every attack event has a release event', trials.every(t => t.stage.attacks > 0 && !t.stage.unbalanced)),
  ];
  if (by('tempo').length) checks.push(check('Tempo changes anchor at the exact boundary frame',
    by('tempo').every(t => t.changes.filter(c => c.name === 'tempo').every(c => Math.abs(c.anchorFrameResidual) < 1e-6 && Math.abs(c.anchorBarResidual) < 1e-9))));
  if (by('held').length) checks.push(check('Held gates survive joins and leaves',
    by('held').every(t => t.held.submitted === 1 && t.held.onsets === 1 && !t.held.gaps)));
  if (by('cold-join').length) checks.push(check('Cold 512-note join keeps every surviving attack',
    by('cold-join').every(t => t.perPhrase.every(clean))));
  if (by('stall').length) checks.push(check('Main-thread stalls of 250/500/1000 ms lose no attacks',
    by('stall').every(t => t.perPhrase.every(clean) && t.stalls.length === 3)));
  if (by('mute-latency').length) checks.push(check('Immediate mute is audible within 150 ms of the request (render graph)',
    by('mute-latency').every(t => t.muteLatency.requestToPcmSilenceMs !== null && t.muteLatency.requestToPcmSilenceMs < 150)));
  checks.push(check('No uncaught browser errors or rejections', !browserErrors.length));
  const environment = { userAgent: navigator.userAgent, sampleRate: engine.context.sampleRate,
    baseLatency: engine.context.baseLatency, outputLatency: engine.context.outputLatency, hardwareConcurrency: navigator.hardwareConcurrency };
  await engine.context.close();
  return { environment, configuration: { repeats, only, eventToleranceSeconds: .003, pcmToleranceSeconds: .012,
    pcmThreshold: .0005, pcmSilenceSeconds: .01, scope: 'Desktop headless Chrome render graph on a shared host; no physical latency or phone claims' },
    summary, checks, trials, browserErrors };
};
