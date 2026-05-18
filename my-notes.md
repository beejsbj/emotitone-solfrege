# My visual audit notes



okay so we are working on this design system, unifying the various ideas.
and decomposing ideas into full whole units, we created a skill to ...

one guiding principle is as, we decompose stuff into smaller atoms. those then need to be used. all the higher complex stuff have to have their stuff be made of the tokens/primatives defined. if they have something not defined, it needs to be defined at the simpler levels first then can be used.


before we begin, id like you do some purginging/decomposing of the following.
- assets, refrence assets. bloating the process and sink.



---
## color
- so i see brand colors are being used in many of the specimen cards that the skill made. brand colors are not to be used in ui elements. all ui is monochromatic, with only brass as the color.

- music colors
so, the hue range ought not to be its own 03 section. it just needs to be a toggle.
infact we dont need repeating ranges, or color blocks. it bloats this seciton.
infact lets do this. we can display the colors in this section as a segmented wheel. a single wheel. and then we can apply fixed chroma vs movable. ranges root, octave, scale count, animation speed, toggle, duration. root key, --music-c range seems unneeded, (maybe using the word ""chroma" is causing confusion since lch also calls saturation that? but its effectivly, movable hue vs fixed hue. chroma was me shorterning "Chromatic")
/Users/burooj/Library/Application Support/CleanShot/media/media_G335zQMqdg/CleanShot.screenshot-2026.05.18-14.26.52.png



## typography
- this typography section is a hodge podge mess of rules. we need to streamline this.
/Users/burooj/Library/Application Support/CleanShot/media/media_kRlmkmYy8l/CleanShot.screenshot-2026.05.18-14.31.37.png

## geometry
### spacing
- why do we have multiple spacing and radii over views?
/Users/burooj/Library/Application Support/CleanShot/media/media_okU0bN3h1d/CleanShot.screenshot-2026.05.18-14.33.09.png

- why is cut paper marks in geometry tokens section
/Users/burooj/Library/Application Support/CleanShot/media/media_lNkAhzXu5F/CleanShot.screenshot-2026.05.18-14.33.19.png
(tho decompose that decorative yellow rectangle line seperator thingy, its like a variant application of "kicker" primative)

## motion
- motion keyframes(4/4) is the most sane form of represting our ideas. and i want to decompose 1/4 2/4, 3/4 into the same structure.
/Users/burooj/Library/Application Support/CleanShot/media/media_6512nTnyEp/CleanShot.screenshot-2026.05.18-14.35.52.png
(btw some of them still have "todo", find those animations, they are within the components or css. esp in the "Motion applied".
 smear is used in the persona 5 tabs. 5/9 of motion applied. and in 7/9
bob is 6/9
flash is in 4/9
paper rip flash is in 7/9
cross fade rip is in 7/9
purge glow.

- we dont need a seperate motion applied section in primatives. 7/9 still has stuff not decomposed.



## primatives
### decorations
brand colors are allowed for decorations.
because the main part of the app wont have much space for decor anyway.
section 5/6 is more of a composition than a primative.
purge section 6/6, this thing is getting in the way.
#### kicker
- rectangle variant of it, vertical and horizontal, idea from preset card and line seperator head. i mentioned these above too. /Users/burooj/Library/Application Support/CleanShot/media/media_WYt0cwNvnk/CleanShot.screenshot-2026.05.18-14.46.30.png
- give kickers a tiny random tilt/rotate, 1-3degs? 
- the presentation of the specimen is repeating a lot of text. tomato and tomato, pine and pine. and the text is small. only do the second label if its adding new. otherwise it bloats.
/Users/burooj/Library/Application Support/CleanShot/media/media_JRR9nBejf9/CleanShot.screenshot-2026.05.18-14.45.27.png

#### marks
2/6 is the creation from the specimen skill structure
3/6 music marks ought to be merged with the norational marks and into the specimen. 3/6 is redundant. 

#### badge/sticker 
some more examples of badge/stickers
/Users/burooj/Library/Application Support/CleanShot/media/media_I0pRIGB32A/CleanShot.screenshot-2026.05.18-14.51.31.png
/Users/burooj/Library/Application Support/CleanShot/media/media_flMTP2GtlV/CleanShot.screenshot-2026.05.18-14.51.49.png

this screenshot below is old badge showcase. also showing treatments of the geomtrey we defined.
/Users/burooj/Library/Application Support/CleanShot/media/media_XBmEyrkFlg/CleanShot.screenshot-2026.05.18-14.55.28.png


### keys
- bone and tomato are branding colors. brass,ink,ivory are ui colors.
keys will only use music colors, aka 3/3 section of colors.

additionally i want to have the same unified structure for a key. and then "cuts" are just geomtery we defined, stuff like clip path. being applied to the same key. and similarly we show the same structure tall, wide, squary.
for being pressed they can maybe use that pressed shaodow. and have transition?
(btw the clip path used in the cuts keys ought to be decomposed into the geomtry clip path section, these arent repped there.
/Users/burooj/Library/Application Support/CleanShot/media/media_sDiuWguGpg/CleanShot.screenshot-2026.05.18-14.59.51.png

idk what 2/2 is. its redundant.


### knobs
these cannot use brand colors. ONLY UI.
so knobs deserive two seperate specimen cards
the 1/2 flat type that you labelled arc,
/Users/burooj/Library/Application Support/CleanShot/media/media_aHSfdYLhQo/CleanShot.screenshot-2026.05.18-15.06.58.png

 and 2/2 the "full-looking" type you named ring. i guess the flat one looks more "digital" and the other looks more "analog"
/Users/burooj/Library/Application Support/CleanShot/media/media_puqDdN67V2/CleanShot.screenshot-2026.05.18-15.07.14.png

so theres two visual-types(digital, analog) and 
four functional types(range, boolean, options, button)
so two specimen cards(digital, ananlog). and the variants within showing the fiunctional types. 

### buttons
these cannot use brand colors. only ui. 
and all our buttons cannot use text within, we only have icon buttons.
feel free to apply some of the geotery to them. 

### tabs 
/Users/burooj/Library/Application Support/CleanShot/media/media_friPeRtJy0/CleanShot.screenshot-2026.05.18-15.12.54.png
these cannot use brand colors. only ui. 
this specific card is broken. and isnt interactive.
and its missing the persona-5 style tabs from motion-applied section, 5/9, 7/9, 9/9 (these three sections have variants of the persona 5 style tabs)
/Users/burooj/Library/Application Support/CleanShot/media/media_yEZnlMH6io/CleanShot.screenshot-2026.05.18-15.12.43.png

### card shell
they ought to have more variants. no border variants. contrast-y full black with ivory, vice versa. 


### brand
call this logo instead. and only have logo, use specimen skill on the logo.
incorpate the tagline into the logo. as variant.
purge 3/5, 4/5.

5/5 is like decor's 5/6. more compositions, showing a kind of "hero-seection"

the decoration on the right of 5/5 could be a full decoration right?
/Users/burooj/Library/Application Support/CleanShot/media/media_AOknhhpXIp/CleanShot.screenshot-2026.05.18-15.17.29.png



### motion applied
this is not a primative. and will largely need to be decomposed then purged. a lot has already been decomposed. ive mentioned a few things above alredy to pull from this. ill mention what else can be salvaged below. and the this section gets purged.


- /Users/burooj/Library/Application Support/CleanShot/media/media_mMe2Liztm4/CleanShot.screenshot-2026.05.18-15.18.30.png
this is basically a primative, idk what to call it? beat counter loading thingy

guess thats it, otherwise i mentioned the animations, and p5-tabs before.


-----
## parts
lots of confusion here, lots of drift, lots of overlap.
### strips 
this needs to be a primative. it needs to be passed through the spcimen skill.

code strip is a seperate entitiy altogether and also ought to be a primative. because its inuque component.
its variants could be varioations on displaying(solfege, degreee, raw notes), or the way durations are represented, or how its layouted/shaped
here is the live version screenshots, and you can see how the strudel code is shown here.
/Users/burooj/Library/Application Support/CleanShot/media/media_SeWac0Nz2a/CleanShot.screenshot-2026.05.18-15.23.15.png
/Users/burooj/Library/Application Support/CleanShot/media/media_BxFwL5QtGk/CleanShot.screenshot-2026.05.18-15.24.11.png

### pattern card
1/3 pattern card is just drifted far. because as we see in 3/3 (pattern-reel) the actual pattern cards used in that full interactive version are diffferent, so that version ought to be decomosed into pattern card.
- purge 2/3

pattern card has two shapes. full expanded and sleek non expanded(shows strips, not bars). we see this in the pattern reel. the active one is expanded and at the bottom.


### preset card
this doesnt need to be a seperate component from the spine-card , it is just a variant of it with a button inside
/Users/burooj/Library/Application Support/CleanShot/media/media_wyPhXrFjOm/CleanShot.screenshot-2026.05.18-14.21.45.png


### panel haeder
this component doesnt exist. this is just the expanded/active pattern card.

### hardware bar
purge this.


## copositions
- loading screen (this ought to combine with the two sections i said above were meant to be compositions) 
- top drawer (used by instrument picker and visual config)
- bottom drawer (used by the pattern reel, the keys)

drawer itself ought to be a primative. since its a fundamental unit.

