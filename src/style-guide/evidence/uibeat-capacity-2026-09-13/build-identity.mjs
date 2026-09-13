#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export const BUILD_IDENTITY_FILE = "emotitone-build-identity.json";
export const BUILD_IDENTITY_SCHEMA_VERSION = 1;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isBoundedBuildAssetPath(path) {
  return /^(?:assets\/[A-Za-z0-9._/-]+|[A-Za-z0-9._-]+)\.(?:js|css)$/.test(path) &&
    !path.includes("..") && !path.includes("//");
}

function run(executable, args, { cwd, capture = false } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolvePromise({ stdout: stdout.trim(), stderr: stderr.trim() });
      const detail = signal ? `signal ${signal}` : `exit ${code}`;
      rejectPromise(new Error(`${executable} ${args.join(" ")} failed (${detail})${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

async function git(cwd, args) {
  return (await run("git", args, { cwd, capture: true })).stdout;
}

async function requireCleanCheckout(repoRoot, phase) {
  const status = await git(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) {
    throw new Error(`Refusing ${phase} with a dirty checkout:\n${status}`);
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Build output must not contain a symbolic link: ${path}`);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function assetPathFromEntryUrl(value) {
  let url;
  try {
    url = new URL(value, "https://build.invalid/");
  } catch {
    throw new Error(`Invalid entry asset URL in dist/index.html: ${value}`);
  }
  if (url.origin !== "https://build.invalid" || url.search || url.hash) {
    throw new Error(`Entry asset must be a root-relative, query-free build URL: ${value}`);
  }
  const path = url.pathname.replace(/^\//, "");
  if (!/^assets\/[A-Za-z0-9._/-]+\.(?:js|css)$/.test(path) || path.includes("..")) {
    throw new Error(`Entry asset is outside the bounded assets directory: ${value}`);
  }
  return path;
}

export function parseEntryAssets(indexHtml) {
  const assets = [];
  for (const match of indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const path = assetPathFromEntryUrl(match[1]);
    if (extname(path) === ".js") assets.push(path);
  }
  for (const match of indexHtml.matchAll(/<link\b[^>]*\brel=["'][^"']*stylesheet[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const path = assetPathFromEntryUrl(match[1]);
    if (extname(path) === ".css") assets.push(path);
  }
  const unique = [...new Set(assets)].sort();
  if (!unique.some((path) => path.endsWith(".js")) || !unique.some((path) => path.endsWith(".css"))) {
    throw new Error("dist/index.html must reference at least one entry JavaScript and stylesheet asset");
  }
  return unique;
}

export async function collectBuildIdentity({ distRoot, sourceRevision, bunVersion, declaredPackageManager, createdAt }) {
  if (!/^[0-9a-f]{40,64}$/.test(sourceRevision)) throw new Error(`Invalid source revision ${sourceRevision}`);
  const indexPath = join(distRoot, "index.html");
  const indexBytes = await readFile(indexPath);
  const entryAssets = parseEntryAssets(indexBytes.toString("utf8"));
  const files = await listFiles(distRoot);
  const assets = [];
  for (const file of files) {
    if (!/\.(?:js|css)$/.test(file)) continue;
    const path = relative(distRoot, file).split(sep).join("/");
    if (!isBoundedBuildAssetPath(path)) {
      throw new Error(`Emitted JavaScript or CSS has an unbounded output path: ${path}`);
    }
    const bytes = await readFile(file);
    assets.push({
      path,
      type: extname(path) === ".js" ? "script" : "stylesheet",
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
    });
  }
  assets.sort((left, right) => left.path.localeCompare(right.path));
  const paths = new Set(assets.map(({ path }) => path));
  for (const path of entryAssets) {
    if (!paths.has(path)) throw new Error(`Entry asset is missing from build output: ${path}`);
  }
  return {
    schemaVersion: BUILD_IDENTITY_SCHEMA_VERSION,
    sourceRevision,
    createdAt,
    build: {
      command: ["bun", "run", "build"],
      bunVersion,
      declaredPackageManager,
    },
    entryDocument: {
      path: "index.html",
      bytes: indexBytes.byteLength,
      sha256: sha256(indexBytes),
    },
    entryAssets,
    assets,
  };
}

export async function buildWithIdentity({ cwd = process.cwd(), now = () => new Date().toISOString() } = {}) {
  const repoRoot = await git(cwd, ["rev-parse", "--show-toplevel"]);
  if (!repoRoot) throw new Error("Could not resolve the git checkout root");
  await requireCleanCheckout(repoRoot, "to build identity");
  const sourceRevision = await git(repoRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (!/^[0-9a-f]{40,64}$/.test(sourceRevision)) throw new Error(`Git returned an invalid source revision: ${sourceRevision}`);
  const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const bunVersion = (await run("bun", ["--version"], { cwd: repoRoot, capture: true })).stdout;

  await run("bun", ["run", "build"], { cwd: repoRoot });

  const finalRevision = await git(repoRoot, ["rev-parse", "--verify", "HEAD^{commit}"]);
  if (finalRevision !== sourceRevision) {
    throw new Error(`Source revision changed during build: ${sourceRevision} -> ${finalRevision}`);
  }
  await requireCleanCheckout(repoRoot, "after production build");

  const distRoot = resolve(repoRoot, "dist");
  const manifest = await collectBuildIdentity({
    distRoot,
    sourceRevision,
    bunVersion,
    declaredPackageManager: packageJson.packageManager ?? null,
    createdAt: now(),
  });
  const destination = join(distRoot, BUILD_IDENTITY_FILE);
  const temporary = join(distRoot, `.${BUILD_IDENTITY_FILE}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  try {
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`wrote ${relative(repoRoot, destination)} for ${sourceRevision} (Bun ${bunVersion})`);
  return { manifest, destination };
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}

if (isMain()) {
  buildWithIdentity().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
