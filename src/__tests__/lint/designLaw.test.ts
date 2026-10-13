// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FlatESLint } from "eslint/use-at-your-own-risk";
import stylelint from "stylelint";
// @ts-expect-error plain ESM modules, no types
import { assertCompleteReport, collectCounts } from "../../../lint/designLawCounts.mjs";

/**
 * The design-law lint (BJS-481) is behaviour of the real ESLint and Stylelint
 * configs: lint a file at a path in a zone and see what CI would say. Existing
 * debt is the committed baseline (lint/designLawBaseline.json).
 */
const root = resolve(__dirname, "../../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");
const baseline = JSON.parse(read("lint/designLawBaseline.json")) as Record<string, Record<string, number>>;

const eslint = new FlatESLint({ cwd: root, overrideConfigFile: resolve(root, "eslint.config.js") });

async function eslintProblems(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: resolve(root, filePath) });
  return result.messages.filter((m) => m.severity === 2).map((m) => ({ rule: m.ruleId ?? "parse-error", message: m.message }));
}
const eslintRules = async (filePath: string, code: string) => (await eslintProblems(filePath, code)).map((p) => p.rule);

async function styleProblems(codeFilename: string, code: string): Promise<string[]> {
  const result = await stylelint.lint({
    code,
    codeFilename: resolve(root, codeFilename),
    configFile: resolve(root, "stylelint.config.mjs"),
  });
  return result.results.flatMap((r) => [
    ...r.warnings.map((w) => w.text),
    ...r.parseErrors.map((e) => `parse error: ${e.text}`),
  ]);
}

const vue = (script: string, template = "<div />", style = "") =>
  `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n${style}`;
const style = (css: string) => `<style scoped>\n.x {\n${css}\n}\n</style>\n`;

const STORES = "design-law/no-store-imports";
const SERVICES = "design-law/no-production-service-imports";
const BRAND = "design-law/no-brand-colour";
const RAW = "design-law/no-raw-colour";
const BUTTON = "design-law/no-bespoke-button";

