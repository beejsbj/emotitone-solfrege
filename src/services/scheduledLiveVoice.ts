import * as audio from "@/services/superdoughAudio";

/** Times use the same monotonic millisecond clock as the live play engine. */
export function createScheduledLiveVoice(options: {
  noteId: string;
  noteName: string;
  instrument: string;
  at: number;
  releaseSeconds: number;
  now: () => number;
  onStart: (timestamp: number) => void;
  onEnd: (timestamp: number) => void;
  onError: (error: unknown) => void;
}) {
  const { noteId, now } = options;
  const epochOffset = Date.now() - now();
  const audioOffset = audio.getAudioContext().currentTime - now() / 1000;
  let endAt = Infinity;
  let startAt = options.at;
  let ready = false;
  let armed = false;
  let published = false;
  let finished = false;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  function finish() {
    if (finished) return;
    // Web Audio keeps playing when the main thread stalls. Preserve an onset
    // that sounded even if its visual/recording timer has not run yet.
    if (armed && !published && endAt > startAt && now() >= startAt) publishStart();
    finished = true;
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    if (published) options.onEnd(epochOffset + endAt);
  }

  function publishStart() {
    if (finished) return;
    published = true;
    options.onStart(epochOffset + startAt);
  }

  function scheduleEnd() {
    if (!ready || !Number.isFinite(endAt)) return;
    if (endAt <= startAt) {
      audio.stopNote(noteId);
      finish();
      return;
    }
    audio.releaseNote(noteId, Math.max(audio.getAudioContext().currentTime, audioOffset + endAt / 1000));
    clearTimeout(endTimer);
    if (endAt <= now()) finish();
    else endTimer = setTimeout(finish, endAt - now());
  }

  void audio.attackNote(noteId, options.noteName, options.instrument, {
    atTime: audioOffset + options.at / 1000,
    release: options.releaseSeconds,
  }).then((startedAt) => {
    ready = true;
    if (finished || endAt <= now()) {
      audio.stopNote(noteId);
      finish();
      return;
    }
    armed = true;
    if (Number.isFinite(startedAt)) {
      startAt = Math.max(options.at, (startedAt - audioOffset) * 1000);
    }
    if (endAt <= startAt) {
      audio.stopNote(noteId);
      finish();
      return;
    }
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
        if (ready) audio.stopNote(noteId);
        finish();
      } else {
        scheduleEnd();
      }
    },
  };
}
