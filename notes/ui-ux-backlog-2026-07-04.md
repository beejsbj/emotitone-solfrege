---
id: oq5yb1npbl2f
title: g
created: '2026-07-04T07:42:14.701Z'
modified: '2026-07-04T07:42:14.701Z'
tags: []
---
# g

Emotitone ui/ux fixes

- Hilbert scope loses color once you lift finger.
- why is page scrollable?
- the keyboard controls row needs to be better. Maybe play/del/send shoudl be different types of buttons? gotta think
- strudel strip container needs visual upgrade to match design.
- color mode needs two modes. Fixed chromatic distribution (360 / 12, C = 0). Movable chromatic distribution(360 / scale Count, keyRoot = 0). Like movable do. in config.
- roli/blocks should match the coloring of wtv mode/setting we use.
- similar to how the strudel scrolls when playing from strudel. It should also scroll when user live plays new notes (so new notes are getting added to
- when a new sound is picked. Perhaps a loading spinner graying out keyboard saying "samples being downloaded"? instead of the current way, where i can try to play and get no response, then it downloads, then i tap again and it plays(and that happesn seperately for each key lol)
- visual config options need to be better, more relevant. and seems to be missing quite a few of options/categories that i remember being there, i think? maybe some should
- Hilbert scope option parity with my implementation in this strudel fork. https://codeberg.org/uzu/strudel/src/commit/de56d8af0cfddff2174dcf9b20d21c17d8460a15/packages/webaudio/hilbert.mjs
- beating shapes, needs to have a fewwer shapes. default, like the faster ones look ugly. idk, need ideas for making it fit.
- pattern list needs ui/ux upgrade.
- need open in strudel button on pattern card ?
- neutrals/white/black/etc for ui (knobs, ui buttons etc).
- Chromatic Colors only present for the music and related like keyboard, and visual system.
- Floating pop up needs to be reworked. wip
- particles need to use fun angular, uneven, music symbol icons instead of random shapes. (i have some examples i can share, ask for this)
- design is not fully cohesive, need to streamline it.
- Also need better predefined themes. (black and white, roundy, glassmorphic, etdi c) strings/particles/blobs/hilbert options being invovled as part of these "themes". like one of the themes could have ambiance work with particles, where the particles come from under the keyboard like a lavalap of particles emerging from the sounds.
- perhaps each of the visual subsystems have their own presets too?

Each pattern card
Should also indicate root octave.
“F4” major

so each card has  “Piano keyoctave mode BPM”
 
the way i imagine pattern list is that its by default at the current pattern, and when you drag it, you are already part of the list and you can scroll directly, instead of a button to open up a list. like a dial almost, and the “center” is the selected pattern. so really its like the pattern list is always there, bottom most is newest one, then i can just scroll natually, and the three patterns above fade in to be visible, and i can scroll up and what ever i land on “in center” becomes the “current” pattern. 

And then I don't want the “days left/kept” thing. Instead have a small icon button similar to the copy button. That is a,floppydisk icon.
It's red when unsaved with a floating number badge '7d' top right of button. Like similar to the app badges in Andriod phones.

Play backspace ought to be normal compact icon only buttons. And on the right of the live strip. or maybe play on left and
enter/send button also icon only and on the right of pattern /list/card

Maybe
- itervallic arcs and chord triangles between blobs.
- Chord row in keyboard.
- swipe keys? Circular shape?