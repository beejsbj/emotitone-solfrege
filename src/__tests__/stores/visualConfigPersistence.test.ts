import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import capture from '../fixtures/persistence/visual-config.v0.store-capture.json?raw';
import { useVisualConfigStore } from '@/stores/visualConfig';
import { useTempoStore, useOctaveStore, useDrawerRowsStore } from '@/stores/performanceSettings';
import { HISTORICAL_VISUAL_DEFAULTS } from '@/data/visual-config-default-history';
import { visualConfigCodec, isPerformanceField } from '@/services/visualConfigPersistence';
import { DEFAULT_CONFIG } from '@/data/visual-config-metadata';
import { listBackups, restoreBackup, readPayload } from '@/services/persistenceCodec';
import { persistentStorage, resetSaveFailure, saveFailureNotice } from '@/services/safeStorage';

const key = 'emotitone-visual-config';
const pinia: Pinia[] = [];
const fresh = () => {
  const instance = createPinia();
  pinia.push(instance);
  setActivePinia(instance);
  return useVisualConfigStore();
};
const saved = (storageKey = key) => JSON.parse(localStorage.getItem(storageKey)!);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetSaveFailure();
});
afterEach(() => {
  pinia.splice(0).forEach(disposePinia);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('visual config codec and performance ownership', () => {
  it('migrates captured store bytes, backs them up exactly, and reloads separate settings', () => {
    localStorage.setItem(key, capture);
    const store = fresh();
    expect(store.config.blobs.baseSizeRatio).toBe(0.33);
    expect(store.laBasedMinor).toBe(true);
    expect(saved()).toEqual({ $version: 1, data: { config: { blobs: { baseSizeRatio: 0.33 } }, laBasedMinor: true } });
    const backups = listBackups(persistentStorage, key);
    expect(backups).toHaveLength(1);
    expect(localStorage.getItem(backups[0].backupKey)).toBe(capture);
    expect(saved('emotitone-tempo').data).toEqual({ value: 147 });
    expect(saved('emotitone-octave').data).toEqual({ value: 6 });
    expect(saved('emotitone-drawer-rows').data).toEqual({ value: 5 });
    const reloaded = fresh();
    expect(reloaded.config).toEqual(store.config);
    expect(listBackups(persistentStorage, key)).toHaveLength(1);
  });

  it('reconciles known old defaults only once, preserving customized values', () => {
    localStorage.setItem(key, JSON.stringify({ config: {
      blobs: { oscillationAmplitude: 0.4, driftSpeed: 8, vibrationAmplitude: 10, vibrationFrequencyDivisor: 10, fieldSoftness: 12, baseSizeRatio: 0.31 },
    } }));
    const store = fresh();
    expect(store.config.blobs.oscillationAmplitude).toBe(DEFAULT_CONFIG.blobs.oscillationAmplitude);
    expect(saved().data.config).toEqual({ blobs: { baseSizeRatio: 0.31 } });
    store.updateConfig('blobs', { driftSpeed: 8 });
    store.saveToStorage();
    const reloaded = fresh();
    expect(reloaded.config.blobs.driftSpeed).toBe(8);
  });

  it.each(['stacked', 'hidden', 'bar', 'sparkles'])(
    'silently drops a stored %s duration override without a reload rewrite loop', async (durationMode) => {
      localStorage.setItem(key, JSON.stringify({ $version: 1, data: { config: {
        codeStrip: { durationMode, showRests: false },
      } } }));
      const store = fresh();
      expect(store.config.codeStrip).not.toHaveProperty('durationMode');
      expect(store.config.codeStrip.showRests).toBe(false);
      expect(saveFailureNotice.value).toBeNull();
      store.saveToStorage();
      expect(saved().data.config).toEqual({ codeStrip: { showRests: false } });
      const bytes = localStorage.getItem(key);
      expect(fresh().config.codeStrip).toEqual(store.config.codeStrip);
      await nextTick();
      vi.runAllTimers();
      expect(localStorage.getItem(key)).toBe(bytes);
      const write = vi.spyOn(localStorage, 'setItem');
      await nextTick();
      vi.advanceTimersByTime(10_000);
      expect(write.mock.calls.filter(([name]) => name === key)).toHaveLength(0);
      expect(listBackups(persistentStorage, key)).toHaveLength(0);
      expect(saveFailureNotice.value).toBeNull();
    },
  );

  it.each([
    ['4141b1fb', {
      blobs: { baseSizeRatio: 0.1, opacity: 0.5, oscillationAmplitude: 1, driftSpeed: 10,
        fusionStrength: 0.4, webOpacity: 0.5, showIntervalLabels: false },
      ambient: { opacityMajor: 0.6, opacityMinor: 0.4, brightnessMajor: 0.5,
        brightnessMinor: 0.3, saturationMajor: 0.8, saturationMinor: 0.6 },
      strings: { baseOpacity: 0.05, activeOpacity: 0.9, maxAmplitude: 15,
        dampingFactor: 0.08, interpolationSpeed: 0.15, opacityInterpolationSpeed: 0.1 },
      hilbertScope: { sizeRatio: 0.6, opacity: 0.7, glowIntensity: 10, history: 0.2 },
    }],
    ['d6dc0e7d', { blobs: { connectionMode: 'off', showChordLabel: false } }],
  ])('reconciles defaults predating %s without preserving migration side effects', (_, config) => {
    localStorage.setItem(key, JSON.stringify({ config }));
    const store = fresh();
    expect(store.config).toEqual(DEFAULT_CONFIG);
    expect(saved().data.config).toEqual({});
  });

  it('reconciles every generated historical visual default through the codec', () => {
    for (const [section, fields] of Object.entries(HISTORICAL_VISUAL_DEFAULTS)) {
      for (const [field, values] of Object.entries(fields)) {
        if (isPerformanceField(section, field)) continue;
        for (const value of values) {
          const read = readPayload(visualConfigCodec, JSON.stringify({ config: { [section]: { [field]: value } } }));
          expect(read.kind).toBe('migrated');
          expect(read.state.config, `${section}.${field}=${value}`).toEqual(DEFAULT_CONFIG);
        }
      }
    }
  });

  it('imports exported performance settings into their owners and reloads them', async () => {
    const store = fresh();
    store.config.codeStrip.bpm = 157;
    store.config.keyboard.mainOctave = 6;
    store.config.keyboard.rowCount = 2;
    const exported = store.exportConfig();
    store.config.codeStrip.bpm = 100;
    store.config.keyboard.mainOctave = 3;
    store.config.keyboard.rowCount = 4;
    expect(store.importConfig(exported)).toBe(true);
    expect(useTempoStore().value).toBe(157);
    expect(useOctaveStore().value).toBe(6);
    expect(useDrawerRowsStore().value).toBe(2);
    await nextTick();
    vi.runAllTimers();
    expect(fresh().config).toEqual(store.config);
    expect(saved().data.config).toEqual({});
  });

  it('recovers missing performance keys from v0 backup with a later visual format', () => {
    localStorage.setItem(key + '.backup.v0.2026-10-15', capture);
    const newer = JSON.stringify({ $version: 2, data: { future: true } });
    localStorage.setItem(key, newer);
    const store = fresh();
    expect(store.config.codeStrip.bpm).toBe(147);
    expect(store.config.keyboard).toMatchObject({ mainOctave: 6, rowCount: 5 });
    expect(localStorage.getItem(key)).toBe(newer);
  });

  it('batches rapid tempo ticks into one write and cancels pending ephemeral saves', async () => {
    const store = fresh();
    await nextTick();
    vi.runAllTimers();
    const write = vi.spyOn(localStorage, 'setItem');
    const tempoWrites = () => write.mock.calls.filter(([name]) => name === 'emotitone-tempo');
    for (let bpm = 121; bpm <= 150; bpm++) {
      store.config.codeStrip.bpm = bpm;
      await nextTick();
      vi.advanceTimersByTime(10);
    }
    expect(tempoWrites()).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(tempoWrites()).toHaveLength(1);
    expect(saved('emotitone-tempo').data.value).toBe(150);
    store.config.codeStrip.bpm = 160;
    await nextTick();
    store.useEphemeralDefaults();
    vi.runAllTimers();
    expect(tempoWrites()).toHaveLength(1);
  });

  it.each(['pagehide', 'dispose'])('flushes the last performance gesture on %s', (event) => {
    fresh();
    useTempoStore().value = 151;
    useOctaveStore().value = 6;
    useDrawerRowsStore().value = 4;
    if (event === 'pagehide') window.dispatchEvent(new Event('pagehide'));
    else disposePinia(pinia.pop()!);
    expect(saved('emotitone-tempo').data.value).toBe(151);
    expect(saved('emotitone-octave').data.value).toBe(6);
    expect(saved('emotitone-drawer-rows').data.value).toBe(4);
  });

  it('holds the player store after a backup restore while an ephemeral specimen exists', async () => {
    localStorage.setItem(key, capture);
    const player = fresh();
    const backup = listBackups(persistentStorage, key)[0];
    fresh().useEphemeralDefaults();
    expect(restoreBackup(backup.backupKey).ok).toBe(true);
    player.config.blobs.baseSizeRatio = 0.39;
    player.saveToStorage();
    await nextTick();
    vi.runAllTimers();
    expect(localStorage.getItem(key)).toBe(capture);
  });

  it('saves only changed fields, removes reverted overrides, and picks up later defaults', () => {
    const store = fresh();
    store.updateConfig('strings', { count: 12 });
    store.saveToStorage();
    expect(saved()).toEqual({ $version: 1, data: { config: { strings: { count: 12 } } } });
    const original = DEFAULT_CONFIG.blobs.baseSizeRatio;
    try {
      DEFAULT_CONFIG.blobs.baseSizeRatio = 0.29;
      const reloaded = fresh();
      expect(reloaded.config.blobs.baseSizeRatio).toBe(0.29);
      expect(reloaded.config.strings.count).toBe(12);
      reloaded.updateConfig('strings', { count: DEFAULT_CONFIG.strings.count });
      reloaded.saveToStorage();
      expect(saved().data.config).toEqual({});
    } finally {
      DEFAULT_CONFIG.blobs.baseSizeRatio = original;
    }
  });

  it('small stores own updates, survive appearance resets, and do not save visual config', async () => {
    const store = fresh();
    await nextTick();
    vi.runAllTimers();
    localStorage.removeItem(key);
    useTempoStore().value = 155;
    useOctaveStore().value = 7;
    useDrawerRowsStore().value = 2;
    await nextTick();
    vi.runAllTimers();
    expect(localStorage.getItem(key)).toBeNull();
    expect(store.config.codeStrip.bpm).toBe(155);
    store.resetToDefaults();
    store.resetSection('keyboard');
    store.resetSection('codeStrip');
    const reloaded = fresh();
    expect(reloaded.config.codeStrip.bpm).toBe(155);
    expect(reloaded.config.keyboard).toMatchObject({ mainOctave: 7, rowCount: 2 });
    expect(saved().data.config).toEqual({});
  });

  it('leaves legacy bytes intact when the backup fails, then retries before saving', () => {
    localStorage.setItem(key, capture);
    const write = localStorage.setItem.bind(localStorage);
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((name, value) => {
      if (name.includes('.backup.')) throw new DOMException('full', 'QuotaExceededError');
      write(name, value);
    });
    const store = fresh();
    expect(localStorage.getItem(key)).toBe(capture);
    expect(store.config.blobs.baseSizeRatio).toBe(0.33);
    store.saveToStorage();
    expect(localStorage.getItem(key)).toBe(capture);
    expect(saveFailureNotice.value?.kind).toBe('quota');
    spy.mockImplementation(write);
    store.saveToStorage();
    expect(saved().$version).toBe(1);
    expect(localStorage.getItem(listBackups(persistentStorage, key)[0].backupKey)).toBe(capture);
  });

  it('recovers a failed destination write from the migration backup on reload', () => {
    localStorage.setItem(key, capture);
    const write = localStorage.setItem.bind(localStorage);
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((name, value) => {
      if (name === 'emotitone-tempo') throw new DOMException('full', 'QuotaExceededError');
      write(name, value);
    });
    expect(fresh().config.codeStrip.bpm).toBe(147);
    expect(saved().$version).toBe(1);
    expect(localStorage.getItem('emotitone-tempo')).toBeNull();
    spy.mockImplementation(write);
    expect(fresh().config.codeStrip.bpm).toBe(147);
    expect(saved('emotitone-tempo').data.value).toBe(147);
  });

  it('keeps existing destinations and refuses writes to newer formats', () => {
    localStorage.setItem(key, capture);
    localStorage.setItem('emotitone-tempo', JSON.stringify({ $version: 1, data: { value: 96 } }));
    expect(fresh().config.codeStrip.bpm).toBe(96);
    const newer = JSON.stringify({ $version: 99, data: { future: true } });
    localStorage.setItem(key, newer);
    localStorage.setItem('emotitone-octave', newer);
    const store = fresh();
    store.updateConfig('blobs', { isEnabled: false });
    store.updateConfig('keyboard', { mainOctave: 7 });
    store.saveToStorage();
    expect(localStorage.getItem(key)).toBe(newer);
    expect(localStorage.getItem('emotitone-octave')).toBe(newer);
    expect(saveFailureNotice.value?.kind).toBe('newer');
  });
});
