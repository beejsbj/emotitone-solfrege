import { describe, expect, it, vi } from 'vitest';
vi.unmock('@strudel/core');
// Strudel's own REPL hash codec, from the installed @strudel/core.
import { code2hash, hash2code } from '@strudel/core/util.mjs';
import { strudelCodeHash, strudelUrl } from '@/services/strudelLink';

describe('Open in Strudel link', () => {
  const code = '`< C4@0.25 {E4, G4}@0.5 ~@0.25 >`.as("note").sound("sine").cpm(120 / 4)';

  it('opens strudel.cc with the code in the hash, as the REPL encodes it', () => {
    expect(strudelUrl(code)).toBe(`https://strudel.cc/#${code2hash(code)}`);
    expect(hash2code(new URL(strudelUrl(code)).hash.slice(1))).toBe(code);
  });

  it('keeps non-ASCII text and long takes intact', () => {
    const unicode = '// Sol–fa ♯ take\n`< F#4 Bb4 >`.as("note")';
    expect(hash2code(strudelCodeHash(unicode))).toBe(unicode);

    const long = `\`< ${Array.from({ length: 6000 }, (_, index) => `C${index % 7}@0.25`).join(' ')} >\``;
    expect(hash2code(strudelCodeHash(long))).toBe(long);
  });

  it('escapes base64 characters that are not safe in a URL hash', () => {
    const hash = strudelCodeHash('?>?>');
    expect(hash).not.toMatch(/[+/=]/);
  });
});
