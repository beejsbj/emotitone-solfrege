import { describe, expect, it, vi } from 'vitest';
vi.unmock('@strudel/core');
import { m } from '@strudel/mini';
import { transpiler } from '@strudel/transpiler';
import '@strudel/tonal';
import { renderStrudelNotation, type StrudelConfig } from '@/services/StrudelNotation';
import {
  noteIdAtLocations,
  setSoundingNotationSpans,
  soundingNoteIdForHap,
} from '@/services/notationSpans';
import type { LogNote } from '@/types/patterns';

function note(id: string, pitch: string, start: number, duration: number, extra: Partial<LogNote> = {}): LogNote {
  return {
    id, note: pitch, pressTime: start, releaseTime: start + duration, duration,
    octave: Number(pitch.slice(-1)), scaleIndex: 0, key: 'C', mode: 'major', instrument: 'sine',
    ...extra,
  } as LogNote;
}

// Play the generated code through the installed transpiler and mini-notation,
// then name each sounding onset by the span map, as the Strudel output does.
function soundingIds(notes: LogNote[], config: Partial<StrudelConfig> = {}) {
  const { code, spans } = renderStrudelNotation(notes, config);
  const { output } = transpiler(code);
  const pattern = new Function('m', output)(m);
  const events = pattern.queryArc(0, 4)
    .filter((hap: any) => hap.hasOnset())
    .map((hap: any) => `${hap.value.note ?? hap.value.n}=${noteIdAtLocations(spans, hap.context.locations)}`);
  // Every onset across several loops, as distinct pitch=id pairs in code order.
  const pairs = [...new Set<string>(events)];
  return { code, spans, pairs, onsets: events.length };
}

describe('notation generator spans', () => {
  it('emits one span per note id covering its value', () => {
    const notes = [note('a', 'C4', 0, 500), note('b', 'E4', 750, 250)];
    const { code, spans } = renderStrudelNotation(notes);

    // Byte-for-byte generated-code expectations live in StrudelNotation.test.ts.
    expect(spans.map((span) => span.noteId)).toEqual(['a', 'b']);
    expect(spans.map((span) => code.slice(span.from, span.to))).toEqual(['C4', 'E4']);
  });

  it('names every sounding note of a melody, a chord and offset lanes by its own id', () => {
    const { pairs, onsets } = soundingIds([
      note('lead', 'C4', 0, 500),
      note('root', 'E4', 1000, 500),
      note('fifth', 'G4', 1000, 500),
      note('long', 'A4', 2000, 1000),
      note('late', 'B4', 2250, 250),
    ]);

    expect(onsets).toBeGreaterThan(5);
    expect(pairs.sort()).toEqual(['A4=long', 'B4=late', 'C4=lead', 'E4=root', 'G4=fifth']);
  });

  it('covers control fields and relative degrees, so the whole atom names its note', () => {
    const notes = [
      note('do', 'C4', 0, 500, { gateDuration: 250 } as Partial<LogNote>),
      note('mi', 'E4', 500, 500, { scaleIndex: 2 }),
    ];
    const { code, spans, pairs } = soundingIds(notes, {
      notationType: 'relative', scaleKey: 'C', scaleMode: 'major', scaleOctave: 4,
    });

    expect(code).toContain('.scale("C4:major")');
    expect(spans.map((span) => code.slice(span.from, span.to))).toEqual(['0:0.5', '2:1']);
    expect(pairs.sort()).toEqual(['C4=do', 'E4=mi']);
  });

  it('keeps the same offsets on one line for the Code Strip', () => {
    const notes = [note('a', 'C4', 0, 500), note('b', 'D4', 500, 500)];
    const multiline = renderStrudelNotation(notes);
    const inline = renderStrudelNotation(notes, { inline: true });

    expect(inline.code).not.toContain('\n');
    expect(inline.code).toBe(multiline.code.replace(/\n/g, ' '));
    expect(inline.spans).toEqual(multiline.spans);
  });

  it('returns no spans for an empty take', () => {
    expect(renderStrudelNotation([])).toEqual({ code: '', spans: [] });
  });
});

describe('sounding note resolution', () => {
  const spans = [
    { noteId: 'a', from: 3, to: 5 },
    { noteId: 'b', from: 6, to: 8 },
  ];

  it('prefers the narrowest location, not an enclosing group', () => {
    expect(noteIdAtLocations(spans, [{ start: 2, end: 9 }, { start: 6, end: 8 }])).toBe('b');
  });

  it('names nothing when no location falls inside a note span', () => {
    expect(noteIdAtLocations(spans, [{ start: 20, end: 24 }])).toBeUndefined();
    expect(noteIdAtLocations(spans, undefined)).toBeUndefined();
  });

  it('reads the spans of the code that is sounding now', () => {
    const hap = { context: { locations: [{ start: 3, end: 5 }] } };
    setSoundingNotationSpans(spans);
    expect(soundingNoteIdForHap(hap)).toBe('a');
    setSoundingNotationSpans(null);
    expect(soundingNoteIdForHap(hap)).toBeUndefined();
  });
});
