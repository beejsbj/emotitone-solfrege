# Emotitone Solfege - Development Plan

This document outlines the tasks required to build the Emotitone Solfege web application.

## Phase 1: Project Setup & Core Structure

- [x] Initialize Vue 3 project using the Composition API.
- [x] Install necessary dependencies:
  - [x] Use Bun for package management.
  - [x] `pinia` for state management.
  - [x] `gsap` for animations.
  - [x] `tailwindcss` for styling. you wont need config, as v4 uses @theme
- [x] Configure Tailwind CSS v4 with a CSS variable-based design system.
- [x] Set up project structure (directories for components, stores, services, assets).
- [x] Integrate the 'Ojuju' Google Font.
- [x] Create a basic `App.vue` layout to host the main components.
- [x] Run dev server on port 5175

## Phase 2: Music Logic & State Management (Pinia)

- [x] Create a `music.js` service for music theory calculations.
  - [x] Function to generate notes for all 12 major and minor scales.
  - [x] Data structures for solfege degrees, including names, emotional descriptions, and color maps from the brief.
- [x] Set up a Pinia store (`musicStore.js`).
  - [x] State: `currentKey`, `currentMode`, `scaleNotes`.
  - [x] Actions: `setKey`, `setMode`.
  - [x] Getters: to compute the current scale based on key and mode.

## Phase 3: Audio Integration

- [x] Choose and integrate an audio solution (e.g., `Tone.js` for dynamic audio synthesis).
- [x] Create an `audioService.js` to handle note playback.
  - [x] Function to play a specific note (e.g., `playNote('C4')`).

## Phase 4: Core UI Components

- [x] **`SolfegeButton.vue` Component:**
  - [x] Receives note information (name, color, etc.) as props.
  - [x] Displays solfege name and emotional description.
  - [x] On click, triggers the `audioService` to play the corresponding note.
- [x] **`SolfegePalette.vue` Component:**
  - [x] Fetches the current scale from the Pinia store.
  - [x] Renders a `SolfegeButton` for each note in the scale.
  - [x] Displays the actual note names (e.g., C, D, E) for the current scale.
- [x] **`KeySelector.vue` Component:**
  - [x] Dropdown to select from the 12 musical keys.
  - [x] Updates the `currentKey` in the Pinia store.
- [x] **`ModeToggle.vue` Component:**
  - [x] Switch to select between Major and Minor modes.
  - [x] Updates the `currentMode` in the Pinia store.

## Phase 5: Animation & Visual Feedback (GSAP)

- [x] **`AnimatedBackground.vue` Component:**
  - [x] Create dynamic, layered gradients using GSAP.
- [x] Link note playback to background animations.
  - [x] When a note is played, the background animates to the corresponding color gradient from the brief.
  - [x] The animation should evolve through the note's duration (attack, sustain, release).
  - [x] Implement lighting effects (bright for major, moody for minor).
- [x] Implement "flecks" and texture effects as described in the brief.
- [x] Add subtle typography animations with the 'Ojuju' variable font.

## Phase 6: Melody Sequencer

- [x] Extend Pinia store to manage the sequencer state (`sequence` array).
- [x] **`Sequencer.vue` Component:**
  - [x] Allow users to add notes to the sequence by tapping `SolfegeButton`s.
  - [x] Display the current sequence.
  - [x] Implement "Play Sequence" functionality that uses the `audioService`.
  - [x] Implement logic for clearing the sequence and handling note length.

## Phase 7: Predefined Patterns

- [x] Create a data file for predefined melodic patterns and intervals.
- [x] **`PredefinedPatterns.vue` Component:**
  - [x] Renders a list of buttons for each pattern.
  - [x] Clicking a button plays the corresponding pattern using the `audioService`.

## Phase 8: Final Styling & Polish

- [x] Apply the final "vintage, sleek, jazz club" aesthetic across the app.
- [x] Ensure the layout is mobile-first and fully responsive.
- [x] Review all animations and transitions for smoothness and performance.
- [x] Conduct final testing and bug fixing.
