import { defineStore } from "pinia";
import { ref, watch } from "vue";
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
    if (isRecord(raw) && raw.$version === 1) {
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
    watch(value, () => {
      if (persistenceEnabled) persistence.save({ value: value.value });
    }, { flush: "sync" });
    const useEphemeralDefaults = () => {
      persistenceEnabled = false;
      value.value = fallback;
    };
    return { value, useEphemeralDefaults };
  });
}

export const useTempoStore = numericSetting("tempo", "emotitone-tempo", 120, "codeStrip", "bpm");
export const useOctaveStore = numericSetting("octave", "emotitone-octave", 4, "keyboard", "mainOctave");
export const useDrawerRowsStore = numericSetting("drawerRows", "emotitone-drawer-rows", 3, "keyboard", "rowCount");
