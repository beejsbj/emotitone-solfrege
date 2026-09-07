<template>
  <section class="harmonic-specimen">
    <header class="harmonic-specimen__header">
      <div>
        <h3>Harmonic Geometry · Canvas Unique</h3>
        <p>
          Two relationships, one shared material field. Labels remain an
          optional layer and default off.
        </p>
      </div>

      <label class="harmonic-specimen__toggle">
        <input v-model="showLabels" type="checkbox" />
        Show analysis labels
      </label>
    </header>

    <div class="harmonic-specimen__grid">
      <figure>
        <canvas
          ref="webCanvas"
          aria-label="Four colored blobs joined by fused harmonic filaments"
        />
        <figcaption>
          <strong>Web</strong>
          <span>Distinct bodies share fused perimeter and interior filaments.</span>
        </figcaption>
      </figure>

      <figure>
        <canvas
          ref="mergeCanvas"
          aria-label="Four colored blobs joined as one fluid body"
        />
        <figcaption>
          <strong>Merge</strong>
          <span>Every body stays joined; distance tapers the shared neck.</span>
        </figcaption>
      </figure>
    </div>

    <p class="harmonic-specimen__boundary">
      The specimen freezes real vibrating blob frames. Contours, field fusion,
      music colors, label placement, and configuration all cross production
      renderer seams; no audio is driven here.
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
  HarmonicAnalysisSnapshot,
  HarmonicGeometryConfig,
  HarmonicGeometryMode,
} from "@/types";

const webCanvas = ref<HTMLCanvasElement | null>(null);
const mergeCanvas = ref<HTMLCanvasElement | null>(null);
const showLabels = ref(false);
const renderer = useHarmonicGeometryRenderer();
const blobRenderer = useBlobRenderer();
const blobFieldRenderer = useBlobFieldRenderer();

const notes: ActiveNote[] = [
  {
    solfegeIndex: 0,
    solfege: MAJOR_SOLFEGE[0],
    frequency: 261.63,
    octave: 4,
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
    (ratio) => Math.min(width, height) * ratio
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
  const config: HarmonicGeometryConfig = {
    ...DEFAULT_CONFIG.floatingPopup,
    isEnabled: true,
    geometryMode: mode,
    showChord: showLabels.value,
    showIntervals: showLabels.value,
    showEmotionalDescription: showLabels.value,
    backdropBlur: 18,
    glassmorphOpacity: mode === "merge" ? 0.86 : 0.68,
    opacity: mode === "merge" ? 0.82 : 0.9,
  };
  const scene = renderer.buildScene(snapshot, blobs, config, width, height);
  const frames = notes.flatMap((note, index) => {
    const blob = blobs.get(note.noteId);
    return blob
      ? [
          blobRenderer.createFixtureFrame(
            note.noteId,
            blob,
            DEFAULT_CONFIG.blobs,
            1.15 + index * 0.17
          ),
        ]
      : [];
  });

  blobFieldRenderer.renderBlobField(
    context,
    frames,
    mode,
    config,
    scene,
    DEFAULT_CONFIG.blobs
  );
  renderer.renderLabels(context, scene, config);
};

const drawAll = async () => {
  await nextTick();
  drawSpecimen(webCanvas.value, "web");
  drawSpecimen(mergeCanvas.value, "merge");
};

watch(showLabels, drawAll, { flush: "post" });
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
  gap: 18px;
  width: min(960px, calc(100vw - 32px));
  min-width: 0;
  color: var(--ivory);
}

.harmonic-specimen__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
}

.harmonic-specimen h3,
.harmonic-specimen p {
  margin: 0;
}

.harmonic-specimen h3 {
  font: var(--t-display-s);
  text-transform: uppercase;
}

.harmonic-specimen p,
.harmonic-specimen figcaption,
.harmonic-specimen__toggle {
  color: var(--ivory-3);
  font: var(--t-label);
}

.harmonic-specimen__header p {
  max-width: 64ch;
  margin-top: 6px;
}

.harmonic-specimen__toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.harmonic-specimen__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.harmonic-specimen figure {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
}

.harmonic-specimen canvas {
  display: block;
  width: 100%;
  height: 260px;
  border-radius: var(--radius-m);
  background:
    radial-gradient(circle at 50% 42%, hsla(210, 18%, 16%, 0.76), transparent 68%),
    var(--ink);
}

.harmonic-specimen figcaption {
  display: grid;
  gap: 2px;
}

.harmonic-specimen figcaption strong {
  color: var(--ivory);
  font: var(--t-mono);
  text-transform: uppercase;
}

.harmonic-specimen__boundary {
  max-width: 78ch;
}

@media (max-width: 720px) {
  .harmonic-specimen__header {
    align-items: start;
    flex-direction: column;
  }

  .harmonic-specimen__grid {
    grid-template-columns: 1fr;
  }

  .harmonic-specimen canvas {
    height: 220px;
  }
}
</style>
