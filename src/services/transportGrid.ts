/**
 * The one tempo authority (W9, S111): the running pattern transport's bar
 * grid, published for live play styles that are scheduled on the main
 * thread. The worklet's own Repeat/Arp reads the grid on the audio thread;
 * this is the same grid for the fallback renderer.
 *
 * A tiny registry rather than an import of the pattern player, so the music
 * store does not pull the transport (and the notation planner) into its chunk.
 */
export interface TransportGrid {
  /** AudioContext time, in milliseconds, at which `bar` falls. */
  at: number;
  bar: number;
  /** The tempo from `at` onwards; one bar is four beats. */
  bpm: number;
}

type GridSource = () => TransportGrid | undefined;
let source: GridSource | undefined;

/** The running transport publishes its grid here; returns the unregister function. */
export function setTransportGridSource(next: GridSource): () => void {
  source = next;
  return () => { if (source === next) source = undefined; };
}

/** The current grid, or undefined when no transport is running. */
export function getTransportGrid(): TransportGrid | undefined {
  return source?.();
}

/** The AudioContext time (ms) of transport bar `bar` on `grid`. */
export function gridTime(grid: TransportGrid, bar: number): number {
  return grid.at + (bar - grid.bar) * 240_000 / grid.bpm;
}

/** The first subdivision (1/`rate` of a bar) at or after `time`, as a bar. */
export function nextSubdivision(grid: TransportGrid, time: number, rate: number): number {
  const bar = grid.bar + (time - grid.at) * grid.bpm / 240_000;
  return Math.ceil(bar * rate - 1e-9) / rate;
}
