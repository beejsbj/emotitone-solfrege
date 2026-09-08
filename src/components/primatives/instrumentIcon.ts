import {
  Anvil,
  AudioWaveform,
  Bell,
  Bird,
  Bug,
  Bus,
  Church,
  CloudRain,
  Crosshair,
  Drum,
  Guitar,
  Hand,
  MicVocal,
  Music2,
  Phone,
  Piano,
  Plane,
  Rocket,
  Siren,
  Sparkles,
  TrainFront,
  Waves,
  Wind,
  Wine,
  type LucideIcon,
} from "lucide-vue-next";

type InstrumentIconRule = {
  icon: LucideIcon;
  matches: RegExp;
};

const iconRules: InstrumentIconRule[] = [
  {
    icon: Piano,
    matches: /\b(piano\d*|fmpiano|epiano\d*|steinway|kawai|clavi\w*|harpsichord|celesta|music ?box)\b/,
  },
  {
    icon: Guitar,
    matches: /\b(guitar|banjo|sitar|koto|shamisen|dulcimer|fretless|slap bass|acoustic bass|electric bass|bass guitar|psaltery|dantranh|strumstick)\b/,
  },
  {
    icon: Music2,
    matches: /\b(harp|folkharp|violin|viola|cello|contrabass|fiddle|pizzicato|tremolo|string ensemble|synth strings|orchestra|accordion|bandoneon)\b/,
  },
  {
    icon: Church,
    matches: /\b(organ|pipeorgan)\b/,
  },
  {
    icon: Wind,
    matches: /\b(flute|piccolo|recorder|clarinet|oboe|bassoon|sax|saxello|horn|trumpet|trombone|tuba|brass|ocarina|harmonica|shakuhachi|shanai|whistle|ballwhistle|blown bottle|breath noise|didgeridoo|bagpipe|super64|wind)\w*\b/,
  },
  {
    icon: MicVocal,
    matches: /\b(voice|vocal|choir|aahs|oohs)\b/,
  },
  {
    icon: Bell,
    matches: /\b(bell\w*|handbells?|glockenspiel|marimba|vibraphone|xylophone|kalimba\d*|agogo|steel drums|tubular ?bells?\d*|balafon|chime\w*|handchimes?|finger ?cymbal|flexatone|triangles|marktrees)\b/,
  },
  { icon: Anvil, matches: /\b(anvil|brake ?drum|metal)\b/ },
  {
    icon: Drum,
    matches: /\b(drum|drums|bass ?drum\d*|ocean ?drum|kick|snare|tom|taiko|cymbal|hat|hihat|clap|conga|bongo|tamb|timpani|timba|mrid|perc|rim|cowbell|shaker|gong|woodblock|clave|guiro|darbuka|frame|slit|ratch|sleigh|cabasa|cajon|chaapu|clash|slapstick|vibraslap)\w*\b|\b(bd|sd|hh|cp|cr|cb|mt|ht|lt|oh|rd|sh|tb|misc)\b|^(dhi|dhin|dhum|ka|ki|na|nam|ta|tha|thom|oberheimdmx)$/,
  },
  { icon: CloudRain, matches: /\b(rain|thunder)\b/ },
  { icon: Bird, matches: /\b(bird|tweet|crow)\b/ },
  { icon: Bug, matches: /\b(insect|cricket)\b/ },
  { icon: Bus, matches: /^bus$/ },
  { icon: Phone, matches: /\b(telephone|phone)\b/ },
  { icon: Plane, matches: /\b(helicopter|airplane|jet)\b/ },
  { icon: TrainFront, matches: /\b(train\w*|rail)\b/ },
  { icon: Rocket, matches: /\b(space|rocket)\b/ },
  { icon: Siren, matches: /\bsiren\b/ },
  { icon: Crosshair, matches: /\b(gunshot|shot)\b/ },
  { icon: Waves, matches: /\b(seashore|ocean|surf|water)\b/ },
  { icon: Wine, matches: /\bwine ?glass\w*\b/ },
  { icon: Hand, matches: /\b(applause|hand clap)\b/ },
  { icon: Sparkles, matches: /\b(crystal|goblins|halo|brightness|atmosphere)\b/ },
  {
    icon: AudioWaveform,
    matches: /\b(synth|lead|pad|sine|sin|square|sqr|saw|sawtooth|triangle|tri|pulse|supersaw|noise|brown|white|pink|bytebeat|crackle|zzfx|soundtrack|echoes|sci fi|fx)\b/,
  },
];

const resolvedIcons = new Map<string, LucideIcon>();

function normalizeInstrumentName(instrument: string): string {
  return instrument
    .trim()
    .toLowerCase()
    .replace(/^gm_/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

/**
 * Presentation-only instrument identity shared by Drawer handles and picker Stickers.
 * Specific acoustic families win first; AudioWaveform is the honest generic sound fallback.
 */
export function instrumentIconFor(instrument: string): LucideIcon {
  const name = normalizeInstrumentName(instrument);
  const cached = resolvedIcons.get(name);
  if (cached) return cached;

  const icon = iconRules.find((rule) => rule.matches.test(name))?.icon ?? AudioWaveform;
  resolvedIcons.set(name, icon);
  return icon;
}
