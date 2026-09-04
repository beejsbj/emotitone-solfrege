const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

function spokenNumber(value: number): string {
  if (value < 0) return `minus ${spokenNumber(Math.abs(value))}`;
  return NUMBER_WORDS[value] ?? String(value);
}

function spokenAccidental(value: string) {
  const normalized = value.replace(/♯/g, "#").replace(/♭/g, "b");
  if (normalized === "##") return "double sharp";
  if (normalized === "bb") return "double flat";
  return [...normalized]
    .map((accidental) => accidental === "#" ? "sharp" : "flat")
    .join(" ");
}

export function accessibleScaleDegree(scaleIndex: number) {
  return spokenNumber(scaleIndex + 1);
}

export function accessiblePitch(rawPitch: string) {
  const match = rawPitch.match(/^([A-Ga-g])([#b♯♭]*)(-?\d+)$/);
  if (!match) {
    return rawPitch
      .replace(/#/g, " sharp ")
      .replace(/♯/g, " sharp ")
      .replace(/b/g, " flat ")
      .replace(/♭/g, " flat ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const [, letter, accidental, octave] = match;
  return [
    letter.toUpperCase(),
    spokenAccidental(accidental),
    spokenNumber(Number(octave)),
  ].filter(Boolean).join(" ");
}
