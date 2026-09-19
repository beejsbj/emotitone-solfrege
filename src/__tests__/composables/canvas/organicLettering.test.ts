import { describe, expect, it } from "vitest";
import { organicGlyph, sampleLetteringShape } from "@/composables/canvas/organicLettering";
import type { PreparedBlobFrame } from "@/types/canvas";

function body(xScale = 1, rotation = 0, offset = 0): PreparedBlobFrame {
  return {
    blob: { x: offset, y: offset }, scaledRadius: 40, opacity: 1,
    contour: Array.from({ length: 48 }, (_, i) => {
      const angle = i / 48 * Math.PI * 2;
      const x = Math.cos(angle) * 40 * xScale, y = Math.sin(angle) * 40;
      return { x: offset + x * Math.cos(rotation) - y * Math.sin(rotation),
        y: offset + x * Math.sin(rotation) + y * Math.cos(rotation) };
    }),
  } as PreparedBlobFrame;
}

describe("shape-driven lettering", () => {
  it("uses actual contour strain and ignores translation", () => {
    expect(sampleLetteringShape([body()]).stretch).toBeCloseTo(0);
    expect(sampleLetteringShape([body(1.2)]).stretch).toBeGreaterThan(0.5);
    expect(sampleLetteringShape([body(1.2, Math.PI / 4)]).bend).toBeGreaterThan(0.5);
    expect(sampleLetteringShape([body(1.2, 0, 300)]).stretch)
      .toBeCloseTo(sampleLetteringShape([body(1.2)]).stretch);
  });

  it("is deterministic and bounds distortion even for extreme shapes", () => {
    const shape = sampleLetteringShape([body(100, Math.PI / 8)]);
    expect(sampleLetteringShape([body(100, Math.PI / 8)])).toEqual(shape);
    for (const chord of [true, false]) for (const unit of [-4, -1, 0, 1, 4]) {
      const glyph = organicGlyph(shape, unit, chord);
      expect(Math.abs(glyph.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(glyph.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(glyph.angle)).toBeLessThanOrEqual(0.055);
      expect(glyph.scaleX).toBeLessThanOrEqual(1.035);
    }
  });

  it("returns identity without live bodies, including invisible/degenerate bodies", () => {
    const invisible = { ...body(2), opacity: 0 };
    const degenerate = { ...body(2), scaledRadius: 0 };
    expect(organicGlyph(sampleLetteringShape([invisible, degenerate]), 1, true))
      .toEqual({ x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 });
  });
});
