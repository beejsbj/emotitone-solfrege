import { toRaw } from "vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { mergeById, mergeFields, type WithId } from "@/services/listMerge";
import {
  createPersistedBinding,
  defineCodec,
  type PersistedBinding,
  type PersistenceCodec,
  type WriteHold,
} from "@/services/persistenceCodec";
import { persistentStorage, type SafeStorage, type SaveFailureKind } from "@/services/safeStorage";
import {
  sanitizeStageLookPatch,
  STAGE_LOOK_BODY_TIMING_FIELDS,
  type StageLookPatch,
} from "@/services/stageAppearance";
import { isRecord, migrateVisualConfig } from "@/services/visualConfigPersistence";
import type { VisualEffectsConfig } from "@/types/visual";

/**
 * Named appearance presets: the player's saved Stage Looks and (legacy) full
 * configurations. Each list is one stored key, and since BJS-579 each is a
 * codec that merges with other tabs by id, the way the phrase shelf does
 * (docs/persistence-codec.md, "Two tabs"). Version history of both keys:
 *
 *  - 0: a bare JSON array of presets, no envelope (before codecs). Rewritten
 *    at the first load of a build with this codec, after a backup.
 *  - 1: the same array inside the `$version` envelope; written only by builds
 *    that merge with other tabs.
 */

export const SAVED_CONFIGS_KEY = "emotitone-saved-configs";
export const SAVED_STAGE_LOOKS_KEY = "emotitone-saved-stage-looks";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SavedStageLook {
  id: string;
  name: string;
  patch: StageLookPatch;
  createdAt: string;
  updatedAt: string;
}

function migrateSavedConfig(rawSavedConfig: unknown): SavedConfig | null {
  if (!isRecord(rawSavedConfig)) {
    return null;
  }

  const migrated = {
    ...(rawSavedConfig as Omit<SavedConfig, "config">),
    config: migrateVisualConfig((rawSavedConfig as { config?: unknown }).config),
  } as SavedConfig;
  delete (migrated as SavedConfig & { stagePreferences?: unknown }).stagePreferences;
  return migrated;
}

function migrateSavedStageLook(rawLook: unknown): SavedStageLook | null {
  if (!isRecord(rawLook) || typeof rawLook.name !== "string") {
    return null;
  }

  const now = new Date().toISOString();
  const patch = sanitizeStageLookPatch(rawLook.patch);
  // Looks saved before body timing joined the allowlist never stored it, and
  // only a Look can change it now. Like a built-in, an omitted field resolves
  // from the canonical defaults rather than whatever Look was kept before.
  if (patch.blobs) {
    const blobs = patch.blobs as Record<string, unknown>;
    for (const field of STAGE_LOOK_BODY_TIMING_FIELDS) {
      if (typeof blobs[field] !== "number") blobs[field] = DEFAULT_CONFIG.blobs[field];
    }
  }
  return {
    id: typeof rawLook.id === "string" ? rawLook.id : now,
    name: rawLook.name,
    patch,
    createdAt: typeof rawLook.createdAt === "string" ? rawLook.createdAt : now,
    updatedAt: typeof rawLook.updatedAt === "string" ? rawLook.updatedAt : now,
  };
}

const byId = (data: unknown): unknown =>
  Array.isArray(data)
    ? [...data].sort((left, right) => String(left?.id).localeCompare(String(right?.id)))
    : data;

/**
 * One list of presets as a codec. Stored data is read the way it always was
 * (an entry the app can't use is dropped, an old one is converted); the merge
 * reads another tab's bytes and the agreed base through the same step, so the
 * three lists it compares are alike.
 */
function presetListCodec<E extends WithId>(key: string, read: (raw: unknown) => E | null): PersistenceCodec<E[]> {
  const decode = (data: unknown): E[] => {
    if (!Array.isArray(data)) throw new Error(`Invalid saved presets in "${key}"`);
    return data.map(read).filter((preset): preset is E => preset !== null);
  };
  return defineCodec<E[]>({
    key,
    version: 1,
    defaults: () => [],
    decode,
    // Unversioned data is the same array, only without the envelope.
    migrations: { 0: (data) => data },
    // Presets are things the player made: a preset new in either tab is kept,
    // a change in one tab wins over none in the other, a preset one tab
    // deleted stays deleted unless the other tab changed it since they last
    // agreed (an edit beats a concurrent delete, as for a phrase), and when
    // both changed one preset this tab's value wins field by field.
    merge(base, ours, theirs) {
      let before: E[] | undefined;
      try {
        before = base === null ? undefined : decode(base);
      } catch {
        // An unusable base only means nothing is known to be agreed: keep everything.
      }
      return mergeById(before, ours, decode(theirs), (preset) => toRaw(preset), mergeFields, () => false);
    },
    // Two tabs may hold the same presets in a different order; order alone is
    // nothing every tab shares, so it never counts as a change to write.
    shared: byId,
  });
}

export const savedConfigsCodec = presetListCodec<SavedConfig>(SAVED_CONFIGS_KEY, migrateSavedConfig);
export const savedStageLooksCodec = presetListCodec<SavedStageLook>(SAVED_STAGE_LOOKS_KEY, migrateSavedStageLook);

/** What the player is told when a hold, not the browser, refused the write. */
const heldFailure = (hold: WriteHold | null): SaveFailureKind =>
  hold?.reason === "newer" || hold?.reason === "restored" ? "newer" : "unknown";

export interface PresetPersistence<E extends WithId> {
  readonly binding: PersistedBinding<E[]>;
  /**
   * An explicit save, answered at the point of action: null when the list is
   * stored (or already was), else why it was not. A failure also raises the
   * shared "Can't save" notice, which a retry of the same key ends.
   */
  save(list: E[]): SaveFailureKind | null;
}

/**
 * One list's binding. `adopt` takes another tab's presets, merged with this
 * tab's, into memory; the binding calls it before any write that merges, and
 * on a `storage` event (`binding.listen`).
 */
export function createPresetPersistence<E extends WithId>(
  codec: PersistenceCodec<E[]>,
  adopt: (list: E[]) => void,
): PresetPersistence<E> {
  // The browser's answer to the last write, whichever key it was for (the
  // list, or the backup it waited on), so a save can say why it failed.
  let failure: SaveFailureKind | null = null;
  const storage: SafeStorage = {
    ...persistentStorage,
    // An explicit save fails once, in answer to a tap, and nothing retries it.
    write(key, value, options) {
      const kind = persistentStorage.attempt(key, value, key === codec.key ? { ...options, oneOff: true } : options);
      if (kind) failure = kind;
      return kind === null;
    },
  };
  const binding = createPersistedBinding(codec, { storage, adopt });
  return {
    binding,
    save(list) {
      failure = null;
      return binding.save(list) ? null : failure ?? heldFailure(binding.hold);
    },
  };
}
