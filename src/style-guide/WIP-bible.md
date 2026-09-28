# EmotiTone Design Bible — WIP

A recentering document, not a ledger. It holds the few ideas every design decision should answer to. The Plan (`DESIGN_SYSTEM_TRACKER.md`) holds current state and gates; the Log holds receipts. This file changes rarely and only when Burooj changes the direction.

Status: **work in progress.** Stated by Burooj on 2026-09-27, including the hardware-with-stickers seam; decisions quoted below come from the Log. The full design history is a separate, later pass. Open questions are marked **Open**; don't settle them on Burooj's behalf.

---

## 1. The sentence

**Cut-paper jazz, lit by a synth.**

Two halves, two jobs. *Cut-paper jazz* is the identity: poster, hand-cut, loud, and made by hand. *Lit by a synth* is the instrument: dark hardware where light means sound is happening.

## 2. Where it came from

- **Before:** the app explored a sleek, glassy instrument look (glassmorphism). It was purged app-wide on 2026-08-20, and glass stays rejected.
- **Then:** the Let's Jazz typeface and its illustration pack (Unio Creative, after Saul Bass) arrived late and set the identity. Reference: the font and illustration previews at https://befonts.com/lets-jazz-sans-serif-font.html.
- **Now:** a deliberate hybrid. The jazz poster supplies the identity and the brand colours. The instrument lineage survives as the hardware of the playing area, with glass replaced by Ink, Ivory, and Brass.

### What Let's Jazz actually looks like

- Flat colour. No gradients, no soft shadows, no glass.
- Skewed quadrilaterals, not rectangles: panels, highlight bands, and piano keys all lean.
- Faceted, angular illustration: hands, trumpets, and clefs cut from polygons.
- A deliberate offset: colour fill sits off its black outline.
- A tilted highlight band behind a word, like tape or a strip of paper.
- Condensed, bouncy letterforms with an uneven baseline and mixed sizes.
- Mustard, red, purple, and white on charcoal.

"Cut" comes from hard edges and leaning shapes, not from drop shadows.

## 3. Two zones

| | **Brand zone** | **Playing zone** |
| --- | --- | --- |
| Voice | Jazzy cut-paper poster | Sleek chrome hardware |
| Colour | Brand papers: Tomato, Mustard, Plum, Cobalt, Pine, Bone | **Only Music Color.** Everything else is Ink, Ivory, and Brass |
| Surfaces | Brand Logo, Loading Screen, the style guide, moments of identity | Keyboard, CodeStrip Bar, Control Bar, Drawers, PatternReel, top menus, Stage |
| Feel | Loud, tilted, layered, handmade | Contrasty, precise, tactile, alive under the finger |

**The rule that matters most:** brand colour in the playing zone is a violation, not a flourish. When you play, the only colour on screen comes from the music.

**The seam: hardware with paper stuck on it.** In Burooj's words, the stage is hardware, and stickers and cut pieces are planted or stamped on top of it.

- **The chassis is hardware:** Ink surfaces, dark analog wells, Knobs, Joystick, the Lit Keycap Buttons, bars, Drawers, the floating Readout display, and Brass. It is machined, contrasty, and precise.
- **Applied paper sits on the chassis:** Keys, the Tabs chip in the top menus, and the instrument panel's Stickers. These pieces carry the cut property — cut silhouettes, slight tilts, and hard presses — and it fits them because they are things put onto the instrument.
- **Applied paper wears playing-zone colour:** Ink, Ivory, or Music Color. Keys are cut paper in their pitch's colour. Brand papers never come in.
- **Type crosses both zones:** Lets Jazz is the display and label face everywhere, including Stage lettering, Keys, and Knob labels.

So when judging a playing-zone part, first ask whether it is **chassis** or **applied paper**. Chassis gets hardware treatment; applied paper gets the cut treatment, still with no brand colour.

## 4. Colour law

