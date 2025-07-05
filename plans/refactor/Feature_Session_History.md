# Feature: Session History Implementation

## 🎯 Goal

Implement a "Session History" feature that passively tracks all notes and chords played by the user during a single browser session. This creates a musical log that can be reviewed, saved, or used as the basis for a new melody.

## 📋 Background

Musical ideas are ephemeral. A user might play an interesting phrase but have no way to recall it moments later. The app currently lacks any form of short-term musical memory. This feature will provide a passive musical memory system.

## 🔧 Implementation Steps

### Step 1: Create History Store

**Create `src/stores/history.ts`:**

```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface PlayedNote {
  note: string; // e.g., 'C4'
  timestamp: number;
  duration: number;
  velocity?: number;
}

export interface PlayedChord {
  notes: string[]; // e.g., ['C4', 'E4', 'G4']
  timestamp: number;
  duration: number;
  chordName?: string;
}

export interface SessionEvent {
  id: string;
  type: "note" | "chord";
  data: PlayedNote | PlayedChord;
  sessionId: string;
}

export const useHistoryStore = defineStore("history", () => {
  const events = ref<SessionEvent[]>([]);
  const sessionId = ref<string>(generateSessionId());
  const maxEvents = ref<number>(1000); // Limit to prevent memory issues

  const notesHistory = computed(() =>
    events.value.filter((e) => e.type === "note")
  );

  const chordsHistory = computed(() =>
    events.value.filter((e) => e.type === "chord")
  );

  const recentEvents = computed(
    () => events.value.slice(-50) // Last 50 events
  );

  const addNote = (note: PlayedNote) => {
    const event: SessionEvent = {
      id: generateEventId(),
      type: "note",
      data: note,
      sessionId: sessionId.value,
    };

    events.value.push(event);

    // Trim if exceeding max events
    if (events.value.length > maxEvents.value) {
      events.value = events.value.slice(-maxEvents.value);
    }
  };

  const addChord = (chord: PlayedChord) => {
    const event: SessionEvent = {
      id: generateEventId(),
      type: "chord",
      data: chord,
      sessionId: sessionId.value,
    };

    events.value.push(event);

    if (events.value.length > maxEvents.value) {
      events.value = events.value.slice(-maxEvents.value);
    }
  };

  const clearHistory = () => {
    events.value = [];
  };

  const exportHistory = () => {
    return {
      sessionId: sessionId.value,
      events: events.value,
      exportedAt: Date.now(),
    };
  };

  const getPhrasesFromHistory = (minNotes: number = 3): PlayedNote[][] => {
    // Detect musical phrases based on timing gaps
    const noteEvents = notesHistory.value;
    const phrases: PlayedNote[][] = [];
    let currentPhrase: PlayedNote[] = [];

    noteEvents.forEach((event, index) => {
      const note = event.data as PlayedNote;
      const nextEvent = noteEvents[index + 1];

      currentPhrase.push(note);

      // If gap is > 2 seconds or end of events, finish phrase
      const gap = nextEvent
        ? (nextEvent.data as PlayedNote).timestamp -
          (note.timestamp + note.duration)
        : Infinity;

      if (gap > 2000 || !nextEvent) {
        if (currentPhrase.length >= minNotes) {
          phrases.push([...currentPhrase]);
        }
        currentPhrase = [];
      }
    });

    return phrases;
  };

  return {
    events,
    sessionId,
    notesHistory,
    chordsHistory,
    recentEvents,
    addNote,
    addChord,
    clearHistory,
    exportHistory,
    getPhrasesFromHistory,
  };
});

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### Step 2: Integrate with Audio Service

**Update `src/services/audio.ts` to log events:**

```typescript
import { useHistoryStore } from "@/stores/history";

export class AudioService {
  private historyStore = useHistoryStore();
  private noteStartTimes = new Map<string, number>();

  async playNote(note: string, autoRelease: boolean = true): Promise<void> {
    const startTime = Date.now();
    this.noteStartTimes.set(note, startTime);

    // Existing playNote logic...
    await this.synth?.triggerAttack(note);

    if (autoRelease) {
      // If auto-releasing, log immediately with estimated duration
      setTimeout(() => {
        this.logNoteEvent(note, startTime, 500); // 500ms default duration
      }, 100);
    }
  }

  releaseNote(note: string): void {
    const startTime = this.noteStartTimes.get(note);
    const endTime = Date.now();

    // Existing releaseNote logic...
    this.synth?.triggerRelease(note);

    if (startTime) {
      this.logNoteEvent(note, startTime, endTime - startTime);
      this.noteStartTimes.delete(note);
    }
  }

  async playChord(notes: string[], chordId: string = "default"): Promise<void> {
    const startTime = Date.now();

    // Existing playChord logic...
    const promises = notes.map((note) => this.playNote(note, false));
    await Promise.all(promises);

    // Log chord event
    this.historyStore.addChord({
      notes,
      timestamp: startTime,
      duration: 1000, // Default chord duration
      chordName: chordId,
    });
  }

