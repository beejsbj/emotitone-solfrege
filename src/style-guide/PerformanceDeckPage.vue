<template>
  <main class="performance-deck-page">
    <div class="performance-deck-page__stage" aria-hidden="true" />

    <header class="performance-deck-page__workbench">
      <div>
        <p>Focused real specimen · isolated controls</p>
        <h1>PerformanceDeck.</h1>
        <p class="performance-deck-page__intro">
          The production composition in controlled mode: PatternReel, its attached Drawer
          handle, opaque instrument rails, and Keyboard. No app store, persistence, audio,
          haptic, or Humming wiring is constructed here.
        </p>
      </div>

      <div class="performance-deck-page__controls" aria-label="Specimen controls">
        <button type="button" @click="drawerOpen = !drawerOpen">
          {{ drawerOpen ? "Close deck" : "Open deck" }}
        </button>
        <button type="button" @click="resetCode">Restore code</button>
        <button type="button" @click="warming = !warming">
          {{ warming ? "End warmup" : "Preview warmup" }}
        </button>
        <label>
          <span>Rows</span>
          <select v-model.number="rowCount">
            <option v-for="count in [1, 3, 5]" :key="count" :value="count">
              {{ count }}
            </option>
          </select>
        </label>
      </div>

      <output aria-live="polite">{{ lastAction }}</output>
    </header>

    <PerformanceDeck
      usage="controlled"
      v-model:drawer-open="drawerOpen"
      v-model:key-value="keyValue"
      v-model:mode-value="modeValue"
      v-model:bpm="bpm"
      v-model:octave="octave"
      v-model:play-mode="playMode"
      v-model:harmony-value="harmonyValue"
      :patterns="patterns"
      :selected-pattern-id="selectedPatternId"
      :pattern-entry-signal="patternEntrySignal"
      :code-strip-tokens="codeStripTokens"
      :is-playing="isPlaying"
      :row-count="rowCount"
      :keyboard-rows="keyboardRows"
      :warming="warming"
      warmup-message="Preparing the specimen"
      warming-instrument-name="Piano"
      @row-count-change="updateRowCount"
      @toggle-playback="togglePlayback"
      @backspace="removeLastEvent"
      @return="commitCode"
      @pattern-commit="selectPattern"
      @pattern-delete="deletePattern"
      @pattern-copy="copyPattern"
      @pattern-open-strudel="reportPatternAction('Open Strudel', $event)"
      @pattern-rename="renamePattern"
      @keyboard-press="reportKeyboardIntent('Press', $event)"
      @keyboard-release="reportKeyboardIntent('Release', $event)"
      @chord-press="reportChordIntent('Chord press', $event)"
      @chord-release="reportChordIntent('Chord release', $event)"
      @harmony-effective="reportHarmony"
      @update:key-value="reportControl('Key', $event)"
      @update:mode-value="reportControl('Mode', $event)"
      @update:bpm="reportControl('BPM', $event)"
      @update:octave="reportControl('Octave', $event)"
      @update:play-mode="reportControl('Style', $event)"
      @update:harmony-value="reportControl('Harmony', $event)"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import PerformanceDeck from "@/components/PerformanceDeck.vue";
import type {
  KeyboardChordIntent,
  KeyboardIntent,
  KeyboardRowView,
} from "@/components/compounds/Keyboard.vue";
import { staticNoteColorResolver } from "@/components/primatives/noteColorContext";
import type {
  PatternReelInput,
  PatternReelItem,
} from "@/components/compounds/PatternReel.vue";
import { visibleKeyboardOctaves } from "@/components/compounds/keyboardEdition";
import { instrumentIconFor } from "@/components/primatives/instrumentIcon";
import type {
  CodeStripNote,
  CodeStripNoteToken,
  CodeStripToken,
} from "@/components/uniques/CodeStrip/index.vue";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type { HarmonyAlteration } from "@/domain/harmony";
import { getChromaticNoteForScaleIndex } from "@/services/musicColor";
import type { ChromaticNote, MusicalMode } from "@/types/music";

