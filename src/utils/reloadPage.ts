/**
 * Starts the app from scratch. The loading screen's answer to a stalled audio
 * engine: a hung engine start stays cached inside the audio runtime and
 * Superdough, so only a fresh page gives the engine a genuinely new attempt.
 */
export function reloadPage(): void {
  window.location.reload();
}
