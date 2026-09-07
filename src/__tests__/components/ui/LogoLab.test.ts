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

  it("compares four new directions without changing the old BrandLogo source", () => {
    for (const direction of ["Offbeat", "Open Bell", "Paper Duet", "Resonance"]) {
      expect(logoLabSource).toContain(direction);
    }

    expect(logoLabSource).toContain("Compact");
    expect(logoLabSource).toContain("One colour");
    expect(logoLabSource).not.toContain("@/components/uniques/BrandLogo.vue");
  });
});
