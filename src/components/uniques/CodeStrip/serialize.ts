import type { CodeStripNote, CodeStripNoteToken, CodeStripToken } from "./types";

const NOTE_NAMES: CodeStripNote[] = ["do", "re", "mi", "fa", "sol", "la", "ti"];

/** Mini-notation for controlled tokens, so a specimen has code to open. */
export function serializeCodeStripTokens(tokens: CodeStripToken[]) {
  const body = tokens.map((token) => {
    if (token.type === "note") {
      return `${sourceNoteValue(token)}${token.duration ?? ""}`;
    }
    if (token.type === "rest") return `~${token.duration ?? ""}`;
    if (token.type === "chord") {
      const members = token.members.map((member) =>
        member.rawPitch ?? String(member.scaleIndex ?? 0),
      );
      return `{${members.join(", ")}}${token.duration ?? ""}`;
    }
    return token.text ?? ",";
  }).join(" ");

  return `\`< [ ${body} ] >\``;
}

function sourceNoteValue(token: CodeStripNoteToken) {
  if (token.glyph === "raw" && token.rawPitch) return token.rawPitch;
  if (token.rawPitch && /^[A-Ga-g]/.test(token.rawPitch)) return token.rawPitch;
  return String(token.scaleIndex ?? NOTE_NAMES.indexOf(token.note));
}