const degreeLabels = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function guideNote(
  note: CodeStripNote,
  text: string,
  rawPitch: string,
  scaleIndex: number,
  mode: MusicalMode,
  musicKey: ChromaticNote,
  duration: string,
  progress: number,
): CodeStripNoteToken {
  const pitch = rawPitch.replace(/\d+$/, "") as ChromaticNote;
  const tokenOctave = Number(rawPitch.match(/\d+$/)?.[0]);

  return {
    type: "note",
    note,
    text,
    rawPitch,
    scaleIndex,
    pitchClassIndex: CHROMATIC_NOTES.indexOf(pitch),
    octave: tokenOctave,
    mode,
    musicKey,
    isAccidental: pitch.includes("#"),
    duration,
    progress,
  };
}

const initialTokens: CodeStripToken[] = [
  guideNote("do", "Do", "C4", 0, "major", "C", "@0.25", 1),
  guideNote("mi", "Mi", "E4", 2, "major", "C", "@0.125", .76),
  { type: "rest", duration: "@0.125", progress: .4 },
  guideNote("sol", "Sol", "G4", 4, "major", "C", "@0.5", 0),
];
const afterRainTokens: CodeStripToken[] = [
  guideNote("do", "Do", "F#4", 0, "dorian", "F#", "@0.25", 1),
  guideNote("mi", "Mi", "A4", 2, "dorian", "F#", "@0.125", .7),
  guideNote("sol", "Sol", "C#5", 4, "dorian", "F#", "@0.375", .3),
];
const lateTrainTokens: CodeStripToken[] = [
  guideNote("do", "Do", "D3", 0, "minor", "D", "@0.5", 1),
  guideNote("mi", "Mi", "F3", 2, "minor", "D", "@0.25", .55),
  guideNote("sol", "Sol", "A3", 4, "minor", "D", "@0.25", .15),
];

interface GuidePattern extends PatternReelItem {
  codeStripTokens: CodeStripToken[];
  musicKey: ChromaticNote;
  mode: MusicalMode;
  bpm: number;
  octave: number;
}

function cloneTokens(tokens: CodeStripToken[]) {
  return tokens.map((token) => token.type === "chord"
    ? { ...token, members: token.members.map((member) => ({ ...member })) }
    : { ...token });
}

function staticPitchColor(pitchClassIndex: number, mode: MusicalMode, key: ChromaticNote, octave: number) {
  return staticNoteColorResolver.getKeyBackgroundByPitchClass(
    pitchClassIndex,
    mode,
    key,
    octave,
    "colored",
    CHROMATIC_NOTES[pitchClassIndex].includes("#"),
  ).primaryColor;
}

function applyPatternContext(
  pattern: GuidePattern,
  musicKey: ChromaticNote,
  mode: MusicalMode,
  bpm: number,
  octave: number,
) {
  const pitchClassIndex = CHROMATIC_NOTES.indexOf(musicKey);
  pattern.musicKey = musicKey;
  pattern.mode = mode;
  pattern.bpm = bpm;
  pattern.octave = octave;
  pattern.rootLabel = `${musicKey.replace("#", "♯")}${octave}`;
  pattern.spine = staticPitchColor(pitchClassIndex, mode, musicKey, octave);
}

function tokenTimeline(
  tokens: CodeStripToken[],
  mode: MusicalMode,
  key: ChromaticNote,
  octave: number,
) {
  return tokens.flatMap((token) => {
    if (token.type !== "note") return [];
    const duration = Number.parseFloat((token.duration ?? "").replace(/^@/, ""));
    const tokenMode = token.mode ?? mode;
    const tokenKey = token.musicKey ?? key;
    const pitchClassIndex = token.pitchClassIndex
      ?? CHROMATIC_NOTES.indexOf(
        getChromaticNoteForScaleIndex(token.scaleIndex ?? 0, tokenMode, tokenKey)
          ?? tokenKey,
      );

    return [{
      color: staticPitchColor(
        pitchClassIndex,
        tokenMode,
        tokenKey,
        token.octave ?? octave,
      ),
      durationMs: Math.round(
        (Number.isFinite(duration) && duration > 0 ? duration : 1) * 1000,
      ),
    }];
  });
}

