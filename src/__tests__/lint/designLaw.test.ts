// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FlatESLint } from "eslint/use-at-your-own-risk";
import stylelint from "stylelint";
// @ts-expect-error plain ESM config module, no types
import { RECORDED_ALLOWLIST } from "../../../lint/designZones.mjs";

/**
 * The design-law lint (BJS-481) is behaviour of the real ESLint and Stylelint
 * configs: lint a file at a path in a zone and see what CI would say.
 */
const root = resolve(__dirname, "../../..");
const allowlist = RECORDED_ALLOWLIST as Record<string, string[]>;

const eslint = new FlatESLint({ cwd: root, overrideConfigFile: resolve(root, "eslint.config.js") });

async function eslintRules(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, filePath) });
  return result.messages
    .filter((m) => m.severity === 2)
    .map((m) => m.ruleId ?? "parse-error");
}

async function styleProblems(codeFilename: string, code: string): Promise<string[]> {
  const result = await stylelint.lint({
    code,
    codeFilename: resolve(root, codeFilename),
    configFile: resolve(root, "stylelint.config.mjs"),
  });
  return result.results.flatMap((r) => r.warnings.map((w) => w.text));
}

const vue = (script: string, template = "<div />", style = "") =>
  `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n${style}`;

const STORE = "@typescript-eslint/no-restricted-imports";

describe("import boundary: primitives and compounds", () => {
  const primitive = "src/components/primatives/FreshPrimitive.vue";
  const compound = "src/components/compounds/FreshCompound.vue";

  it("rejects a store import, absolute or relative", async () => {
    expect(await eslintRules(primitive, vue('import { useMusicStore } from "@/stores/music";\nuseMusicStore();'))).toContain(STORE);
    expect(await eslintRules(compound, vue('import { useMusicStore } from "../../stores/music";\nuseMusicStore();'))).toContain(STORE);
  });

  it("rejects a production service and the audio engine", async () => {
    expect(await eslintRules(primitive, vue('import { stageAudio } from "@/services/stageAudio";\nstageAudio;'))).toContain(STORE);
    expect(await eslintRules(compound, vue('import { x } from "@/audio/liveRenderer";\nx;'))).toContain(STORE);
  });

  it("allows type-only imports, pure services and composables", async () => {
    const code = vue(
      [
        'import type { MusicState } from "@/stores/music";',
        'import { getChromaticNoteForScaleIndex } from "@/services/musicColor";',
        'import { useUIBeatScale } from "@/composables/useUIBeat";',
        "const s: MusicState | null = null;",
        "[s, getChromaticNoteForScaleIndex, useUIBeatScale];",
      ].join("\n"),
    );
    expect(await eslintRules(primitive, code)).toEqual([]);
  });

  it("does not apply outside primitives and compounds", async () => {
    const code = vue('import { useMusicStore } from "@/stores/music";\nuseMusicStore();');
    expect(await eslintRules("src/components/FreshPanel.vue", code)).toEqual([]);
  });

  it("holds an allowlisted file to the kinds it is not allowlisted for", async () => {
    const [file] = allowlist["no-store-imports"];
    expect(allowlist["no-production-service-imports"]).toContain(file);
    expect(await eslintRules(file, vue('import { useMusicStore } from "@/stores/music";\nuseMusicStore();'))).toEqual([]);
  });
});

describe("colour law in script and template", () => {
  const playing = "src/components/compounds/FreshCompound.vue";

  it("rejects brand papers as tone names, custom properties and template attributes", async () => {
    expect(await eslintRules(playing, vue('const tone = "tomato";\ntone;'))).toContain("design-law/no-brand-colour");
    expect(await eslintRules(playing, vue('const c = "color-mix(in srgb, var(--bone) 40%, transparent)";\nc;'))).toContain("design-law/no-brand-colour");
    expect(await eslintRules(playing, vue("", '<Sticker color="mustard" />'))).toContain("design-law/no-brand-colour");
  });

  it("rejects raw hex, rgb, hsl and oklch literals in script, templates and template literals", async () => {
    for (const code of [
      vue('const c = "#d8362a";\nc;'),
      vue("const c = `rgba(0, 0, 0, ${1})`;\nc;"),
      vue('const c = "hsl(48, 96%, 78%)";\nc;'),
      vue('const c = "oklch(70% 0.1 20)";\nc;'),
      vue("", '<div class="border-[#76544f] p-2" />'),
    ]) {
      expect(await eslintRules(playing, code)).toContain("design-law/no-raw-colour");
    }
  });

  it("allows tokens, transparent, currentColor and ordinary strings", async () => {
    const code = vue(
      'const a = "var(--ink)";\nconst b = "var(--brass)";\nconst c = "transparent";\nconst d = "currentColor";\nconst e = "pine-tree";\n[a, b, c, d, e];',
    );
    expect(await eslintRules(playing, code)).toEqual([]);
  });

  it("applies to composables but not to the brand zone, services or the style guide", async () => {
    const code = vue('const c = "#d8362a" + "var(--tomato)";\nc;');
    expect(await eslintRules("src/composables/useFresh.ts", 'export const c = "#d8362a";')).toContain("design-law/no-raw-colour");
    for (const path of [
      "src/components/uniques/BrandLogo.vue",
      "src/components/compositions/LoadingScreen.vue",
      "src/style-guide/FreshPage.vue",
      "src/services/musicColor.ts",
    ]) {
      expect(await eslintRules(path, path.endsWith(".ts") ? 'export const c = "#d8362a";' : code)).toEqual([]);
    }
  });

  it("exempts an allowlisted file from that rule only", async () => {
    const file = allowlist["no-brand-colour"][0];
    expect(await eslintRules(file, vue('const tone = "tomato";\ntone;'))).toEqual([]);
    expect(await eslintRules(file, vue('const c = "#d8362a";\nc;'))).toContain("design-law/no-raw-colour");
  });
});

