import { nextTick, shallowRef, type ShallowRef } from "vue";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type { StageAudioFeatures } from "@/services/stageAudio";
import type { ActiveNote, ChromaticNote, SolfegeData } from "@/types/music";
import type { StageLabState } from "@/types/stageLab";

/*
 * One conductor per lab frame. Every frame on the page builds the same one
 * and receives the same parent messages, so production and every direction
 * play identical notes, attacks, releases, and envelope at the same moments.
 * Notes are C major; G♯ is the one borrowed pitch, kept for exact-pitch color.
 */

const MAJOR = getScaleForMode("major").solfege;
const DEGREE_OF_PITCH: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const RAISED: Record<string, string> = { "C#": "Di", "D#": "Ri", "F#": "Fi", "G#": "Si", "A#": "Li" };

export const STAGE_LAB_STATES: { id: StageLabState; label: string; pitches: string[] }[] = [
  { id: "phrase", label: "Phrase (loops)", pitches: [] },
  { id: "silence", label: "Silence", pitches: [] },
  { id: "note", label: "One note", pitches: ["C4"] },
  { id: "fifth", label: "Fifth", pitches: ["C4", "G4"] },
  { id: "triad", label: "C major", pitches: ["C4", "E4", "G4"] },
  { id: "minor", label: "A minor", pitches: ["A3", "C4", "E4"] },
  { id: "seventh", label: "G7", pitches: ["G3", "B3", "D4", "F4"] },
  { id: "augmented", label: "C aug (borrowed G♯)", pitches: ["C4", "E4", "G#4"] },
];

/** The looping phrase: each step holds, releases, then the next attacks. */
const PHRASE: { state: StageLabState; holdMs: number }[] = [
  { state: "note", holdMs: 2200 },
  { state: "fifth", holdMs: 2400 },
  { state: "triad", holdMs: 2800 },
  { state: "minor", holdMs: 2600 },
  { state: "seventh", holdMs: 2800 },
  { state: "augmented", holdMs: 2600 },
  { state: "silence", holdMs: 2400 },
];

const ATTACK_S = 0.02;
const DECAY_S = 0.3;
const SUSTAIN = 0.72;
const RELEASE_S = 0.45;

interface Voice {
  note: ActiveNote;
  startedAt: number;
  releasedAt: number | null;
  oscillator: OscillatorNode | null;
  gain: GainNode | null;
}

let attackSequence = 0;

