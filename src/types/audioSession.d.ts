/** Minimal optional Audio Session surface used by Safari's playback unlock. */
interface Navigator {
  readonly audioSession?: { type: "auto" | "playback" | "play-and-record" | "ambient" | "transient" | "transient-solo" };
}
