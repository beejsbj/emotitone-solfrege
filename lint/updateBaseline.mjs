/**
 * Regenerates lint/designLawBaseline.json from the violations that exist now.
 * The baseline is a ratchet: this refuses to raise a count or add a file, so it
 * is the tool for recording paid-down debt. `--allow-growth` overrides that for a
 * reviewed exception (say, a surface moved into the playing zone) and must be
 * justified in the PR.
 */
import { writeFileSync } from "node:fs";
import { BASELINE_FILE, RULES, loadBaseline } from "./baseline.mjs";
import { collectCounts } from "./designLawCounts.mjs";

const allowGrowth = process.argv.includes("--allow-growth");
// An unreadable baseline is not a first run: with nothing to ratchet against, today's violations
// would be recorded as debt. Only a reviewed --allow-growth rebuilds it from scratch.
let previous = {};
let hadBaseline = true;
try {
  previous = loadBaseline();
} catch (error) {
  if (!allowGrowth) {
    console.error(`${error.message}\n\n(To rebuild it from scratch, run with --allow-growth and justify it in the PR.)`);
    process.exit(1);
  }
  console.error(`${error.message}\nRebuilding from the violations that exist now (--allow-growth).`);
  hadBaseline = false;
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

if (growth.length && hadBaseline && !allowGrowth) {
  console.error("Refusing to raise the design-law baseline. New violations must be fixed, not recorded:\n  " + growth.join("\n  "));
  console.error("\n(Use --allow-growth only for a reviewed exception, and explain it in the PR.)");
  process.exit(1);
}

writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + "\n");
console.log(paidDown.length ? `Baseline lowered:\n  ${paidDown.join("\n  ")}` : "Baseline unchanged.");
if (growth.length && hadBaseline) console.log(`Baseline raised (--allow-growth):\n  ${growth.join("\n  ")}`);
