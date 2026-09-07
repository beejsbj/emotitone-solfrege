import { describe, expect, it } from "vitest";
import appSource from "@/App.vue?raw";
import mainSource from "@/main.ts?raw";
import logoLabSource from "@/style-guide/logo-lab/LogoLab.vue?raw";

describe("Brand Logo definition lab", () => {
  it("mounts on an isolated lazy route without advancing the production Knob edition", () => {
    expect(appSource).toContain('pathname === "/logo-lab"');
    expect(appSource).toContain('import("./style-guide/logo-lab/LogoLab.vue")');
    expect(mainSource).toContain('["/style-guide", "/logo-lab"]');
  });

  it("compares three six-cut Paper Duet refinements without changing the old BrandLogo source", () => {
    for (const refinement of ["Tight Weave", "Loose Rhythm", "Shared Edge"]) {
      expect(logoLabSource).toContain(refinement);
    }

    for (const part of ["e-stem", "e-top", "e-middle", "e-bottom", "t-cap", "t-stem"]) {
      expect(logoLabSource.match(new RegExp(`data-cut=\\"${part}\\"`, "g"))).toHaveLength(3);
    }

    expect(logoLabSource).toContain("Round 02");
    expect(logoLabSource).toContain("Compact");
    expect(logoLabSource).toContain("One colour");
    expect(logoLabSource).not.toContain("@/components/uniques/BrandLogo.vue");
  });
});
