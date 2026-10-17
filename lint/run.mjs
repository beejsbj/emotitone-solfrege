// Run both halves even when ESLint fails, so the debt audit includes CSS.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { REPO_ROOT } from "./baseline.mjs";
let failed = false;
for (const [bin, args] of [["eslint", ["."]], ["stylelint", ["src/**/*.{vue,css}"]]]) {
  const result = spawnSync(resolve(REPO_ROOT, "node_modules/.bin", bin), args, { cwd: REPO_ROOT, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  failed ||= result.status !== 0;
}
process.exitCode = failed ? 1 : 0;
