// Keep Strudel's real webaudio module surface, but fill the helper exports that
// @strudel/soundfonts expects and Vite fails to infer through the forked bundle.
// @ts-ignore deep import has no published declaration file
export * from "../../node_modules/@strudel/webaudio/dist/index.mjs";

// @ts-ignore superdough has no bundled declaration file in this repo
export {
  getADSRValues,
  getAudioContext,
  getParamADSR,
  getPitchEnvelope,
  getVibratoOscillator,
  onceEnded,
  registerSound,
  releaseAudioNode,
} from "superdough";
