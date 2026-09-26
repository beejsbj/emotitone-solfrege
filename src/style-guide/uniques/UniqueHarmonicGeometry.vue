<template>
  <section class="harmonic-specimen">
    <p class="harmonic-specimen__role">Canvas unique · strands or one body</p>
    <p class="harmonic-specimen__intro">
      Distinct bodies joined by fine Web strands, or one filled Merge body.
      Analysis labels are an optional layer and default off.
    </p>

    <div class="harmonic-specimen__toggles" role="group" aria-label="Specimen layers">
      <button
        type="button"
        class="harmonic-specimen__toggle"
        :aria-pressed="showLabels"
        @click="showLabels = !showLabels"
      >
        Show analysis labels
      </button>
      <button
        type="button"
        class="harmonic-specimen__toggle"
        :aria-pressed="fullyFused"
        @click="fullyFused = !fullyFused"
      >
        Fuse Merge body
      </button>
    </div>

    <div class="harmonic-specimen__grid">
      <figure>
        <canvas
          ref="webCanvas"
          aria-label="Four distinct colored blobs joined by thin harmonic strands"
        />
        <figcaption>
          <strong>Web</strong>
          <span>Distinct bodies joined by fine curved strands, with open space between.</span>
        </figcaption>
      </figure>

      <figure>
        <canvas
          ref="mergeCanvas"
          aria-label="Four colored blobs joined as one fluid body"
        />
        <figcaption>
          <strong>Merge</strong>
          <span>Note positions shape one rounded body with a filled, color-blended interior.</span>
        </figcaption>
      </figure>
    </div>

    <p class="harmonic-specimen__boundary">
      Frozen frames from the real vibrating blob renderer. Contours, field
      fusion, Music Color, label placement, and configuration all cross
      production renderer seams; no audio is driven here.
    </p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { MAJOR_SOLFEGE } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useBlobRenderer } from "@/composables/canvas/useBlobRenderer";
import { useBlobFieldRenderer } from "@/composables/canvas/useBlobFieldRenderer";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import type {
  ActiveBlob,
  ActiveNote,
  BlobConfig,
  HarmonicAnalysisSnapshot,
  HarmonicGeometryMode,
} from "@/types";

const webCanvas = ref<HTMLCanvasElement | null>(null);
const mergeCanvas = ref<HTMLCanvasElement | null>(null);
const showLabels = ref(false);
const fullyFused = ref(false);
const renderer = useHarmonicGeometryRenderer();
const blobRenderer = useBlobRenderer();
const blobFieldRenderer = useBlobFieldRenderer();

const notes: ActiveNote[] = [
  {
    solfegeIndex: 0,
    solfege: MAJOR_SOLFEGE[0],
    frequency: 261.63,
    octave: 4,
    keyboardOctave: 4,
    noteId: "guide-c4",
    noteName: "C4",
    mode: "major",
    key: "C",
  },
  {
    solfegeIndex: 2,
    solfege: MAJOR_SOLFEGE[2],
    frequency: 329.63,
    octave: 4,
    keyboardOctave: 4,
    noteId: "guide-e4",
    noteName: "E4",
    mode: "major",
    key: "C",
  },
  {
    solfegeIndex: 4,
    solfege: MAJOR_SOLFEGE[4],
    frequency: 392,
    octave: 4,
    keyboardOctave: 4,
    noteId: "guide-g4",
    noteName: "G4",
    mode: "major",
    key: "C",
  },
  {
    solfegeIndex: 6,
    solfege: MAJOR_SOLFEGE[6],
    frequency: 493.88,
    octave: 4,
    keyboardOctave: 4,
    noteId: "guide-b4",
    noteName: "B4",
    mode: "major",
    key: "C",
  },
];

const snapshot: HarmonicAnalysisSnapshot = {
  isVisible: true,
  displayedNotes: notes,
  intervalEdges: [
    {
      fromNoteId: "guide-c4",
      toNoteId: "guide-e4",
      fromIndex: 0,
      toIndex: 1,
      interval: "3M",
    },
    {
      fromNoteId: "guide-e4",
      toNoteId: "guide-g4",
      fromIndex: 1,
      toIndex: 2,
      interval: "3m",
    },
    {
      fromNoteId: "guide-c4",
      toNoteId: "guide-g4",
      fromIndex: 0,
      toIndex: 2,
      interval: "5P",
    },
    {
      fromNoteId: "guide-c4",
      toNoteId: "guide-b4",
      fromIndex: 0,
      toIndex: 3,
      interval: "7M",
    },
    {
      fromNoteId: "guide-e4",
      toNoteId: "guide-b4",
      fromIndex: 1,
      toIndex: 3,
      interval: "5P",
    },
    {
      fromNoteId: "guide-g4",
      toNoteId: "guide-b4",
      fromIndex: 2,
      toIndex: 3,
      interval: "3M",
    },
  ],
  chordLabel: "Cmaj7",
  emotionalDescription: "Home · brightness · strength",
};

