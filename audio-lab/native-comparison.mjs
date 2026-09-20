/** Bounded actual-app comparison. Horizons are an explicit Vite laboratory
 * transform, not a shipped product setting. Defaults remain untouched. */
import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
export function nativeComparisonPlugin(value) {
  if (value === undefined) return null;
  const horizon = Number(value);
  if (![400, 1200, 2000].includes(horizon)) throw new Error('LAB_NATIVE_LOOKAHEAD_MS must be 400, 1200 or 2000');
  return { name: 'lab-native-lookahead', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('/src/audio/native/renderer.ts') && !id.endsWith('/audio-lab/reference/native/renderer.ts')) return;
    const old = 'export const NATIVE_LOOKAHEAD_MS = 400';
    if (!code.includes(old)) throw new Error('Native renderer constant changed; audit the comparison transform');
    return { code: code.replace(old, `export const NATIVE_LOOKAHEAD_MS = ${horizon}`), map: null };
  } };
}

// Declared before any measurements. These are bounded warm desktop-lab gates,
// not a claim about acceptable latency on every device or physical output.
export const comparisonLimits = Object.freeze({ inputToPcmMs: 50, synchronousOperationMs: 25,
  retainedVoiceNodes: 256, releaseTailSeconds: .1, missingGridWindows: 0, minimumPulseRms: .001,
  maxExternalEventLoopSlipMs: 250, maxChordSubmissionSpanMs: 150 });

// Declared after diagnosing the old group, before exercising its repair. The
// original receipts/limits remain unchanged; this is an additional acceptance
// requirement for notification ownership and responsiveness.
export const targetedDeliveryLimits = Object.freeze({ postReleaseSettlementMs: 1000, tailAfterReleaseMs: 100 });

