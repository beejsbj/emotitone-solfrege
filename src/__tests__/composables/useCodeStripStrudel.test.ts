import { afterEach, describe, expect, it } from "vitest";
import { useCodeStripStrudel } from "@/composables/useCodeStripStrudel";

/** The Code Strip's text, as the shelf's Open in Strudel reads it. */
describe("the Code Strip's shared code", () => {
  afterEach(() => useCodeStripStrudel().clearCode());

  it("treats comment-prefixed code as playable but rejects comment-only documents", () => {
    const code = useCodeStripStrudel();
    code.syncCode("// Evening arrangement\n/* Keep this soft */\nsound('piano')");
    expect(code.hasPlayableCode.value).toBe(true);

    code.syncCode("// Arrangement pending\n/* No notes yet */");
    expect(code.hasPlayableCode.value).toBe(false);

    for (const lineBreak of ["\r", "\r\n", " ", " "]) {
      code.syncCode(`// Arrangement${lineBreak}sound('piano')`);
      expect(code.hasPlayableCode.value).toBe(true);
    }
  });

  it("is shared by every reader, and empty once the strip leaves", () => {
    useCodeStripStrudel().syncCode("`< C4 >`.as(\"note\")");
    expect(useCodeStripStrudel().currentCode.value).toBe("`< C4 >`.as(\"note\")");
    useCodeStripStrudel().clearCode();
    expect(useCodeStripStrudel().currentCode.value).toBe("");
    expect(useCodeStripStrudel().hasPlayableCode.value).toBe(false);
  });
});
