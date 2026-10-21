import { createVoiceGroupLifecycle } from "@/services/inputVoiceGroups";

/** One sounding voice an owner asks for. */
export type PerformerVoice =
  /** A scale degree in a keyboard octave, resolved against the key at press. */
  | { kind: "degree"; scaleIndex: number; octave: number }
  /**
   * An exact pitch (MIDI, chord members). `mirrorMidi: false` keeps the voice
   * off the MIDI mirror: a controller that already shows its own press.
   */
  | { kind: "pitch"; pitch: string; velocity?: number; mirrorMidi?: boolean };

export interface PerformerPress {
  /**
   * One physical contact or note, namespaced by its adapter:
   * `melody:<contact>:<key>`, `chord:<contact>:<degree>`, `keyboard:<code>`,
   * `midi:<input>:<channel>:<note>`. Owners never merge: two contacts on one
   * pitch are two owners with two voices.
   */
  owner: string;
  kind: "note" | "chord";
  voices: readonly PerformerVoice[];
  /** Keyboard key lit while this owner holds (`0_4`, `chord:degree-1`). */
  touchKey?: string;
}

export type PerformerReleaseReason =
  /** The adapter saw the contact end (pointer up, key up, MIDI note-off). */
  | "input"
  /** The same physical note started again before its release arrived. */
  | "retrigger"
  | "blur"
  | "hidden"
  /** The instrument locked for warmup or recovery. */
  | "locked"
  /** A new instrument was selected; the old one's voices were silenced. */
  | "instrument-change"
  /** No key-repeat renewal arrived inside the window (the macOS Cmd case). */
  | "missing-key-up"
  /** Every voice failed or was refused, so nothing can sound. */
  | "silent"
  | "teardown";

export type PerformerIntent =
  | { type: "press"; owner: string; kind: PerformerPress["kind"]; voices: readonly PerformerVoice[]; touchKey?: string }
  | { type: "release"; owner: string; kind: PerformerPress["kind"]; reason: PerformerReleaseReason };

