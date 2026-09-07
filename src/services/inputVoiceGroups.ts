export type VoiceAttack = (
  isCancelled: () => boolean,
) => Promise<string | null>;

interface VoiceGroup {
  released: boolean;
  settled: boolean;
  resolvedVoiceIds: Set<string>;
  completion: Promise<string[]>;
}

export interface VoiceGroupLifecycle {
  attack(ownerId: string, voices: readonly VoiceAttack[]): Promise<string[]>;
  release(ownerId: string): void;
  releaseAll(): void;
  hasOwner(ownerId: string): boolean;
}

/**
 * Gives every input owner its own independently articulated audio voices.
 * Duplicate/unison pitches are intentionally not coalesced: releasing one
 * contact can never silence a second contact that happens to share its pitch.
 */
export function createVoiceGroupLifecycle(
  releaseVoice: (voiceId: string) => void | Promise<void>,
  onAttackError: (error: unknown) => void = () => undefined,
): VoiceGroupLifecycle {
  const groups = new Map<string, VoiceGroup>();

  function releaseResolved(group: VoiceGroup) {
    for (const voiceId of group.resolvedVoiceIds) {
      void releaseVoice(voiceId);
    }
    group.resolvedVoiceIds.clear();
  }

  function attack(ownerId: string, voices: readonly VoiceAttack[]) {
    const existing = groups.get(ownerId);
    if (existing && !existing.released) return existing.completion;

    const group: VoiceGroup = {
      released: false,
      settled: false,
      resolvedVoiceIds: new Set(),
      completion: Promise.resolve([]),
    };
    groups.set(ownerId, group);

    group.completion = Promise.all(voices.map(async (attackVoice) => {
      try {
        const voiceId = await attackVoice(() => group.released);
        if (!voiceId) return null;

        if (group.released) {
          void releaseVoice(voiceId);
        } else {
          group.resolvedVoiceIds.add(voiceId);
        }
        return voiceId;
      } catch (error) {
        onAttackError(error);
        return null;
      }
    })).then((voiceIds) => voiceIds.filter((voiceId): voiceId is string => Boolean(voiceId)))
      .finally(() => {
        group.settled = true;
        if (group.released && groups.get(ownerId) === group) {
          groups.delete(ownerId);
        }
      });

    return group.completion;
  }

  function release(ownerId: string) {
    const group = groups.get(ownerId);
    if (!group || group.released) return;

    group.released = true;
    releaseResolved(group);
    if (group.settled && groups.get(ownerId) === group) {
      groups.delete(ownerId);
    }
  }

  function releaseAll() {
    for (const ownerId of Array.from(groups.keys())) {
      release(ownerId);
    }
  }

  return {
    attack,
    release,
    releaseAll,
    hasOwner: (ownerId) => Boolean(groups.get(ownerId) && !groups.get(ownerId)?.released),
  };
}