| Colour | Role | Where |
| --- | --- | --- |
| **Music Color** | Pitch identity: the lesson itself. One numeric OKLCH authority (`musicColorCore.ts`); never a parallel palette | Anything that sounds or represents a pitch |
| **Ink / Ivory** | Warm contrasty chrome. Ink is the stage; Ivory is text, paper, and the chosen state | Everywhere |
| **Brass** | The single instrument metal: sheen and glow. Reserved for masters and the things you play with | Playing zone, sparingly |
| **Brand papers** | Decorative identity | Brand zone only |

Recorded corrections that already enforce this:

- Brand colours are decorative; brass is instrument metal (2026-05-27).
- Brass is prohibited in picker Stickers and assigned only to specific Config masters (2026-09-08).
- Neutral gray chrome moved onto Ink/Ivory; only hardware wells stay neutral (2026-09-26).

## 5. Material

- **Filled, not outlined.** Borders must be intentional grammar. Many recorded rejections back this: Button's inset ring (2026-08-29), the framed CodeStrip (2026-09-04), the PatternReel housing (2026-09-10), and Card's hairline shell (retired).
- **Hardware in the playing zone:** dark analog wells, keycap depth, Brass sheen and glow, hard presses. Surfaces are opaque; a translucent bar was accepted once, then made opaque Ink.
- **Paper in the brand zone:** cut edges, tilts, offsets, torn bands, stacked scraps, in brand colours.
- **Applied paper in the playing zone:** cut pieces stuck onto the hardware — Keys, Tabs chips, Stickers — in Ink, Ivory, or Music Color (see §3).
- **No glass.** No backdrop blur, no frosted panels.

## 6. Analog and digital

The playing zone is part hardware, part software. Some units ship in paired editions and alternate between app loads: Knob Analog Ring / Digital Arc, Joystick Analog / Digital, and seven Tabs editions. The variation is part of the aliveness — each load is a slightly different pressing of the same instrument. New units should ask whether they have an analog and a digital reading.

## 7. Type

- **Lets Jazz:** display, labels, headings, and short text.
- **JetBrains Mono:** long text, captions, code, and numbers that need to align.
- Rule of thumb from the tokens: more than about five words of body copy moves to mono.

## 8. Motion — light answers sound

- Light and pulse follow the music: sounding Notes, Stage, and UIBeat on controls. Nothing blinks for decoration.
- **Tactile grammar is bounce:** a shared elastic release on press and drag feedback. It should be playful but snappy. Burooj has repeatedly sped motion up (PatternReel to 200ms) and rejected front-loaded, jerky, or invisible rebounds.
- **Continuous over discrete:** handoffs slide and track the finger instead of jumping (Tabs pages, Bar Tape, PatternReel).
- **Reduced Motion is fully still:** no recurring motion and no blinking fallback.

## 9. Density and fit

- Mobile first at 390px, and it must still work at 1440.
- Flush and sleek: repeated corrections removed wasted insets, trays, and gutters. Examples are CodeStrip flush (2026-09-04), PatternStrip 20% shorter, and 20% smaller bar buttons.
- Decisions are made on the deployed phone, not in the abstract.

## 10. Judging a direction

Ask these in order:

1. **Which zone is it in?** If it's the playing zone, is it chassis (hardware) or applied paper (cut)? Either way, is its only colour Ink, Ivory, Brass (chassis only), or the music?
2. Is Brass used only for a master or an instrument part?
3. Is every outline intentional grammar?
4. Does its light or motion answer sound or touch, not decoration?
5. Does it have an analog or digital reading?
6. Does it survive 390px, Reduced Motion, and Forced Colors?
7. Is it an idea, not a variation?

## 11. Hard don'ts

- No glassmorphism: blur, frosted panels, or translucent chrome.
- No brand colour in the playing zone.
- No second Music Color palette or calculation.
- No Brass as decoration or in picker Stickers.
- No default borders, trays, or housings around playing surfaces.
- No perpetual decorative motion, and nothing moving under Reduced Motion.

## 12. Open

- **How far the poster voice reaches into the product:** Burooj to decide.
- **Top-menu panels:** the Tabs chip and picker Stickers are applied paper. Is the panel behind them chassis, or something else?
- **Name and status:** WIP until accepted; the full history pass may extend §2.
