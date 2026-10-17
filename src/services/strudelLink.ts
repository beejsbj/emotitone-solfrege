const STRUDEL_REPL_URL = "https://strudel.cc/";

/**
 * The strudel.cc REPL loads code from its URL hash. This matches Strudel's own
 * `code2hash` (@strudel/core 1.2.6, util.mjs): UTF-8 bytes, base64, then
 * `encodeURIComponent`; the REPL reverses it with `hash2code`. Bytes are
 * encoded in chunks so a long take cannot overflow the argument list.
 */
export function strudelCodeHash(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return encodeURIComponent(btoa(binary));
}

/** A strudel.cc link that opens with this code in the editor. */
export function strudelUrl(code: string): string {
  return `${STRUDEL_REPL_URL}#${strudelCodeHash(code)}`;
}
