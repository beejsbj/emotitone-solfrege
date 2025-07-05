# Feature: Record Player Sequencer Visuals

## 🎯 Goal

Evolve the Circular Sequencer's UI from its current grid-based design to a more elegant and intuitive "Record Player" aesthetic. This high-impact visual enhancement will make the app feel more polished and unique while maintaining all existing functionality.

## 📋 Background

The current circular sequencer, while functional, can be visually noisy and doesn't fully capture the "intuitive instrument" feel. It's a grid of circles, not a cohesive visual metaphor. This feature will transform it into a record player aesthetic.

## 🔧 Implementation Steps

### Step 1: Analyze Current Components

**Study existing circular sequencer components:**

- `src/components/sequencer/circular/CircularGrid.vue`
- `src/components/sequencer/circular/CircularIndicators.vue`
- `src/components/sequencer/circular/CircularLabels.vue`
- `src/components/sequencer/circular/CircularPlayhead.vue`
- `src/components/sequencer/circular/CircularTracks.vue`

**Understand current rendering:**

- How tracks are currently displayed
- How beats are visualized
- How the playhead moves
- How active notes are shown

### Step 2: Design Record Player Aesthetic

**Key visual changes:**

1. **Concentric SVG Tracks** - Render 7 tracks as clean, concentric circles
2. **Stroke-Based Beat Visualization** - Use `stroke-dasharray` for 16 steps instead of individual circles
3. **Simplified Color Scheme** - Each track has a base color with intensity variations
4. **Record Player Details** - Add vinyl record textures and center spindle

### Step 3: Create Record Player Components

**Create new component structure:**

```
src/components/sequencer/record-player/
├── RecordPlayerTracks.vue      # Concentric track circles
├── RecordPlayerBeats.vue       # Beat visualization with stroke-dasharray
├── RecordPlayerPlayhead.vue    # Needle/playhead animation
├── RecordPlayerCenter.vue      # Center spindle and labels
└── RecordPlayerVisuals.vue     # Main orchestrating component
```

### Step 4: Implement SVG-Based Rendering

**RecordPlayerTracks.vue:**

```vue
<template>
  <svg :width="size" :height="size" class="record-player-tracks">
    <circle
      v-for="(track, index) in tracks"
      :key="index"
      :cx="center"
      :cy="center"
      :r="getTrackRadius(index)"
      :stroke="getTrackColor(track)"
      :stroke-width="getTrackThickness(index)"
      :stroke-dasharray="getTrackDashArray(track)"
      fill="none"
      class="track-circle"
    />
  </svg>
</template>

<script setup lang="ts">
const getTrackRadius = (index: number) => {
  const maxRadius = size / 2 - 40;
  const minRadius = 60;
  return maxRadius - (index * (maxRadius - minRadius)) / 6;
};

const getTrackThickness = (index: number) => {
  // Do (thickest) to Ti (thinnest)
  return 12 - index * 1.5;
};

const getTrackDashArray = (track: TrackData) => {
  // Create dash pattern for 16 beats
  const circumference = 2 * Math.PI * getTrackRadius(track.index);
  const stepLength = circumference / 16;

  return track.notes
    .map((isActive, beatIndex) => {
      return isActive ? stepLength * 0.8 : stepLength * 0.2;
    })
    .join(" ");
};
</script>
```

**RecordPlayerPlayhead.vue:**

```vue
<template>
  <svg :width="size" :height="size" class="record-player-playhead">
    <line
      :x1="center"
      :y1="center"
      :x2="needleX"
      :y2="needleY"
      stroke="hsla(0, 0%, 90%, 0.8)"
      stroke-width="2"
      class="playhead-needle"
    />
    <circle
      :cx="center"
      :cy="center"
      :r="8"
      fill="hsla(0, 0%, 20%, 1)"
      class="center-spindle"
    />
  </svg>
</template>

<script setup lang="ts">
const needlePosition = computed(() => {
  const angle = (currentBeat / 16) * 2 * Math.PI - Math.PI / 2;
  const radius = size / 2 - 20;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
});
</script>
```

### Step 5: Add Record Player Details

**Vinyl record texture:**

```vue
<template>
  <svg class="record-texture">
    <!-- Concentric groove lines -->
    <circle
      v-for="groove in grooves"
      :key="groove"
      :cx="center"
      :cy="center"
      :r="groove"
      stroke="hsla(0, 0%, 0%, 0.1)"
      stroke-width="0.5"
      fill="none"
    />

    <!-- Center label -->
    <circle
      :cx="center"
      :cy="center"
      :r="30"
      fill="hsla(280, 100%, 70%, 0.1)"
      stroke="hsla(280, 100%, 70%, 0.3)"
      stroke-width="1"
    />
  </svg>
</template>
```

### Step 6: Integrate with Existing System

**Update main sequencer component:**

```vue
<template>
  <div class="circular-sequencer">
    <!-- Replace existing grid with record player -->
    <RecordPlayerVisuals
      :tracks="sequencerTracks"
      :current-beat="currentBeat"
      :is-playing="isPlaying"
      @note-toggle="toggleNote"
    />
  </div>
</template>
```

**Maintain API compatibility:**

- Keep all existing props and events
- Preserve track data structure
- Maintain note toggling functionality
- Keep playhead animation behavior

### Step 7: Add Animation Enhancements

**Smooth playhead movement:**

```typescript
const animatePlayhead = () => {
  const startAngle = (previousBeat / 16) * 2 * Math.PI;
  const endAngle = (currentBeat / 16) * 2 * Math.PI;

  gsap.to(playheadAngle, {
    duration: 0.1,
    ease: "power2.out",
    value: endAngle,
  });
};
```

**Track highlight on play:**

```typescript
const highlightActiveTrack = (trackIndex: number) => {
  gsap.to(`.track-${trackIndex}`, {
    duration: 0.1,
    strokeWidth: "+=2",
    yoyo: true,
    repeat: 1,
  });
};
```

## ✅ Verification

1. **Visual Transformation**: Sequencer displays as concentric circles resembling a record player
2. **Functionality Preserved**: All existing sequencer features work identically
3. **Performance**: No performance regression from SVG rendering
4. **Responsive**: Works well on different screen sizes
5. **Accessibility**: Screen readers can still understand the interface
6. **Animation**: Smooth playhead movement and track highlighting

## 📦 Completion

This feature is complete when the circular sequencer has been transformed into a record player aesthetic, all existing functionality is preserved, and the new visual design provides a more intuitive and polished user experience.
