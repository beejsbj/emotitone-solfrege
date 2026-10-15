import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import capture from '../fixtures/persistence/visual-config.v0.store-capture.json?raw';
import { useVisualConfigStore } from '@/stores/visualConfig';
import { useTempoStore, useOctaveStore, useDrawerRowsStore } from '@/stores/performanceSettings';
import { DEFAULT_CONFIG } from '@/data/visual-config-metadata';
import { listBackups } from '@/services/persistenceCodec';
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
      codeStrip: { durationMode: 'stacked' },
    } }));
    const store = fresh();
    expect(store.config.blobs.oscillationAmplitude).toBe(DEFAULT_CONFIG.blobs.oscillationAmplitude);
    expect(store.config.codeStrip.durationMode).toBe('bar');
    expect(saved().data.config).toEqual({ blobs: { baseSizeRatio: 0.31 } });
    store.updateConfig('blobs', { driftSpeed: 8 });
    store.updateConfig('codeStrip', { durationMode: 'stacked' });
    store.saveToStorage();
    const reloaded = fresh();
    expect(reloaded.config.blobs.driftSpeed).toBe(8);
    expect(reloaded.config.codeStrip.durationMode).toBe('stacked');
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
