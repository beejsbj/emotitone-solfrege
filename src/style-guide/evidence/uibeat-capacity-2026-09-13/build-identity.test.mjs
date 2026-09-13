import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { collectBuildIdentity, parseEntryAssets } from "./build-identity.mjs";
import { verifyLoadedBuildIdentity } from "./capture-build-identity.mjs";

const REVISION = "0123456789abcdef0123456789abcdef01234567";
const OTHER_REVISION = "fedcba9876543210fedcba9876543210fedcba98";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function manifestFor(files, entryAssets = ["assets/app.js", "assets/app.css"]) {
  return {
    schemaVersion: 1,
    sourceRevision: REVISION,
    createdAt: "2026-09-13T12:00:00.000Z",
    build: { command: ["bun", "run", "build"], bunVersion: "1.3.14", declaredPackageManager: "bun@1.2.17" },
    entryDocument: { path: "index.html", bytes: 1, sha256: hash("x") },
    entryAssets,
    assets: Object.entries(files).map(([path, content]) => ({
      path,
      type: path.endsWith(".js") ? "script" : "stylesheet",
      bytes: Buffer.byteLength(content),
      sha256: hash(content),
    })),
  };
}

function fakeCdp({
  files = { "assets/app.js": "current js", "assets/app.css": "current css", "assets/lazy.js": "lazy js" },
  manifest = manifestFor(files),
  manifestStatus = 200,
  manifestUrl = "https://device.test/emotitone-build-identity.json",
  unavailable,
  resourceUrls,
  documentContent = "x",
} = {}) {
  const calls = [];
  const urls = resourceUrls ?? Object.keys(files).map((path) => `https://device.test/${path}`);
  return {
    calls,
    async command(method, params) {
      calls.push({ method, params });
      if (method === "Page.enable") return {};
      if (method === "Page.getResourceTree") {
        return {
          frameTree: {
            frame: { id: "MAIN", url: "https://device.test/?capture=1" },
            resources: urls.map((url) => ({
              url,
              type: url.endsWith(".css") ? "Stylesheet" : "Script",
            })),
          },
        };
      }
      if (method === "Runtime.evaluate") {
        return { result: { value: { status: manifestStatus, url: manifestUrl, text: JSON.stringify(manifest) } } };
      }
      if (method === "Page.getResourceContent") {
        if (params.url === "https://device.test/?capture=1") {
          if (unavailable === "index.html") throw new Error("resource body evicted");
          return { content: documentContent, base64Encoded: false };
        }
        const path = new URL(params.url).pathname.slice(1);
        if (unavailable === path) throw new Error("resource body evicted");
        return { content: files[path], base64Encoded: false };
      }
      throw new Error(`Unexpected CDP command ${method}`);
    },
  };
}

test("collects hashes for emitted JavaScript, CSS, and direct entry assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emotitone-build-identity-"));
  try {
    await mkdir(join(directory, "assets"));
    const index = '<script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css">';
    await writeFile(join(directory, "index.html"), index);
    await writeFile(join(directory, "assets/app.js"), "app");
    await writeFile(join(directory, "assets/app.css"), "css");
    await writeFile(join(directory, "assets/lazy.js"), "lazy");
    await writeFile(join(directory, "sw.js"), "service worker");
    const identity = await collectBuildIdentity({
      distRoot: directory,
      sourceRevision: REVISION,
      bunVersion: "1.3.14",
      declaredPackageManager: "bun@1.2.17",
      createdAt: "2026-09-13T12:00:00.000Z",
    });
    assert.deepEqual(identity.entryAssets, ["assets/app.css", "assets/app.js"]);
    assert.deepEqual(identity.assets.map(({ path }) => path), ["assets/app.css", "assets/app.js", "assets/lazy.js", "sw.js"]);
    assert.equal(identity.assets.find(({ path }) => path === "assets/app.js").sha256, hash("app"));
    assert.equal(identity.build.bunVersion, "1.3.14");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects entry assets outside the bounded root Vite assets directory", () => {
  assert.throws(() => parseEntryAssets('<script src="/../escape.js"></script><link rel="stylesheet" href="/assets/app.css">'), /bounded assets directory/);
});

test("proves current loaded resource bytes through CDP", async () => {
  const cdp = fakeCdp();
  const proof = await verifyLoadedBuildIdentity({ cdp, expectedRevision: REVISION });
  assert.equal(proof.sourceRevision, REVISION);
  assert.deepEqual(proof.verifiedResources.map(({ path }) => path), ["assets/app.css", "assets/app.js", "assets/lazy.js"]);
  assert.equal(proof.entryDocument.url, "https://device.test/?capture=1");
  assert.equal(cdp.calls.filter(({ method }) => method === "Page.getResourceContent").length, 4);
  assert.equal(proof.manifestUrl, "https://device.test/emotitone-build-identity.json");
});

test("rejects a stale tab whose loaded assets do not include the manifest entry", async () => {
  const files = { "assets/old.js": "old", "assets/app.css": "current css" };
  const manifest = manifestFor({ ...files, "assets/app.js": "new" });
  const cdp = fakeCdp({ files, manifest });
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp, expectedRevision: REVISION }),
    /did not load expected entry asset assets\/app\.js/,
  );
});

test("rejects loaded bytes that do not match the source-bound manifest", async () => {
  const files = { "assets/app.js": "changed js", "assets/app.css": "current css" };
  const manifest = manifestFor({ "assets/app.js": "expected js", "assets/app.css": "current css" });
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ files, manifest }), expectedRevision: REVISION }),
    /does not match the source-bound manifest/,
  );
});

test("rejects a stale or modified main document with matching entry assets", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ documentContent: "modified HTML" }), expectedRevision: REVISION }),
    /current main document does not match the source-bound manifest entry document/,
  );
});

test("rejects a missing manifest and an expected revision mismatch", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ manifestStatus: 404 }), expectedRevision: REVISION }),
    /manifest is unavailable/,
  );
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp(), expectedRevision: OTHER_REVISION }),
    /does not match expected revision/,
  );
});

test("fails clearly when current resource content is unavailable", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ unavailable: "assets/app.js" }), expectedRevision: REVISION }),
    /cannot read current document resource assets\/app\.js through Page\.getResourceContent: resource body evicted/,
  );
});

test("rejects manifest traversal and queried app resource URLs", async () => {
  const files = { "assets/app.js": "current js", "assets/app.css": "current css" };
  const traversal = manifestFor(files);
  traversal.assets[0].path = "assets/../app.js";
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ files, manifest: traversal }), expectedRevision: REVISION }),
    /invalid asset path/,
  );
  await assert.rejects(
    verifyLoadedBuildIdentity({
      cdp: fakeCdp({ files, resourceUrls: ["https://device.test/assets/app.js?v=old", "https://device.test/assets/app.css"] }),
      expectedRevision: REVISION,
    }),
    /loaded app asset has an unbounded URL/,
  );
});

test("rejects a manifest redirect away from the fixed measured-origin URL", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ manifestUrl: "https://other.test/emotitone-build-identity.json" }), expectedRevision: REVISION }),
    /manifest fetch redirected outside its fixed URL/,
  );
});
