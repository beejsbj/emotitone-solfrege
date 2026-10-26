import { describe, expect, it } from 'vitest';
import { strudelCodeHash, strudelUrl } from '@/services/strudelLink';

/** The REPL's `hash2code`: URI component, base64, then UTF-8. */
function hash2code(hash: string): string {
  const binary = atob(decodeURIComponent(hash));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

describe('Open in Strudel link', () => {
  const code = '`< C4@0.25 {E4, G4}@0.5 ~@0.25 >`.as("note").sound("sine").cpm(120 / 4)';

  it('opens strudel.cc with the code in the hash, as the REPL encodes it', () => {
    // Strudel's own code2hash (@strudel/core 1.2.6) for this text, recorded before the package left.
    expect(strudelUrl(code)).toBe('https://strudel.cc/#YDwgQzRAMC4yNSB7RTQsIEc0fUAwLjUgfkAwLjI1ID5gLmFzKCJub3RlIikuc291bmQoInNpbmUiKS5jcG0oMTIwIC8gNCk%3D');
    expect(hash2code(new URL(strudelUrl(code)).hash.slice(1))).toBe(code);
  });

  it('keeps non-ASCII text and long takes intact', () => {
    const unicode = '// Sol–fa ♯ take\n`< F#4 Bb4 >`.as("note")';
    expect(strudelCodeHash(unicode)).toBe('Ly8gU29s4oCTZmEg4pmvIHRha2UKYDwgRiM0IEJiNCA%2BYC5hcygibm90ZSIp');
    expect(hash2code(strudelCodeHash(unicode))).toBe(unicode);

    const long = `\`< ${Array.from({ length: 6000 }, (_, index) => `C${index % 7}@0.25`).join(' ')} >\``;
    expect(hash2code(strudelCodeHash(long))).toBe(long);
  });

  it('escapes base64 characters that are not safe in a URL hash', () => {
    const hash = strudelCodeHash('?>?>');
    expect(hash).not.toMatch(/[+/=]/);
  });
});
