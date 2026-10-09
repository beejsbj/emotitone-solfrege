import * as audio from "@/services/superdoughAudio";
import type { LiveAudioClock } from "@/services/liveAudioClock";

export const SCHEDULED_LIVE_MIDI_EVENT = "scheduled-live-midi-note";
const CLOCK_ROUNDING_EPSILON_MS = 0.000001;

/** Times use the same monotonic millisecond clock as the live play engine. */
export function createScheduledLiveVoice(options: {
  noteId: string;
  noteName: string;
  instrument: string;
  at: number;
  releaseSeconds: number;
  now: () => number;
  clock?: Pick<LiveAudioClock, "toAudioTime" | "fromAudioTime" | "toEpochTime">;
  onScheduleStart?: (timestamp: number) => void;
  onScheduleEnd?: (timestamp: number) => void;
  onStart: (timestamp: number) => void;
  onEnd: (timestamp: number) => void;
  onError: (error: unknown) => void;
}) {
  const { noteId, now } = options;
  const epochOffset = Date.now() - now();
  let audioOffset = audio.getAudioContext().currentTime - now() / 1000;
  const audioTime = (at: number) => options.clock?.toAudioTime(at) ?? audioOffset + at / 1000;
  const epochTime = (at: number) => options.clock?.toEpochTime(at) ?? epochOffset + at;
  let endAt = Infinity;
  let startAt = options.at;
  let ready = false;
  let armed = false;
  let midiStartScheduled = false;
  let midiEndScheduledAt = Infinity;
  let published = false;
  let finished = false;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleMidiEnd(at: number) {
    if (!midiStartScheduled || at >= midiEndScheduledAt) return;
    midiEndScheduledAt = at;
    options.onScheduleEnd?.(epochTime(at));
  }

  function finish() {
    if (finished) return;
    if (armed && endAt > startAt && endAt - now() > CLOCK_ROUNDING_EPSILON_MS) {
      clearTimeout(endTimer);
      endTimer = setTimeout(finish, endAt - now());
      return;
    }
    // Web Audio keeps playing when the main thread stalls. Preserve an onset
    // that sounded even if its visual/recording timer has not run yet.
    if (armed && !published && endAt > startAt && now() >= startAt) publishStart();
    finished = true;
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    if (published) options.onEnd(epochTime(endAt));
  }

  function publishStart() {
    if (finished || published) return;
    if (startAt - now() > CLOCK_ROUNDING_EPSILON_MS) {
      startTimer = setTimeout(publishStart, startAt - now());
      return;
    }
    published = true;
    options.onStart(epochTime(startAt));
  }

  function scheduleEnd() {
    if (!ready || !Number.isFinite(endAt)) return;
    if (endAt <= startAt) {
      scheduleMidiEnd(startAt);
      audio.stopNote(noteId);
      finish();
      return;
    }
    scheduleMidiEnd(endAt);
    audio.releaseNote(noteId, Math.max(audio.getAudioContext().currentTime, audioTime(endAt)));
    clearTimeout(endTimer);
    if (endAt <= now()) finish();
    else endTimer = setTimeout(finish, endAt - now());
  }

  void audio.attackNote(noteId, options.noteName, options.instrument, {
    atTime: audioTime(options.at),
    release: options.releaseSeconds,
  }).then((startedAt) => {
    ready = true;
    // A suspended context can resume while attackNote is awaiting audio setup.
    // Refresh the mapping before converting its returned audio-clock onset.
    if (!options.clock) audioOffset = audio.getAudioContext().currentTime - now() / 1000;
    if (Number.isFinite(startedAt)) {
      startAt = Math.max(options.at, options.clock?.fromAudioTime(startedAt) ?? (startedAt - audioOffset) * 1000);
    }
    if (finished || endAt <= startAt) {
      audio.stopNote(noteId);
      finish();
      return;
    }
    // A ready source can play while its Promise continuation is delayed.
    // Preserve that reported onset, but never invent one for an unresolved
    // cold load or an onset that fell after the whole gate had elapsed.
    armed = endAt > now() || Number.isFinite(startedAt);
    if (endAt <= now()) {
      audio.stopNote(noteId);
      finish();
      return;
    }
    midiStartScheduled = true;
    options.onScheduleStart?.(epochTime(startAt));
    if (startAt <= now()) publishStart();
    else startTimer = setTimeout(publishStart, startAt - now());
    scheduleEnd();
  }).catch((error) => {
    endAt = now();
    finish();
    options.onError(error);
  });

  return {
    release(at: number) {
      if (finished || at >= endAt) return;
      endAt = at;
      if (at <= options.at) {
        // A released key must cancel audio already queued in the lookahead.
        if (ready) {
          scheduleMidiEnd(startAt);
          audio.stopNote(noteId);
        }
        finish();
      } else {
        scheduleEnd();
      }
    },
  };
}
