/**
 * Judge a rendered audio-lab result. Pure: no browser, so stored results can be
 * re-checked. Every group lab.mjs produces must be present exactly once before
 * its rows are judged; filtered `.every(...)` alone accepts an empty group.
 */
const ATTACKS = ['direct', 'superdough'].flatMap((engine) => [false, true]
  .flatMap((stress) => [0, 5, 10].map((leadMs) => `${engine}/${stress}/${leadMs}`)));
const SEQUENCES = ['direct', 'superdough', 'worklet-repeat', 'worklet-arp']
  .flatMap((engine) => [false, true].map((stress) => `${engine}/${stress}`));
const PRODUCTION_SCENARIOS = ['stable-stall', 'held-changes', 'tempo-boundary'];

/** Identities absent from `rows` or present more than once. */
function matrixGaps(rows, expected, identity) {
  const seen = (rows ?? []).map(identity);
  return expected.filter((key) => seen.filter((value) => value === key).length !== 1)
    .concat(seen.filter((value) => !expected.includes(value)));
}

export function validateResults(results, { legacySuperdough = false } = {}) {
  const gaps = [
    ...matrixGaps(results.attacks, ATTACKS, (row) => `${row.engine}/${row.stress}/${row.leadMs}`),
    ...matrixGaps(results.sequences, SEQUENCES, (row) => `${row.engine}/${row.stress}`),
    ...(legacySuperdough ? [] : matrixGaps(results.productionScenarios, PRODUCTION_SCENARIOS, (row) => row.name)),
  ];
  const checks = [
    [`every expected attack, sequence and production scenario is present once${gaps.length ? ` (gaps: ${gaps.join(', ')})` : ''}`, gaps.length === 0],
    ['direct and Superdough 5/10ms attacks produce all notes', results.attacks.filter((row) => row.leadMs > 0).every((row) => row.missing === 0 && row.duplicatesOrUnexpected === 0)],
    ['all idle sequences produce all notes', results.sequences.filter((row) => !row.stress).every((row) => row.missing === 0 && row.duplicatesOrUnexpected === 0)],
    ['render-thread sequences survive 300ms main-thread stalls', results.sequences.filter((row) => row.engine.startsWith('worklet')).every((row) => row.missing === 0 && row.duplicatesOrUnexpected === 0 && row.onsetErrorMs.max < 1)],
    ['worklet queued cancellation produces silence', results.prototypeLifecycle.cancelledOnsets === 0],
    ['worklet release becomes silent without a large sample discontinuity', results.prototypeLifecycle.releaseTailPeakAfter15ms === 0 && results.prototypeLifecycle.releaseLargestAdjacentSampleStep < 0.03],
    ['worklet bounds voices and releases all', results.prototypeLifecycle.denseStats.peak <= 16 && results.prototypeLifecycle.releasedStats.active === 0],
  ];
  if (!legacySuperdough) checks.push(
    ['finished Superdough voices leave the registry', results.cleanup.voicesStillRegisteredAfterNaturalEndAndRelease === 0],
    ['Superdough has a finite default voice budget', results.cleanup.maxPolyphony === 128],
    ['production engine and scheduled voices match rendered attacks during input changes and stress',
      results.productionScenarios.every((row) => row.missing === 0 && row.duplicatesOrUnexpected === 0 && row.errors.length === 0
        && row.published === row.ended && row.remainingVoices === 0
        && (row.expectedMusicalPulses === null || row.expectedMusicalPulses === row.published))],
    ['500 overlapping sample voices exercise the budget and clean up', results.denseLifecycle.attacks === 500
      && results.denseLifecycle.admitted === 500 && results.denseLifecycle.peakRegistered >= 120
      // Registry includes up to eight 10ms retirement fades beyond active128.
      && results.denseLifecycle.peakRegistered <= 136 && results.denseLifecycle.remainingRegistered === 0],
    ['ongoing production sixteenth-note intervals stay within 1ms of the audio grid',
      results.productionScenarios.find((row) => row.name === 'stable-stall')?.maxOngoingIntervalDeviationMs <= 1],
  );
  return checks.map(([name, passed]) => ({ name, passed }));
}