/** What the performer drives. Production wires the music and keyboard stores. */
export interface PerformerHost {
  attack(voice: PerformerVoice, isCancelled: () => boolean): Promise<string | null>;
  releaseVoice(voiceId: string): void | Promise<void>;
  setPitchBend(voiceId: string, cents: number, at?: number): void;
  setGain(voiceId: string, gain: number, at?: number): void;
  addTouch(owner: string, touchKey: string): void;
  removeTouch(owner: string): void;
  isLocked(): boolean;
  onAttackError?(owner: string, error: unknown): void;
  setTimer?(callback: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
}

interface Hold {
  press: PerformerPress;
  completion: Promise<string[]>;
  voiceIds: string[];
  cents: number;
  gain: number;
  watchdog?: { handle: unknown; windowMs: number };
}

/** An owner belongs to a scope when it is the scope or sits beneath it. */
export function ownerInScope(owner: string, scope?: string) {
  return scope === undefined || owner === scope || owner.startsWith(`${scope}:`);
}

/**
 * The one performer: every input adapter presses and releases through it.
 *
 * It owns the voice-group lifetime of each owner (a late attack after release
 * is released, never published as held), the keyboard touch it lights, and
 * the expression intents it forwards. Expression itself stays per note in the
 * engine; the performer only remembers the latest intent so a voice that
 * resolves after the gesture started receives it.
 */
export function createPerformer(host: PerformerHost) {
  const holds = new Map<string, Hold>();
  const listeners = new Set<(intent: PerformerIntent) => void>();
  const voiceGroups = createVoiceGroupLifecycle((voiceId) => host.releaseVoice(voiceId));
  function reportAttackError(owner: string, error: unknown) {
    if (host.onAttackError) host.onAttackError(owner, error);
    else console.error(`[Performer] Attack failed for ${owner}`, error);
  }
  function attackVoice(owner: string, voice: PerformerVoice, isCancelled: () => boolean) {
    try {
      return host.attack(voice, isCancelled).catch((error: unknown) => {
        reportAttackError(owner, error);
        return null;
      });
    } catch (error) {
      reportAttackError(owner, error);
      return Promise.resolve(null);
    }
  }
  const setTimer = host.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer = host.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  function emit(intent: PerformerIntent) {
    for (const listener of Array.from(listeners)) listener(intent);
  }

  function stopWatchdog(hold: Hold) {
    if (!hold.watchdog) return;
    clearTimer(hold.watchdog.handle);
    hold.watchdog = undefined;
  }

  function end(owner: string, hold: Hold, reason: PerformerReleaseReason) {
    holds.delete(owner);
    stopWatchdog(hold);
    // Audio first; reactive feedback and listeners follow.
    voiceGroups.release(owner);
    if (hold.press.touchKey !== undefined) host.removeTouch(owner);
    emit({ type: "release", owner, kind: hold.press.kind, reason });
  }

  function press(request: PerformerPress): Promise<string[]> {
    const existing = holds.get(request.owner);
    // A repeated press of a held owner (key repeat, a duplicate pointer event)
    // is the same hold, not a second voice.
    if (existing) return existing.completion;
    if (host.isLocked() || request.voices.length === 0) return Promise.resolve([]);

    const owner = request.owner;
    const hold: Hold = {
      press: { ...request, voices: [...request.voices] },
      completion: Promise.resolve([]),
      voiceIds: [],
      cents: 0,
      gain: 1,
    };
    holds.set(owner, hold);
    hold.completion = voiceGroups.attack(
      owner,
      hold.press.voices.map((voice) => (isCancelled) => attackVoice(owner, voice, isCancelled)),
    ).then((voiceIds) => {
      if (holds.get(owner) !== hold) return voiceIds;
      if (voiceIds.length === 0) {
        end(owner, hold, "silent");
        return voiceIds;
      }
      hold.voiceIds = voiceIds;
      for (const voiceId of voiceIds) {
        if (hold.cents) host.setPitchBend(voiceId, hold.cents);
        if (hold.gain !== 1) host.setGain(voiceId, hold.gain);
      }
      return voiceIds;
    });
    // Audio is submitted before the touch lights or listeners run.
    if (hold.press.touchKey !== undefined) host.addTouch(owner, hold.press.touchKey);
    emit({ type: "press", owner, kind: hold.press.kind, voices: hold.press.voices, touchKey: hold.press.touchKey });
    return hold.completion;
  }

  function release(owner: string, reason: PerformerReleaseReason = "input") {
    const hold = holds.get(owner);
    if (!hold) return false;
    end(owner, hold, reason);
    return true;
  }

  /** Release every owner in a scope (`midi:<input>`, `keyboard`), or all. */
  function releaseAllFor(scope?: string, reason: PerformerReleaseReason = "input") {
    for (const [owner, hold] of Array.from(holds)) {
      if (ownerInScope(owner, scope) && holds.get(owner) === hold) end(owner, hold, reason);
    }
  }

  function pitchBend(owner: string, cents: number, at?: number) {
    const hold = holds.get(owner);
    if (!hold) return false;
    hold.cents = cents;
    for (const voiceId of hold.voiceIds) host.setPitchBend(voiceId, cents, at);
    return true;
  }

  function setGain(owner: string, gain: number, at?: number) {
    const hold = holds.get(owner);
    if (!hold) return false;
    hold.gain = gain;
    for (const voiceId of hold.voiceIds) host.setGain(voiceId, gain, at);
    return true;
  }

  function armWatchdog(owner: string, hold: Hold, windowMs: number) {
    stopWatchdog(hold);
    hold.watchdog = {
      windowMs,
      handle: setTimer(() => {
        if (holds.get(owner) === hold) end(owner, hold, "missing-key-up");
      }, windowMs),
    };
  }

  /**
   * The owner's release may never arrive (macOS swallows key-ups while Cmd is
   * down). Unless `renew` is called inside the window, release it. Asking
   * again does not extend a watch already running; only `renew` does.
   */
  function expectRenewal(owner: string, windowMs: number) {
    const hold = holds.get(owner);
    if (!hold) return false;
    if (!hold.watchdog) armWatchdog(owner, hold, windowMs);
    return true;
  }

  /** Evidence the contact is still down (a key-repeat event). */
  function renew(owner: string) {
    const hold = holds.get(owner);
    if (!hold?.watchdog) return false;
    armWatchdog(owner, hold, hold.watchdog.windowMs);
    return true;
  }

  return {
    press,
    release,
    releaseAllFor,
    pitchBend,
    setGain,
    expectRenewal,
    renew,
    isHeld: (owner: string) => holds.has(owner),
    owners: (scope?: string) => Array.from(holds.keys()).filter((owner) => ownerInScope(owner, scope)),
    isLocked: () => host.isLocked(),
    subscribe(listener: (intent: PerformerIntent) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispose() {
      releaseAllFor(undefined, "teardown");
      listeners.clear();
    },
  };
}

export type Performer = ReturnType<typeof createPerformer>;