function midiOf(pitch: string) {
  const match = /^([A-G]#?)(-?\d)$/.exec(pitch);
  if (!match) return 60;
  return CHROMATIC_NOTES.indexOf(match[1] as ChromaticNote) + (Number(match[2]) + 1) * 12;
}

export function labNote(pitch: string): ActiveNote {
  const match = /^([A-G]#?)(-?\d)$/.exec(pitch);
  const name = (match?.[1] ?? "C") as ChromaticNote;
  const octave = Number(match?.[2] ?? 4);
  const degree = DEGREE_OF_PITCH[name];
  const borrowed = degree === undefined;
  // Borrowed pitches keep exact identity; their solfège is the raised degree below.
  const base = MAJOR[DEGREE_OF_PITCH[name[0]] ?? 0];
  const solfege: SolfegeData = borrowed ? { ...base, name: RAISED[name] ?? base.name } : MAJOR[degree];
  return {
    noteId: `stage-lab-${pitch}-${++attackSequence}`,
    noteName: `${name}${octave}`,
    pitchClassIndex: CHROMATIC_NOTES.indexOf(name),
    solfegeIndex: borrowed ? -1 : degree,
    solfege,
    frequency: 440 * 2 ** ((midiOf(pitch) - 69) / 12),
    octave,
    keyboardOctave: 4,
    mode: "major",
    key: "C",
  };
}

export interface StageLabConductor {
  activeNotes: ShallowRef<readonly ActiveNote[]>;
  eventTarget: EventTarget;
  audio: StageAudioFeatures;
  /** The summed voice node, once audio exists; lab painters read it for the scope. */
  waveformNode: () => AudioNode | null;
  isAudioRunning: () => boolean;
  wake: () => Promise<void>;
  setState: (state: StageLabState) => void;
  key: (pitch: string, down: boolean) => void;
  dispose: () => void;
}

export function createStageLabConductor(initial: StageLabState): StageLabConductor {
  const activeNotes = shallowRef<readonly ActiveNote[]>([]);
  const eventTarget = new EventTarget();
  const voices = new Map<string, Voice>();
  const keyVoices = new Map<string, string>();
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let sink: GainNode | null = null;
  let phraseTimer = 0;
  let disposed = false;

  const now = () => performance.now() / 1000;

  const initializeAudio = () => {
    if (master) return master;
    if (typeof AudioContext === "undefined") return null;
    context = new AudioContext();
    master = context.createGain();
    sink = context.createGain();
    master.gain.value = 0.32;
    sink.gain.value = 0;
    // The silent sink keeps analyser-only branches pulled; nothing is audible.
    master.connect(sink);
    sink.connect(context.destination);
    voices.forEach(startOscillator);
    return master;
  };

  function startOscillator(voice: Voice) {
    if (!context || !master || voice.oscillator) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = voice.note.frequency;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + ATTACK_S);
    gain.gain.linearRampToValueAtTime(SUSTAIN, context.currentTime + ATTACK_S + DECAY_S);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    voice.oscillator = oscillator;
    voice.gain = gain;
  }

  function stopOscillator(voice: Voice) {
    if (!context || !voice.oscillator || !voice.gain) return;
    const t = context.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
    voice.gain.gain.linearRampToValueAtTime(0, t + RELEASE_S);
    voice.oscillator.stop(t + RELEASE_S + 0.05);
    const { oscillator, gain } = voice;
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  const publish = () => {
    activeNotes.value = [...voices.values()].filter((v) => v.releasedAt === null).map((v) => v.note);
  };

  const dispatch = (type: "note-played" | "note-released", note: ActiveNote) => {
    eventTarget.dispatchEvent(new CustomEvent(type, {
      detail: type === "note-played"
        ? { ...note, note: note.solfege, source: "stage-lab", record: false, mirrorMidi: false }
        : { ...note, note: note.solfege.name },
    }));
  };

  const attack = (pitch: string) => {
    const note = labNote(pitch);
    const voice: Voice = { note, startedAt: now(), releasedAt: null, oscillator: null, gain: null };
    voices.set(note.noteId, voice);
    startOscillator(voice);
    publish();
    // Production finds the note in its controlled view before recording harmony.
    void nextTick(() => { if (!disposed) dispatch("note-played", note); });
    return note.noteId;
  };

  const release = (noteId: string) => {
    const voice = voices.get(noteId);
    if (!voice || voice.releasedAt !== null) return;
    voice.releasedAt = now();
    stopOscillator(voice);
    publish();
    dispatch("note-released", voice.note);
  };

  const releaseAll = () => [...voices.keys()].forEach(release);

  const pruneVoices = () => {
    const t = now();
    voices.forEach((voice, id) => {
      if (voice.releasedAt !== null && t - voice.releasedAt > RELEASE_S + 0.1) voices.delete(id);
    });
  };

  const holdState = (state: StageLabState) => {
    releaseAll();
    const pitches = STAGE_LAB_STATES.find((s) => s.id === state)?.pitches ?? [];
    pitches.forEach(attack);
  };

  const runPhrase = (step = 0) => {
    const { state, holdMs } = PHRASE[step % PHRASE.length];
    holdState(state);
    phraseTimer = window.setTimeout(() => runPhrase(step + 1), holdMs);
  };

  const setState = (state: StageLabState) => {
    window.clearTimeout(phraseTimer);
    if (state === "phrase") runPhrase();
    else holdState(state);
  };

  const levelOf = (voice: Voice, t: number) => {
    const age = t - voice.startedAt;
    const held = age < ATTACK_S
      ? age / ATTACK_S
      : age < ATTACK_S + DECAY_S
        ? 1 - (1 - SUSTAIN) * ((age - ATTACK_S) / DECAY_S)
        : SUSTAIN;
    if (voice.releasedAt === null) return held;
    return held * Math.max(0, 1 - (t - voice.releasedAt) / RELEASE_S);
  };

  const audio: StageAudioFeatures = {
    initialize: initializeAudio,
    sample(timestampMs) {
      pruneVoices();
      const t = now();
      let sum = 0;
      voices.forEach((voice) => { sum += levelOf(voice, t); });
      if (sum <= 0.001) return { envelope: 0, hasSignal: false };
      const shimmer = 0.94 + Math.sin(timestampMs * 0.0043) * 0.06;
      return { envelope: Math.min(0.95, (0.3 + sum * 0.36) * shimmer), hasSignal: true };
    },
    cleanup() {
      voices.forEach((voice) => { try { voice.oscillator?.stop(); } catch { /* already stopped */ } });
      master?.disconnect();
      sink?.disconnect();
      void context?.close().catch(() => undefined);
      context = null;
      master = null;
      sink = null;
    },
  };

  setState(initial);

  return {
    activeNotes,
    eventTarget,
    audio,
    waveformNode: () => master,
    isAudioRunning: () => context?.state === "running",
    async wake() {
      initializeAudio();
      if (context?.state === "suspended") await context.resume();
    },
    setState,
    key(pitch, down) {
      if (down) {
        if (keyVoices.has(pitch)) return;
        keyVoices.set(pitch, attack(pitch));
      } else {
        const id = keyVoices.get(pitch);
        keyVoices.delete(pitch);
        if (id) release(id);
      }
    },
    dispose() {
      disposed = true;
      window.clearTimeout(phraseTimer);
      releaseAll();
    },
  };
}
