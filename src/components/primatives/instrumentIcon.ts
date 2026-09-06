import { Drum, Guitar, Piano, type LucideIcon } from "lucide-vue-next";

// Presentation only: unknown sound banks retain their name without an invented identity.
// Match known names, not broad categories (which also contain synths and sound effects).
const icons = new Map<string, LucideIcon>();
for (const name of [
  "piano", "steinway", "kawai", "fmpiano", "epiano1", "epiano2",
  "acoustic grand piano", "electric grand piano", "electric piano", "honky tonk piano",
]) icons.set(name, Piano);
for (const name of [
  "guitar", "acoustic guitar", "electric guitar",
  "acoustic guitar nylon", "acoustic guitar steel", "electric guitar clean",
  "electric guitar jazz", "electric guitar muted", "distortion guitar", "overdriven guitar",
  "guitar fret noise", "guitar harmonics", "electric bass", "bass guitar",
  "electric bass finger", "electric bass pick", "fretless bass", "slap bass 1", "slap bass 2",
]) icons.set(name, Guitar);
for (const name of [
  "drum", "drums", "bd", "sd", "kick", "snare", "tom", "taiko drum", "melodic tom",
]) icons.set(name, Drum);

export function instrumentIconFor(instrument: string): LucideIcon | undefined {
  const name = instrument.trim().toLowerCase().replace(/^gm_/, "").replace(/[_-]+/g, " ");
  return icons.get(name);
}
