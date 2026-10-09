import type { Phrase } from './phrases';
import type { ChromaticNote, MusicalMode } from './music';
import type { Pattern as StrudelPattern } from '@strudel/core';
import type { RecordedPatternPlan } from '@/services/recordedPatternPlan';
import type { LiveAudioClock } from '@/services/liveAudioClock';
import type { UIBeatClock } from '@/composables/useUIBeat';

export type LooperRate = 0.5 | 1 | 2;
export type LooperBoundary = 'immediate' | 'bar' | { bar: number };
export interface CachedLooperPhrase {
  readonly phraseId: string;
  readonly base: StrudelPattern;
  readonly degrees: StrudelPattern;
  readonly plan: RecordedPatternPlan;
  readonly lengthBars: number;
  readonly context: Phrase['context'];
  readonly notes: Phrase['notes'];
}
export interface LooperMember {
  readonly phrase: CachedLooperPhrase;
  readonly phraseId: string;
  readonly base: StrudelPattern;
  readonly lengthBars: number;
  readonly offsetBars: number;
  readonly rate: LooperRate;
  readonly pinned: boolean;
  readonly muted: boolean;
}
export type LooperMemberSettings = Pick<LooperMember, 'offsetBars' | 'rate' | 'pinned' | 'muted'>;
export interface LooperScheduler {
  started: boolean;
  cps: number;
  lastBegin: number;
  lastEnd: number;
  lastTick: number;
  latency: number;
  clock: { duration: number };
  pattern?: StrudelPattern;
  now(): number;
  setCps(cps: number): void;
}
/** Attached to the sole editor: no scheduler constructor in this contract. */
export interface LooperPlaybackPort {
  scheduler: LooperScheduler;
  ready(): Promise<void>;
  setPattern(pattern: StrudelPattern, autostart: boolean): Promise<unknown>;
  invalidate(): void;
  stop(): Promise<void> | void;
  onFrame(listener: (rawPosition: number) => void): () => void;
  onStop(listener: () => void): () => void;
  claim(): () => void;
}
export interface LooperTransportOptions {
  playback: LooperPlaybackPort;
  audioContext: () => Pick<AudioContext, 'currentTime' | 'state'> & Partial<Pick<AudioContext, 'baseLatency' | 'outputLatency'>>;
  clock: Pick<LiveAudioClock, 'fromEpochTime'>;
  beat?: UIBeatClock;
  bpm?: number;
  key?: ChromaticNote;
  mode?: MusicalMode;
}
export interface LooperChangeReceipt {
  boundaryBar: number;
  boundaryAudioTime: number;
  requestedAudioTime: number;
  preparationAndSwapMs: number;
  policy: 'immediate' | 'bar';
}
