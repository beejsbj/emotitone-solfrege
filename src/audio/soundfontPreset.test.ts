import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseSoundfontPreset, SoundfontParseError } from './soundfontPreset'

// The shape of a real webaudiofontdata file (0000_JCLive_sf2_file.js), shortened.
const FONT = `console.log('load _tone_0000_JCLive_sf2_file');
var _tone_0000_JCLive_sf2_file={
\tzones:[
\t\t{
\t\t\tmidi:0
\t\t\t,originalPitch:2400
\t\t\t,keyRangeLow:0
\t\t\t,keyRangeHigh:27
\t\t\t,loopStart:133802
\t\t\t,loopEnd:135153
\t\t\t,coarseTune:0
\t\t\t,fineTune:-12
\t\t\t,sampleRate:44100
\t\t\t,ahdsr:true
\t\t\t,file:'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQ=='
\t\t\t,anchor:0.01328798
\t\t\t//_tone.Gd_pno_B6_R_
\t\t}
\t\t,{midi:0,originalPitch:6.2e3,keyRangeLow:28,keyRangeHigh:127,sampleRate:22050,sample:"AAD/fw==", /* old format */}
\t]
};
`

afterEach(() => { delete (globalThis as Record<string, unknown>).__soundfontRan })

describe('soundfont preset parser', () => {
  it('reads every zone of a font file as data: tuning, ranges, loops and audio', () => {
    expect(parseSoundfontPreset(FONT)).toEqual([
      { originalPitch: 2400, coarseTune: 0, fineTune: -12, keyRangeLow: 0, keyRangeHigh: 27, sampleRate: 44100,
        loopStart: 133802, loopEnd: 135153, file: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQ==' },
      { originalPitch: 6200, coarseTune: 0, fineTune: 0, keyRangeLow: 28, keyRangeHigh: 127, sampleRate: 22050,
        loopStart: 0, loopEnd: 0, sample: 'AAD/fw==' },
    ])
  })

  it('parses a large escape run without blocking input for seconds', () => {
    const count = 300_000
    const payload = '\\\\'.repeat(count)
    const start = performance.now()
    const [zone] = parseSoundfontPreset(`var _x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'${payload}'}]}`)
    const elapsed = performance.now() - start
    expect(zone.file).toBe('\\'.repeat(count))
    // Generous headroom over a linear scan; the repeated suffix searches take seconds.
    expect(elapsed).toBeLessThan(1000)
  })

  it('never runs code from a font file', () => {
    const evaluate = vi.spyOn(globalThis, 'eval')
    const attacks = [
      `var _tone_x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:44100,file:(globalThis.__soundfontRan=1,'AAAA')}]};`,
      `var _tone_x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:44100,file:'AAAA'}]};globalThis.__soundfontRan=1;`,
      `var _tone_x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:44100,file:atob('AAAA')}]};`,
      `var _tone_x={get zones(){globalThis.__soundfontRan=1;return []}};`,
      `var _tone_x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:44100,file:\`\${globalThis.__soundfontRan=1}\`}]};`,
    ]
    for (const attack of attacks) expect(() => parseSoundfontPreset(attack), attack).toThrow(SoundfontParseError)
    expect((globalThis as Record<string, unknown>).__soundfontRan).toBeUndefined()
    expect(evaluate).not.toHaveBeenCalled()
    evaluate.mockRestore()
  })

  it('computes arithmetic on numeric literals, as some fonts write it (0253_Acoustic_Guitar: originalPitch:4200-140)', () => {
    const [zone] = parseSoundfontPreset(`var _x={zones:[{originalPitch:4200-140,coarseTune:-(1+1)*3,fineTune:-20/4,keyRangeLow:41,keyRangeHigh:42,sampleRate:44100,file:'A'}]}`)
    expect(zone).toMatchObject({ originalPitch: 4060, coarseTune: -6, fineTune: -5 })
    for (const text of [
      `var _x={zones:[{originalPitch:4200-x,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'A'}]}`,
      `var _x={zones:[{originalPitch:4200-(globalThis.__soundfontRan=1),keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'A'}]}`,
      `var _x={zones:[{originalPitch:1/0,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'A'}]}`,
    ]) expect(() => parseSoundfontPreset(text), text).toThrow(SoundfontParseError)
    expect((globalThis as Record<string, unknown>).__soundfontRan).toBeUndefined()
  })

  it('keeps a "__proto__" key as inert data', () => {
    const [zone] = parseSoundfontPreset(`var _x={zones:[{__proto__:{polluted:1},originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'A'}]}`)
    expect(Object.getPrototypeOf(zone)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('decodes string escapes and rejects malformed or incomplete presets', () => {
    expect(parseSoundfontPreset(`var _x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:'a\\'b\\u0041\\x42'}]}`)[0].file)
      .toBe("a'bAB")
    for (const text of [
      'no assignment here',
      'var _x=[1,2]',
      'var _x={zones:[]}',
      'var _x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:1}]}',
      'var _x={zones:[{keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:"A"}]}',
      'var _x={zones:[{originalPitch:Infinity,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:"A"}]}',
      'var _x={zones:[{originalPitch:60,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:"A',
    ]) expect(() => parseSoundfontPreset(text), text).toThrow(SoundfontParseError)
  })
})
