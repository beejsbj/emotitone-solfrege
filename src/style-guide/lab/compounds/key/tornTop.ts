/*
 * Guide-only torn tops for Direction C. Every pitch class and octave gets its
 * own deterministic tear (the same Sol4 always tears the same way), written
 * as two clip polygons on the real Note:
 *   --key-tear-outer  the torn paper edge, showing the Ivory core
 *   --key-tear-core   the Music Color layer, 1–3px lower along the tear
 * Sides and bottom keep a machined lean; only the top edge is torn. Tear
 * depths are in px so a 44px outer row and a 76px main row lose the same
 * few pixels.
 */

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const px = (value: number) => `${value.toFixed(2)}px`;
const pct = (value: number) => `${value.toFixed(2)}%`;

function tear(pitchClass: number, octave: number) {
  const random = seeded(pitchClass * 7919 + octave * 104_729 + 17);
  const steps = 18;
  const left = 0.5 + random() * 2;
  const right = 98 + random() * 1.8;
  const phase = random() * Math.PI * 2;
  const frequency = 0.8 + random() * 1.4;
  const swell = 0.9 + random() * 1.1;
  const corePhase = random() * Math.PI * 2;

  const edge = Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const jitter = index === 0 || index === steps ? 0 : (random() - 0.5) * 0.7;
    const x = left + (right - left) * (t + jitter / steps);
    const nick = random() < 0.14 ? 1.4 + random() * 1.2 : 0;
    const y = Math.min(6, Math.max(0, 2.4 + swell * Math.sin(phase + frequency * Math.PI * 2 * t) + (random() - 0.5) * 1.5 + nick));
    const core = 1.2 + 1.1 * (0.5 + 0.5 * Math.sin(corePhase + Math.PI * 2 * 1.3 * t)) + random() * 0.6;
    return { x, y, core };
  });

  const bottomRight = `${pct(98.4 + random() * 1.4)} calc(100% - ${px(random() * 2.5)})`;
  const bottomLeft = `${pct(0.6 + random() * 2)} calc(100% - ${px(random() * 1.5)})`;
  const sides = `${bottomRight}, ${bottomLeft}`;

  return {
    outer: `polygon(${edge.map(({ x, y }) => `${pct(x)} ${px(y)}`).join(", ")}, ${sides})`,
    core: `polygon(${edge.map(({ x, y, core }) => `${pct(x)} ${px(y + core)}`).join(", ")}, ${sides})`,
  };
}

/** Scoped rules seeding one tear per pitch class × octave under `scope`. */
export function tornTopRules(scope: string) {
  const rules: string[] = [];
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    for (let octave = 1; octave <= 8; octave += 1) {
      const { outer, core } = tear(pitchClass, octave);
      rules.push(
        `${scope} .note[data-pitch-class-index="${pitchClass}"][data-octave="${octave}"]{--key-tear-outer:${outer};--key-tear-core:${core}}`,
      );
    }
  }
  return rules.join("\n");
}