describe("import boundary: primitives and compounds", () => {
  const primitive = "src/components/primatives/FreshPrimitive.vue";
  const compound = "src/components/compounds/FreshCompound.vue";

  it("rejects a store import, absolute or relative", async () => {
    expect(await eslintRules(primitive, vue('import { useMusicStore } from "@/stores/music";\nuseMusicStore();'))).toContain(STORES);
    expect(await eslintRules(compound, vue('import { useMusicStore } from "../../stores/music";\nuseMusicStore();'))).toContain(STORES);
  });

  it("rejects a production service and the audio engine", async () => {
    expect(await eslintRules(primitive, vue('import { stageAudio } from "@/services/stageAudio";\nstageAudio;'))).toContain(SERVICES);
    expect(await eslintRules(compound, vue('import { x } from "@/audio/liveRenderer";\nx;'))).toContain(SERVICES);
    expect(await eslintRules(compound, vue('import { x } from "../../services/liveAudio";\nx;'))).toContain(SERVICES);
  });

  it("rejects dynamic import(), require() and re-exports of the same targets (bypass 1)", async () => {
    for (const [code, rule] of [
      ['export const x = import("@/stores/music");', STORES],
      ['export const load = (n: string) => import("../../stores/" + n);', STORES],
      ['export const load = (n: string) => import("@/services/" + n);', SERVICES],
      ['export const x = import("@/components/../stores/music");', STORES],
      ['export const x = import("../../stores/music");', STORES],
      ['export const x = import("../../../src/stores/music");', STORES],
      ['export const x = import("@/services/inputVoiceGroups");', SERVICES],
      ['export const x = import("../../audio/live/types");', SERVICES],
      ["export const load = (n: string) => import(`@/stores/${n}`);", STORES],
      ['export { useMusicStore } from "@/stores/music";', STORES],
      ['export * from "../../services/liveAudio";', SERVICES],
      ['const x = require("@/stores/music");\nexport { x };', STORES],
    ] as const) {
      expect(await eslintRules("src/components/primatives/fresh.ts", code), code).toContain(rule);
    }
    expect(await eslintRules(compound, vue('const load = () => import("@/stores/music");\nload;'))).toContain(STORES);
  });

  it("resolves root-absolute paths such as /src/stores/music (BJS-520)", async () => {
    expect(await eslintRules(primitive, vue('import { useMusicStore } from "/src/stores/music";\nuseMusicStore();'))).toContain(STORES);
    expect(await eslintRules(compound, vue('export const x = import("/src/services/stageAudio");'))).toContain(SERVICES);
    expect(await eslintRules(compound, vue('import { x } from "/src/services/musicColor";\nx;'))).toEqual([]);
    expect(await eslintRules(compound, vue('import { x } from "/node_modules/gsap/index.js";\nx;'))).toEqual([]);
  });

  it("forbids the playback engine and exempts colocated specs", async () => {
    expect(await eslintRules(primitive, vue('import { createPlayStyleEngine } from "@/services/playStyles"; void createPlayStyleEngine;'))).toContain(SERVICES);
    expect(await eslintRules("src/components/primatives/fresh.spec.ts", 'import { s } from "@/stores/music"; export const c = "#123456"; void s;')).toEqual([]);
  });

  it("allows type-only imports, pure services, composables and ordinary dynamic imports", async () => {
    const code = vue(
      [
        'import type { MusicState } from "@/stores/music";',
        'import { type Foo } from "../../services/stageAudio";',
        'import { getChromaticNoteForScaleIndex } from "@/services/musicColor";',
        'import { useUIBeatScale } from "@/composables/useUIBeat";',
        'export type { Bar } from "@/stores/music";',
        'const lazy = () => import("gsap");',
        "const s: MusicState | null = null;",
        "[s, getChromaticNoteForScaleIndex, useUIBeatScale, lazy];",
      ].join("\n"),
    );
    expect(await eslintRules(primitive, code)).toEqual([]);
  });

  it("does not apply outside primitives and compounds", async () => {
    const code = vue('import { useMusicStore } from "@/stores/music";\nuseMusicStore();');
    expect(await eslintRules("src/components/FreshPanel.vue", code)).toEqual([]);
  });
});

describe("use the primitives: no bespoke buttons", () => {
  const panel = "src/components/FreshPanel.vue";

  it("rejects a raw <button> in a playing-zone component, compounds and uniques included", async () => {
    for (const path of [panel, "src/components/compounds/FreshCompound.vue", "src/components/uniques/Fresh/index.vue"]) {
      expect(await eslintRules(path, vue("", "<button type=\"button\" @click=\"go\">Go</button>")), path).toContain(BUTTON);
    }
    expect(await eslintRules("src/components/fresh.tsx", "export const view = <button>Go</button>;")).toContain(BUTTON);
  });

  it("rejects an <a> with its own visual styling, but not a plain link", async () => {
    for (const anchor of ['<a href="/x" class="rounded px-3">Go</a>', '<a href="/x" :class="{ on }">Go</a>', '<a href="/x" style="padding: 4px">Go</a>', '<a href="/x" role="button">Go</a>']) {
      expect(await eslintRules(panel, vue("", anchor)), anchor).toContain(BUTTON);
    }
    expect(await eslintRules("src/components/fresh.tsx", 'export const view = <a href="/x" className="pill">Go</a>;')).toContain(BUTTON);
    expect(await eslintRules(panel, vue("", '<a href="/credits">Credits</a>'))).toEqual([]);
  });

  it("rejects bound literal button roles in Vue and JSX, while allowing link roles", async () => {
    expect(await eslintRules(panel, vue("", '<a :role="\'button\'">Go</a>'))).toEqual([BUTTON]);
    expect(await eslintRules("src/components/fresh.tsx", 'export const view = <a role={"button"}>Go</a>;')).toEqual([BUTTON]);
    expect(await eslintRules(panel, vue("", '<a href="/x" :role="\'link\'">Go</a>'))).toEqual([]);
    expect(await eslintRules("src/components/fresh.tsx", 'export const view = <a href="/x" role={"link"}>Go</a>;')).toEqual([]);
  });

  it("accepts the Button primitive and other components, however they are spelled", async () => {
    const code = vue('import Button from "@/components/primatives/Button.vue";\nvoid Button;', '<Button accessible-name="Go">Go</Button><button-group /><span class="button" />');
    expect(await eslintRules(panel, code)).toEqual([]);
  });

  it("does not apply inside the primitives folder, the brand zone or tests", async () => {
    const code = vue("", '<button type="button">Go</button>');
    for (const path of ["src/components/primatives/FreshControl.vue", "src/components/primatives/Knob/Fresh.vue", "src/components/compositions/LoadingScreen.vue", "src/style-guide/FreshPage.vue"]) {
      expect(await eslintRules(path, code), path).toEqual([]);
    }
  });

  it("lets a file with recorded debt keep it, and fails when it gains another or pays one down", async () => {
    const path = "src/components/compounds/Key.vue";
    const key = read(path);
    expect(baseline["no-bespoke-button"][path]).toBe(1);
    expect(await eslintRules(path, key)).toEqual([]);
    expect(await eslintRules(path, key.replace("</template>", "<button>More</button></template>"))).toContain(BUTTON);
    const paidDown = await eslintProblems(path, vue("export {};"));
    expect(paidDown.map((p) => p.rule)).toContain(BUTTON);
    expect(paidDown.map((p) => p.message).join()).toMatch(/lower it with "bun run lint:baseline"/i);
  });
});

