# Native scheduling reference

This directory preserves the repaired native renderer and the dual-backend
manager from the frozen comparison at `37666ea`. Production imports only the
worklet manager in `src/services/livePlayback.ts`; the shared instrument
extractor remains in `src/services/preparedNativeInstrument.ts` because the
worklet also needs the original sample and soundfont metadata.

`LAB_UI_BACKEND=native` in the audio lab installs a Vite module redirect to this
manager. The normal Vite application build never installs that plugin. Native
lookahead is still changed only by the guarded laboratory transform. The source
and tests are retained for reproducibility, not as another product setting.

Run reference tests with `bunx vitest run audio-lab/reference`. The actual-app
comparison commands and declared limits are in `../native-comparison.md`.
