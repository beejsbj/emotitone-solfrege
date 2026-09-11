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
  let ready = false;
  let published = false;
  let finished = false;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    if (published) options.onEnd(epochOffset + endAt);
  }

  function publishStart() {
    if (finished || endAt <= now()) return;
    published = true;
    options.onStart(epochOffset + options.at);
  }

  function scheduleEnd() {
    if (!ready || !Number.isFinite(endAt)) return;
    if (endAt <= options.at) {
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
  }).then(() => {
    ready = true;
    if (finished || endAt <= now()) {
      audio.stopNote(noteId);
      finish();
      return;
    }
    if (options.at <= now()) publishStart();
    else startTimer = setTimeout(publishStart, options.at - now());
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
