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

/*
 * Edition marks: every edition in a family must meet the floor before the
 * family joins Shuffle (BJS-508). Tabs, the Ring collar and the focus rings are
 * covered above; these are the marks only one edition draws.
 */
describe("edition-specific marks", () => {
  const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb => ({
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
  });

  it("Knob Arc: the value stroke reads against its 40% track and the Ink beneath, in Ivory and Brass", () => {
    for (const surface of INK_SURFACES) {
      for (const tone of ["--ivory", "--brass"]) {
        const value = token(tone);
        const track = over(value, 0.4, token(surface));
        expectContrast(`${tone} Arc value on ${surface}`, value, token(surface), MARK);
        expectContrast(`${tone} Arc value against its track on ${surface}`, value, track, MARK);
      }
    }
  });

  // The puck's position carries the chosen direction in both Joystick
  // editions. Analog's lit Ivory detent is a redundant cue: it reads against
  // the other detents but only 1.3-2.1:1 on the Brass bezel.
  it("Joystick Analog: the puck reads on the dark well and the detents on the Brass bezel", () => {
    // Brightest point of --instrument-control-dark-well: #252525 under its 10% white highlight.
    const wellHighlight = over({ r: 1, g: 1, b: 1 }, 0.1, { r: 0x25 / 255, g: 0x25 / 255, b: 0x25 / 255 });
    for (const [index, stop] of brassFillStops.entries()) {
      expectContrast(`puck stop ${index} on the dark well`, stop, wellHighlight, MARK);
      expectContrast(`detent on bezel stop ${index}`, token("--brass-edge"), stop, MARK);
    }
    expectContrast("effective detent against the other detents", ivory, token("--brass-edge"), MARK);
  });

  it("Joystick Digital: the ring, cap and detents read on the Ink plate", () => {
    const plate = token("--ink");
    expectContrast("ring", token("--brass"), plate, MARK);
    expectContrast("detent", token("--brass-lo"), plate, MARK);
    expectContrast("effective detent", token("--brass-hi"), plate, MARK);
    for (const [index, stop] of brassFillStops.entries()) {
      expectContrast(`cap stop ${index}`, stop, plate, MARK);
    }
  });
});