describe("baseline: a file with debt may not gain more (bypass 2)", () => {
  it("passes a file with exactly its recorded debt", async () => {
    for (const file of ["src/components/primatives/Note.vue", "src/components/compounds/Keyboard.vue", "src/composables/canvas/harmonicTypography.ts"]) {
      expect(await eslintRules(file, read(file)), file).toEqual([]);
    }
    expect(await styleProblems("src/components/primatives/Readout.vue", read("src/components/primatives/Readout.vue"))).toEqual([]);
  });

  it("fails when a listed file gains a raw colour or a brand paper in script", async () => {
    const note = read("src/components/primatives/Note.vue");
    const grown = note.replace("</script>", 'const newForbiddenColour = "#123456";\nvoid newForbiddenColour;\n</script>');
    expect(await eslintRules("src/components/primatives/Note.vue", grown)).toContain(RAW);
    const mark = read("src/components/primatives/Mark.vue");
    expect(await eslintRules("src/components/primatives/Mark.vue", mark.replace("</script>", 'const t = "cobalt";\nvoid t;\n</script>'))).toContain(BRAND);
  });

  it("fails when a listed file gains another store or service import", async () => {
    const keyboard = read("src/components/compounds/Keyboard.vue");
    const path = "src/components/compounds/Keyboard.vue";
    expect(await eslintRules(path, keyboard.replace("</script>", 'const more = () => import("@/stores/phrases");\nvoid more;\n</script>'))).toContain(STORES);
    expect(await eslintRules(path, keyboard.replace("</script>", 'import("@/services/liveAudio");\n</script>'))).toContain(SERVICES);
  });

  it("fails when a listed file gains a style violation", async () => {
    const readout = read("src/components/primatives/Readout.vue");
    const grown = readout.replace("</style>", ".more { background: rgba(10, 20, 30, .5); }\n</style>");
    expect((await styleProblems("src/components/primatives/Readout.vue", grown)).join()).toMatch(/must not gain more/);
    expect((await styleProblems("src/components/primatives/Readout.vue", readout + style("background: #123456;"))).join()).toMatch(/must not gain more/);
    const mark = read("src/components/primatives/Mark.vue").replace("</style>", ".more { color: var(--cobalt); }\n</style>");
    expect((await styleProblems("src/components/primatives/Mark.vue", mark)).join()).toMatch(/must not gain more/);
  });

  it("fails when debt is paid down but the baseline still records it, so counts only go down", async () => {
    const stale = await eslintProblems("src/components/primatives/Note.vue", vue("export {};"));
    expect(stale.map((p) => p.rule)).toContain(RAW);
    expect(stale.map((p) => p.message).join()).toMatch(/lower it with "bun run lint:baseline"/i);
    expect((await styleProblems("src/components/primatives/Readout.vue", vue("export {};", "<div />", style("color: var(--ink);")))).join()).toMatch(/Lower it with/);
  });

  it("is exactly today's debt: nothing stale, nothing unlisted", { timeout: 180_000 }, () => {
    expect(collectCounts()).toEqual(baseline);
  });

  it("refuses debt collection from actual fatal lint reports", async () => {
    const script = await eslint.lintText("const =", { filePath: resolve(root, "src/components/fresh.ts") });
    const css = await stylelint.lint({ code: ".x {", codeFilename: resolve(root, "src/components/fresh.css"), configFile: resolve(root, "stylelint.config.mjs") });
    const invalidConfig = await stylelint.lint({ code: ".x {}", config: { rules: { "unknown-rule": true } } });
    for (const report of [script, css.results, invalidConfig.results]) expect(() => assertCompleteReport(report)).toThrow(/could not parse/);
    const ordinary = await eslint.lintText('const c = "#abc"; void c;', { filePath: resolve(root, "src/components/fresh.ts") });
    expect(() => assertCompleteReport(ordinary)).not.toThrow();
  });

  it("judges all Vue roots together and visits interpolation-only templates", async () => {
    const note = "src/components/primatives/Note.vue";
    const colours = Array(baseline["no-raw-colour"][note]).fill("'#abc'").join(",");
    expect(await eslintRules(note, vue("", `<div /><div :data-colours="[${colours}]" />`))).toEqual([]);
    expect(await eslintRules("src/components/Fresh.vue", vue("", "{{ '#abc' }}"))).toContain(RAW);
  });
});

