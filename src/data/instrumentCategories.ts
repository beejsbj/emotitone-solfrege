export interface InstrumentCategory {
  name: string;
  instruments: string[];
  preload: string[]; // 3 pre-warmed during loading
}

export const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  {
    name: 'Keyboards',
    instruments: [
      'gm_celesta', 'gm_clavinet', 'gm_epiano1', 'gm_epiano2',
      'gm_harpsichord', 'gm_music_box', 'gm_piano',
    ],
    preload: ['gm_piano', 'gm_epiano1', 'gm_harpsichord'],
  },
  {
    name: 'Guitar & Bass',
    instruments: [
      'gm_acoustic_guitar_nylon', 'gm_acoustic_guitar_steel', 'gm_electric_guitar_clean',
      'gm_electric_guitar_jazz', 'gm_electric_guitar_muted', 'gm_distortion_guitar',
      'gm_overdriven_guitar', 'gm_guitar_fret_noise', 'gm_guitar_harmonics',
      'gm_acoustic_bass', 'gm_electric_bass_finger', 'gm_electric_bass_pick',
      'gm_fretless_bass', 'gm_slap_bass_1', 'gm_slap_bass_2',
    ],
    preload: ['gm_acoustic_guitar_nylon', 'gm_electric_guitar_clean', 'gm_electric_bass_finger'],
  },
  {
    name: 'Strings',
    instruments: [
      'gm_cello', 'gm_contrabass', 'gm_fiddle', 'gm_orchestral_harp',
      'gm_pizzicato_strings', 'gm_string_ensemble_1', 'gm_string_ensemble_2',
      'gm_synth_strings_1', 'gm_synth_strings_2', 'gm_tremolo_strings',
      'gm_viola', 'gm_violin',
    ],
    preload: ['gm_violin', 'gm_cello', 'gm_pizzicato_strings'],
  },
  {
    name: 'Brass',
    instruments: [
      'gm_trumpet', 'gm_trombone', 'gm_french_horn', 'gm_tuba',
      'gm_muted_trumpet', 'gm_brass_section', 'gm_synth_brass_1', 'gm_synth_brass_2',
    ],
    preload: ['gm_trumpet', 'gm_trombone', 'gm_french_horn'],
  },
  {
    name: 'Organs',
    instruments: [
      'gm_church_organ', 'gm_drawbar_organ', 'gm_percussive_organ',
      'gm_reed_organ', 'gm_rock_organ',
    ],
    preload: ['gm_church_organ', 'gm_drawbar_organ', 'gm_rock_organ'],
  },
  {
    name: 'Winds',
    instruments: [
      'gm_alto_sax', 'gm_baritone_sax', 'gm_bassoon', 'gm_blown_bottle',
      'gm_clarinet', 'gm_english_horn', 'gm_flute', 'gm_oboe', 'gm_ocarina',
      'gm_pan_flute', 'gm_piccolo', 'gm_recorder', 'gm_shakuhachi',
      'gm_shanai', 'gm_soprano_sax', 'gm_tenor_sax', 'gm_whistle', 'gm_harmonica',
    ],
    preload: ['gm_flute', 'gm_clarinet', 'gm_pan_flute'],
  },
  {
    name: 'Mallets',
    instruments: [
      'gm_glockenspiel', 'gm_kalimba', 'gm_marimba', 'gm_steel_drums',
      'gm_tubular_bells', 'gm_vibraphone', 'gm_xylophone',
    ],
    preload: ['gm_marimba', 'gm_vibraphone', 'gm_xylophone'],
  },
  {
    name: 'World',
    instruments: [
      'gm_banjo', 'gm_dulcimer', 'gm_koto', 'gm_shamisen', 'gm_sitar',
      'gm_accordion', 'gm_bagpipe', 'gm_bandoneon', 'gm_agogo', 'gm_woodblock',
      'gm_tinkle_bell', 'gm_timpani',
    ],
    preload: ['gm_sitar', 'gm_koto', 'gm_banjo'],
  },
  {
    name: 'Synths',
    instruments: [
      'brown', 'bytebeat', 'crackle', 'gm_fx_atmosphere', 'gm_fx_brightness',
      'gm_fx_crystal', 'gm_fx_echoes', 'gm_fx_goblins', 'gm_fx_rain',
      'gm_fx_sci_fi', 'gm_fx_soundtrack', 'gm_lead_1_square', 'gm_lead_2_sawtooth',
      'gm_lead_3_calliope', 'gm_lead_4_chiff', 'gm_lead_5_charang', 'gm_lead_6_voice',
      'gm_lead_7_fifths', 'gm_lead_8_bass_lead', 'gm_pad_bowed', 'gm_pad_choir',
      'gm_pad_halo', 'gm_pad_metallic', 'gm_pad_new_age', 'gm_pad_poly',
      'gm_pad_sweep', 'gm_pad_warm', 'gm_synth_bass_1', 'gm_synth_bass_2',
      'gm_synth_choir', 'gm_synth_drum',
      'pink', 'pulse', 'saw', 'sawtooth', 'sbd', 'sin', 'sine', 'sqr', 'square',
      'supersaw', 'tri', 'triangle', 'user', 'white',
    ],
    // Built-in oscillators (sin, saw, etc.) skip gracefully — no sample bank
    preload: ['gm_pad_new_age', 'gm_lead_1_square', 'gm_synth_bass_1'],
  },
  {
    name: 'Drums & Percussion',
    instruments: [
      'gm_applause', 'gm_bird_tweet', 'gm_choir_aahs', 'gm_gunshot',
      'gm_helicopter', 'gm_melodic_tom', 'gm_orchestra_hit',
      'gm_reverse_cymbal', 'gm_seashore', 'gm_taiko_drum', 'gm_telephone',
      'gm_voice_oohs',
    ],
    preload: ['gm_taiko_drum', 'gm_melodic_tom', 'gm_orchestra_hit'],
  },
];

/** Flat list of all sounds that should be pre-warmed during init. */
export const PRELOAD_SOUNDS: string[] =
  INSTRUMENT_CATEGORIES.flatMap((c) => c.preload);
