import { createHash } from "node:crypto";

import { BUILD_IDENTITY_FILE, BUILD_IDENTITY_SCHEMA_VERSION } from "./build-identity.mjs";

function fail(message) {
  throw new Error(`Loaded build identity verification failed: ${message}`);
}

function validateRevision(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40,64}$/.test(value)) {
    fail(`${label} must be a full lowercase git revision`);
  }
  return value;
}

function validatedAssetPath(path) {
  if (typeof path !== "string" || !/^(?:assets\/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+)\.(?:js|css)$/.test(path) ||
      path.includes("..") || path.includes("//")) {
    fail(`manifest contains an invalid asset path: ${JSON.stringify(path)}`);
  }
  return path;
}

export function validateBuildIdentityManifest(manifest, expectedRevision) {
  validateRevision(expectedRevision, "expected source revision");
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("manifest is not an object");
  if (manifest.schemaVersion !== BUILD_IDENTITY_SCHEMA_VERSION) {
    fail(`unsupported manifest schema ${JSON.stringify(manifest.schemaVersion)}`);
  }
  validateRevision(manifest.sourceRevision, "manifest source revision");
  if (manifest.sourceRevision !== expectedRevision) {
    fail(`manifest revision ${manifest.sourceRevision} does not match expected revision ${expectedRevision}`);
  }
  if (manifest.entryDocument?.path !== "index.html" ||
      !Number.isSafeInteger(manifest.entryDocument.bytes) || manifest.entryDocument.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(manifest.entryDocument.sha256 ?? "")) {
    fail("manifest has an invalid entry document");
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0 || manifest.assets.length > 1_000) {
    fail("manifest must contain a bounded, nonempty asset list");
  }
  const assetsByPath = new Map();
  for (const asset of manifest.assets) {
    const path = validatedAssetPath(asset?.path);
    const expectedType = path.endsWith(".js") ? "script" : "stylesheet";
    if (asset.type !== expectedType || !Number.isSafeInteger(asset.bytes) || asset.bytes < 0 ||
        typeof asset.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(asset.sha256)) {
      fail(`manifest has invalid metadata for ${path}`);
    }
    if (assetsByPath.has(path)) fail(`manifest repeats asset ${path}`);
    assetsByPath.set(path, asset);
  }
  if (!Array.isArray(manifest.entryAssets)) fail("manifest entryAssets is missing");
  const entryAssets = manifest.entryAssets.map(validatedAssetPath);
  if (new Set(entryAssets).size !== entryAssets.length) fail("manifest repeats an entry asset");
  if (!entryAssets.some((path) => path.endsWith(".js")) || !entryAssets.some((path) => path.endsWith(".css"))) {
    fail("manifest must identify entry JavaScript and stylesheet assets");
  }
  for (const path of entryAssets) {
    if (!assetsByPath.has(path)) fail(`entry asset is absent from manifest assets: ${path}`);
  }
  return { assetsByPath, entryAssets };
}

function parseDocumentUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`Page.getResourceTree returned an invalid document URL: ${JSON.stringify(value)}`);
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
    fail(`measured document must use a credential-free HTTP(S) URL: ${url.href}`);
  }
  return url;
}

async function fetchManifestThroughMeasuredPage(cdp, manifestUrl) {
  const expression = `(async () => {
    const expectedUrl = ${JSON.stringify(manifestUrl)};
    const response = await fetch(expectedUrl, { cache: "no-store", credentials: "same-origin" });
    return { status: response.status, url: response.url, text: await response.text() };
  })()`;
  const response = await cdp.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response?.exceptionDetails) fail("the measured page could not fetch its build identity manifest");
  const result = response?.result?.value;
  if (!result || typeof result !== "object") fail("manifest fetch returned no value");
  if (result.url !== manifestUrl) fail(`manifest fetch redirected outside its fixed URL: ${JSON.stringify(result.url)}`);
  if (result.status !== 200) fail(`manifest is unavailable at ${manifestUrl} (HTTP ${result.status})`);
  try {
    return JSON.parse(result.text);
  } catch {
    fail(`manifest at ${manifestUrl} is not valid JSON`);
  }
}

