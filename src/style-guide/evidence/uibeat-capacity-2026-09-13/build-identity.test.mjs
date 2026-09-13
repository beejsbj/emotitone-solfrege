import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  collectBuildIdentity,
  parseEntryAssets,
  requireUnconfiguredViteBuildEnvironment,
} from "./build-identity.mjs";
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
  scriptFrameId = "MAIN",
  scriptDefaultContext = true,
} = {}) {
  const calls = [];
  const urls = resourceUrls ?? Object.keys(files).map((path) => `https://device.test/${path}`);
  const listeners = new Map();
  return {
    calls,
    on(method, listener) {
      listeners.set(method, listener);
      return () => listeners.delete(method);
    },
    async command(method, params) {
      calls.push({ method, params });
      if (method === "Page.enable") return {};
      if (method === "Page.getResourceTree") {
        return {
          frameTree: {
            frame: { id: "MAIN", url: "https://device.test/?capture=1" },
            resources: urls.filter((url) => url.endsWith(".css")).map((url) => ({
              url,
              type: "Stylesheet",
            })),
          },
        };
      }
      if (method === "Runtime.evaluate") {
        return { result: { value: { status: manifestStatus, url: manifestUrl, text: JSON.stringify(manifest) } } };
      }
      if (method === "Debugger.enable") {
        for (const url of urls.filter((candidate) => new URL(candidate).pathname.endsWith(".js"))) {
          listeners.get("Debugger.scriptParsed")?.({
            scriptId: `script:${url}`,
            url,
            executionContextAuxData: { frameId: scriptFrameId, isDefault: scriptDefaultContext },
          });
        }
        return { debuggerId: "DEBUGGER" };
      }
      if (method === "Debugger.getScriptSource") {
        const url = params.scriptId.slice("script:".length);
        return { scriptSource: files[new URL(url).pathname.slice(1)] };
      }
      if (method === "Debugger.disable") return {};
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
      buildEnvironment: await requireUnconfiguredViteBuildEnvironment(directory, {}),
      createdAt: "2026-09-13T12:00:00.000Z",
    });
    assert.deepEqual(identity.entryAssets, ["assets/app.css", "assets/app.js"]);
    assert.deepEqual(identity.assets.map(({ path }) => path), ["assets/app.css", "assets/app.js", "assets/lazy.js", "sw.js"]);
    assert.equal(identity.assets.find(({ path }) => path === "assets/app.js").sha256, hash("app"));
    assert.equal(identity.build.bunVersion, "1.3.14");
    assert.deepEqual(identity.build.environment.inputs.VITE_PITCH_ANALYSIS_URL, { defined: false });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects the known production Vite input in dotenv files without exposing its value", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emotitone-vite-environment-"));
  const secretValue = "https://pitch.example.test/analyze?token=do-not-record";
  try {
    await writeFile(join(directory, ".env.production"), `VITE_PITCH_ANALYSIS_URL=${secretValue}\n`);
    await assert.rejects(
      requireUnconfiguredViteBuildEnvironment(directory, {}),
      (error) => error.message.includes(".env.production defines VITE_PITCH_ANALYSIS_URL") &&
        !error.message.includes(secretValue),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects an exported production Vite input and accepts unrelated dotenv values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emotitone-vite-environment-"));
  const secretValue = "https://pitch.example.test/exported-secret";
  try {
    await writeFile(join(directory, ".env"), "UNRELATED_VALUE=allowed\n");
    await assert.rejects(
      requireUnconfiguredViteBuildEnvironment(directory, { VITE_PITCH_ANALYSIS_URL: secretValue }),
      (error) => error.message.includes("exported VITE_PITCH_ANALYSIS_URL") &&
        !error.message.includes(secretValue),
    );
    assert.deepEqual(await requireUnconfiguredViteBuildEnvironment(directory, {}), {
      mode: "production",
      policy: "known production Vite inputs must be unset",
      inputs: { VITE_PITCH_ANALYSIS_URL: { defined: false } },
    });
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
  assert.equal(cdp.calls.filter(({ method }) => method === "Page.getResourceContent").length, 2);
  assert.equal(cdp.calls.filter(({ method }) => method === "Debugger.getScriptSource").length, 2);
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
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ unavailable: "assets/app.css" }), expectedRevision: REVISION }),
    /cannot read current document resource assets\/app\.css through Page\.getResourceContent: resource body evicted/,
  );
});

test("rejects app scripts outside the main frame default context", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ scriptFrameId: "CHILD" }), expectedRevision: REVISION }),
    /no executed same-origin main-frame app JavaScript/,
  );
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ scriptDefaultContext: false }), expectedRevision: REVISION }),
    /no executed same-origin main-frame app JavaScript/,
  );
});

test("fails clearly when executed script source is unavailable", async () => {
  const cdp = fakeCdp();
  const originalCommand = cdp.command.bind(cdp);
  cdp.command = async (method, params) => {
    if (method === "Debugger.getScriptSource") throw new Error("script source discarded");
    return originalCommand(method, params);
  };
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp, expectedRevision: REVISION }),
    /cannot read executed main-frame script .* through Debugger\.getScriptSource: script source discarded/,
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
    /executed app script has an unbounded URL/,
  );
});

test("rejects a manifest redirect away from the fixed measured-origin URL", async () => {
  await assert.rejects(
    verifyLoadedBuildIdentity({ cdp: fakeCdp({ manifestUrl: "https://other.test/emotitone-build-identity.json" }), expectedRevision: REVISION }),
    /manifest fetch redirected outside its fixed URL/,
  );
});
