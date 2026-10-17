import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FlatESLint } from "eslint/use-at-your-own-risk";

const root = resolve(__dirname, "../../..");
const eslint = new FlatESLint({ cwd: root, overrideConfigFile: resolve(root, "eslint.config.js") });

describe("undefined names in TypeScript excluded from type-check", () => {
  it.each([
    "src/__tests__/helpers/audio.ts",
    "src/composables/__tests__/audio.ts",
    "src/composables/audio.test.ts",
    "src/composables/audio.spec.ts",
    "src/test-setup.ts",
  ])("rejects an undefined name in an unexecuted helper in %s", async (filePath) => {
    const [result] = await eslint.lintText("export const createGain = () => gain;", {
      filePath: resolve(root, filePath),
    });

    expect(result.errorCount).toBe(1);
    expect(result.messages).toContainEqual(expect.objectContaining({ ruleId: "no-undef", severity: 2 }));
  });

  it("accepts declared names and the configured browser, Node and DOM type globals", async () => {
    const [result] = await eslint.lintText([
      'import { vi } from "vitest";',
      'const listener: EventListener = vi.fn();',
      'window.addEventListener("load", listener);',
      'export const nodeVersion = process.versions.node;',
    ].join("\n"), { filePath: resolve(root, "src/__tests__/helpers/audio.ts") });

    expect(result.errorCount).toBe(0);
    expect(result.messages.filter((message) => message.ruleId === "no-undef")).toEqual([]);
  });
});
