import { defineStore } from "pinia";
import { ref, watch, onScopeDispose } from "vue";
import { createPersistedBinding, listBackups } from "@/services/persistenceCodec";
import { persistentStorage } from "@/services/safeStorage";
import { isRecord, VISUAL_CONFIG_STORAGE_KEY } from "@/services/visualConfigPersistence";

/** The v0 config is read before its eager rewrite. If a destination write failed
 * during that move, its missing key can recover from the codec's v0 backup on
 * the next load. Existing destinations (including newer versions) always win. */
function legacyPerformanceValue(section: string, field: string): unknown {
  const read = persistentStorage.read(VISUAL_CONFIG_STORAGE_KEY);
  if (!read.ok || read.value === null) return undefined;
  try {
    let raw = JSON.parse(read.value);
    if (isRecord(raw) && "$version" in raw) {
      const backup = listBackups(persistentStorage, VISUAL_CONFIG_STORAGE_KEY)
        .find((entry) => entry.label === "v0");
      if (!backup) return undefined;
      raw = JSON.parse(persistentStorage.getItem(backup.backupKey) ?? "null");
    }
    if (!isRecord(raw) || "$version" in raw) return undefined;
    const config = isRecord(raw.config) ? raw.config : raw;
    const values = config[section] ?? (section === "codeStrip" ? config.liveStrip : undefined);
    return isRecord(values) ? values[field] : undefined;
  } catch {
    return undefined;
  }
}

function numericSetting(id: string, key: string, fallback: number, section: string, field: string) {
  return defineStore(id, () => {
    const persistence = createPersistedBinding<{ value: number }>({
      key,
      version: 1,
      defaults: () => ({ value: fallback }),
      decode(data) {
        if (!isRecord(data)) throw new Error(`Invalid ${id}`);
        return { value: typeof data.value === "number" && Number.isFinite(data.value) ? data.value : fallback };
      },
      migrations: {},
    });
    const loaded = persistence.load();
    if (persistence.outcome === "empty") {
      const legacy = legacyPerformanceValue(section, field);
      if (typeof legacy === "number" && Number.isFinite(legacy)) {
        loaded.value = legacy;
        persistence.save(loaded);
      }
    }
    const value = ref(loaded.value);
    let persistenceEnabled = true;
    let saveTimeout: ReturnType<typeof setTimeout> | undefined;
    const savePending = () => {
      if (saveTimeout === undefined) return;
      clearTimeout(saveTimeout);
      saveTimeout = undefined;
      if (persistenceEnabled) persistence.save({ value: value.value });
    };
    watch(value, () => {
      if (saveTimeout !== undefined) clearTimeout(saveTimeout);
      if (persistenceEnabled) saveTimeout = setTimeout(savePending, 500);
    }, { flush: "sync" });
    // Flush the last gesture when navigating away or disposing the store.
    const flushOnHide = () => { if (document.visibilityState === "hidden") savePending(); };
    window.addEventListener("pagehide", savePending);
    document.addEventListener("visibilitychange", flushOnHide);
    onScopeDispose(() => {
      savePending();
      persistence.unregister();
      window.removeEventListener("pagehide", savePending);
      document.removeEventListener("visibilitychange", flushOnHide);
    });
    const useEphemeralDefaults = () => {
      persistenceEnabled = false;
      savePending();
      persistence.unregister();
      value.value = fallback;
    };
    return { value, useEphemeralDefaults };
  });
}

export const useTempoStore = numericSetting("tempo", "emotitone-tempo", 120, "codeStrip", "bpm");
export const useOctaveStore = numericSetting("octave", "emotitone-octave", 4, "keyboard", "mainOctave");
export const useDrawerRowsStore = numericSetting("drawerRows", "emotitone-drawer-rows", 3, "keyboard", "rowCount");
/**
 * Loop Timing: this device's calibration, in ms, for notes played over a loop.
 * A note's attack converts to the transport bar it sounded on; this much is
 * taken off, for a player who hears the loop late. Per device, never in a Look.
 */
export const LOOP_TIMING_RANGE = { min: -100, max: 200, step: 5 } as const;
export const useLoopTimingStore = numericSetting("loopTiming", "emotitone-loop-timing", 0, "codeStrip", "looperCalibrationMs");
