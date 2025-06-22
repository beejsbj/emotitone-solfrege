# Project Brief: Emotitone Solfege - An Interactive Music Theory Web App

## 1. AI Persona & Tech Stack

You are an expert musician, programmer, and designer.
You are an expert in Vue 3 Composition API, Pinia, GSAP, CSS Design and Tailwind v4.

Your task is to build a simple, mobile-first web app based on the concepts outlined below.

do animations/styling/design at the end, but build it so that can easily themed, especially being able to change themes.

Use Bun for package management.
Configure Tailwind CSS v4 with a CSS variable-based design system.
Run dev server on port **5175**
**Required Proficiency:**

- **Framework:** Vue 3 (Composition API)
- **State Management:** Pinia
- **Animation:** GSAP (GreenSock Animation Platform)
- **Styling:** Tailwind CSS v4 with a CSS variable-based design system.
- **Audio:** integrate an audio solution (e.g., `Tone.js` for dynamic audio synthesis).

---

## 2. Vision & Core Concept

The goal is to create an immersive, educational tool that allows users to _feel_ and intuitively understand music theory, specifically the concept of solfege. The app will demonstrate how each note in a scale has a unique emotional character and how these relationships create the "emotional DNA" of music. It's an interactive experience combining sound, color, and animation to make music theory intuitive and fun.

The core idea is that the emotional "flavor" of a solfege degree (e.g., the longing of `La`, the tension of `Ti`) is constant across all keys because it's about the _relationship_ between notes, not their absolute pitch.

---

## 3. Key Features

### 3.1. Interactive Solfege Palette

- A set of large, touch-friendly buttons for each solfege degree (`Do`, `Re`, `Mi`, etc.).
- Each button will be color-coded and display its name and emotional description.
- Tapping a button plays the corresponding note and triggers a background animation reflecting its emotional character.

### 3.2. Key & Mode Selection

- **Key Selector:** A dropdown or similar UI to switch between all 12 musical keys.
- **Mode Toggle:** A switch to select between **Major** and **Minor** modes.
- The app must dynamically update the notes played by the solfege buttons based on the selected key and mode.
- Display the actual note names (e.g., C, D, E...) for the current scale below the solfege buttons.

### 3.3. Melody Sequencer

- Allow the user to tap solfege buttons to create a sequence of up to 4 sections of 4 notes each, a note could be lengthened and held.
- A "Play Sequence" button to play back the created melody.

### 3.4. Predefined Patterns

- A section with a list of buttons that play predefined melodic patterns and intervals.
- This will help demonstrate common musical phrases and their emotional impact.
- Include the following demos:

#### Emotional Character of Intervals:

- **Unison/Octave:** Unity, completion
- **Minor 2nd:** Dissonance, yearning, pain
- **Major 2nd:** Gentle tension, stepping forward
- **Minor 3rd:** Sadness, introspection
- **Major 3rd:** Joy, brightness
- **Perfect 4th:** Stability, openness
- **Tritone:** Tension, mystery, unrest
- **Perfect 5th:** Power, openness, clarity
- **Minor 6th:** Melancholy, longing
- **Major 6th:** Sweet, nostalgic
- **Minor 7th:** Bluesy, unresolved
- **Major 7th:** Sharp tension, modernist

#### Common Melodic Patterns:

- **Scale Ascent & Descent:** The classic scale journey up and down.
- **Do-Sol-Do:** (Do → Sol → Do) - Perfect fifth leap, triumphant.
- **Do-Ti-Do:** (Do → Ti → Do) - Leading tone resolution, urgent.
- **Do-La-Sol:** (Do → La → Sol) - Descending sadness.
- **Sol-Ti-Do:** (Sol → Ti → Do) - Dominant resolution, satisfying.
- **La-Ti-Do:** (La → Ti → Do) - Longing to resolution.
- **Do-Mi-Sol:** (Do → Mi → Sol) - Major triad, bright and stable.
- **Do-Re-Mi:** (Do → Re → Mi) - Optimistic ascent.
- **Mi-Re-Do:** (Mi → Re → Do) - Gentle descent home.
- **Fa-Mi:** (Fa → Mi) - Tension release, sigh.
- **Ti-Do-Ti-Do:** (Ti → Do → Ti → Do) - Restless resolution.

---

## 4. Design, Animation & Aesthetics

The overall aesthetic should be **vintage, sleek, and classy**, with a **"jazz club"** vibe. The design should be ambient and immersive.

### 4.1. Visuals & Background

- Use the provided image as inspiration for ambient, complex gradients.
- The background should be a dynamically animating gradient that responds to the played note.
- **Dynamic Lighting:** Create complex, layered gradients with radial spotlights that pulse and shift.
  - Major keys should have bright, vibrant lighting.
  - Minor keys should have dimmed, moody, and introspective lighting.