const patterns = ref<GuidePattern[]>([
  {
    id: "after-rain",
    name: "After Rain",
    instrumentIcon: instrumentIconFor("music box"),
    instrumentLabel: "Music Box",
    rootLabel: "F♯4",
    spine: staticPitchColor(6, "dorian", "F#", 4),
    barTape: tokenTimeline(afterRainTokens, "dorian", "F#", 4),
    canDelete: true,
    canCopy: true,
    canOpenStrudel: false,
    canRename: true,
    openUnavailableLabel: "Unavailable in isolated specimen",
    codeStripTokens: cloneTokens(afterRainTokens),
    musicKey: "F#",
    mode: "dorian",
    bpm: 92,
    octave: 4,
  },
  {
    id: "late-train",
    name: "Late Train",
    instrumentIcon: instrumentIconFor("epiano1"),
    instrumentLabel: "Rhodes",
    rootLabel: "D3",
    spine: staticPitchColor(2, "minor", "D", 3),
    barTape: tokenTimeline(lateTrainTokens, "minor", "D", 3),
    canDelete: true,
    canCopy: true,
    canOpenStrudel: false,
    canRename: true,
    openUnavailableLabel: "Unavailable in isolated specimen",
    codeStripTokens: cloneTokens(lateTrainTokens),
    musicKey: "D",
    mode: "minor",
    bpm: 108,
    octave: 3,
  },
  {
    id: "current",
    name: "Current Take",
    instrumentIcon: instrumentIconFor("piano"),
    instrumentLabel: "Piano",
    rootLabel: "C4",
    spine: staticPitchColor(0, "major", "C", 4),
    barTape: tokenTimeline(initialTokens, "major", "C", 4),
    canDelete: false,
    canCopy: true,
    canOpenStrudel: false,
    canRename: false,
    deleteUnavailableLabel: "Edit the current take in CodeStrip",
    openUnavailableLabel: "Unavailable in isolated specimen",
    codeStripTokens: cloneTokens(initialTokens),
    musicKey: "C",
    mode: "major",
    bpm: 120,
    octave: 4,
  },
]);
const currentBarTape = (patterns.value.find((pattern) => pattern.id === "current")?.barTape ?? [])
  .map((segment) => ({ ...segment }));

const drawerOpen = ref(true);
const selectedPatternId = ref("current");
const patternEntrySignal = ref(0);
const codeStripTokens = ref<CodeStripToken[]>(initialTokens.map((token) => ({ ...token })));
const isPlaying = ref(false);
const warming = ref(false);
const keyValue = ref<ChromaticNote>("C");
const modeValue = ref<MusicalMode>("major");
const bpm = ref(120);
const octave = ref(4);
const playMode = ref("together");
const rowCount = ref(3);
const harmonyValue = ref<HarmonyAlteration>("auto");
const lastAction = ref("Ready · controlled PerformanceDeck");
let copySequence = 0;
let deleteArmTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(deleteArmTimer));

const keyboardRows = computed<KeyboardRowView[]>(() => {
  const scale = getScaleForMode(modeValue.value);
  return visibleKeyboardOctaves(octave.value, rowCount.value).map((rowOctave) => ({
    octave: rowOctave,
    keys: scale.solfege.map((solfege, scaleIndex) => {
      const pitch = getChromaticNoteForScaleIndex(scaleIndex, modeValue.value, keyValue.value)
        ?? keyValue.value;
      const pitchOctave = rowOctave + Number(
        CHROMATIC_NOTES.indexOf(pitch) < CHROMATIC_NOTES.indexOf(keyValue.value),
      );
      return {
        id: `${scaleIndex}_${rowOctave}`,
        syllable: solfege.name,
        degree: degreeLabels[scaleIndex] ?? String(scaleIndex + 1),
        rawPitch: `${pitch}${pitchOctave}`,
        scaleIndex,
        pitchClassIndex: CHROMATIC_NOTES.indexOf(pitch),
        colorOctave: pitchOctave,
        mode: modeValue.value,
        musicKey: keyValue.value,
        accidental: pitch.includes("#"),
      };
    }),
  }));
});

function patternName(id: string) {
  return patterns.value.find((pattern) => pattern.id === id)?.name ?? id;
}