export async function exerciseNativeComparison({ call, evaluate, delay }) {
  const cases = [], checks = [];
  const fullDeliveryAcceptance = process.env.LAB_NATIVE_TARGETED !== '1' && process.env.LAB_NATIVE_PROFILE !== '1';
  // Observe for at least 1200ms so the existing 1000ms acceptance boundary can
  // be evaluated. A notification in the extra 200ms still fails that boundary.
  const deliveryObservationMs = targetedDeliveryLimits.postReleaseSettlementMs + 200;
  let worstExternalSlip = 0, previous = performance.now();
  const external = setInterval(() => { const now = performance.now(); worstExternalSlip = Math.max(worstExternalSlip, now - previous - 100); previous = now; }, 100);
  const key = (type, letter) => call('Input.dispatchKeyEvent', { type, key: letter.toLowerCase(), code: `Key${letter}`, windowsVirtualKeyCode: letter.charCodeAt(0) });
  const press = letters => Promise.all([...letters].map(letter => key('keyDown', letter)));
  const release = letters => Promise.all([...letters].map(letter => key('keyUp', letter)));
  const begin = async (bpm, mode = 'repeat:16', stall = null) => {
    // Each matched case starts at the same empty recording desk. Pattern-growth
    // performance has its own full-history harness; do not accumulate different
    // history lengths if an earlier renderer's run took longer.
    await evaluate("document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('patterns').clearAllNotes()");
    await evaluate(`window.__uiVisual.config.codeStrip.bpm=${bpm};window.__uiMusic.setPlayMode(${JSON.stringify(mode)});window.__audioUiLab.configure(${JSON.stringify({ stall })});document.activeElement?.blur()`);
    await delay(1400);
    await evaluate('window.__nativeComparison.reset();window.__audioUiLab.begin()', true);
  };
  const verifyCompleteDelivery = async row => {
    const { measured, pcm, name } = row;
    const finalInput = measured.input.filter(event => event.type === 'keyup').at(-1);
    const expectedOwners = measured.operations.filter(operation => operation.method === 'press').map(operation => operation.args[0]);
    const ownerIds = measured.endedOwners.map(owner => owner.ownerId);
    const active = new Map(), completed = new Map();
    let pairsOrdered = true;
    for (const event of measured.lifecycle) {
      if (event.phase === 'attack') {
        if (active.has(event.noteId) || completed.has(event.noteId)) pairsOrdered = false;
        active.set(event.noteId, event);
      } else {
        const attack = active.get(event.noteId);
        if (!attack || attack.ownerId !== event.ownerId || attack.pitch !== event.pitch || event.at < attack.at) pairsOrdered = false;
        active.delete(event.noteId); completed.set(event.noteId, event);
      }
    }
    const edgeIdentity = event => [event.phase, event.noteId, event.ownerId, event.pitch, event.at];
    const arrivals = pcm.trace.filter(event => event.type === 'worklet-event');
    const fifoMatchesArrivals = JSON.stringify(arrivals.map(edgeIdentity)) === JSON.stringify(measured.lifecycle.map(edgeIdentity));
    const lastNotificationAt = Math.max(...measured.lifecycle.map(event => event.deliveredAt), ...measured.endedOwners.map(owner => owner.deliveredAt));
    const settlementMs = lastNotificationAt - finalInput.time;
    const recording = await evaluate(`(()=>{const store=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('patterns');const notes=store.exportNotes();return {recordedNotes:notes.length,activeMusicNotes:window.__uiMusic.activeNotes.size,validTimeline:notes.every(note=>Number.isFinite(note.pressTime)&&Number.isFinite(note.releaseTime)&&note.releaseTime>=note.pressTime)}})()`);
    row.deliveryAcceptance = { limits: targetedDeliveryLimits, minimumObservationMs: deliveryObservationMs,
      expectedOwners, endedOwners: ownerIds, completedNotes: completed.size, pairsOrdered, stillActive: active.size,
      fifoMatchesArrivals, finalInput, lastNotificationAt, settlementMs, recording };
    checks.push({ name: `${name}: lifecycle pairs are complete, unique and ordered`, passed: pairsOrdered && active.size === 0 && completed.size > 0 });
    if (process.env.LAB_UI_BACKEND !== 'native') checks.push({ name: `${name}: every arriving worklet lifecycle edge is delivered in exact FIFO order`, passed: fifoMatchesArrivals });
    checks.push({ name: `${name}: every pressed owner closes exactly once`, passed: expectedOwners.length > 0 && new Set(expectedOwners).size === expectedOwners.length && ownerIds.length === expectedOwners.length && expectedOwners.every(owner => ownerIds.filter(id => id === owner).length === 1) });
    checks.push({ name: `${name}: final lifecycle and owner notifications settle within1000ms of final trusted release`, passed: settlementMs >= 0 && settlementMs <= targetedDeliveryLimits.postReleaseSettlementMs });
    checks.push({ name: `${name}: recording retains every completed note and leaves no active musical notes`, passed: recording.recordedNotes === completed.size && recording.activeMusicNotes === 0 && recording.validTimeline });
  };
  const finish = async (name, options = {}) => {
    const pcm = await evaluate('window.__audioUiLab.finish()', true);
    const measured = await evaluate(`window.__nativeComparison.finish(${JSON.stringify({ ...options, anchor: pcm.onsets[0] })})`);
    const row = { name, pcm, measured }; cases.push(row);
    console.log('Native comparison:', JSON.stringify({ name, onsetMs: pcm.inputToPcmMs, missing: measured.grid.filter(x => !(x.rms > comparisonLimits.minimumPulseRms)).length,
      peakNodes: measured.peakRetainedNodes, retained: measured.retainedNodes, maxOperationMs: Math.max(0, ...measured.operations.map(x => x.duration)), tail: measured.tail?.peak }));
    checks.push({ name: `${name}: actual PCM, trusted input, cleanup and declared operation bounds`, passed: pcm.finitePcm && pcm.peak > .001 && pcm.final100msPeak < .001
      && measured.input.length > 0 && measured.input.every(x => x.trusted)
      && pcm.inputToPcmMs >= 0 && pcm.inputToPcmMs <= comparisonLimits.inputToPcmMs
      && measured.grid.every(x => x.rms > comparisonLimits.minimumPulseRms)
      && measured.peakRetainedNodes <= comparisonLimits.retainedVoiceNodes && measured.retainedNodes === 0
      && measured.operations.every(x => x.duration <= comparisonLimits.synchronousOperationMs)
      && (!measured.tail || measured.tail.samples > 0 && measured.tail.peak < .001) });
    checks.push({ name: `${name}: PCM capture includes every delivered release`, passed: measured.input.filter(x => x.type === 'keyup').every(x => x.audioTime + .1 < measured.captureEndAudioTime) });
    if (fullDeliveryAcceptance) await verifyCompleteDelivery(row);
    return row;
  };
  try {
    await evaluate('window.__nativeComparison.install()', true);
    if (process.env.LAB_NATIVE_FAST_CHORD === '1') {
      const expectedArticulation = await evaluate("import('/src/services/liveArticulation.ts').then(module=>module.getLiveArticulation('piano'))", true);
      await begin(220, 'together');
      for (let i = 0; i < 8; i++) { await press('ADF'); await delay(65); await release('ADF'); await delay(45); }
      await delay(1500);
      const row = await finish('ARTICULATION CONTRACT: eight fast three-key Together chords', { inspectTogetherArticulation: true });
      const observed = row.measured.articulation;
      checks.push({ name: 'Prepared piano articulation matches the unchanged200ms source contract', passed: observed.prepared.release === expectedArticulation.release && expectedArticulation.release === .2 });
      checks.push({ name: 'Fast chord articulation retains exactly24 notes and owners with no resumed attack after final release', passed: row.deliveryAcceptance.completedNotes === 24 && row.deliveryAcceptance.endedOwners.length === 24 && !row.measured.lifecycle.some(event => event.phase === 'attack' && event.at > observed.finalReleaseAudioTime) });
      checks.push({ name: 'External runner avoids severe host contention', passed: worstExternalSlip <= comparisonLimits.maxExternalEventLoopSlipMs });
      return { limits: comparisonLimits, targetedDeliveryLimits, fastChordOnly: true, expectedArticulation,
        cases, checks, worstExternalEventLoopSlipMs: worstExternalSlip,
        scope: 'One fixture-correction follow-up. Together silence is measured after actual audio release edge plus the observed prepared instrument release and one128-frame quantum. The old keyup+100ms subwindow is informational; prior failed receipts remain unchanged.' };
    }
    if (process.env.LAB_NATIVE_TARGETED === '1') {
      await begin(220, 'repeat:16', { after: 800, duration: 650 });
      await press('ADF');
      await delay(3150);
      await release('ADF');
      // Use the captured trusted keyup clock, not an extra CDP clock query that
      // can itself queue behind all application work and overshoot PCM storage.
      await delay(targetedDeliveryLimits.postReleaseSettlementMs + 200);
      const row = await finish('TARGETED DELIVERY: 220 BPM three-key repeat through 650ms stall', {
        stepSeconds: 60 / 220 / 4, tailAfterFinalInputReleaseMs: targetedDeliveryLimits.tailAfterReleaseMs,
      });
      const measured = row.measured;
      const finalInput = measured.input.filter(event => event.type === 'keyup').at(-1);
      const presses = measured.operations.filter(operation => operation.method === 'press');
      const expectedOwners = presses.map(operation => operation.args[0]);
      const expectedPitches = presses.flatMap(operation => operation.args[1].map(note => note.pitch));
      const active = new Map(), completed = new Map();
      let pairsOrdered = true;
      for (const event of measured.lifecycle) {
        if (event.phase === 'attack') {
          if (active.has(event.noteId) || completed.has(event.noteId)) pairsOrdered = false;
          active.set(event.noteId, event);
        } else {
          const attack = active.get(event.noteId);
          if (!attack || attack.ownerId !== event.ownerId || attack.pitch !== event.pitch || event.at < attack.at) pairsOrdered = false;
          active.delete(event.noteId); completed.set(event.noteId, event);
        }
      }
      const attacks = measured.lifecycle.filter(event => event.phase === 'attack');
      const firstAt = attacks[0]?.at;
      const finalDownAt = Math.max(...measured.input.filter(event => event.type === 'keydown').map(event => event.audioTime));
      const step = 60 / 220 / 4;
      const beatGroups = new Map();
      for (const event of attacks) {
        const beat = Math.round((event.at - firstAt) / step);
        const pitches = beatGroups.get(beat) ?? [];
        pitches.push(event.pitch); beatGroups.set(beat, pitches);
      }
      const expectedBeatPitches = [];
      for (let beat = Math.ceil((finalDownAt - firstAt + .02) / step); beat * step < 2.95; beat++) {
        const actual = beatGroups.get(beat) ?? [];
        expectedBeatPitches.push({ beat, actual, passed: actual.length === expectedPitches.length && expectedPitches.every(pitch => actual.filter(value => value === pitch).length === 1) });
      }
      const ownerIds = measured.endedOwners.map(owner => owner.ownerId);
      const lastNotificationAt = Math.max(...measured.lifecycle.map(event => event.deliveredAt), ...measured.endedOwners.map(owner => owner.deliveredAt));
      const settlementMs = lastNotificationAt - finalInput.time;
      const recording = await evaluate(`(()=>{const store=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('patterns');const notes=store.exportNotes();return {recordedNotes:notes.length,activeMusicNotes:window.__uiMusic.activeNotes.size,validTimeline:notes.every(note=>Number.isFinite(note.pressTime)&&Number.isFinite(note.releaseTime)&&note.releaseTime>=note.pressTime)}})()`);
      row.deliveryAcceptance = { limits: targetedDeliveryLimits, expectedOwners, endedOwners: ownerIds,
        expectedBeatPitches, completedNotes: completed.size, pairsOrdered, stillActive: active.size,
        finalInput, lastNotificationAt, settlementMs, recording };
      checks.push({ name: 'Targeted lifecycle pairs are complete, unique and ordered', passed: pairsOrdered && active.size === 0 && completed.size > 0 });
      checks.push({ name: 'Targeted repeated chord preserves every pitch on every fully held beat', passed: expectedBeatPitches.length > 30 && expectedBeatPitches.every(beat => beat.passed) });
      checks.push({ name: 'Targeted owner lifetimes close exactly once', passed: expectedOwners.length === 3 && ownerIds.length === 3 && expectedOwners.every(owner => ownerIds.filter(id => id === owner).length === 1) });
      checks.push({ name: 'Targeted final lifecycle and owner notifications settle within1000ms of final trusted release', passed: settlementMs >= 0 && settlementMs <= targetedDeliveryLimits.postReleaseSettlementMs });
      checks.push({ name: 'Targeted recording retains every completed note with a valid timeline and no active musical notes', passed: recording.recordedNotes === completed.size && recording.activeMusicNotes === 0 && recording.validTimeline });
      checks.push({ name: 'Targeted external runner avoids severe host contention', passed: worstExternalSlip <= comparisonLimits.maxExternalEventLoopSlipMs });
      return { limits: comparisonLimits, targetedDeliveryLimits, targetedOnly: true, cases, checks,
        worstExternalEventLoopSlipMs: worstExternalSlip,
        scope: 'One unprofiled repair acceptance case; actual release-derived PCM tail plus exact lifecycle, owner and recording retention. Does not replace the original four-way receipts.' };
    }
    if (process.env.LAB_NATIVE_PROFILE === '1') {
      // Diagnostic only: one dense case, after normal instrument preparation.
      // Profiled timings are never substituted for the matched timing receipts.
      await begin(220, 'repeat:16', { after: 800, duration: 650 });
      await call('Profiler.enable');
      await call('Profiler.setSamplingInterval', { interval: 1000 });
      await call('Profiler.start');
      await press('ADF');
      await delay(3150);
      await release('ADF');
      const releasedAt = await evaluate('window.__uiAudio.getAudioContext().currentTime');
      await delay(500);
      await finish('DIAGNOSTIC PROFILE: 220 BPM three-key repeat through 650ms stall', { stepSeconds: 60 / 220 / 4, tailAfter: releasedAt + .1 });
      const { profile } = await call('Profiler.stop');
      const profilePath = process.env.LAB_NATIVE_PROFILE_PATH || '/tmp/native-comparison.cpuprofile.gz';
      await writeFile(profilePath, gzipSync(JSON.stringify(profile)));
      await call('Profiler.disable');
      return { limits: comparisonLimits, diagnosticOnly: true, profilePath, cases, checks,
        worstExternalEventLoopSlipMs: worstExternalSlip,
        scope: 'One sampled CPU diagnostic after instrument preparation; excluded from matched timing comparison.' };
    }
    for (const bpm of [60, 220]) for (const stallDuration of [300, 650]) {
      const letters = bpm === 220 ? 'ADF' : 'A';
      await begin(bpm, 'repeat:16', { after: 800, duration: stallDuration });
      await press(letters);
      await delay(3150);
      await release(letters);
      await delay(deliveryObservationMs);
      const row = await finish(`${bpm} BPM ${letters.length}-key repeat through ${stallDuration}ms stall`, { stepSeconds: 60 / bpm / 4, tailAfterFinalInputReleaseMs: targetedDeliveryLimits.tailAfterReleaseMs });
      const presses = row.measured.input.filter(x => x.type === 'keydown');
      row.chordSubmissionSpanMs = presses.at(-1).time - presses[0].time;
      checks.push({ name: `${bpm} BPM ${stallDuration}ms: intended chord arrives within declared gesture window`, passed: row.chordSubmissionSpanMs <= comparisonLimits.maxChordSubmissionSpanMs });
    }
    await begin(220);
    await press('ADF'); await delay(20); await release('ADF');
    await delay(2300);
    await finish('220 BPM three-key immediate release cancels the full future queue', { tailAfterFinalInputReleaseMs: targetedDeliveryLimits.tailAfterReleaseMs });

    await begin(220, 'arp-up:16');
    await press('ADF'); await delay(350); await release('D'); await press('G');
    const changedAt = await evaluate('window.__uiAudio.getAudioContext().currentTime');
    await delay(350);
    await evaluate('window.__uiVisual.config.codeStrip.bpm=120');
    await delay(1600); await release('AFG'); await delay(deliveryObservationMs);
    const edited = await finish('Three-key arpeggio chord revision followed by 220-to-120 BPM edit', { tailAfterFinalInputReleaseMs: targetedDeliveryLimits.tailAfterReleaseMs });
    edited.changedAt = changedAt;
    const secondPress = edited.measured.operations.filter(x => x.method === 'press')[1];
    const removed = edited.measured.operations.find(x => x.method === 'release' && x.args[0] === secondPress?.args[0]);
    const removedPitch = secondPress?.args[1]?.[0]?.pitch;
    checks.push({ name: 'Removed arpeggio pitch has no attack after its delivered release', passed: !!removed && removedPitch !== undefined && !edited.measured.lifecycle.some(x => x.phase === 'attack' && x.pitch === removedPitch && x.at > removed.audioTime + .003) });
    const tempoChange = edited.measured.operations.find(x => x.method === 'configure' && x.args[0].bpm === 120);
    const afterTempo = edited.measured.lifecycle.filter(x => x.phase === 'attack' && x.at > (tempoChange?.audioTime ?? Infinity) + .2);
    edited.afterTempoIntervals = afterTempo.slice(1).map((x, index) => x.at - afterTempo[index].at);
    checks.push({ name: 'Tempo edit produces the new 125ms arpeggio grid after the preserved boundary', passed: !!tempoChange && edited.afterTempoIntervals.length >= 5 && edited.afterTempoIntervals.every(x => Math.abs(x - .125) < .003) });

    await begin(220, 'together');
    for (let i = 0; i < 8; i++) { await press('ADF'); await delay(65); await release('ADF'); await delay(45); }
    await delay(1500);
    await finish('Eight fast three-key chords through trusted keyboard input', { tailAfterFinalInputReleaseMs: targetedDeliveryLimits.tailAfterReleaseMs });
    return { limits: comparisonLimits, targetedDeliveryLimits, minimumDeliveryObservationMs: deliveryObservationMs, horizonTransform: process.env.LAB_NATIVE_LOOKAHEAD_MS ? Number(process.env.LAB_NATIVE_LOOKAHEAD_MS) : null,
      scope: 'Trusted actual application piano input, PCM grid windows beyond prior-pulse release tail; existing ui-run warm input trials complement these cases. Node counts include source and gain separately. External event-loop slip diagnoses severe host contention; browser long tasks retain application stalls.',
      cases, worstExternalEventLoopSlipMs: worstExternalSlip,
      checks: [...checks, { name: 'External runner avoids severe host contention', passed: worstExternalSlip <= comparisonLimits.maxExternalEventLoopSlipMs }] };
  } finally { clearInterval(external); }
}
