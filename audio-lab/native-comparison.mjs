/** Bounded actual-app comparison. Horizons are an explicit Vite laboratory
 * transform, not a shipped product setting. Defaults remain untouched. */
export function nativeComparisonPlugin(value) {
  if (value === undefined) return null;
  const horizon = Number(value);
  if (![400, 1200, 2000].includes(horizon)) throw new Error('LAB_NATIVE_LOOKAHEAD_MS must be 400, 1200 or 2000');
  return { name: 'lab-native-lookahead', enforce: 'pre', transform(code, id) {
    if (!id.endsWith('/src/audio/native/renderer.ts')) return;
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

export async function exerciseNativeComparison({ call, evaluate, delay }) {
  const cases = [], checks = [];
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
    return row;
  };
  try {
    await evaluate('window.__nativeComparison.install()', true);
    for (const bpm of [60, 220]) for (const stallDuration of [300, 650]) {
      const letters = bpm === 220 ? 'ADF' : 'A';
      await begin(bpm, 'repeat:16', { after: 800, duration: stallDuration });
      await press(letters);
      await delay(3150);
      await release(letters);
      const releasedAt = await evaluate('window.__uiAudio.getAudioContext().currentTime');
      await delay(500);
      const row = await finish(`${bpm} BPM ${letters.length}-key repeat through ${stallDuration}ms stall`, { stepSeconds: 60 / bpm / 4, tailAfter: releasedAt + .1 });
      const presses = row.measured.input.filter(x => x.type === 'keydown');
      row.chordSubmissionSpanMs = presses.at(-1).time - presses[0].time;
      checks.push({ name: `${bpm} BPM ${stallDuration}ms: intended chord arrives within declared gesture window`, passed: row.chordSubmissionSpanMs <= comparisonLimits.maxChordSubmissionSpanMs });
    }
    await begin(220);
    await press('ADF'); await delay(20); await release('ADF');
    const releasedAt = await evaluate('window.__uiAudio.getAudioContext().currentTime');
    await delay(2300);
    await finish('220 BPM three-key immediate release cancels the full future queue', { tailAfter: releasedAt + .1 });

    await begin(220, 'arp-up:16');
    await press('ADF'); await delay(350); await release('D'); await press('G');
    const changedAt = await evaluate('window.__uiAudio.getAudioContext().currentTime');
    await delay(350);
    await evaluate('window.__uiVisual.config.codeStrip.bpm=120');
    await delay(1600); await release('AFG'); await delay(500);
    const edited = await finish('Three-key arpeggio chord revision followed by 220-to-120 BPM edit');
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
    await finish('Eight fast three-key chords through trusted keyboard input');
    return { limits: comparisonLimits, horizonTransform: process.env.LAB_NATIVE_LOOKAHEAD_MS ? Number(process.env.LAB_NATIVE_LOOKAHEAD_MS) : null,
      scope: 'Trusted actual application piano input, PCM grid windows beyond prior-pulse release tail; existing ui-run warm input trials complement these cases. Node counts include source and gain separately. External event-loop slip diagnoses severe host contention; browser long tasks retain application stalls.',
      cases, worstExternalEventLoopSlipMs: worstExternalSlip,
      checks: [...checks, { name: 'External runner avoids severe host contention', passed: worstExternalSlip <= comparisonLimits.maxExternalEventLoopSlipMs }] };
  } finally { clearInterval(external); }
}
