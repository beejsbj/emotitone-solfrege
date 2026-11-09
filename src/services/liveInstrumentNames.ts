import { isSelectableInstrument, selectableReplacement } from "@/data/instrumentCatalog";

const aliases: Record<string, string> = {
  sqr: "square", saw: "sawtooth", tri: "triangle", sin: "sine",
  synth: "triangle", amSynth: "sawtooth", fmSynth: "square",
  membraneSynth: "sine", metalSynth: "square", organ: "organ_full",
  pipeorgan: "pipeorgan_quiet", recorder: "recorder_tenor_sus",
};

export function resolveLiveSoundName(name: string): string {
  return aliases[name] ?? name;
}

/**
 * The sound a saved pattern plays on when it joins the Looper (BJS-594): its own,
 * or when the worklet no longer holds it (a removed sound such as Kawai) the
 * nearest one the picker still offers. Aliases count as their oscillator, so
 * they are left as they are. Nothing is rewritten: the pattern keeps the sound
 * it was recorded on, and this is read again at every join.
 */
export function playableSoundName(name: unknown): string {
  const sound = typeof name === "string" ? resolveLiveSoundName(name) : name;
  return typeof name === "string" && isSelectableInstrument(sound) ? name : selectableReplacement(sound);
}
