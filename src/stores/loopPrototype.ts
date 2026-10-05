/**
 * PROTOTYPE — throwaway. Not for main.
 *
 * Question: can a loop sit beside the phrase system without a record button?
 * The take keeps capturing everything as it does today; Return lays the take
 * down on the Platter as a layer; the Platter keeps turning.
 *
 * Nothing here is persisted. Playback is a small look-ahead scheduler on the
 * audio clock that drives the live voice API directly, not Strudel.
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { Note as TonalNote } from "@tonaljs/tonal";
import {
  getSemitoneShift,
  mutatePatternMode,
  transposePatternNotes,
} from "@/data/patterns";
import { cloneNote, resolveBpm } from "@/domain/phraseBook";
import { attackNote, getAudioContext, releaseNote } from "@/services/superdoughAudio";
import { uiBeatClock } from "@/composables/useUIBeat";
import { useMusicStore } from "@/stores/music";
import { usePhrasesStore } from "@/stores/phrases";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type { Shape } from "@/types/instrument";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";
import type { Phrase } from "@/types/phrases";

export interface LoopLayer {
  id: string;
  label: string;
  instrument: string;
  shape: Shape;
  key: ChromaticNote;
  mode: MusicalMode;
  /** pressTime/duration are loop ms (at the loop's own BPM), wrapped into lengthMs. */
  notes: PatternNote[];
  /** A whole multiple of the loop length. */
  lengthMs: number;
  muted: boolean;
}

const TICK_MS = 25;
const LOOKAHEAD_S = 0.12;
const MIN_GATE_MS = 30;

const mod = (value: number, length: number) => ((value % length) + length) % length;