function loadedAppResources(frameTree, documentUrl) {
  const resources = frameTree?.resources;
  if (!Array.isArray(resources)) fail("Page.getResourceTree returned no main-frame resources");
  const selected = [];
  const seen = new Set();
  for (const resource of resources) {
    if (resource?.type !== "Script" && resource?.type !== "Stylesheet") continue;
    let url;
    try {
      url = new URL(resource.url);
    } catch {
      continue;
    }
    if (url.origin !== documentUrl.origin || !/\.(?:js|css)$/.test(url.pathname)) continue;
    if (url.search || url.hash || !url.pathname.startsWith("/assets/") || url.pathname.includes("%")) {
      fail(`loaded app asset has an unbounded URL: ${url.href}`);
    }
    const path = validatedAssetPath(url.pathname.slice(1));
    if (seen.has(path)) fail(`Page.getResourceTree repeats loaded asset ${path}`);
    seen.add(path);
    selected.push({ path, type: resource.type, url: url.href });
  }
  if (selected.length === 0) fail("Page.getResourceTree contains no loaded same-origin app JavaScript or CSS");
  return selected;
}

function resourceBytes(content, path) {
  if (!content || typeof content.content !== "string" || typeof content.base64Encoded !== "boolean") {
    fail(`Page.getResourceContent returned no usable bytes for ${path}`);
  }
  return Buffer.from(content.content, content.base64Encoded ? "base64" : "utf8");
}

async function readCurrentResource(cdp, frameId, url, label) {
  let content;
  try {
    content = await cdp.command("Page.getResourceContent", { frameId, url });
  } catch (error) {
    fail(`cannot read current document resource ${label} through Page.getResourceContent: ${error instanceof Error ? error.message : error}`);
  }
  return resourceBytes(content, label);
}

export async function verifyLoadedBuildIdentity({ cdp, expectedRevision }) {
  if (!cdp || typeof cdp.command !== "function") fail("cdp must expose command(method, params)");
  validateRevision(expectedRevision, "expected source revision");
  await cdp.command("Page.enable");
  const resourceTreeResult = await cdp.command("Page.getResourceTree");
  const frameTree = resourceTreeResult?.frameTree;
  const frameId = frameTree?.frame?.id;
  if (typeof frameId !== "string" || !frameId) fail("Page.getResourceTree returned no main frame id");
  const documentUrl = parseDocumentUrl(frameTree.frame.url);
  const resources = loadedAppResources(frameTree, documentUrl);
  const manifestUrl = new URL(`/${BUILD_IDENTITY_FILE}`, documentUrl.origin).href;
  const manifest = await fetchManifestThroughMeasuredPage(cdp, manifestUrl);
  const { assetsByPath, entryAssets } = validateBuildIdentityManifest(manifest, expectedRevision);
  const documentBytes = await readCurrentResource(cdp, frameId, documentUrl.href, "index.html");
  const documentDigest = createHash("sha256").update(documentBytes).digest("hex");
  if (documentBytes.byteLength !== manifest.entryDocument.bytes || documentDigest !== manifest.entryDocument.sha256) {
    fail("current main document does not match the source-bound manifest entry document");
  }
  const loadedPaths = new Set(resources.map(({ path }) => path));
  for (const path of entryAssets) {
    if (!loadedPaths.has(path)) fail(`current document did not load expected entry asset ${path}`);
  }

  const verifiedResources = [];
  for (const resource of resources) {
    const expected = assetsByPath.get(resource.path);
    if (!expected) fail(`current document loaded asset absent from manifest: ${resource.path}`);
    const bytes = await readCurrentResource(cdp, frameId, resource.url, resource.path);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== expected.bytes || digest !== expected.sha256) {
      fail(`current document resource ${resource.path} does not match the source-bound manifest`);
    }
    verifiedResources.push({
      path: resource.path,
      type: expected.type,
      bytes: bytes.byteLength,
      sha256: digest,
    });
  }
  verifiedResources.sort((left, right) => left.path.localeCompare(right.path));
  return {
    schemaVersion: BUILD_IDENTITY_SCHEMA_VERSION,
    sourceRevision: manifest.sourceRevision,
    documentUrl: documentUrl.href,
    manifestUrl,
    build: manifest.build,
    entryDocument: {
      path: manifest.entryDocument.path,
      url: documentUrl.href,
      bytes: documentBytes.byteLength,
      sha256: documentDigest,
    },
    entryAssets,
    verifiedResources,
    proof: "Page.getResourceTree inventory and Page.getResourceContent entry-document, JavaScript, and CSS bytes from the already-loaded main document",
  };
}