  private logNoteEvent(
    note: string,
    startTime: number,
    duration: number
  ): void {
    this.historyStore.addNote({
      note,
      timestamp: startTime,
      duration,
      velocity: 0.7, // Default velocity
    });
  }
}
```

### Step 3: Create History Viewer Component (Optional UI)

**Create `src/components/history/SessionHistoryViewer.vue`:**

```vue
<script setup lang="ts">
import { useHistoryStore } from "@/stores/history";
import { computed, ref } from "vue";

const historyStore = useHistoryStore();
const showDetails = ref(false);

const phrases = computed(() => historyStore.getPhrasesFromHistory());

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const exportSession = () => {
  const data = historyStore.exportHistory();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session_${data.sessionId}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const playPhrase = async (phrase: PlayedNote[]) => {
  // Reconstruct and play the phrase
  for (const note of phrase) {
    // Play note with original timing
    setTimeout(() => {
      // Use audio service to play note
    }, note.timestamp - phrase[0].timestamp);
  }
};
</script>

<template>
  <div class="session-history-viewer">
    <div class="history-header">
      <h3>Session History</h3>
      <div class="history-stats">
        <span>{{ historyStore.events.length }} events</span>
        <span>{{ phrases.length }} phrases</span>
      </div>
    </div>

    <div class="history-controls">
      <button @click="showDetails = !showDetails">
        {{ showDetails ? "Hide" : "Show" }} Details
      </button>
      <button @click="exportSession">Export Session</button>
      <button @click="historyStore.clearHistory" class="danger">
        Clear History
      </button>
    </div>

    <div v-if="showDetails" class="history-content">
      <div class="phrases-section">
        <h4>Detected Phrases</h4>
        <div class="phrases-list">
          <div
            v-for="(phrase, index) in phrases"
            :key="index"
            class="phrase-item"
            @click="playPhrase(phrase)"
          >
            <div class="phrase-notes">
              {{ phrase.map((n) => n.note).join(" → ") }}
            </div>
            <div class="phrase-time">
              {{ formatTime(phrase[0].timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <div class="recent-events">
        <h4>Recent Events</h4>
        <div class="events-list">
          <div
            v-for="event in historyStore.recentEvents"
            :key="event.id"
            class="event-item"
          >
            <span class="event-type">{{ event.type }}</span>
            <span class="event-data">
              {{
                event.type === "note"
                  ? (event.data as PlayedNote).note
                  : (event.data as PlayedChord).notes.join(", ")
              }}
            </span>
            <span class="event-time">
              {{ formatTime(event.data.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-history-viewer {
  background: hsla(0, 0%, 0%, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-stats span {
  margin-left: 16px;
  color: hsla(0, 0%, 70%, 1);
  font-size: 0.9rem;
}

.history-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.phrase-item,
.event-item {
  background: hsla(0, 0%, 100%, 0.05);
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.phrase-item:hover {
  background: hsla(0, 0%, 100%, 0.1);
}

.phrase-notes {
  font-family: monospace;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.phrase-time,
.event-time {
  font-size: 0.8rem;
  color: hsla(0, 0%, 60%, 1);
}

.danger {
  background: hsla(0, 70%, 50%, 0.2);
  border-color: hsla(0, 70%, 50%, 0.5);
}
</style>
```

### Step 4: Add Persistence (Optional)

**Add persistence with localStorage:**

```typescript
// In history store
import { useLocalStorage } from "@vueuse/core";

export const useHistoryStore = defineStore("history", () => {
  // Use localStorage for persistence across page reloads
  const events = useLocalStorage<SessionEvent[]>("session-history", []);

  // ... rest of store implementation
});
```

### Step 5: Integration with Main App

**Add to main palette component:**

```vue
<script setup lang="ts">
import { SessionHistoryViewer } from "@/components/history";

// Show history viewer in debug/developer mode
const showHistory = ref(false);
</script>

<template>
  <div class="palette-container">
    <!-- Existing palette content -->

    <!-- Optional history viewer -->
    <SessionHistoryViewer v-if="showHistory" />
  </div>
</template>
```

## ✅ Verification

1. **Event Logging**: All notes and chords played are logged to the history store
2. **Performance**: Logging has no noticeable impact on audio playback
3. **Memory Management**: History is limited to prevent memory issues
4. **Data Integrity**: Events are recorded with accurate timestamps and durations
5. **Phrase Detection**: System can identify musical phrases from timing gaps
6. **Export Functionality**: Session data can be exported as JSON
7. **Vue Devtools**: History state can be inspected in Vue Devtools

## 📦 Completion

This feature is complete when the session history system passively tracks all musical events, provides phrase detection capabilities, and offers optional UI for reviewing and exporting session data. The system should operate transparently without affecting the core music-playing experience.
