---
id: du4uy18xm4xo
title: athabascua uni
created: '2026-07-04T07:42:14.662Z'
modified: '2026-07-04T07:42:14.662Z'
tags: []
---
# athabascua uni	

**Findings**
1. Audio bootstrapping is duplicated. The live engine already loads the full sample catalog in src/services/superdoughAudio.ts (line 163), then pattern playback loads the same packs again in src/composables/useStrudel.ts (line 60). For this kind of app, first-play latency matters more than feature breadth.
2. The splash flow is lying about readiness. src/components/LoadingSplash.vue (line 98) marks audio complete before a real audio unlock, so the onboarding can promise “ready” while audio is still gated.
3. Keyboard rendering is doing per-key work that will not scale on mobile. src/composables/useSolfegeInteraction.ts (line 25) creates its own RAF loop, and src/components/keyboard/KeyboardKey.vue (line 68) instantiates that composable for every key.
4. Touch cleanup is too global. src/components/keyboard/KeyboardKey.vue (line 377) clears all touches when one key unmounts, which is a real interaction bug.
5. Music-theory parsing is not accurate enough for a teaching product. In src/stores/music.ts (line 89), accidentals are collapsed by stripping #/b, and the fallback chromatic mapping is approximate.
6. Device detection is drifting from the actual target experience. src/utils/deviceDetection.ts (line 46) will show desktop-like affordances on large touch devices.
 
**Quality Signal** npm run type-check passed. npm run test:run failed heavily: 67 failing tests across music, visual utils, haptics, performance, device detection, and missing modules. That suggests the codebase has moved faster than its contracts, so stabilizing tests should be a near-term priority before larger feature work.
One question would sharpen the next pass: is the primary target a beginner learning app, a performance instrument, or a pattern sketchpad? Right now the code is split across all three, and that’s what’s diluting the product.

btw @/Users/burooj/Projects/strudel is the local clone of strudel repo, the docs and stuff is there too. incase you need to understand how strudel works.

strudel uses tonal too and has a lot of theory stuff baked in. instead of me reestablishing mappings.

its intent is indeed a musical instrument with beautiful visuals, that happens to tie solfege to color. but its primarily a way to easily play around with melodies, and they are auto being saved and playable back via strudel. cause you are in the flow, you forget to click record. so a immersive intrument for sketching melodies, thats autosaved.

the "teaching" is just association of "vibes". intuition gained via playing, amplified with visuals and colors and solfege.

its not at all a tutorial tool.

the configpanel allows us to change visuals which changes how the visual expressiveness happens. its for nerds. i wanna keep ut.

the history is saved through patterns.

youve had some good insights, when i was building it before i implemented superdough before strudel cause i was replacing Tone.js. and its caused some weird problems like the ones you found. but also the play button isnt "playing strudel" its playing likely something else.

i guess the technical idea i was getting to(cause before i manually created sequencers, intruments, playback) is to use strudel. it provides so much.
strudel is the pattern playback engine. what strudel uses for audio playing(superdough), we wire into it to play keys live and immediate, attack and release on demand.
so our app is  keyboard playing, holding patterns, dealing with ux, wiring things up right, creating visuals in a way. before i used tone js, manually created dictionalries of scales, and notes and etc.

but it seems to have gotten way out of hand.