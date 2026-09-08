import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import appSource from "@/App.vue?raw";
import mainSource from "@/main.ts?raw";
import logoLabSource from "@/style-guide/logo-lab/LogoLab.vue?raw";
import brandColorsSource from "@/style-guide/tokens/TokenBrandColors.vue?raw";

const designSystemSource = readFileSync(
  resolve(process.cwd(), "src/emotitone-design-system.css"),
  "utf8",
);

describe("Brand Logo definition lab", () => {
  it("mounts on an isolated lazy route without advancing the production Knob edition", () => {
    expect(appSource).toContain('pathname === "/logo-lab"');
    expect(appSource).toContain('import("./style-guide/logo-lab/LogoLab.vue")');
    expect(mainSource).toContain('["/style-guide", "/logo-lab"]');
  });

  it("focuses the selected six-cut Tight Weave without changing the old BrandLogo source", () => {
    expect(logoLabSource).toContain("Tight Weave");
    expect(logoLabSource).not.toContain("Loose Rhythm");
    expect(logoLabSource).not.toContain("Shared Edge");

    for (const part of ["e-stem", "e-top", "e-middle", "e-bottom", "t-cap", "t-stem"]) {
      expect(logoLabSource.match(new RegExp(`data-cut=\\"${part}\\"`, "g"))).toHaveLength(1);
    }

    expect(logoLabSource).toContain("Round 05");
    expect(logoLabSource).toContain("Compact survival");
    expect(logoLabSource).not.toContain("@/components/uniques/BrandLogo.vue");
  });

  it("compares four controlled treatments built from the real Mark primitive", () => {
    expect(logoLabSource).toContain('from "../../components/primatives/Mark.vue"');

    for (const treatment of ["Paper Flecks", "Musical Ink", "Little Burst", "One Overprint"]) {
      expect(logoLabSource).toContain(treatment);
    }

    for (const mark of ["diamond", "wave", "disk", "eighth", "staccato", "star", "zigzag"]) {
      expect(logoLabSource).toContain(`name: "${mark}"`);
    }
  });

  it("promotes Cobalt through the Brand token owner and real token specimen", () => {
    expect(designSystemSource).toMatch(/--cobalt:\s+#2f67b2/);
    expect(brandColorsSource).toContain("var(--cobalt)");
    expect(brandColorsSource).toContain("#2F67B2");
    expect(logoLabSource).toContain("--t-stem: var(--cobalt)");
  });
});