describe("colour law in styles", () => {
  const playing = "src/components/compounds/FreshCompound.vue";
  const style = (css: string) => `<style scoped>\n.x {\n${css}\n}\n</style>\n`;

  it("rejects brand tokens and raw colour in a Vue style block", async () => {
    expect((await styleProblems(playing, vue("", "<div />", style("color: var(--tomato);")))).join()).toMatch(/Brand paper/);
    expect((await styleProblems(playing, vue("", "<div />", style("--rim: color-mix(in srgb, var(--plum) 30%, transparent);")))).join()).toMatch(/Brand paper/);
    expect((await styleProblems(playing, vue("", "<div />", style("box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5);")))).join()).toMatch(/Raw colour/);
    expect((await styleProblems(playing, vue("", "<div />", style("background: #1a1a1a;")))).join()).toMatch(/Raw colour/);
  });

  it("rejects the same in a plain CSS file", async () => {
    expect((await styleProblems("src/components/primatives/fresh.css", ".x { color: var(--cobalt); }"))).toHaveLength(1);
    expect((await styleProblems("src/components/primatives/fresh.css", ".x { color: hsl(10 20% 30%); }"))).toHaveLength(1);
  });

  it("allows tokens, transparent, currentColor and gradient masks", async () => {
    const css = style(
      [
        "color: var(--ivory);",
        "background: var(--brass-sheen), transparent;",
        "border-color: currentColor;",
        "-webkit-mask: linear-gradient(#000 0 0) content-box;",
        "mask: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 5px);",
      ].join("\n"),
    );
    expect(await styleProblems(playing, vue("", "<div />", css))).toEqual([]);
  });

  it("leaves the brand zone, the style guide and token sources alone", async () => {
    const css = style("color: var(--tomato); background: #d8362a;");
    expect(await styleProblems("src/components/uniques/BrandLogo.vue", vue("", "<div />", css))).toEqual([]);
    expect(await styleProblems("src/style-guide/FreshPage.vue", vue("", "<div />", css))).toEqual([]);
    expect(await styleProblems("src/emotitone-design-system.css", ":root { --tomato: #d8362a; }")).toEqual([]);
  });

  it("exempts an allowlisted file from that rule only", async () => {
    const file = allowlist["style/no-brand-colour"].find((f) => !allowlist["style/no-raw-colour"].includes(f));
    expect(file, "some file is allowlisted for brand colour but not raw colour").toBeTruthy();
    expect(await styleProblems(file!, vue("", "<div />", style("color: var(--tomato);")))).toEqual([]);
    expect((await styleProblems(file!, vue("", "<div />", style("color: #d8362a;")))).join()).toMatch(/Raw colour/);
  });
});

describe("the allowlist is exactly today's debt", () => {
  const run = (bin: string, args: string[]) => {
    try {
      return execFileSync(resolve(root, "node_modules/.bin", bin), args, {
        cwd: root,
        env: { ...process.env, DESIGN_LAW_NO_ALLOWLIST: "1" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (error) {
      return (error as { stdout: string }).stdout;
    }
  };

  it("lists no file that is gone and none that is already fixed or missing", { timeout: 120_000 }, () => {
    const found: Record<string, Set<string>> = Object.fromEntries(Object.keys(allowlist).map((k) => [k, new Set<string>()]));
    const rel = (p: string) => p.replace(`${root}/`, "");

    const eslintReport = JSON.parse(run("eslint", ["src/components", "src/composables", "src/App.vue", "src/MainApp.vue", "-f", "json"]));
    for (const file of eslintReport) {
      for (const m of file.messages) {
        if (m.ruleId === "design-law/no-brand-colour") found["no-brand-colour"].add(rel(file.filePath));
        if (m.ruleId === "design-law/no-raw-colour") found["no-raw-colour"].add(rel(file.filePath));
        if (m.ruleId === STORE) {
          found[/stores/.test(m.message) ? "no-store-imports" : "no-production-service-imports"].add(rel(file.filePath));
        }
      }
    }
    // Stylelint writes JSON to stderr on failure, so ask for a file.
    const reportFile = resolve(mkdtempSync(resolve(tmpdir(), "design-law-")), "stylelint.json");
    run("stylelint", ["src/**/*.{vue,css}", "-f", "json", "--output-file", reportFile]);
    const styleReport = JSON.parse(readFileSync(reportFile, "utf8"));
    for (const file of styleReport) {
      for (const w of file.warnings) {
        found[w.text.startsWith("Brand paper") ? "style/no-brand-colour" : "style/no-raw-colour"].add(rel(file.source));
      }
    }

    for (const [rule, files] of Object.entries(allowlist)) {
      for (const file of files) expect(existsSync(resolve(root, file)), `${rule}: ${file} no longer exists`).toBe(true);
      expect([...found[rule]].sort(), `${rule}: allowlist differs from the violations that remain`).toEqual([...files].sort());
    }
  });
});
