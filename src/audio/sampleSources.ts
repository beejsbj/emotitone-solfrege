/**
 * Where instrument data comes from. Every remote base URL lives here, so moving
 * to self-hosted data (BJS-496) changes one file. Licences: see NOTICE.
 */

/** dough-samples sample maps (`piano.json`, `vcsl.json`). Each map names its own `_base`. */
export const SAMPLE_MAP_BASE_URL = "https://raw.githubusercontent.com/felixroos/dough-samples/main/";

/** webaudiofontdata General MIDI fonts, one `<font>.js` file per preset. */
export const SOUNDFONT_BASE_URL = "https://felixroos.github.io/webaudiofontdata/sound/";

/** Sample packs the loading screen counts, with the label it shows for each. */
export const SAMPLE_PACKS = [
  { key: "piano", label: "Piano" },
  { key: "vcsl", label: "Orchestra" },
] as const;

export function sampleMapUrl(pack: string): string {
  return `${SAMPLE_MAP_BASE_URL}${pack}.json`;
}

let soundfontBaseUrl = SOUNDFONT_BASE_URL;

/** Point font loading elsewhere (an offline lab fixture, or a self-hosted copy). */
export function setSoundfontBaseUrl(url: string): void {
  soundfontBaseUrl = url.endsWith("/") ? url : `${url}/`;
}

export function soundfontUrl(font: string): string {
  return `${soundfontBaseUrl}${encodeURIComponent(font)}.js`;
}
