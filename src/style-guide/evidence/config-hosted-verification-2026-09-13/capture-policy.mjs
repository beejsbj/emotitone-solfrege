import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const HOST = "https://emotitone-solfrege.vercel.app";
export const ARCHIVED_SOURCE_REVISION = "dc5734617107136e00fdabda38c473aa55b601f0";
export const EXPECTED_ASSETS = Object.freeze({
  "/assets/index-372029c0.js": "08f0714fc17d0d794009c64ba6cbe7840971ebed17754ebe14deda47bca3637c",
  "/assets/index-128c7174.css": "128c7174da1c95924c28e5e0627a860049293719111a68a87e7405a37c5cb4cc",
});

async function requireSuccessfulResponse(response, url) {
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response;
}

export async function verifyArchivedDeployment({ fetchImpl = fetch, host = HOST, expectedAssets = EXPECTED_ASSETS } = {}) {
  const documentResponse = await requireSuccessfulResponse(await fetchImpl(`${host}/`), `${host}/`);
  const document = await documentResponse.text();
  const verifiedAssets = [];

  for (const [assetPath, expectedSha256] of Object.entries(expectedAssets)) {
    assert.ok(document.includes(assetPath), `Current ${host} document does not reference archived asset ${assetPath}`);
    const assetUrl = new URL(assetPath, host).href;
    const assetResponse = await requireSuccessfulResponse(await fetchImpl(assetUrl), assetUrl);
    const actualSha256 = createHash("sha256").update(Buffer.from(await assetResponse.arrayBuffer())).digest("hex");
    assert.equal(actualSha256, expectedSha256, `Archived asset hash mismatch for ${assetPath}`);
    verifiedAssets.push({ path: assetPath, sha256: actualSha256 });
  }

  return {
    host,
    matchesArchivedAssetBaseline: true,
    baselineDocumentedAtSourceRevision: ARCHIVED_SOURCE_REVISION,
    deploymentRevisionEstablished: false,
    verifiedAt: new Date().toISOString(),
    assets: verifiedAssets,
  };
}

function requestedOutputPath(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex === -1) {
    assert.equal(argv.length, 0, `Unexpected arguments: ${argv.join(" ")}`);
    return null;
  }
  assert.equal(argv.length, 2, "Use only --output <fresh-directory>");
  assert.ok(argv[outputIndex + 1], "--output requires a directory");
  return path.resolve(argv[outputIndex + 1]);
}

export async function createCaptureWorkspace({ argv = process.argv.slice(2), archiveDirectory, label }) {
  const requested = requestedOutputPath(argv);
  const suffix = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const destination = requested ?? path.join(os.tmpdir(), `emotitone-${label}-${suffix}`);
  const archive = path.resolve(archiveDirectory);
  const relativeToArchive = path.relative(archive, destination);
  const isOutsideArchive = relativeToArchive === ".." || relativeToArchive.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToArchive);
  assert.ok(isOutsideArchive, `Refusing to write rerun output inside archived evidence: ${destination}`);

  try {
    await fs.lstat(destination);
    throw new Error(`Output directory already exists; choose a fresh path: ${destination}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const staging = `${destination}.partial-${randomUUID().slice(0, 8)}`;
  await fs.mkdir(staging, { recursive: true });
  return { destination, staging };
}

export async function publishCapture({ destination, staging }) {
  await fs.rename(staging, destination);
}

export async function publishFailedCapture({ destination, staging, error }) {
  await fs.writeFile(path.join(staging, "capture-failed.json"), `${JSON.stringify({
    status: "failed",
    failedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  }, null, 2)}\n`);
  await fs.rename(staging, destination);
}

export function assertPersistenceComparisons(output) {
  assert.equal(output.preview.persistedFieldsUnchanged, true, "Preview changed persisted config");
  assert.equal(output.discarded.persistedFieldsUnchanged, true, "Discard did not restore persisted config");
  assert.equal(output.kept.persistedFieldsChanged, true, "Keep did not change persisted config");
  assert.equal(output.reloaded.persistedFieldsMatchKept, true, "Reload did not preserve kept config");
}
