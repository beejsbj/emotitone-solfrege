// The browser lab replaces only catalog initialization/prewarming in the lower
// adapter. Production play-style and scheduled-voice modules run unchanged.
import * as dough from 'superdough';
import { LIVE_AUDIO_SCHEDULING_LEAD_MS } from '../src/services/liveAudioTiming.ts';

export const admittedVoices = new Map();
export const getAudioContext = () => dough.getAudioContext();
export async function attackNote(noteId, noteName, instrument, options = {}) {
  const context = getAudioContext();
  const at = Math.max(options.atTime || 0, context.currentTime + LIVE_AUDIO_SCHEDULING_LEAD_MS / 1000);
  const result = await dough.superdough({ s: instrument, note: noteName, voiceId: noteId,
    sustainUntilRelease: true, gain: 0.8, attack: 0.001, release: options.release ?? 0.03 }, at, 0.25, 1);
  const startedAt = Number.isFinite(result) ? result : Math.max(at, context.currentTime);
  admittedVoices.set(noteId, { startedAt, noteName });
  return startedAt;
}
export const releaseNote = (noteId, at) => dough.releaseVoice(noteId, at);
export const stopNote = (noteId) => dough.cancelVoice(noteId);
