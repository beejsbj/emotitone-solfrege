import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "@/services/musicColorCore";
import {
  readTokenDeclarations,
  tokenColor,
  tokenGradientStops,
  type Rgb,
} from "../helpers/designTokens";

/*
 * The contrast floor (WCAG 2): text 4.5:1 (1.4.3); marks and focus rings 3:1
 * against what they sit on (1.4.11, 2.4.13). Colours come from the token source.
 */
// Note-label colour follows accidentals by design (Burooj, 2026-10-15); contrast there is not enforced.
const TEXT = 4.5;
const MARK = 3;

const tokens = readTokenDeclarations();
const token = (name: string) => tokenColor(name, tokens);
const ivory = token("--ivory");
const INK_SURFACES = ["--ink", "--ink-2", "--ink-3", "--ink-4"] as const;
const brassFillStops = tokenGradientStops("--brass-fill", tokens);

function expectContrast(
  label: string,
  foreground: Rgb,
  background: Rgb,
  floor: number,
) {
  const ratio = contrastRatio(foreground, background);
  expect(ratio, `${label}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(floor);
}

describe("UI token contrast floor", () => {
  it("prints inactive-but-enabled text in --ivory-3 at 4.5:1 on every Ink surface", () => {
    for (const surface of INK_SURFACES) {
      expectContrast(`--ivory-3 on ${surface}`, token("--ivory-3"), token(surface), TEXT);
    }
  });

  it("keeps Tabs Marquee inactive and hovered labels at 4.5:1 on its --ink-2 rail", () => {
    const rail = token("--ink-2");
    expectContrast("inactive Ivory label", token("--ivory-3"), rail, TEXT);
    expectContrast("hovered Ivory label", token("--ivory-2"), rail, TEXT);
    expectContrast("inactive Brass label", token("--brass-lo"), rail, TEXT);
    expectContrast("active Brass label", token("--brass-hi"), rail, TEXT);
  });

  it("prints the active Brass chip label at 4.5:1 on every stop of --brass-fill", () => {
    expect(brassFillStops.length).toBeGreaterThan(2);
    for (const [index, stop] of brassFillStops.entries()) {
      expectContrast(`--brass-edge on --brass-fill stop ${index}`, token("--brass-edge"), stop, TEXT);
    }
  });

  it("keeps unlit LED marks at 3:1 on every Ink surface, below every lit mark", () => {
    const unlit = token("--led-off");
    for (const surface of INK_SURFACES) {
      expectContrast(`--led-off on ${surface}`, unlit, token(surface), MARK);
    }
    // Lit chads and bulbs are Ivory or Brass with a glow; they must still read
    // brighter than the unlit mark beside them.
    for (const lit of ["--ivory", "--brass", "--brass-hi"]) {
      expect(relativeLuminance(token(lit))).toBeGreaterThan(relativeLuminance(unlit));
    }
    expectContrast("lit Ivory chad against unlit", ivory, unlit, MARK);
  });

  it("draws a focus ring that reaches 3:1 on every cap and surface material", () => {
    const inner = token("--focus-ring-inner");
    const outer = token("--focus-ring-outer");
    expect(tokens.get("--focus-ring-width")).toBe("2px");
    expectContrast("inner ring against outer ring", inner, outer, MARK);

    const materials: Array<[string, Rgb]> = [
      ...["--ink", "--ink-2", "--ink-3", "--ink-4", "--ink-5"].map((name) => [name, token(name)] as [string, Rgb]),
      ...["--ivory", "--ivory-2", "--ivory-3", "--ivory-4"].map((name) => [name, token(name)] as [string, Rgb]),
      ...["--brass", "--brass-hi", "--brass-lo", "--brass-edge", "--led-off"].map((name) => [name, token(name)] as [string, Rgb]),
      ...brassFillStops.map((stop, index) => [`--brass-fill stop ${index}`, stop] as [string, Rgb]),
    ];
    for (const [name, material] of materials) {
      const best = Math.max(contrastRatio(inner, material), contrastRatio(outer, material));
      expect(best, `focus ring on ${name}: ${best.toFixed(2)}:1`).toBeGreaterThanOrEqual(MARK);
    }
  });
});