const createBlobs = (
  width: number,
  height: number,
  mode: HarmonicGeometryMode
) => {
  const positions =
    mode === "merge"
      ? [
          { x: width * 0.14, y: height * 0.7 },
          { x: width * 0.38, y: height * 0.25 },
          { x: width * 0.66, y: height * 0.3 },
          { x: width * 0.86, y: height * 0.7 },
        ]
      : [
          { x: width * 0.18, y: height * 0.26 },
          { x: width * 0.8, y: height * 0.22 },
          { x: width * 0.82, y: height * 0.76 },
          { x: width * 0.2, y: height * 0.8 },
        ];
  const radii = [0.17, 0.14, 0.15, 0.16].map(
    (ratio) => Math.min(width, height) * ratio * (mode === "merge" && fullyFused.value ? 2.2 : 1)
  );

  return new Map<string, ActiveBlob>(
    notes.map((note, index) => [
      note.noteId,
      {
        x: positions[index].x,
        y: positions[index].y,
        note: note.solfege,
        frequency: note.frequency,
        startTime: 0,
        baseRadius: radii[index],
        opacity: 0.88,
        isFadingOut: false,
        driftVx: 0,
        driftVy: 0,
        vibrationPhase: index,
        scale: 1,
        renderScale: 1,
        renderOpacity: 0.88,
        mode: note.mode,
        key: note.key,
        octave: note.octave,
      },
    ])
  );
};

const drawSpecimen = (
  canvas: HTMLCanvasElement | null,
  mode: HarmonicGeometryMode
) => {
  if (!canvas) return;

  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(280, bounds.width);
  const height = Math.max(210, bounds.height);
  const pixelRatio = window.devicePixelRatio || 1;
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const blobs = createBlobs(width, height, mode);
  const config: BlobConfig = {
    ...DEFAULT_CONFIG.blobs,
    connectionMode: mode,
    showChordLabel: showLabels.value,
    showIntervalLabels: showLabels.value,
    showEmotionLabel: showLabels.value,
    fieldSoftness: 18,
    fusionStrength: mode === "merge" ? 0.86 : 0.68,
    webOpacity: 0.9,
    labelOpacity: mode === "merge" ? 0.82 : 0.9,
  };
  const scene = renderer.buildScene(snapshot, blobs, config, width, height);
  const frames = notes.flatMap((note, index) => {
    const blob = blobs.get(note.noteId);
    return blob
      ? [
          blobRenderer.createFixtureFrame(
            note.noteId,
            blob,
            config,
            1.15 + index * 0.17
          ),
        ]
      : [];
  });

  blobFieldRenderer.renderBlobField(
    context,
    frames,
    config,
    scene
  );
  renderer.renderLabels(context, scene, config);
};

const drawAll = async () => {
  await nextTick();
  await document.fonts?.ready;
  drawSpecimen(webCanvas.value, "web");
  drawSpecimen(mergeCanvas.value, "merge");
};

watch([showLabels, fullyFused], drawAll, { flush: "post" });
onMounted(() => {
  void drawAll();
  window.addEventListener("resize", drawAll);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", drawAll);
  blobFieldRenderer.dispose();
});
</script>

<style scoped>
.harmonic-specimen {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
  color: var(--ivory);
}

.harmonic-specimen p {
  margin: 0;
}

.harmonic-specimen__role {
  font: 700 clamp(20px, 3vw, 26px)/1.05 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--guide-paper-text, var(--ivory-2));
}

.harmonic-specimen__intro,
.harmonic-specimen__boundary {
  max-width: 64ch;
  font: var(--t-body-mono);
  color: var(--ivory-2);
}

.harmonic-specimen__boundary {
  font: var(--t-body-s-mono);
  color: var(--ivory-3);
}

.harmonic-specimen__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3) var(--s-4);
}

/* Layer toggles: cut-paper tabs; the layer's paper when on. */
.harmonic-specimen__toggle {
  min-height: 40px;
  padding: 8px 14px 6px;
  border: 0;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  clip-path: var(--clip-tab);
  cursor: pointer;
  transition:
    background-color var(--dur-ui) var(--ease-brush),
    color var(--dur-ui) var(--ease-brush);
}

.harmonic-specimen__toggle[aria-pressed="true"] {
  background: var(--guide-paper, var(--ivory));
  color: var(--guide-paper-ink, var(--ink));
  transform: rotate(var(--rot-tile-2));
}

.harmonic-specimen__toggle:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 2px;
}

.harmonic-specimen__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: var(--s-7) var(--s-6);
}

.harmonic-specimen figure {
  display: grid;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
}

.harmonic-specimen canvas {
  display: block;
  width: 100%;
  height: clamp(220px, 28vw, 340px);
  background: var(--ink);
}

.harmonic-specimen figcaption {
  display: grid;
  gap: var(--s-2);
  font: var(--t-caption);
  color: var(--ivory-3);
}

.harmonic-specimen figcaption strong {
  color: var(--ivory);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  .harmonic-specimen__toggle { transition: none; }
}
</style>