- **Effects:** Use GSAP to create smooth blur morphs, color shifts, and other "bubbly/refractive" visual effects that feel organic and responsive.

### 4.2. Typography

- Use the **Ojuju** variable font from Google Fonts.
- Play with the variable font weight to create a dynamic, retro-technical feel, reminiscent of vintage audio equipment.

```html
<style>
  @import url('https://fonts.googleapis.com/css2?family=Ojuju:wght@200..800&display=swap');
</style>
```

### 4.3. Color & Emotion System

This is the heart of the app's visual feedback. Each note has a complex color identity that evolves, representing its emotional texture from attack to release. Use the following detailed maps for the color gradients and emotional textures.

#### Major Scale

| Name | Number | Color Gradient / Flecks                               | Emotion & Texture                                            | Description                               |
| ---- | ------ | ----------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Do   | 1      | Deep Blue → Warm Orange → Golden, with soft radiance  | Home, rest, stability; foundation, trust, warmth from peace  | The foundation. Complete resolution.      |
| Re   | 2      | Sky Blue → Cyan → Silver, airy flecks                 | Forward motion, stepping up; hopeful lift, gentle curiosity  | Moving away from home with purpose.       |
| Mi   | 3      | Bright Yellow → Warm Orange → Amber, glowing points   | Bright, joyful optimism; clarity and rising joy              | Sunny and optimistic, wants to rise.      |
| Fa   | 4      | Greenish base, with pulling Orange-Red streaks        | Tension, unease; inward pull, leaning fall, yearning         | Unstable, wants to fall back to Mi.       |
| Sol  | 5      | Glory Red → Yellow, with hints of Royal Blue          | Strength, confidence, dominance; a triumphant beacon         | Confident and stable, but not quite home. |
| La   | 6      | Pink → Rose, with flecks of Deep Purple               | Longing, wistfulness; emotional openness, romantic ache      | Beautiful sadness, reaching for Do.       |
| Ti   | 7      | Electric Yellow → Vibrant Violet, sparkling intensity | Urgency, restlessness; spiritual tension, strong upward pull | Restless, must resolve up to Do!          |
| Do   | 8      | Deep Blue → Warm Orange → Golden, with soft radiance  | Resolution, completion, home; warmth rising from peace       | Back home, one octave higher.             |

#### Minor Scale

| Name | Number | Color Gradient / Flecks                             | Emotion & Texture                                                | Description                      |
| ---- | ------ | --------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Do   | 1      | Slate → Ash Blue → Faint Gold flecks                | Grounded, somber home; dignified stability with emotional weight | Dark but stable foundation.      |
| Re   | 2      | Forest Green → Blue-Gray → Teal mist                | Gentle, uncertain step; cautious, introverted motion             | Cautious movement forward.       |
| Me   | 3      | Dusky Rose → Amber → Flecks of Gray                 | Melancholy, introspection; tender vulnerability                  | Minor third - tender sadness.    |
| Fa   | 4      | Burnt Green → Muted Orange-Red, slow drip of warmth | Tension, yearning; a shadowed inward pull                        | Same tension, deeper in minor.   |
| Sol  | 5      | Deep Plum → Faded Gold, brushed with stormy blue    | Bittersweet strength; noble sorrow with resilience               | Strong but tinged with sadness.  |
| Le   | 6      | Dark Indigo → Burgundy → Dark Brown, matte texture  | Deep longing, sorrow; grounded grief, ancient ache               | Minor sixth - profound yearning. |
| Te   | 7      | Muted Violet → Slate → Rose, subtle sparkles        | Gentle leading, subdued; shadowed anticipation                   | Softer leading tone than Ti.     |
| Do   | 8      | Slate → Ash Blue → Faint Gold flecks                | Somber resolution; dignified return with minor character         | Home, but with minor character.  |

---

## 5. Conceptual Notes for Implementation

- **Gradient Logic:** The gradients should evolve over the duration of a note's sound (attack → sustain → release). This can be a subtle animation within the background. Radial gradients are a good starting point.
- **Flecks/Accents:** The "flecks" in the color maps can be implemented as secondary particle effects or highlights within the main gradient, reflecting overtone energy or harmonic context.
- **Light & Texture:** Pay attention to the texture descriptions. Some colors "glow" (Mi, Ti), while others feel like they "absorb" light (Le, Me). This can be achieved with brightness, blur, and opacity animations.
- Create a `music.js` service for music theory calculations.
- Data structures connecting 12 notes, scales, dynamic solfrege degrees, and their names, emotional description and color maps.
- database of common melodic patterns and intervals and of interesting ones.