describe("colour law in script and template", () => {
  const playing = "src/components/compounds/FreshCompound.vue";

  it("rejects brand papers as tone names, custom properties and template attributes", async () => {
    expect(await eslintRules(playing, vue('const tone = "tomato";\ntone;'))).toContain(BRAND);
    expect(await eslintRules(playing, vue('const c = "color-mix(in srgb, var(--bone) 40%, transparent)";\nc;'))).toContain(BRAND);
    expect(await eslintRules(playing, vue("", '<Sticker color="mustard" />'))).toContain(BRAND);
  });

  it("rejects raw hex, rgb, hsl and oklch literals in script, templates and template literals", async () => {
    for (const code of [
      vue('const c = "#d8362a";\nc;'),
      vue("const c = `rgba(0, 0, 0, ${1})`;\nc;"),
      vue('const c = "hsl(48, 96%, 78%)";\nc;'),
      vue('const c = "oklch(70% 0.1 20)";\nc;'),
      vue("", '<div class="border-[#76544f] p-2" />'),
    ]) {
      expect(await eslintRules(playing, code)).toContain(RAW);
    }
  });

  it("rejects inline named colours without rejecting token tone names or prose", async () => {
    for (const [template, rule] of [
      ['<div style=" color: tomato" />', BRAND], ['<div class="bg-[tomato]" />', BRAND],
      ['<div class="bg-white" />', RAW], ['<div style="border: 1px solid white" />', RAW],
      ["<div :style=\"{ color: true ? 'black' : 'currentColor' }\" />", RAW],
    ]) expect(await eslintRules(playing, vue("", template)), template).toContain(rule);
    expect(await eslintRules(playing, vue('const s = { color: "white" }; void s;'))).toContain(RAW);
    expect(await eslintRules(playing, vue('const s = { tone: "ivory", label: "white" }; const resolvedColor = () => true ? "ivory" : "ink"; void [s, resolvedColor];', '<div title="white" class="text-ivory" />'))).toEqual([]);
  });

  it("parses JSX and TSX before applying colour rules", async () => {
    for (const ext of ["jsx", "tsx"]) {
      const file = `src/components/fresh.${ext}`;
      expect(await eslintRules(file, 'export const view = <div style={{ color: "var(--ink)" }} />;')).toEqual([]);
      expect(await eslintRules(file, 'export const view = <div style={{ color: "#123456" }} />;')).toContain(RAW);
    }
  });

  it("checks inline property variants and shorthand values in style objects", async () => {
    for (const [property, value, rule] of [
      ["border-top", "1px solid white", RAW], ["outline", "1px solid tomato", BRAND],
      ["column-rule", "1px solid white", RAW], ["text-decoration", "underline tomato", BRAND],
      ["background-image", "linear-gradient(white, transparent)", RAW],
      ["--edge", "1px solid white", RAW],
    ]) {
      expect(await eslintRules(playing, vue("", `<div style="${property}: ${value}" />`))).toContain(rule);
      expect(await eslintRules(playing, vue("", `<div :style="{ '${property}': '${value}' }" />`))).toContain(rule);
    }
    expect(await eslintRules(playing, vue('const s = { borderTop: "1px solid white", outline: "1px solid tomato" }; void s;'))).toEqual([RAW, BRAND]);
    expect(await eslintRules(playing, vue('const s = { fontFamily: "white", animation: "tan 1s" }; void s;', '<div style="font-family: white; animation: tan 1s; color: var(--ivory)" />'))).toEqual([]);
  });

  it("rejects Tailwind palette shades, variants and directional utilities", async () => {
    for (const name of ["red", "blue", "slate", "zinc", "neutral", "stone", "amber", "emerald", "sky", "rose"]) {
      for (const utility of ["bg", "text", "hover:border-t", "ring-offset"]) expect(await eslintRules(playing, vue("", `<div class="${utility}-${name}-500/80" />`))).toContain(RAW);
    }
    expect(await eslintRules(playing, vue("", '<div class="text-ivory bg-transparent border-current" />'))).toEqual([]);
  });

  it("covers every runtime source extension, not just .vue and .ts (bypass 3)", async () => {
    const code = 'export const colour = "#123456";\nexport const tone = "tomato";';
    for (const path of [
      "src/composables/useFresh.js",
      "src/components/primatives/Fresh.js",
      "src/components/compounds/fresh.mjs",
      "src/composables/canvas/useFresh.ts",
    ]) {
      const rules = await eslintRules(path, code);
      expect(rules, path).toContain(RAW);
      expect(rules, path).toContain(BRAND);
    }
    expect(await eslintRules("src/components/fresh.cjs", 'module.exports = { colour: "#123456", tone: "tomato" };')).toEqual([RAW, BRAND]);
    expect(await eslintRules("src/components/primatives/fresh.js", 'import { s } from "@/stores/music";\nexport default s;')).toContain(STORES);
  });

  it("rejects named colours in SVG paint attributes, static and bound (BJS-520)", async () => {
    for (const template of ['<svg><path fill="white" /></svg>', '<svg><path :stroke="\'black\'" /></svg>', '<svg><stop stop-color="red" /></svg>', '<svg><path fill="tomato" /></svg>']) {
      expect(await eslintRules(playing, vue("", template)), template).toEqual([template.includes("tomato") ? BRAND : RAW]);
    }
    expect(await eslintRules("src/components/fresh.tsx", 'export const view = <svg><path fill="white" /></svg>;')).toContain(RAW);
    expect(await eslintRules(playing, vue("", '<svg><path fill="none" stroke="currentColor" /><path :fill="`var(--ivory)`" /></svg><Sticker color="ivory" />'))).toEqual([]);
  });

  it("rejects named colours inside computed callbacks, but not unrelated strings there (BJS-520)", async () => {
    for (const script of [
      'const color = computed(() => "white");\nvoid color;',
      'const style = computed(() => ({ color: "white" }));\nvoid style;',
      'const stroke = computed(() => { return on.value ? "black" : "var(--ink)"; });\nvoid stroke;',
    ]) {
      expect(await eslintRules(playing, vue(`import { computed, ref } from "vue";\nconst on = ref(true);\n${script}`)), script).toEqual([RAW]);
    }
    const fine = 'const label = computed(() => (on.value === "white" ? "white" : "ink"));\nconst tone = computed(() => (on.value ? "brass" : "ivory"));\nvoid [label, tone];';
    expect(await eslintRules(playing, vue(`import { computed, ref } from "vue";\nconst on = ref(true);\n${fine}`))).toEqual([]);
  });

  it("allows Ivory tone names but rejects CSS ivory in styles, SVG and computed colours", async () => {
    for (const template of ['<div :style="{ color: \'ivory\' }" />', '<svg><path fill="ivory" /></svg>', '<svg><path :stroke="\'ivory\'" /></svg>']) {
      expect(await eslintRules(playing, vue("", template)), template).toEqual([RAW]);
    }
    for (const script of ['const color = "ivory";', 'const color = computed(() => "ivory");', 'const style = computed(() => ({ color: "ivory" }));']) {
      expect(await eslintRules(playing, vue(`${script}\nvoid 0;`)), script).toEqual([RAW]);
    }
    expect(await eslintRules("src/components/fresh.tsx", 'export const view = <svg><path fill="ivory" /></svg>;')).toEqual([RAW]);
    expect(await eslintRules(playing, vue("", '<Mark tone="ivory" /><Sticker :color="\'ivory\'" /><div :style="{ color: \'var(--ivory)\' }" />'))).toEqual([]);
    const token = 'const resolvedColor = computed<StickerPaperColor>(() => props.color ?? "ivory");';
    expect(await eslintRules(playing, vue(token))).toEqual([]);
    expect(await eslintRules(playing, vue(token.replace('"ivory"', '"white"')))).toEqual([RAW]);
  });

  it("checks writable computed getters without treating setter strings as colours", async () => {
    for (const script of ['const color = computed({ get: () => "white", set() {} });', 'const stroke = computed({ get() { return "ivory"; }, set() {} });']) {
      expect(await eslintRules(playing, vue(script)), script).toEqual([RAW]);
    }
    expect(await eslintRules(playing, vue('const color = computed({ get: () => "var(--ivory)", set(value) { log("white", value); } });'))).toEqual([]);
    expect(await eslintRules(playing, vue('const label = computed({ get: () => "white", set() {} });'))).toEqual([]);
  });

  it("allows tokens, transparent, currentColor and ordinary strings", async () => {
    const code = vue(
      'const a = "var(--ink)";\nconst b = "var(--brass)";\nconst c = "transparent";\nconst d = "currentColor";\nconst e = "pine-tree";\n[a, b, c, d, e];',
    );
    expect(await eslintRules(playing, code)).toEqual([]);
  });

  it("checks named colours initialized with Vue refs", async () => {
    for (const factory of ["ref", "shallowRef"]) {
      expect(await eslintRules(playing, vue(`import { ${factory} } from "vue"; const color = ${factory}("white");`, '<div :style="{ color }" />'))).toContain(RAW);
    }
  });

  it("allows inline mask stops without exempting adjacent colours", async () => {
    for (const template of ['<div style="mask: linear-gradient(#000 0 0)" />', '<div :style="{ WebkitMaskImage: `linear-gradient(#000, transparent)` }" />']) {
      expect(await eslintRules(playing, vue("", template))).toEqual([]);
    }
    expect(await eslintRules(playing, vue("", '<div style="mask: linear-gradient(#000 0 0); color: #fff" />'))).toContain(RAW);
  });

  it("allows SVG fragment references but still rejects adjacent colour literals", async () => {
    expect(await eslintRules(playing, vue("", '<svg><use href="#face" :xlink:href="\'#abc\'" style="filter: url(#abc)" /></svg>'))).toEqual([]);
    for (const ext of ["jsx", "tsx"]) expect(await eslintRules(`src/components/fresh.${ext}`, 'export const view = <svg><use href="#face" xlinkHref="#abc" /></svg>;')).toEqual([]);
    expect(await styleProblems("src/components/fresh.css", ".x { filter: url(#abc); clip-path: url('#face'); }")).toEqual([]);
    expect((await styleProblems("src/components/fresh.css", ".x { filter: url(#abc); color: #abc; }")).join()).toMatch(/Raw colour/);
  });

  it("does not apply to the brand zone, services or the style guide", async () => {
    const code = vue('const c = "#d8362a" + "var(--tomato)";\nc;');
    for (const path of [
      "src/components/uniques/BrandLogo.vue",
      "src/components/compositions/LoadingScreen.vue",
      "src/style-guide/FreshPage.vue",
      "src/services/musicColor.ts",
    ]) {
      expect(await eslintRules(path, path.endsWith(".ts") ? 'export const c = "#d8362a";' : code)).toEqual([]);
    }
  });
});

