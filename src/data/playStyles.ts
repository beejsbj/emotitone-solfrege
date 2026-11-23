/**
 * The live play styles the Control Bar offers. The worklet renders every one
 * of them on its own clock (src/audio/live/core.ts); Repeat and Arp follow a
 * running transport's bar grid there.
 *
 * The worklet imports this module, so it has no imports and nothing a render
 * thread can't run.
 */
export const PLAY_STYLE_OPTIONS = [
  { value: 'together', label: 'Together' },
  { value: 'strum-up', label: 'Strum ↑' },
  { value: 'strum-down', label: 'Strum ↓' },
  { value: 'arp-up', label: 'Arp ↑' },
  { value: 'arp-up-down', label: 'Arp ↕' },
  { value: 'repeat', label: 'Repeat' },
] as const

export type PlayStyle = (typeof PLAY_STYLE_OPTIONS)[number]['value']
export type PlayStyleRate = 4 | 8 | 16

export interface PlayModeOption {
  value: string
  label: string
  style: PlayStyle
  rate?: PlayStyleRate
}

/**
 * Repeat and Arp: rhythmic styles. Each pulse sounds for a fixed gate and ends
 * with `PULSE_RELEASE_SECONDS`, whatever the Shape's release. Together and
 * Strum sound the held note with the Shape's release. The worklet pulses by
 * this rule and the music store marks recorded pulses by it (BJS-649), so a
 * note the worklet gates is a note the recorder marks.
 */
export function isRhythmicStyle(style: PlayStyle): boolean {
  return style === 'repeat' || style.startsWith('arp-')
}

/** The release that ends every Repeat and Arp pulse, in seconds. */
export const PULSE_RELEASE_SECONDS = 0.03

// One selector includes each rhythmic style's rate; sustained styles only
// need one position. The engine keeps independent style/rate parameters.
// Pure, so the worklet's bundle, which never reads it, leaves it out.
export const PLAY_MODE_OPTIONS = /* @__PURE__ */ PLAY_STYLE_OPTIONS.flatMap<PlayModeOption>((option) =>
  isRhythmicStyle(option.value)
    ? ([4, 8, 16] as const).map(rate => ({
      value: `${option.value}:${rate}`,
      label: `${option.label}\n1/${rate}`,
      style: option.value,
      rate,
    }))
    : [{ ...option, style: option.value }],
)

export function playModeValue(style: PlayStyle, rate: PlayStyleRate): string {
  return isRhythmicStyle(style) ? `${style}:${rate}` : style
}
