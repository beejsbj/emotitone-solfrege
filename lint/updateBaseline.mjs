/**
 * Regenerates lint/designLawBaseline.json from the violations that exist now.
 * The baseline is a ratchet: this refuses to raise a count or add a file, so it
 * is the tool for recording paid-down debt. `--allow-growth` overrides that for a
 * reviewed exception (say, a surface moved into the playing zone) and must be
 * justified in the PR.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { BASELINE_FILE, RULES } from "./baseline.mjs";
import { collectCounts } from "./designLawCounts.mjs";

const allowGrowth = process.argv.includes("--allow-growth");
let previous = {};
try {
  previous = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
} catch {
  // First run: there is nothing to ratchet against.
}
const next = collectCounts();

const growth = [];
const paidDown = [];
for (const rule of RULES) {
  for (const [file, count] of Object.entries(next[rule])) {
    const before = previous[rule]?.[file] ?? 0;
    if (count > before) growth.push(`${rule}: ${file} ${before} -> ${count}`);
    if (count < before) paidDown.push(`${rule}: ${file} ${before} -> ${count}`);
  }
  for (const file of Object.keys(previous[rule] ?? {})) {
    if (!next[rule][file]) paidDown.push(`${rule}: ${file} ${previous[rule][file]} -> 0 (entry removed)`);
  }
}

if (growth.length && Object.keys(previous).length && !allowGrowth) {
  console.error("Refusing to raise the design-law baseline. New violations must be fixed, not recorded:\n  " + growth.join("\n  "));
  console.error("\n(Use --allow-growth only for a reviewed exception, and explain it in the PR.)");
  process.exit(1);
}

writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + "\n");
console.log(paidDown.length ? `Baseline lowered:\n  ${paidDown.join("\n  ")}` : "Baseline unchanged.");
if (growth.length && Object.keys(previous).length) console.log(`Baseline raised (--allow-growth):\n  ${growth.join("\n  ")}`);
