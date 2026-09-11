import { describe, expect, it } from "vitest";
import { resolveKeySurfaceColor } from "@/services/keySurfaceColor";

describe("key surface color projection", () => {
  it("applies the shared brightness and saturation tuning to colored surfaces", () => {
    expect(resolveKeySurfaceColor(
      "hsla(120, 80%, 60%, 1)",
      "colored",
      false,
      { keyBrightness: 0.5, keySaturation: 0.25 },
    )).toEqual({
      background: "hsla(120, 20%, 30%, 1)",
      primaryColor: "hsla(120, 20%, 30%, 1)",
    });
  });

  it("owns the natural and accidental monochrome bases", () => {
    expect(resolveKeySurfaceColor("ignored", "monochrome", false)).toEqual({
      background: "hsla(0, 0%, 10%, 1)",
      primaryColor: "hsla(0, 0%, 10%, 1)",
    });
    expect(resolveKeySurfaceColor("ignored", "monochrome", true)).toEqual({
      background: "hsla(0, 0%, 100%, 1)",
      primaryColor: "hsla(0, 0%, 100%, 1)",
    });
  });
});
