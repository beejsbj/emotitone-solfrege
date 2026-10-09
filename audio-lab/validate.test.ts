import { describe, expect, it } from 'vitest';
import stored from './results/current.json';
import { validateResults } from './validate.mjs';

const fresh = () => structuredClone(stored);
const failed = (results: ReturnType<typeof fresh>) =>
  validateResults(results).filter((check) => !check.passed).map((check) => check.name);

describe('audio-lab result validator', () => {
  it('accepts the stored complete capture', () => {
    expect(failed(fresh())).toEqual([]);
  });

  it('rejects a capture whose attack and sequence groups are empty', () => {
    const results = fresh();
    results.attacks = [];
    results.sequences = [];
    results.productionScenarios = results.productionScenarios.filter((row) => row.name === 'stable-stall');

    expect(failed(results)).toEqual([expect.stringContaining('gaps: direct/false/0')]);
  });

  it('rejects a duplicated row and a missing production scenario', () => {
    const results = fresh();
    results.attacks.push(results.attacks[0]);
    results.productionScenarios = results.productionScenarios.filter((row) => row.name !== 'tempo-boundary');

    const [matrix] = failed(results);
    expect(matrix).toContain('direct/false/0');
    expect(matrix).toContain('tempo-boundary');
  });
});
