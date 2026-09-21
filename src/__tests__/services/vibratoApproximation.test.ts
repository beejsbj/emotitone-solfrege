import { describe, expect, it } from "vitest";
import { approximateVibrato } from "@/services/vibratoApproximation";

describe("approximateVibrato", () => {
  it("returns undefined for invalid curves, a single drag, and tiny jitter", () => {
    expect(approximateVibrato(undefined)).toBeUndefined();
    expect(approximateVibrato([
      { timeMs: Number.NaN, cents: 20 }, { timeMs: 0, cents: Number.POSITIVE_INFINITY },
    ])).toBeUndefined();
    expect(approximateVibrato([
      { timeMs: 0, cents: -40 }, { timeMs: 100, cents: 40 }, { timeMs: 200, cents: 70 },
    ])).toBeUndefined();
    expect(approximateVibrato([
      { timeMs: 0, cents: 3 }, { timeMs: 50, cents: -4 }, { timeMs: 100, cents: 2 },
      { timeMs: 150, cents: -3 }, { timeMs: 200, cents: 4 },
    ])).toBeUndefined();
  });

  it("retains deliberate slow rocking instead of imposing a 2Hz floor", () => {
    const curve = Array.from({ length: 9 }, (_, index) => ({
      timeMs: index * 500, cents: index % 2 ? -30 : 30,
    }));
    expect(approximateVibrato(curve)).toEqual({ vib: 1, vibmod: 0.3 });
  });

  it("uses full zero-crossing cycles with uneven timestamps and bounds depth", () => {
    const result = approximateVibrato([
      { timeMs: 300, cents: -80 }, { timeMs: 0, cents: 0 },
      { timeMs: 24, cents: 80 }, { timeMs: 77, cents: -80 },
      { timeMs: 126, cents: 80 }, { timeMs: 178, cents: -80 },
      { timeMs: 225, cents: 80 }, { timeMs: 276, cents: -80 },
      { timeMs: 325, cents: 80 }, { timeMs: 375, cents: -80 },
    ])

    expect(result).toEqual({ vib: 10, vibmod: 0.5 })
  });
});
