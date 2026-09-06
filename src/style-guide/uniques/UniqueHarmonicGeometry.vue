<template>
  <section class="harmonic-specimen">
    <header class="harmonic-specimen__header">
      <div>
        <h3>Harmonic Geometry · Canvas Unique</h3>
        <p>
          The real production renderer, exercised with controlled blob fixtures.
          Connections sit beneath the blobs; labels are an optional layer and
          default off.
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
          ref="outlineCanvas"
          aria-label="Soft harmonic connections between three colored blobs"
        />
        <figcaption>
          <strong>Outline</strong>
          <span>Low-contrast color threads emerge from behind each blob.</span>
        </figcaption>
      </figure>

      <figure>
        <canvas
          ref="mergeCanvas"
          aria-label="Three colored blobs joined by fluid merging bridges"
        />
        <figcaption>
          <strong>Merge</strong>
          <span>Filled curved necks make the active blobs read as one body.</span>
        </figcaption>
      </figure>
    </div>

    <p class="harmonic-specimen__boundary">
      Blob circles are inert specimen fixtures. Connection geometry, music
      colors, label placement, and configuration all cross the production
      renderer seam; no audio or application store is driven here.
    </p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { MAJOR_SOLFEGE } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { useColorSystem } from "@/composables/useColorSystem";
import { useHarmonicGeometryRenderer } from "@/composables/canvas/useHarmonicGeometryRenderer";
import type {
  ActiveBlob,
  ActiveNote,
  HarmonicAnalysisSnapshot,
  HarmonicGeometryConfig,
  HarmonicGeometryMode,
} from "@/types";

const outlineCanvas = ref<HTMLCanvasElement | null>(null);
const mergeCanvas = ref<HTMLCanvasElement | null>(null);
const showLabels = ref(false);
const renderer = useHarmonicGeometryRenderer();
const {
  getStaticPrimaryColor,
  getStaticAccentColor,
  withAlpha,
} = useColorSystem();

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
  ],
  chordLabel: "C",
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
          { x: width * 0.3, y: height * 0.58 },
          { x: width * 0.5, y: height * 0.34 },
          { x: width * 0.7, y: height * 0.58 },
        ]
      : [
          { x: width * 0.2, y: height * 0.66 },
          { x: width * 0.5, y: height * 0.26 },
          { x: width * 0.8, y: height * 0.66 },
        ];
  const radius = Math.min(width, height) * (mode === "merge" ? 0.2 : 0.17);

  return new Map<string, ActiveBlob>(
    notes.map((note, index) => [
      note.noteId,
      {
        x: positions[index].x,
        y: positions[index].y,
        note: note.solfege,
        frequency: note.frequency,
        startTime: 0,
        baseRadius: radius,
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

const drawFixtureBlob = (
  context: CanvasRenderingContext2D,
  note: ActiveNote,
  blob: ActiveBlob
) => {
  const radius = blob.baseRadius * blob.scale;
  const primary = getStaticPrimaryColor(
    note.solfege.name,
    note.mode,
    note.octave,
    note.key
  );
  const accent = getStaticAccentColor(
    note.solfege.name,
    note.mode,
    note.octave,
    note.key
  );
  const gradient = context.createRadialGradient(
    blob.x - radius * 0.22,
    blob.y - radius * 0.24,
    radius * 0.08,
    blob.x,
    blob.y,
    radius
  );

  gradient.addColorStop(0, withAlpha(primary, 0.96));
  gradient.addColorStop(0.72, withAlpha(primary, 0.88));
  gradient.addColorStop(1, withAlpha(accent, 0.8));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
  context.fill();
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
    backdropBlur: 14,
    glassmorphOpacity: mode === "merge" ? 0.72 : 0.4,
    opacity: 0.72,
  };
  const scene = renderer.buildScene(snapshot, blobs, config, width, height);

  renderer.renderGeometry(context, scene, config);
  notes.forEach((note) => {
    const blob = blobs.get(note.noteId);
    if (blob) drawFixtureBlob(context, note, blob);
  });
  renderer.renderLabels(context, scene, config);
};

const drawAll = async () => {
  await nextTick();
  drawSpecimen(outlineCanvas.value, "outline");
  drawSpecimen(mergeCanvas.value, "merge");
};

watch(showLabels, drawAll, { flush: "post" });
onMounted(() => {
  void drawAll();
  window.addEventListener("resize", drawAll);
});
onBeforeUnmount(() => window.removeEventListener("resize", drawAll));
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
