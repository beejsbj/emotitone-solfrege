# UIBeat build identity procedure

The physical UIBeat capture is eligible only when the measured page proves which source-bound production build it already loaded. Operator-entered metadata still supplies the expected full Git revision, but it no longer establishes the build identity by itself.

## Build and serve

Start from a checkout with no tracked or untracked changes. Run the evidence helper instead of running a separate build first:

```sh
node src/style-guide/evidence/uibeat-capacity-2026-09-13/build-identity.mjs
```

The helper resolves the checkout root, records the full `HEAD`, requires a clean checkout, records the installed Bun version, and runs the repository's normal `bun run build` command. After the command succeeds, it requires the same revision and a still-clean checkout. It then hashes `dist/index.html`, every emitted JavaScript and CSS file, and identifies the direct JavaScript and stylesheet entry assets from the built HTML. Finally, it writes `dist/emotitone-build-identity.json`.

Serve that exact `dist` directory for the physical capture. Do not copy a manifest into an older build or assign a revision to an existing `dist`; the helper deliberately creates the manifest only after its own clean, stable production build. The manifest records one actual build with the installed Bun version and the repository's declared package manager. It does not claim that another toolchain invocation will reproduce identical bytes.

## Verify the already-loaded page

The capture harness imports `verifyLoadedBuildIdentity({ cdp, expectedRevision })` from `capture-build-identity.mjs` and calls it on the existing CDP connection before it prepares or measures the scene. The function does not reload the tab or remount controls.

It reads the current main-frame resource inventory with `Page.getResourceTree`, then fetches the fixed `/emotitone-build-identity.json` path from the measured document's own origin. It rejects a redirect, a missing manifest, malformed or traversing asset paths, and a manifest revision that differs from the expected metadata revision. It requires the current document to have loaded every direct entry asset. It then obtains the bytes of each loaded same-origin app JavaScript and stylesheet through `Page.getResourceContent` and compares their byte counts and SHA-256 hashes with the manifest. It does not refetch app assets as substitutes for the resources already loaded by the current document.

A tab left open on an older bundle therefore fails even when the server now returns a newer manifest. If Chromium cannot provide the current resource content, the capture fails clearly rather than weakening the proof. An older hosted deployment without this manifest is ineligible.

This establishes bounded build-procedure provenance: a clean stable Git revision produced the manifest and the measured document loaded matching application bytes. It is not a signature, release attestation, or proof against an operator who alters both the build procedure and its evidence.
