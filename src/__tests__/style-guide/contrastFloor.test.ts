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
  NOTE_SURFACE_SHEEN,
  noteLabelBackgrounds,
  resolveMonochromeKeySurface,
  resolveMusicColorKeySurface,
  type KeySurfaceColor,
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
  const lum = { ink: relativeLuminance(ink), ivory: relativeLuminance(ivory) };

  /*
   * KNOWN BAND — awaiting Burooj's decision (PR #170, BJS-504). Neither Ink
   * nor Ivory reaches 4.5:1 on a background whose luminance lies strictly
   * between these bounds; at the crossover the best either can do is
   * sqrt(contrast(Ink, Ivory)) = 4.17:1. Default octave 5 (L 0.575) lands here
   * for about half the hues. Closing it needs a design decision (accept, move
   * the Music Color octave ramp, or a label halo), not a different tone. Any
   * label below 4.5:1 must be explained by this band and nothing else.
   */
  const KNOWN_BAND = {
    // Ink reaches 4.5:1 from here up.
    inkFrom: TEXT * (lum.ink + 0.05) - 0.05,
    // Ivory reaches 4.5:1 from here down.
    ivoryTo: (lum.ivory + 0.05) / TEXT - 0.05,
  };

  function expectBestLabel(label: string, backgrounds: Rgb[]) {
    const tone = musicColorLabelTone(...(backgrounds as [Rgb, ...Rgb[]]));
    const other = tone === "ink" ? "ivory" : "ink";
    const worst = (name: "ink" | "ivory") =>
      Math.min(...backgrounds.map((background) => contrastRatio(toneColor[name], background)));
    const chosen = worst(tone);
    // Always the tone with the better worst case (the shipped crossover is rounded).
    expect(chosen, `${label}: ${tone} ${chosen.toFixed(3)} vs ${worst(other).toFixed(3)}`)
      .toBeGreaterThanOrEqual(worst(other) - 0.01);
    expect(chosen).toBeGreaterThanOrEqual(LARGE_TEXT);
    if (chosen < TEXT) {
      const luminances = backgrounds.map(relativeLuminance);
      const touchesBand = Math.min(...luminances) < KNOWN_BAND.inkFrom &&
        Math.max(...luminances) > KNOWN_BAND.ivoryTo;
      expect(touchesBand, `${label}: ${chosen.toFixed(2)}:1 outside the known band`).toBe(true);
    }
    return chosen;
  }

  function expectSurfaceLabels(label: string, surface: KeySurfaceColor, fill: Rgb, sheen: "colored" | "monochrome") {
    const backgrounds = noteLabelBackgrounds(fill, sheen);
    expect(surface.labelTone).toBe(musicColorLabelTone(...backgrounds.center));
    expect(surface.cornerLabelTones.top).toBe(musicColorLabelTone(...backgrounds.top));
    expect(surface.cornerLabelTones.bottom).toBe(musicColorLabelTone(...backgrounds.bottom));
    return [
      expectBestLabel(`${label} centre`, backgrounds.center),
      expectBestLabel(`${label} top corner`, backgrounds.top),
      expectBestLabel(`${label} bottom corner`, backgrounds.bottom),
    ];
  }

  it("ships the crossover the --ink and --ivory tokens imply", () => {
    const crossover = Math.sqrt((lum.ivory + 0.05) * (lum.ink + 0.05)) - 0.05;
    expect(Math.abs(MUSIC_COLOR_LABEL_CROSSOVER_LUMINANCE - crossover)).toBeLessThan(0.001);
    // The known band is real, and centred on the crossover.
    expect(KNOWN_BAND.ivoryTo).toBeLessThan(crossover);
    expect(KNOWN_BAND.inkFrom).toBeGreaterThan(crossover);
  });

  it("models the surface sheen with the peak strengths in the token source", () => {
    const peaks = (name: string) => {
      const value = tokens.get(name)!;
      const alphas = (rgb: string) => [...value.matchAll(new RegExp(`rgba\\(${rgb},\\s*([\\d.]+)\\)`, "g"))]
        .map((match) => Number(match[1]));
      return { highlight: Math.max(...alphas("255,\\s*255,\\s*255")), shade: Math.max(...alphas("0,\\s*0,\\s*0")) };
    };
    expect(NOTE_SURFACE_SHEEN.colored).toEqual(peaks("--paper-surface-sheen"));
    expect(NOTE_SURFACE_SHEEN.monochrome).toEqual(peaks("--paper-surface-sheen-monochrome"));
  });

  it("labels every pitch class at every octave, mapping, hue phase and key brightness", () => {
    const config = DEFAULT_CONFIG.dynamicColors;
    const modes: MusicColorMode[] = ["fixed", "movable-ordinal", "movable-relative"];
    const brightnessSteps = Array.from({ length: 18 }, (_, step) => 0.3 + step * 0.1);
    let labels = 0;
    let inBand = 0;

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
              const ratios = expectSurfaceLabels(
                `${musicColorMode} ${note}${octave} ×${keyBrightness.toFixed(1)}`, surface, fill, "colored",
              );
              labels += ratios.length;
              inBand += ratios.filter((ratio) => ratio < TEXT).length;
            }
          }
        }
      }
    }

    expect(labels).toBe(3 * 3 * 12 * 9 * 3 * 18);
    // The known band is real but narrow.
    expect(inBand / labels).toBeLessThan(0.15);
  }, 60_000);

  it("labels the whole configurable lightness and chroma range", () => {
    // Middle Lightness 0.2–0.9 with an octave span up to 0.7 reaches every L.
    for (let step = 0; step <= 100; step += 1) {
      const l = step / 100;
      for (const c of [0, 0.05, 0.18, 0.3]) {
        for (let h = 0; h < 360; h += 15) {
          const fill = mapOklchToSrgb({ l, c, h, alpha: 1 });
          const backgrounds = noteLabelBackgrounds(fill, "colored");
          expectBestLabel(`L ${l} C ${c} h ${h} centre`, backgrounds.center);
          expectBestLabel(`L ${l} C ${c} h ${h} top`, backgrounds.top);
          expectBestLabel(`L ${l} C ${c} h ${h} bottom`, backgrounds.bottom);
        }
      }
    }
  }, 60_000);

  it("labels monochrome surfaces by their lightness, not by accidental", () => {
    for (const accidental of [false, true]) {
      for (let brightness = 0.3; brightness <= 2.001; brightness += 0.1) {
        const surface = resolveMonochromeKeySurface(accidental, { keyBrightness: brightness });
        const grey = Number(surface.background.match(/(\d+(?:\.\d+)?)%, 1\)$/)![1]) / 100;
        expectSurfaceLabels(
          `monochrome ${accidental ? "accidental" : "natural"} ×${brightness.toFixed(1)}`,
          surface, { r: grey, g: grey, b: grey }, "monochrome",
        );
      }
    }
  });
});
