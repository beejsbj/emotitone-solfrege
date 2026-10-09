/**
 * Counts every design-law violation that exists right now, ignoring the baseline
 * (it runs the real ESLint and Stylelint with DESIGN_LAW_NO_ALLOWLIST=1). Used to
 * regenerate the baseline and to test that the committed one is exact.
 * Returns { rule: { file: count } } in the baseline's shape.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PLAYING_ZONE_DIRS, PLAYING_ZONE_FILES } from "./designZones.mjs";
import { REPO_ROOT, RULES, relativeToRoot } from "./baseline.mjs";

const run = (bin, args) => {
  try {
    execFileSync(resolve(REPO_ROOT, "node_modules/.bin", bin), args, {
      cwd: REPO_ROOT,
      env: { ...process.env, DESIGN_LAW_NO_ALLOWLIST: "1" },
      stdio: ["ignore", "ignore", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    // Violations make the linters exit non-zero; the report file is what we read.
  }
};

export function collectCounts() {
  const counts = Object.fromEntries(RULES.map((rule) => [rule, {}]));
  const bump = (rule, file) => {
    counts[rule][file] = (counts[rule][file] ?? 0) + 1;
  };
  const dir = mkdtempSync(resolve(tmpdir(), "design-law-"));
  try {
    const eslintReport = resolve(dir, "eslint.json");
    run("eslint", [...PLAYING_ZONE_DIRS, ...PLAYING_ZONE_FILES, "-f", "json", "-o", eslintReport]);
    for (const file of JSON.parse(readFileSync(eslintReport, "utf8"))) {
      for (const message of file.messages) {
        const rule = message.ruleId?.replace(/^design-law\//, "");
        if (RULES.includes(rule)) bump(rule, relativeToRoot(file.filePath));
      }
    }

    const styleReport = resolve(dir, "stylelint.json");
    run("stylelint", ["src/**/*.{vue,css}", "-f", "json", "--output-file", styleReport]);
    for (const file of JSON.parse(readFileSync(styleReport, "utf8"))) {
      for (const warning of file.warnings) {
        if (warning.rule?.startsWith("design-law/")) bump(`style/${warning.rule.slice("design-law/".length)}`, relativeToRoot(file.source));
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const rule of RULES) {
    counts[rule] = Object.fromEntries(Object.entries(counts[rule]).sort(([a], [b]) => a.localeCompare(b)));
  }
  return counts;
}