function resetCode() {
  codeStripTokens.value = cloneTokens(initialTokens);
  const current = patterns.value.find((pattern) => pattern.id === "current");
  if (current) {
    current.barTape = currentBarTape.map((segment) => ({ ...segment }));
    current.codeStripTokens = cloneTokens(initialTokens);
    current.canCopy = true;
    applyPatternContext(current, "C", "major", 120, 4);
  }
  selectedPatternId.value = "current";
  keyValue.value = "C";
  modeValue.value = "major";
  bpm.value = 120;
  octave.value = 4;
  isPlaying.value = false;
  lastAction.value = "Code restored";
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value;
  lastAction.value = isPlaying.value ? "Playback preview started" : "Playback preview stopped";
}

function removeLastEvent() {
  codeStripTokens.value = codeStripTokens.value.slice(0, -1);
  const current = patterns.value.find((pattern) => pattern.id === "current");
  if (current && selectedPatternId.value === current.id) {
    current.codeStripTokens = cloneTokens(codeStripTokens.value);
    current.canCopy = codeStripTokens.value.length > 0;
    current.barTape = tokenTimeline(
      codeStripTokens.value,
      modeValue.value,
      keyValue.value,
      octave.value,
    );
  }
  if (!codeStripTokens.value.length) isPlaying.value = false;
  lastAction.value = "Deleted last CodeStrip event";
}

function commitCode() {
  const current = patterns.value.find((pattern) => pattern.id === "current");
  if (current && codeStripTokens.value.length) {
    const selected = patterns.value.find((pattern) => pattern.id === selectedPatternId.value);
    const takeSource = selected ?? current;
    const takeNumber = patternEntrySignal.value + 1;
    const savedTake: GuidePattern = {
      ...takeSource,
      id: `take-${takeNumber}`,
      name: `Take ${takeNumber}`,
      codeStripTokens: cloneTokens(codeStripTokens.value),
      barTape: tokenTimeline(
        codeStripTokens.value,
        modeValue.value,
        keyValue.value,
        octave.value,
      ),
      musicKey: keyValue.value,
      mode: modeValue.value,
      bpm: bpm.value,
      octave: octave.value,
      canDelete: true,
      canCopy: true,
      canRename: true,
      copied: false,
      deleteArmed: false,
    };
    applyPatternContext(
      savedTake,
      keyValue.value,
      modeValue.value,
      bpm.value,
      octave.value,
    );
    patterns.value.splice(Math.max(0, patterns.value.length - 1), 0, savedTake);
  }
  if (current) {
    current.barTape = [];
    current.codeStripTokens = [];
    current.canCopy = false;
    applyPatternContext(
      current,
      keyValue.value,
      modeValue.value,
      bpm.value,
      octave.value,
    );
  }
  codeStripTokens.value = [];
  isPlaying.value = false;
  selectedPatternId.value = "current";
  patternEntrySignal.value += 1;
  lastAction.value = "Committed and cleared CodeStrip";
}

function selectPattern(id: string, input: PatternReelInput) {
  const pattern = patterns.value.find((candidate) => candidate.id === id);
  if (!pattern) return;
  selectedPatternId.value = id;
  codeStripTokens.value = cloneTokens(pattern.codeStripTokens);
  keyValue.value = pattern.musicKey;
  modeValue.value = pattern.mode;
  bpm.value = pattern.bpm;
  octave.value = pattern.octave;
  isPlaying.value = false;
  lastAction.value = `Selected ${patternName(id)} · ${input}`;
}

function deletePattern(id: string) {
  const index = patterns.value.findIndex((pattern) => pattern.id === id && pattern.canDelete);
  if (index < 0) return;
  const target = patterns.value[index];
  if (!target?.deleteArmed) {
    for (const pattern of patterns.value) pattern.deleteArmed = false;
    target.deleteArmed = true;
    clearTimeout(deleteArmTimer);
    deleteArmTimer = setTimeout(() => {
      const armed = patterns.value.find((pattern) => pattern.id === id);
      if (armed) armed.deleteArmed = false;
    }, 2500);
    lastAction.value = `Confirm delete ${target.name}`;
    return;
  }

  clearTimeout(deleteArmTimer);
  const predecessor = patterns.value[(index - 1 + patterns.value.length) % patterns.value.length];
  const [deleted] = patterns.value.splice(index, 1);
  if (selectedPatternId.value === id && predecessor && predecessor.id !== id) {
    selectPattern(predecessor.id, "tap");
  }
  lastAction.value = `Deleted ${deleted.name}`;
}