describe("colour law in styles", () => {
  const playing = "src/components/compounds/FreshCompound.vue";
  const inVue = (css: string) => vue("", "<div />", style(css));

  it("rejects brand tokens and raw colour in a Vue style block", async () => {
    expect((await styleProblems(playing, inVue("color: var(--tomato);"))).join()).toMatch(/Brand paper/);
    expect((await styleProblems(playing, inVue("--rim: color-mix(in srgb, var(--plum) 30%, transparent);"))).join()).toMatch(/Brand paper/);
    expect((await styleProblems(playing, inVue("box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5);"))).join()).toMatch(/Raw colour/);
    expect((await styleProblems(playing, inVue("background: #1a1a1a;"))).join()).toMatch(/Raw colour/);
  });

  it("rejects bare CSS named colours, brand tones included (bypass 4)", async () => {
    expect((await styleProblems(playing, inVue("color: tomato; --accent: plum;"))).join()).toMatch(/Brand paper "tomato"[\s\S]*Brand paper "plum"|Brand paper "plum"[\s\S]*Brand paper "tomato"/);
    expect((await styleProblems(playing, inVue("background: rebeccapurple;"))).join()).toMatch(/Raw colour "rebeccapurple"/);
    expect((await styleProblems(playing, inVue("border: 1px solid white;"))).join()).toMatch(/Raw colour "white"/);
    expect((await styleProblems(playing, inVue("--glow: color-mix(in srgb, mustard 40%, transparent);"))).join()).toMatch(/Brand paper "mustard"/);
    expect((await styleProblems("src/components/primatives/fresh.css", ".x { color: bone; }")).join()).toMatch(/Brand paper "bone"/);
  });

  it("rejects modern raw colour functions in styles, script and inline styles", async () => {
    for (const value of [
      "oklch(70% .1 20)", "oklab(.7 .1 .1)", "lab(70% 10 10)", "lch(70% 20 30)",
      "hwb(20 10% 10%)", "color(display-p3 1 0 0)", "device-cmyk(0 1 1 0)",
    ]) {
      expect((await styleProblems(playing, inVue(`color: ${value};`))).join(), value).toMatch(/Raw colour/);
      expect(await eslintRules(playing, vue(`const c = "${value}"; void c;`)), value).toContain(RAW);
      expect(await eslintRules(playing, vue("", `<div style="color: ${value}" />`)), value).toContain(RAW);
    }
  });

  it("rejects declared brand custom properties even when their values are allowed tokens", async () => {
    for (const token of ["tomato", "mustard", "plum", "cobalt", "pine", "bone"]) {
      expect((await styleProblems(playing, inVue(`--${token}: var(--ivory);`))).join()).toMatch(/Brand paper/);
    }
    expect((await styleProblems("src/components/fresh.css", ".x { --tomato: var(--ivory); }")).join()).toMatch(/Brand paper/);
    expect(await styleProblems(playing, inVue("--tomato-edge: var(--ivory); --ink: currentColor;"))).toEqual([]);
  });

  it("allows transparent, currentColor, inherit, tokens, masks and non-colour words", async () => {
    const css = [
      "color: var(--ivory);",
      "background: var(--brass-sheen), transparent;",
      "border-color: currentColor;",
      "outline-color: inherit;",
      "font-family: 'Lets Jazz', sans-serif;",
      "animation: tan-spin 1s linear infinite;",
      "transition: color .2s ease;",
      "-webkit-mask: linear-gradient(#000 0 0) content-box;",
      "mask: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 5px);",
    ].join("\n");
    expect(await styleProblems(playing, inVue(css))).toEqual([]);
  });

  it("parses plain CSS as CSS and Vue as Vue, even where baseline entries mix them (bypass 5)", async () => {
    const control = "src/components/primatives/instrumentControl.css";
    const css = read(control);
    expect(await styleProblems(control, css)).toEqual([]);
    expect((await styleProblems(control, `${css}\n.more { color: var(--tomato); }\n`)).join()).toMatch(/Brand paper/);
    expect((await styleProblems("src/components/primatives/fresh.css", ".x { color: var(--tomato); }")).join()).toMatch(/Brand paper/);
    const chord = "src/components/compounds/ChordKey.vue";
    expect((await styleProblems(chord, read(chord).replace("</style>", ".more { color: var(--tomato); }\n</style>"))).join()).toMatch(/Brand paper/);
  });

  it("leaves the brand zone, the style guide and token sources alone", async () => {
    const css = style("color: var(--tomato); background: #d8362a;");
    expect(await styleProblems("src/components/uniques/BrandLogo.vue", vue("", "<div />", css))).toEqual([]);
    expect(await styleProblems("src/style-guide/FreshPage.vue", vue("", "<div />", css))).toEqual([]);
    expect(await styleProblems("src/emotitone-design-system.css", ":root { --tomato: #d8362a; }")).toEqual([]);
  });
});

