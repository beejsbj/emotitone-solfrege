import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import path from "node:path";
import { assertGuideReceipt, assertPersistenceComparisons, createCaptureWorkspace, verifyArchivedDeployment } from "./capture-policy.mjs";

const bytes = Buffer.from("known asset");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const response = (body) => new Response(body, { status: 200 });

test("deployment verification rejects a mismatched asset hash", async () => {
  const fetchImpl = async (url) => url.endsWith("/") ? response('<script src="/asset.js"></script>') : response(bytes);
  await assert.rejects(
    verifyArchivedDeployment({ fetchImpl, host: "https://example.test", expectedAssets: { "/asset.js": "0".repeat(64) } }),
    /hash mismatch/,
  );
});

test("deployment verification accepts a referenced asset with the expected hash", async () => {
  const fetchImpl = async (url) => url.endsWith("/") ? response('<script src="/asset.js"></script>') : response(bytes);
  const provenance = await verifyArchivedDeployment({ fetchImpl, host: "https://example.test", expectedAssets: { "/asset.js": sha256 } });
  assert.deepEqual(provenance.assets, [{ path: "/asset.js", sha256 }]);
  assert.equal(provenance.matchesArchivedAssetBaseline, true);
  assert.equal(provenance.deploymentRevisionEstablished, false);
});

test("persistence verification rejects any false comparison", () => {
  const output = {
    preview: { persistedFieldsUnchanged: true },
    discarded: { persistedFieldsUnchanged: true },
    kept: { persistedFieldsChanged: false },
    reloaded: { persistedFieldsMatchKept: true },
  };
  assert.throws(() => assertPersistenceComparisons(output), /Keep did not change persisted config/);
});

const passingGuideReceipt = () => ({
  viewports: ["desktop", "phone"].map((name) => ({
    viewport: { name },
    look: { storageUnchanged: true },
    knob: { changed: true },
    media: { reducedMotion: true, forcedColors: true, documentWidth: name === "desktop" ? 1440 : 390, viewportWidth: name === "desktop" ? 1440 : 390 },
  })),
});

test("guide verification rejects regressed recorded outcomes", () => {
  const regressions = [
    ["look", "storageUnchanged", /Discard did not restore local storage/],
    ["knob", "changed", /Knob drag did not change its value/],
    ["media", "reducedMotion", /Reduced Motion emulation was not active/],
    ["media", "forcedColors", /Forced Colors emulation was not active/],
  ];
  for (const [section, field, message] of regressions) {
    const result = passingGuideReceipt();
    result.viewports[1][section][field] = false;
    assert.throws(() => assertGuideReceipt(result), message);
  }

  const overflowing = passingGuideReceipt();
  overflowing.viewports[1].media.documentWidth = 391;
  assert.throws(() => assertGuideReceipt(overflowing), /document overflows horizontally/);
});

test("guide verification requires both expected viewports", () => {
  const result = passingGuideReceipt();
  result.viewports.pop();
  assert.throws(() => assertGuideReceipt(result), /did not capture both expected viewports/);
});

test("output policy rejects a dot-prefixed child inside the evidence archive", async () => {
  const archiveDirectory = path.join("/tmp", "archived-evidence");
  await assert.rejects(
    createCaptureWorkspace({ argv: ["--output", path.join(archiveDirectory, "..rerun")], archiveDirectory, label: "test" }),
    /Refusing to write rerun output inside archived evidence/,
  );
});
