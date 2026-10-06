// Ambient declarations for @strudel/* packages that ship no TypeScript types.
// These modules are all runtime-only — we use `any` intentionally.
declare module "@strudel/codemirror" {
  import type { StateEffectType } from "@codemirror/state";

  export const setMiniLocations: StateEffectType<Array<[number, number]>>;
  export const showMiniLocations: StateEffectType<{
    atTime: number | { valueOf(): number };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    haps: any[];
  }>;

  export class StrudelMirror {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSettings(settings: any): void;
    setCode(code: string): void;
    getCode(): string;
    evaluate(): Promise<void>;
    stop(): Promise<void> | void;
    clear(): void;
    destroy?(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view?: any;
  }
}

declare module "@strudel/transpiler" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const transpiler: any;
}

declare module "@strudel/webaudio" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const webaudioOutput: any;
  export function registerSynthSounds(): Promise<void>;
  export function initAudioOnFirstClick(): void;
  export function getAudioContext(): AudioContext;
}

declare module "@strudel/core" {
  /** fraction.js instance as extended by Strudel. */
  export interface StrudelFraction {
    valueOf(): number;
    add(other: StrudelFraction | number): StrudelFraction;
    sub(other: StrudelFraction | number): StrudelFraction;
    mul(other: StrudelFraction | number): StrudelFraction;
    div(other: StrudelFraction | number): StrudelFraction;
    equals(other: StrudelFraction | number): boolean;
    lt(other: StrudelFraction | number): boolean;
    lte(other: StrudelFraction | number): boolean;
    gt(other: StrudelFraction | number): boolean;
    gte(other: StrudelFraction | number): boolean;
    min(other: StrudelFraction): StrudelFraction;
    max(other: StrudelFraction): StrudelFraction;
  }
  export function Fraction(value: number | StrudelFraction): StrudelFraction;
  export class TimeSpan {
    constructor(begin: StrudelFraction, end: StrudelFraction);
    begin: StrudelFraction;
    end: StrudelFraction;
  }
  export class Hap {
    constructor(whole: TimeSpan | undefined, part: TimeSpan, value: Record<string, string | number>, context?: Record<string, unknown>);
    whole?: TimeSpan;
    part: TimeSpan;
    value: Record<string, string | number>;
    context: Record<string, unknown>;
    withValue(fn: (value: Record<string, string | number>) => Record<string, string | number>): Hap;
    hasOnset(): boolean;
    duration: number;
  }
  export class Pattern {
    constructor(query: (state: { span: TimeSpan }) => Hap[]);
    queryArc(begin: number, end: number): Hap[];
    fast(rate: number | StrudelFraction): Pattern;
    slow(rate: number | StrudelFraction): Pattern;
    late(bars: number | StrudelFraction): Pattern;
    ribbon(offset: number, length: number): Pattern;
    scale(scale: string | Pattern): Pattern;
    sound(sound: string | Pattern): Pattern;
    withContext(fn: (context: Record<string, unknown>) => Record<string, unknown>): Pattern;
    fmap(fn: (value: Record<string, string | number>) => Record<string, string | number>): Pattern;
    withHap(fn: (hap: Hap) => Hap): Pattern;
    filterHaps(fn: (hap: Hap) => boolean): Pattern;
    splitQueries(): Pattern;
  }
  export function pure(value: unknown): Pattern;
  export function stack(...patterns: Pattern[]): Pattern;
  export const silence: Pattern;
  export function evaluate(code: string, transpiler?: unknown): Promise<{ pattern: Pattern }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function evalScope(...modules: Promise<any>[]): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function samples(url: string): Promise<any>;
  export function isNote(note: string): boolean;
}

declare module "@strudel/mini" {
  // intentionally empty — side-effect module
}

declare module "@strudel/tonal" {
  // intentionally empty — side-effect module
}

declare module "@strudel/soundfonts" {
  export function registerSoundfonts(): Promise<void>;
}
