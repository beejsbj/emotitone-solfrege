// Ambient declarations for @strudel/* packages that ship no TypeScript types.
// These modules are all runtime-only — we use `any` intentionally.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function evalScope(...modules: Promise<any>[]): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function samples(url: string): Promise<any>;
  export function isNote(note: string): boolean;
  // The headless REPL: scheduler, transpiled evaluation and output routing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function repl(options: any): any;
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