function copyPattern(id: string) {
  const source = patterns.value.find((pattern) => pattern.id === id);
  if (!source) return;
  copySequence += 1;
  const copyId = `${id}-copy-${copySequence}`;
  patterns.value.splice(Math.max(0, patterns.value.length - 1), 0, {
    ...source,
    id: copyId,
    name: `${source.name} Copy`,
    canDelete: true,
    canRename: true,
    copied: true,
    deleteArmed: false,
    codeStripTokens: cloneTokens(source.codeStripTokens),
  });
  lastAction.value = `Copied ${source.name}`;
}

function renamePattern(id: string, title: string) {
  const pattern = patterns.value.find((item) => item.id === id);
  if (!pattern) return;
  pattern.name = title;
  lastAction.value = `Renamed pattern to ${title}`;
}

function reportPatternAction(action: string, id: string) {
  lastAction.value = `${action} · ${patternName(id)}`;
}

function reportKeyboardIntent(action: string, intent: KeyboardIntent) {
  lastAction.value = `${action} · ${intent.keyId} · ${intent.source}`;
}

function reportChordIntent(action: string, intent: KeyboardChordIntent) {
  lastAction.value = `${action} · ${intent.chord.symbol} · ${intent.source}`;
}

function reportHarmony(value: HarmonyAlteration) {
  lastAction.value = `Harmony effective · ${value}`;
}

function reportControl(control: string, value: string | number) {
  lastAction.value = `${control} · ${value}`;
}

function updateRowCount(value: number) {
  rowCount.value = value;
  lastAction.value = `Keyboard rows · ${value}`;
}
</script>

<style scoped>
.performance-deck-page {
  min-height: 100vh;
  overflow: hidden;
  background: var(--ink);
  color: var(--ivory);
}

.performance-deck-page__stage {
  position: fixed;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      var(--ink) 0,
      var(--ink) 54px,
      var(--ink-5) 54px,
      var(--ink-5) 55px
    );
}

.performance-deck-page__workbench {
  position: relative;
  z-index: 0;
  display: grid;
  width: min(760px, calc(100% - 32px));
  gap: var(--s-5);
  margin: clamp(16px, 4vw, 48px) auto 0;
  padding: var(--s-5);
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
}

.performance-deck-page__workbench p,
.performance-deck-page__workbench h1 {
  margin: 0;
}

.performance-deck-page__workbench > div:first-child > p:first-child,
.performance-deck-page__controls,
.performance-deck-page__workbench output {
  font: var(--t-caption);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.performance-deck-page__workbench > div:first-child > p:first-child {
  color: var(--ivory-3);
}

.performance-deck-page__workbench h1 {
  margin-block: var(--s-2) var(--s-3);
  font: var(--t-display-l);
  line-height: .9;
  text-transform: uppercase;
}

.performance-deck-page__intro {
  max-width: 70ch;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

.performance-deck-page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
}

.performance-deck-page__controls button,
.performance-deck-page__controls select {
  min-height: 32px;
  border: 1px solid var(--ivory-4);
  border-radius: 0;
  background: var(--ink);
  color: var(--ivory);
  font: inherit;
  text-transform: uppercase;
}

.performance-deck-page__controls button {
  padding-inline: var(--s-4);
  cursor: pointer;
}

.performance-deck-page__controls label {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.performance-deck-page__workbench output {
  color: var(--ivory-2);
}

@media (max-height: 700px), (max-width: 520px) {
  .performance-deck-page__workbench {
    width: calc(100% - 16px);
    gap: var(--s-3);
    margin-top: 8px;
    padding: var(--s-4);
  }

  .performance-deck-page__workbench h1 {
    font: var(--t-display-m);
  }

  .performance-deck-page__intro {
    display: none;
  }
}

@media (forced-colors: active) {
  .performance-deck-page,
  .performance-deck-page__stage,
  .performance-deck-page__workbench {
    background: Canvas;
    color: CanvasText;
  }
}
</style>