export const useLoopPrototypeStore = defineStore("loopPrototype", () => {
  const phrasesStore = usePhrasesStore();
  const musicStore = useMusicStore();
  const visualConfigStore = useVisualConfigStore();

  const layers = ref<LoopLayer[]>([]);
  /** Loop length in ms at `bpm`. 0 while the Platter is empty. */
  const lengthMs = ref(0);
  /** The tempo the loop was made at; live BPM plays it faster or slower. */
  const bpm = ref(120);
  const running = ref(false);
  /** Loop mode: the Platter is out and Return adds to it. */
  const armed = ref(false);
  /** Extra ms taken off live presses on top of the reported output latency. */
  const nudgeMs = ref(0);
  /** The one layer that sounds alone, if any. */
  const soloId = ref<string | null>(null);
  const isSilent = (layer: LoopLayer) =>
    soloId.value ? layer.id !== soloId.value : layer.muted;

  // Transport, in loop ms. Monotonic; never wrapped.
  let posMs = 0;
  let scheduledToMs = 0;
  let lastAudio = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let voiceCounter = 0;
  // The loop is a transport: while it runs it drives the app's UIBeat.
  let beatGeneration: number | null = null;
  let beatBpm = 0;

  const liveBpm = () => resolveBpm(visualConfigStore.config.codeStrip.bpm);
  const rate = () => liveBpm() / bpm.value;
  const barMs = computed(() => 240_000 / bpm.value);
  const bars = computed(() => (lengthMs.value ? Math.round(lengthMs.value / barMs.value) : 0));
  const hasLoop = computed(() => layers.value.length > 0);

  function latencyMs(): number {
    const context = getAudioContext() as AudioContext;
    const reported = (context.baseLatency || 0) + (context.outputLatency || 0);
    return reported * 1000 + nudgeMs.value;
  }

  /** Layer notes as they sound now: the loop follows the live key and mode. */
  function soundingNotes(layer: LoopLayer): PatternNote[] {
    const key = musicStore.currentKey as ChromaticNote;
    const mode = musicStore.currentMode as MusicalMode;
    let notes = layer.notes;
    if (layer.key !== key) notes = transposePatternNotes(notes, getSemitoneShift(layer.key, key));
    if (layer.mode !== mode) notes = mutatePatternMode(notes, key, mode);
    return notes;
  }

  function advance(): number {
    const now = getAudioContext().currentTime;
    if (running.value) posMs += (now - lastAudio) * 1000 * rate();
    lastAudio = now;
    return now;
  }

  function tick() {
    const now = advance();
    const speed = rate();
    const from = Math.max(scheduledToMs, posMs);
    const to = posMs + LOOKAHEAD_S * 1000 * speed;
    for (const layer of layers.value) {
      if (isSilent(layer)) continue;
      for (const note of soundingNotes(layer)) {
        let lap = Math.ceil((from - note.pressTime) / layer.lengthMs);
        if (note.pressTime + lap * layer.lengthMs <= from) lap += 1;
        for (let at = note.pressTime + lap * layer.lengthMs; at <= to; at += layer.lengthMs) {
          const start = now + (at - posMs) / 1000 / speed;
          const end = start + Math.max(MIN_GATE_MS, note.duration) / 1000 / speed;
          const voiceId = `loop-prototype-${++voiceCounter}`;
          void attackNote(voiceId, note.note, layer.instrument, {
            atTime: start,
            cutoff: layer.shape.cutoff,
            resonance: layer.shape.resonance,
            attack: note.articulation?.attack,
            release: note.articulation?.release,
          }).then(() => releaseNote(voiceId, end)).catch(() => undefined);
        }
      }
    }
    scheduledToMs = to;
  }

  function start() {
    if (running.value || !layers.value.length) return;
    lastAudio = getAudioContext().currentTime;
    scheduledToMs = posMs;
    running.value = true;
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  /** Once per frame: publish the loop's bar position to UIBeat. */
  function publishBeat() {
    if (!running.value) return;
    advance();
    const tempo = liveBpm();
    // The Code Strip's own Play takes the clock over; take it back once idle.
    if (beatGeneration === null || uiBeatClock.snapshot.status === "idle") {
      beatGeneration = uiBeatClock.arm({
        mappingAvailable: true,
        bpm: tempo,
        meter: { beatsPerBar: 4, beatUnit: 4 },
      });
      beatBpm = tempo;
    }
    if (tempo !== beatBpm && uiBeatClock.retime(beatGeneration, tempo)) beatBpm = tempo;
    uiBeatClock.publish(beatGeneration, { rawPosition: posMs, barPosition: posMs / barMs.value });
  }

  function stop() {
    advance();
    running.value = false;
    clearInterval(timer);
    timer = undefined;
    if (beatGeneration !== null) uiBeatClock.stop(beatGeneration);
    beatGeneration = null;
  }

  function toggle() {
    if (running.value) stop();
    else start();
  }

  /** Where phrase time 0 of the open take sits on the loop, or null if it wasn't played live. */
  function liveOrigin(): number | null {
    const { recorder } = phrasesStore.book;
    return recorder.liveNoteIds.length && recorder.wallOrigin !== null ? recorder.wallOrigin : null;
  }

  function loopStartOf(wallOrigin: number): number {
    advance();
    return posMs - ((Date.now() - wallOrigin) + latencyMs()) * rate();
  }

  /** Put a phrase on the Platter. The first one sets the loop's length. */
  function addPhrase(phrase: Phrase, wallOrigin: number | null): void {
    if (!phrase.notes.length) return;
    const first = !layers.value.length;
    if (first) bpm.value = resolveBpm(phrase.context.bpm);
    const scale = resolveBpm(phrase.context.bpm) / bpm.value;
    const scaled = phrase.notes.map((note) => ({
      note,
      start: note.pressTime * scale,
      duration: Math.max(MIN_GATE_MS, note.duration * scale),
    }));
    const sounding = Math.max(...scaled.map((entry) => entry.start + entry.duration));
    const content = wallOrigin === null ? Math.max(sounding, phrase.duration * scale) : sounding;

    let origin = 0;
    let layerLength: number;
    if (first) {
      // A ringing last note may hang a quarter bar over without adding a bar.
      lengthMs.value = Math.max(1, Math.ceil(content / barMs.value - 0.25)) * barMs.value;
      layerLength = lengthMs.value;
      // A played phrase has been "looping" since its first note.
      posMs = wallOrigin === null ? 0 : Math.max(0, Date.now() - wallOrigin);
      scheduledToMs = posMs;
      lastAudio = getAudioContext().currentTime;
    } else {
      layerLength = lengthMs.value * Math.max(1, Math.ceil(content / lengthMs.value - 0.1));
      if (wallOrigin !== null) origin = loopStartOf(wallOrigin);
    }

    layers.value.push({
      id: `layer-${Date.now()}-${layers.value.length}`,
      label: phrase.name ?? (phrase.number ? `Take ${phrase.number}` : phrase.derivedFrom?.name ?? "Layer"),
      instrument: phrase.context.instrument,
      shape: { ...phrase.context.shape },
      key: phrase.context.key,
      mode: phrase.context.mode,
      lengthMs: layerLength,
      muted: false,
      notes: scaled.map(({ note, start, duration }) => {
        const pressTime = mod(origin + start, layerLength);
        return { ...cloneNote(note), pressTime, duration, releaseTime: pressTime + duration };
      }),
    });
    start();
  }

  /** Return (or a tap on the empty Platter): lay the desk's phrase down. */
  function layDownTake(): boolean {
    if (!armed.value) return false;
    const take = phrasesStore.take;
    if (!take.notes.length) return true;
    addPhrase(take, liveOrigin());
    phrasesStore.startBlankTake();
    return true;
  }

  /** The loop button: bring the Platter out, or stop it and put it away. */
  function toggleMode() {
    armed.value = !armed.value;
    if (armed.value) start();
    else stop();
  }

  function removeLayer(id: string) {
    layers.value = layers.value.filter((layer) => layer.id !== id);
    if (soloId.value === id) soloId.value = null;
    if (!layers.value.length) clear();
  }

  function peelLayer(): boolean {
    const last = layers.value[layers.value.length - 1];
    if (!last) return false;
    removeLayer(last.id);
    return true;
  }

  function toggleMute(id: string) {
    const layer = layers.value.find((candidate) => candidate.id === id);
    if (layer) layer.muted = !layer.muted;
  }

  function toggleSolo(id: string) {
    soloId.value = soloId.value === id ? null : id;
  }

  function clear() {
    soloId.value = null;
    stop();
    layers.value = [];
    lengthMs.value = 0;
    posMs = 0;
  }

  /** 0..1 through the loop, or through a layer of the given length. */
  function phase(length = lengthMs.value): number {
    if (!length) return 0;
    advance();
    return mod(posMs, length) / length;
  }

  /** Where the open take's live notes would land if laid down now. */
  function pendingNotes(): PatternNote[] {
    const wallOrigin = liveOrigin();
    if (!hasLoop.value || wallOrigin === null) return [];
    const take = phrasesStore.take;
    const scale = resolveBpm(take.context.bpm) / bpm.value;
    const origin = loopStartOf(wallOrigin);
    return take.notes.map((note) => ({
      ...note,
      pressTime: mod(origin + note.pressTime * scale, lengthMs.value),
      duration: note.duration * scale,
    }));
  }

  /** Pitch-class colour and height need the note as it sounds now. */
  function describe(note: PatternNote) {
    const parsed = TonalNote.get(note.note);
    return { chroma: parsed.chroma ?? 0, midi: parsed.midi ?? 60, octave: parsed.oct ?? 4 };
  }

  return {
    layers,
    lengthMs,
    bpm,
    bars,
    running,
    armed,
    hasLoop,
    nudgeMs,
    soundingNotes,
    pendingNotes,
    describe,
    phase,
    publishBeat,
    latencyMs,
    toggleMode,
    layDownTake,
    toggle,
    toggleMute,
    toggleSolo,
    soloId,
    isSilent,
    removeLayer,
    peelLayer,
    clear,
  };
});
