/**
 * Stylelint rules for the colour law in CSS and Vue <style> blocks. Where they
 * apply is set in stylelint.config.mjs from lint/designZones.mjs; how much
 * existing debt a file may keep is lint/designLawBaseline.json (see baseline.mjs).
 */
import stylelint from "stylelint";
import { judge, relativeToRoot } from "./baseline.mjs";
import { styleDeclarationViolations } from "./colourPatterns.mjs";

const { createPlugin, utils } = stylelint;
const NAMESPACE = "design-law";

// A Vue file's <style> blocks are separate roots sharing one result: pool them, judge after the last.
const pooled = new WeakMap(); // result -> { [ruleName]: { found, seen } }

function styleRule({ kind, baselineKey, text }) {
  const ruleName = `${NAMESPACE}/${kind}`;
  const messages = utils.ruleMessages(ruleName, {
    violation: (found, value) => `${text(found)} (in "${value}")`,
    grown: (found, budget) =>
      `${found}: this file already has design-law debt (baseline allows ${budget} for ${baselineKey}) and must not gain more. Fix the new one; counts only go down.`,
    stale: (budget, count) =>
      `The baseline allows ${budget} for ${baselineKey} here but ${count} remain. Lower it with "bun run lint:baseline".`,
  });

  const rule = () => (root, result) => {
    const byRule = pooled.get(result) ?? {};
    pooled.set(result, byRule);
    const state = (byRule[ruleName] ??= { found: [], seen: 0 });
    const mine = state.found;
    root.walkDecls((decl) => {
      const hit = styleDeclarationViolations(decl.prop, decl.value)[kind === "no-brand-colour" ? "brand" : "raw"];
      if (hit) mine.push({ node: decl, found: hit, value: `${decl.prop}: ${decl.value.replace(/\s+/g, " ")}` });
    });
    state.seen += 1;
    const total = root.document ? root.document.nodes.length : 1;
    if (state.seen < total) return;

    const file = relativeToRoot(root.source?.input?.file ?? "");
    const verdict = judge(baselineKey, file, mine.length);
    if (verdict.kind === "violation") {
      for (const hit of mine) utils.report({ ruleName, result, node: hit.node, message: messages.violation(hit.found, hit.value) });
    } else if (verdict.kind === "grown") {
      for (const hit of mine) utils.report({ ruleName, result, node: hit.node, message: messages.grown(hit.found, verdict.budget) });
    } else if (verdict.kind === "stale") {
      utils.report({ ruleName, result, node: root.nodes?.[0] ?? root, message: messages.stale(verdict.budget, mine.length) });
    }
  };
  rule.ruleName = ruleName;
  rule.messages = messages;
  rule.meta = { url: "https://github.com/beejsbj/emotitone-solfrege/blob/main/AGENTS.md" };
  return createPlugin(ruleName, rule);
}

export default [
  styleRule({
    kind: "no-brand-colour",
    baselineKey: "style/no-brand-colour",
    text: (found) =>
      `Brand paper "${found}" is brand-zone only. In the playing zone, colour is Music Color plus Ink / Ivory / Brass tokens (WIP-bible section 3).`,
  }),
  styleRule({
    kind: "no-raw-colour",
    baselineKey: "style/no-raw-colour",
    text: (found) =>
      `Raw colour "${found}". Use a design-system token, or Music Color from the numeric OKLCH adapter (WIP-bible section 4).`,
  }),
];
