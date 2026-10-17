import type { CodeStripToken } from "./types";

/** What a screen reader calls one event of the strip. */
export function eventName(token: CodeStripToken): string {
  if (token.type === "note") return `Code note ${token.text}`;
  if (token.type === "chord") return token.accessibleName ?? `Code chord ${token.symbol}`;
  if (token.type === "rest") return "Code rest";
  return "Code punctuation";
}
