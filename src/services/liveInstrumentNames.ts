const aliases: Record<string, string> = {
  synth: "triangle", amSynth: "sawtooth", fmSynth: "square",
  membraneSynth: "sine", metalSynth: "square", organ: "organ_full",
  pipeorgan: "pipeorgan_quiet", recorder: "recorder_tenor_sus",
};

export function resolveLiveSoundName(name: string): string {
  return aliases[name] ?? name;
}
