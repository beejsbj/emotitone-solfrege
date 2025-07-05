# Feature: Intuitive Composition Proof of Concept

## 🎯 Goal

Explore and prototype novel, intuitive methods for melody composition that go beyond the circular sequencer. This is **research and experimentation**, focusing on solving the "Melody Writer Challenge" through gesture-based interactions.

## 📋 Background

The current sequencer is excellent for short loops, but the app lacks tools for composing longer, expressive melodies. Traditional tools like piano rolls conflict with the app's philosophy of intuitive play.

## 🔧 Implementation Steps

### Step 1: Choose Primary Concept

**Select one concept to prototype:**

1. **Gesture-Based Melody Drawing**

   - Draw melodies on canvas
   - Y-axis = pitch, X-axis = time
   - Touch pressure = velocity/dynamics

2. **Emotional Melody Seeds**

   - Generate starter melodies from emotions
   - User selects mood → algorithm creates seed
   - Edit the generated melody

3. **Phrase Chaining**
   - Connect sequencer patterns into songs
   - Drag-and-drop timeline interface
   - Verse/Chorus structure building

### Step 2: Build Minimal Prototype

Create isolated Vue component:

```
src/components/experimental/
├── GestureDrawing.vue
├── EmotionalSeeds.vue
└── PhraseChaining.vue
```

### Step 3: Core Mechanic Implementation

**For Gesture Drawing:**

```vue
<script setup lang="ts">
const canvas = ref<HTMLCanvasElement>();
const isDrawing = ref(false);
const drawPath = ref<Point[]>([]);

const onDrawStart = (event: PointerEvent) => {
  isDrawing.value = true;
  const point = getCanvasPoint(event);
  drawPath.value = [point];
};

const onDrawMove = (event: PointerEvent) => {
  if (!isDrawing.value) return;
  const point = getCanvasPoint(event);
  drawPath.value.push(point);
  drawLine(point);
};

const onDrawEnd = () => {
  isDrawing.value = false;
  convertToMelody(drawPath.value);
  drawPath.value = [];
};
</script>
```

### Step 4: Evaluate and Document

Time-box exploration (1-2 sprints). Document findings:

- What worked well?
- What felt intuitive?
- What was confusing?
- Potential for full feature?

## ✅ Verification

1. **Functional Prototype**: Core mechanic works
2. **Intuitive Test**: New users can understand it quickly
3. **Musical Output**: Produces pleasing musical results
4. **Documentation**: Findings clearly documented
5. **Isolation**: No changes to production components

## 📦 Completion

Complete when prototype demonstrates core concept and findings are documented for future development decisions.
