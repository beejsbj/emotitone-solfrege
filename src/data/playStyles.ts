/**
 * The live play styles the Control Bar offers. The worklet renders every one
 * of them on its own clock (src/audio/live/core.ts); Repeat and Arp follow a
 * running transport's bar grid there.
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

// One selector includes each rhythmic style's rate; sustained styles only
// need one position. The engine keeps independent style/rate parameters.
export const PLAY_MODE_OPTIONS = PLAY_STYLE_OPTIONS.flatMap<PlayModeOption>((option) =>
  option.value.startsWith('arp-') || option.value === 'repeat'
    ? ([4, 8, 16] as const).map(rate => ({
      value: `${option.value}:${rate}`,
      label: `${option.label}\n1/${rate}`,
      style: option.value,
      rate,
    }))
    : [{ ...option, style: option.value }],
)

export function playModeValue(style: PlayStyle, rate: PlayStyleRate): string {
  return style.startsWith('arp-') || style === 'repeat' ? `${style}:${rate}` : style
}