describe("an unreadable baseline stops the lint instead of passing it (BJS-520)", () => {
  const bad = ["", "{", "[]", "{}", '{"no-raw-colour": {}}', '{"no-raw-colour": {"src/a.vue": "three"}}', '{"no-raw-colour": {"src/a.vue": -1}}'];
  const withBaseline = (contents: string | null, run: (file: string) => void) => {
    const dir = mkdtempSync(resolve(tmpdir(), "design-law-baseline-"));
    const file = resolve(dir, "baseline.json");
    try {
      if (contents !== null) writeFileSync(file, contents);
      run(file);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const node = (script: string, args: string[], file: string, input?: string) =>
    spawnSync(process.execPath, [resolve(root, script), ...args], { cwd: root, input, encoding: "utf8", env: { ...process.env, DESIGN_LAW_BASELINE_FILE: file } });

  it("loads the committed baseline from a fresh file without needing regeneration", () => {
    withBaseline(JSON.stringify(baseline), (file) => {
      const result = node("node_modules/.bin/eslint", ["--stdin", "--stdin-filename", "src/components/FreshPanel.vue"], file, vue("export {};"));
      expect(result.status, result.stderr).toBe(0);
    });
  });

  it("makes ESLint fail with a message naming the baseline, for a missing, empty or malformed file", { timeout: 60_000 }, () => {
    for (const contents of [null, ...bad]) {
      withBaseline(contents, (file) => {
        const result = node("node_modules/.bin/eslint", ["--stdin", "--stdin-filename", "src/components/FreshPanel.vue"], file, vue("export {};"));
        expect(result.status, String(contents)).not.toBe(0);
        expect(result.stderr, String(contents)).toMatch(/design-law baseline .* (?:is unreadable|is malformed)/);
      });
    }
  });

  it("refuses to rebuild the baseline from scratch without --allow-growth, and leaves the file alone", { timeout: 60_000 }, () => {
    for (const contents of bad) {
      withBaseline(contents, (file) => {
        const result = node("lint/updateBaseline.mjs", [], file);
        expect(result.status, contents).toBe(1);
        expect(result.stderr, contents).toMatch(/--allow-growth/);
        expect(readFileSync(file, "utf8")).toBe(contents);
      });
    }
  });
});
