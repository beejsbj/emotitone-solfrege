import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { CHROMATIC_NOTES } from "@/data";
import {
  contrastRatio,
  mapOklchToSrgb,
  musicColorLabelTone,
  relativeLuminance,
  MUSIC_COLOR_LABEL_CROSSOVER_LUMINANCE,
  type MusicColorMode,
} from "@/services/musicColorCore";
import { resolveMusicColorSampleByPitchClass } from "@/services/musicColor";
import {
  resolveMonochromeKeySurface,
  resolveMusicColorKeySurface,
} from "@/services/keySurfaceColor";
import {
  parseCssRgb,
  readTokenDeclarations,
  tokenColor,
  tokenGradientStops,
  type Rgb,
} from "../helpers/designTokens";

/*
 * The contrast floor (WCAG 2): text 4.5:1 (1.4.3); marks and focus rings 3:1
 * against what they sit on (1.4.11, 2.4.13). Every colour here comes from the
 * token source or from the Music Color authority's own output.
 */
const TEXT = 4.5;
const MARK = 3;
// Bold text from 18.66px counts as large text and needs 3:1.
const LARGE_TEXT = 3;

const tokens = readTokenDeclarations();
const token = (name: string) => tokenColor(name, tokens);
const ink = token("--ink");
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

describe("Note label tone from the Music Color authority", () => {
  const toneColor = { ink, ivory } as const;
  // The best any Ink/Ivory choice can guarantee: the fill whose contrast with
  // both is equal gets the geometric mean of the Ink–Ivory ratio.
  const ceiling = Math.sqrt(contrastRatio(ink, ivory));

  function expectBestLabel(label: string, fill: Rgb) {
    const tone = musicColorLabelTone(fill);
    const chosen = contrastRatio(toneColor[tone], fill);
    const other = contrastRatio(toneColor[tone === "ink" ? "ivory" : "ink"], fill);
    // Always the stronger token (the shipped crossover is rounded to 0.01 luminance).
    expect(chosen, `${label}: ${tone} ${chosen.toFixed(3)} vs ${other.toFixed(3)}`)
      .toBeGreaterThanOrEqual(other - 0.01);
    // 4.5:1 wherever Ink or Ivory can reach it; otherwise the ceiling.
    expect(chosen, `${label}: ${tone} ${chosen.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(Math.min(TEXT, ceiling - 0.01));
    expect(chosen).toBeGreaterThanOrEqual(LARGE_TEXT);
    return chosen;
  }

  it("ships the crossover the --ink and --ivory tokens imply", () => {
    const crossover = Math.sqrt(
      (relativeLuminance(ivory) + 0.05) * (relativeLuminance(ink) + 0.05),
    ) - 0.05;
    expect(Math.abs(MUSIC_COLOR_LABEL_CROSSOVER_LUMINANCE - crossover)).toBeLessThan(0.001);
  });

  it("labels every pitch class at every octave, mapping, hue phase and key brightness", () => {
    const config = DEFAULT_CONFIG.dynamicColors;
    const modes: MusicColorMode[] = ["fixed", "movable-ordinal", "movable-relative"];
    const brightnessSteps = Array.from({ length: 18 }, (_, step) => 0.3 + step * 0.1);
    let samples = 0;
    let belowText = 0;

    for (const musicColorMode of modes) {
      for (const note of CHROMATIC_NOTES) {
        for (let octave = 1; octave <= 9; octave += 1) {
          // Hue motion swings each cell sinusoidally; 0.25 and 0.75 are its extremes.
          for (const phase of [null, 0.25, 0.75]) {
            const resolved = resolveMusicColorSampleByPitchClass(
              note, "major", "C", octave, { ...config, musicColorMode }, "fixed-chromatic", phase,
            );
            expect(resolved, `${note}${octave}`).not.toBeNull();
            for (const keyBrightness of brightnessSteps) {
              const surface = resolveMusicColorKeySurface(resolved!.sample.primary, { keyBrightness });
              const fill = parseCssRgb(surface.background);
              expect(surface.labelTone).toBe(musicColorLabelTone(fill));
              const chosen = expectBestLabel(`${musicColorMode} ${note}${octave} ×${keyBrightness.toFixed(1)}`, fill);
              samples += 1;
              if (chosen < TEXT) belowText += 1;
            }
          }
        }
      }
    }

    expect(samples).toBe(3 * 12 * 9 * 3 * 18);
    // The mid-lightness band where neither token reaches 4.5:1 is real but narrow.
    expect(belowText / samples).toBeLessThan(0.1);
  });

  it("labels the whole configurable lightness and chroma range", () => {
    // Middle Lightness 0.2–0.9 with an octave span up to 0.7 reaches every L.
    for (let step = 0; step <= 100; step += 1) {
      const l = step / 100;
      for (const c of [0, 0.05, 0.18, 0.3]) {
        for (let h = 0; h < 360; h += 15) {
          expectBestLabel(`L ${l} C ${c} h ${h}`, mapOklchToSrgb({ l, c, h, alpha: 1 }));
        }
      }
    }
  });

  it("labels monochrome surfaces by their lightness, not by accidental", () => {
    for (const accidental of [false, true]) {
      for (let brightness = 0.3; brightness <= 2.001; brightness += 0.1) {
        const surface = resolveMonochromeKeySurface(accidental, { keyBrightness: brightness });
        const grey = Number(surface.background.match(/(\d+(?:\.\d+)?)%, 1\)$/)![1]) / 100;
        const fill = { r: grey, g: grey, b: grey };
        expect(surface.labelTone).toBe(musicColorLabelTone(fill));
        expectBestLabel(`monochrome ${accidental ? "accidental" : "natural"} ×${brightness.toFixed(1)}`, fill);
      }
    }
  });
});
