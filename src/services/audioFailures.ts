/**
 * Why audio startup stopped. The loading screen answers each kind differently:
 * - "samples": the sample library could not be fetched in time. Retry, or play
 *   on with the built-in synths, which need nothing downloaded.
 * - "blocked": the browser has not let the AudioContext run yet. One tap cues it.
 * - "engine": the audio graph itself failed to initialise. Only a retry helps.
 */
export type AudioFailureKind = "samples" | "blocked" | "engine";

/** A sample-pack fetch failed; the audio engine itself is untouched. */
export class SampleLoadError extends Error {
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "SampleLoadError";
    this.cause = options?.cause;
  }
}

/** The AudioContext exists but the browser has not allowed it to run. */
export class AudioBlockedError extends Error {
  constructor(message = "The browser has not allowed audio to start yet") {
    super(message);
    this.name = "AudioBlockedError";
  }
}
