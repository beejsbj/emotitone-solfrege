<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Tabs from "@/components/ui/Tabs.vue";
import TabsList from "@/components/ui/TabsList.vue";
import TabsTrigger from "@/components/ui/TabsTrigger.vue";
import TabsContent from "@/components/ui/TabsContent.vue";
import { logger } from "@/utils";
import { useMusicStore } from "@/stores/music";
import { useInstrumentStore } from "@/stores/instrument";
import { useSequencerStore } from "@/stores/sequencer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { audioService } from "@/services/audio";
import { musicTheory } from "@/services/music";
import * as Tone from "tone";

// Only show in development
const isDevelopment = import.meta.env.DEV;
if (!isDevelopment) {
  logger.warn("SystemCheck component only available in development");
}

const activeTab = ref("overview");

// Real store connections
const musicStore = useMusicStore();
const instrumentStore = useInstrumentStore();
const sequencerStore = useSequencerStore();
const visualConfigStore = useVisualConfigStore();

// Real-time monitoring state
const audioContextState = ref<string>("suspended");
const activeNotesCount = ref(0);
const currentBPM = ref(120);
const memoryUsage = ref<{ used: number; limit: number }>({
  used: 0,
  limit: 0,
});

// Refactoring progress tracking
interface RefactoringPhase {
  name: string;
  priority: "high" | "medium" | "low" | "feature";
  completed: boolean;
  description: string;
  fileName: string;
}

const refactoringPhases = ref<RefactoringPhase[]>([
  {
    name: "High Priority: Logging Cleanup",
    priority: "high",
    completed: false,
    description: "Replace console statements with structured logging",
    fileName: "High_Logging_Cleanup.md",
  },
  {
    name: "High Priority: TonalJS Integration",
    priority: "high",
    completed: true,
    description: "Restore advanced music theory capabilities",
    fileName: "COMPLETED_High_TonalJS_Integration.md",
  },
  {
    name: "High Priority: Color System Consolidation",
    priority: "high",
    completed: false,
    description: "Unify all color-related systems",
    fileName: "High_ColorSystem_Consolidation.md",
  },
  {
    name: "High Priority: Component Fixes",
    priority: "high",
    completed: false,
    description: "Fix broken components (ConfigPanel, FloatingPopup)",
    fileName: "High_Component_Fixes.md",
  },
  {
    name: "Medium Priority: TypeScript Migration",
    priority: "medium",
    completed: true,
    description: "Convert remaining JS files to TypeScript",
    fileName: "COMPLETED_Med_TypeScript_Migration.md",
  },
  {
    name: "Medium Priority: Configuration Store Splitting",
    priority: "medium",
    completed: false,
    description: "Break down monolithic config store",
    fileName: "Med_Configuration_Store_Splitting.md",
  },
  {
    name: "Medium Priority: Large File Breakdown",
    priority: "medium",
    completed: false,
    description: "Split large files into focused modules",
    fileName: "Med_Large_File_Breakdown.md",
  },
  {
    name: "Medium Priority: Music Logic Deduplication",
    priority: "medium",
    completed: true,
    description: "Remove duplicate music calculations",
    fileName: "COMPLETED_Med_Music_Logic_Deduplication.md",
  },
  {
    name: "Medium Priority: Data Layer Harmonization",
    priority: "medium",
    completed: false,
    description: "Integrate melody generator with pattern analysis",
    fileName: "Med_Data_Layer_Harmonization.md",
  },
  {
    name: "Low Priority: Event Position Logic",
    priority: "low",
    completed: false,
    description: "Extract event position logic into composable",
    fileName: "Low_Event_Position_Logic.md",
  },
  {
    name: "Low Priority: UI Button Patterns",
    priority: "low",
    completed: false,
    description: "Standardize button components",
    fileName: "Low_UI_Button_Patterns.md",
  },
  {
    name: "Low Priority: Final Polish",
    priority: "low",
    completed: false,
    description: "Clean up dead code and unused imports",
    fileName: "Low_Final_Polish.md",
  },
  {
    name: "Feature: Record Player Visuals",
    priority: "feature",
    completed: false,
    description: "Transform sequencer into record player aesthetic",
    fileName: "Feature_Record_Player_Visuals.md",
  },
  {
    name: "Feature: Chord Buttons",
    priority: "feature",
    completed: false,
    description: "Add chord functionality to palette interface",
    fileName: "Feature_Chord_Buttons.md",
  },
  {
    name: "Feature: Session History",
    priority: "feature",
    completed: false,
    description: "Track and save played notes",
    fileName: "Feature_Session_History.md",
  },
  {
    name: "Feature: System Boundaries",
    priority: "feature",
    completed: false,
    description: "Clarify system architecture",
    fileName: "Feature_System_Boundaries.md",
  },
  {
    name: "Feature: Composition POC",
    priority: "feature",
    completed: false,
    description: "Experimental intuitive composition tools",
    fileName: "Feature_Composition_POC.md",
  },
  {
    name: "Feature: Systems Check",
    priority: "feature",
    completed: false,
    description: "Create comprehensive testing/demo page",
    fileName: "Feature_Systems_Check.md",
  },
]);

// Compute real progress metrics
const refactoringProgress = computed(() => {
  const total = refactoringPhases.value.length;
  const completed = refactoringPhases.value.filter((p) => p.completed).length;
  const byPriority = {
    high: {
      total: refactoringPhases.value.filter((p) => p.priority === "high")
        .length,
      completed: refactoringPhases.value.filter(
        (p) => p.priority === "high" && p.completed
      ).length,
    },
    medium: {
      total: refactoringPhases.value.filter((p) => p.priority === "medium")
        .length,
      completed: refactoringPhases.value.filter(
        (p) => p.priority === "medium" && p.completed
      ).length,
    },
    low: {
      total: refactoringPhases.value.filter((p) => p.priority === "low")
        .length,
      completed: refactoringPhases.value.filter(
        (p) => p.priority === "low" && p.completed
      ).length,
    },
    feature: {
      total: refactoringPhases.value.filter((p) => p.priority === "feature")
        .length,
      completed: refactoringPhases.value.filter(
        (p) => p.priority === "feature" && p.completed
      ).length,
    },
  };

  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
    byPriority,
  };
});

// System health monitoring
const systemHealth = ref({
  stores: {
    music: false,
    instrument: false,
    sequencer: false,
    visualConfig: false,
  },
  services: {
    audio: false,
    musicTheory: false,
  },
  performance: {
    fps: 0,
    latency: 0,
  },
});

// Real logger monitoring
const logHistory = ref<
  Array<{ id: number; time: string; level: string; message: string }>
>([]);

// Monitor real system state
const updateSystemHealth = () => {
  // Check stores
  systemHealth.value.stores.music = !!musicStore.currentKey;
  systemHealth.value.stores.instrument = !!instrumentStore.currentInstrument;
  systemHealth.value.stores.sequencer = sequencerStore.config !== undefined;
  systemHealth.value.stores.visualConfig =
    visualConfigStore.config !== undefined;

  // Check services
  systemHealth.value.services.audio = audioService !== undefined;
  systemHealth.value.services.musicTheory = musicTheory !== undefined;

  // Audio context state
  if (Tone.context) {
    audioContextState.value = Tone.context.state;
  }

  // Active notes count
  activeNotesCount.value = musicStore.activeNotes.size;

  // Current BPM from sequencer config
  currentBPM.value = sequencerStore.config?.tempo || 120;

  // Memory usage (if available)
  if (performance && "memory" in performance) {
    const mem = (performance as any).memory;
    memoryUsage.value = {
      used: Math.round(mem.usedJSHeapSize / 1048576),
      limit: Math.round(mem.jsHeapSizeLimit / 1048576),
    };
  }
};

// Interactive test functions
const testAudioService = async () => {
  try {
    await audioService.initialize();
    audioService.playNote("C4", "8n");
    logger.dev("Audio service test: played C4");
  } catch (error) {
    logger.error("Audio service test failed:", error);
  }
};

const testMusicTheory = () => {
  const scale = musicTheory.getCurrentScale();
  const frequency = musicTheory.getNoteFrequency(0, 4); // Do in 4th octave
  logger.dev("Music theory test:", { scale, frequency });
};

const testStores = () => {
  logger.dev("Store states:", {
    music: {
      key: musicStore.currentKey,
      mode: musicStore.currentMode,
      activeNotes: musicStore.activeNotes.size,
    },
    instrument: {
      current: instrumentStore.currentInstrument,
      available: instrumentStore.availableInstruments.length,
    },
    sequencer: {
      playing: sequencerStore.config?.globalIsPlaying,
      tempo: sequencerStore.config?.tempo,
      sequencersCount: sequencerStore.sequencers.length,
    },
    visualConfig: {
      config: visualConfigStore.config ? "Loaded" : "Not loaded",
      effects: "Various effects configured",
    },
  });
};

// Setup logger interception
const setupLoggerInterception = () => {
  // Intercept logger calls
  const originalDev = logger.dev;
  const originalWarn = logger.warn;
  const originalError = logger.error;

  logger.dev = (...args: any[]) => {
    logHistory.value.push({
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      level: "dev",
      message: args.join(" "),
    });
    if (logHistory.value.length > 50) logHistory.value.shift();
    return originalDev(...args);
  };

  logger.warn = (...args: any[]) => {
    logHistory.value.push({
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      level: "warn",
      message: args.join(" "),
    });
    if (logHistory.value.length > 50) logHistory.value.shift();
    return originalWarn(...args);
  };

  logger.error = (...args: any[]) => {
    logHistory.value.push({
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      level: "error",
      message: args.join(" "),
    });
    if (logHistory.value.length > 50) logHistory.value.shift();
    return originalError(...args);
  };

  return () => {
    logger.dev = originalDev;
    logger.warn = originalWarn;
    logger.error = originalError;
  };
};

// Performance monitoring
let animationFrameId: number | null = null;
const startPerformanceMonitoring = () => {
  let lastTime = performance.now();
  let frames = 0;

  const measure = () => {
    frames++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime;

    if (delta >= 1000) {
      systemHealth.value.performance.fps = Math.round(
        (frames * 1000) / delta
      );
      frames = 0;
      lastTime = currentTime;
    }

    animationFrameId = requestAnimationFrame(measure);
  };

  measure();
};

onMounted(() => {
  if (!isDevelopment) return;

  // Start monitoring
  updateSystemHealth();
  const healthInterval = setInterval(updateSystemHealth, 1000);

  // Setup logger interception
  const cleanupLogger = setupLoggerInterception();

  // Start performance monitoring
  startPerformanceMonitoring();

  // Cleanup
  onUnmounted(() => {
    clearInterval(healthInterval);
    cleanupLogger();
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
});
</script>

<template>
  <div
    v-if="isDevelopment"
    class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4"
  >
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-emerald-400 mb-2">
          🔬 System Check - Development Monitor
        </h1>
        <p class="text-slate-300">
          Real-time monitoring and debugging tools for EmotiTone Solfège
        </p>
        <p class="text-sm text-amber-400 mt-2">
          ⚠️ Development environment only
        </p>
      </div>

      <Tabs v-model="activeTab" class="flex flex-col h-full">
        <TabsList
          class="bg-slate-800/50 backdrop-blur border border-slate-700 p-1 rounded-lg mb-6"
        >
          <TabsTrigger
            value="overview"
            class="text-slate-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-slate-700/50"
          >
            📊 Overview
          </TabsTrigger>
          <TabsTrigger
            value="refactoring"
            class="text-slate-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-slate-700/50"
          >
            📋 Refactoring Phases
          </TabsTrigger>
          <TabsTrigger
            value="logging"
            class="text-slate-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-slate-700/50"
          >
            📝 Logger Monitor
          </TabsTrigger>
          <TabsTrigger
            value="debugging"
            class="text-slate-300 data-[state=active]:text-emerald-400 data-[state=active]:bg-slate-700/50"
          >
            🐛 Debug Tools
          </TabsTrigger>
        </TabsList>

        <!-- Overview Tab -->
        <TabsContent
          value="overview"
          class="overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-emerald-400 mb-4">
              Refactoring Progress - Real Status
            </h2>

            <!-- Truthful Progress Summary -->
            <div
              class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 mb-6"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-white">
                  Overall Progress
                </h3>
                <div class="text-3xl font-bold">
                  <span
                    :class="
                      refactoringProgress.percentage > 50
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    "
                  >
                    {{ refactoringProgress.completed }}/{{ refactoringProgress.total }}
                  </span>
                  <span class="text-slate-400 text-lg ml-2">
                    ({{ refactoringProgress.percentage }}%)
                  </span>
                </div>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-3 mb-4">
                <div
                  class="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  :style="{ width: refactoringProgress.percentage + '%' }"
                ></div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div class="text-sm text-slate-400">High Priority</div>
                  <div class="text-lg font-semibold text-red-400">
                    {{ refactoringProgress.byPriority.high.completed }}/{{ refactoringProgress.byPriority.high.total }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-slate-400">Medium Priority</div>
                  <div class="text-lg font-semibold text-amber-400">
                    {{ refactoringProgress.byPriority.medium.completed }}/{{ refactoringProgress.byPriority.medium.total }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-slate-400">Low Priority</div>
                  <div class="text-lg font-semibold text-blue-400">
                    {{ refactoringProgress.byPriority.low.completed }}/{{ refactoringProgress.byPriority.low.total }}
                  </div>
                </div>
                <div>
                  <div class="text-sm text-slate-400">Features</div>
                  <div class="text-lg font-semibold text-purple-400">
                    {{ refactoringProgress.byPriority.feature.completed }}/{{ refactoringProgress.byPriority.feature.total }}
                  </div>
                </div>
              </div>
            </div>

            <!-- System Health Status -->
            <div class="grid gap-4 md:grid-cols-2">
              <div
                class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4"
              >
                <h3 class="text-lg font-semibold text-white mb-4">
                  System Health
                </h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-slate-300">Audio Context</span>
                    <span
                      :class="
                        audioContextState === 'running'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      "
                      class="font-mono text-sm"
                    >
                      {{ audioContextState }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-300">Active Notes</span>
                    <span class="text-emerald-400 font-mono text-sm">
                      {{ activeNotesCount }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-300">Current BPM</span>
                    <span class="text-emerald-400 font-mono text-sm">
                      {{ currentBPM }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-300">FPS</span>
                    <span
                      :class="
                        systemHealth.performance.fps > 30
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      "
                      class="font-mono text-sm"
                    >
                      {{ systemHealth.performance.fps }}
                    </span>
                  </div>
                  <div
                    v-if="memoryUsage.limit > 0"
                    class="flex justify-between items-center"
                  >
                    <span class="text-slate-300">Memory</span>
                    <span class="text-emerald-400 font-mono text-sm">
                      {{ memoryUsage.used }}MB / {{ memoryUsage.limit }}MB
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4"
              >
                <h3 class="text-lg font-semibold text-white mb-4">
                  Service Status
                </h3>
                <div class="space-y-3">
                  <div class="space-y-2">
                    <div class="text-sm text-slate-400">Stores</div>
                    <div class="grid grid-cols-2 gap-2">
                      <div
                        v-for="(status, store) in systemHealth.stores"
                        :key="store"
                        class="flex items-center gap-2"
                      >
                        <div
                          :class="
                            status
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                          "
                          class="w-2 h-2 rounded-full"
                        ></div>
                        <span class="text-sm text-slate-300">{{ store }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="text-sm text-slate-400">Services</div>
                    <div class="grid grid-cols-2 gap-2">
                      <div
                        v-for="(status, service) in systemHealth.services"
                        :key="service"
                        class="flex items-center gap-2"
                      >
                        <div
                          :class="
                            status
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                          "
                          class="w-2 h-2 rounded-full"
                        ></div>
                        <span class="text-sm text-slate-300">{{ service }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Interactive Testing -->
            <div
              class="bg-slate-800/30 backdrop-blur border border-slate-700 rounded-lg p-6"
            >
              <h3 class="text-xl font-semibold text-white mb-4">
                Interactive System Tests
              </h3>
              <div class="flex flex-wrap gap-3">
                <button
                  @click="testAudioService"
                  class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🔊 Test Audio Service
                </button>
                <button
                  @click="testMusicTheory"
                  class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🎵 Test Music Theory
                </button>
                <button
                  @click="testStores"
                  class="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📦 Log Store States
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Refactoring Phases Tab -->
        <TabsContent
          value="refactoring"
          class="overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6">
              Refactoring Phase Status
            </h2>
            
            <div class="space-y-4">
              <!-- High Priority Phases -->
              <div>
                <h3 class="text-lg font-semibold text-red-400 mb-3">
                  🔴 High Priority
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="phase in refactoringPhases.filter(p => p.priority === 'high')"
                    :key="phase.fileName"
                    class="bg-slate-800/50 border rounded-lg p-3"
                    :class="
                      phase.completed
                        ? 'border-emerald-700'
                        : 'border-slate-700'
                    "
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-white">
                          {{ phase.name.replace(/^[^:]+: /, '') }}
                        </div>
                        <div class="text-sm text-slate-400">
                          {{ phase.description }}
                        </div>
                      </div>
                      <div
                        :class="
                          phase.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-400'
                        "
                        class="px-3 py-1 rounded text-sm font-medium"
                      >
                        {{ phase.completed ? '✓ Complete' : 'Pending' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Medium Priority Phases -->
              <div>
                <h3 class="text-lg font-semibold text-amber-400 mb-3">
                  🟡 Medium Priority
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="phase in refactoringPhases.filter(p => p.priority === 'medium')"
                    :key="phase.fileName"
                    class="bg-slate-800/50 border rounded-lg p-3"
                    :class="
                      phase.completed
                        ? 'border-emerald-700'
                        : 'border-slate-700'
                    "
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-white">
                          {{ phase.name.replace(/^[^:]+: /, '') }}
                        </div>
                        <div class="text-sm text-slate-400">
                          {{ phase.description }}
                        </div>
                      </div>
                      <div
                        :class="
                          phase.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-400'
                        "
                        class="px-3 py-1 rounded text-sm font-medium"
                      >
                        {{ phase.completed ? '✓ Complete' : 'Pending' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Low Priority Phases -->
              <div>
                <h3 class="text-lg font-semibold text-blue-400 mb-3">
                  🟢 Low Priority
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="phase in refactoringPhases.filter(p => p.priority === 'low')"
                    :key="phase.fileName"
                    class="bg-slate-800/50 border rounded-lg p-3"
                    :class="
                      phase.completed
                        ? 'border-emerald-700'
                        : 'border-slate-700'
                    "
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-white">
                          {{ phase.name.replace(/^[^:]+: /, '') }}
                        </div>
                        <div class="text-sm text-slate-400">
                          {{ phase.description }}
                        </div>
                      </div>
                      <div
                        :class="
                          phase.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-400'
                        "
                        class="px-3 py-1 rounded text-sm font-medium"
                      >
                        {{ phase.completed ? '✓ Complete' : 'Pending' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Feature Phases -->
              <div>
                <h3 class="text-lg font-semibold text-purple-400 mb-3">
                  ⭐ Features
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="phase in refactoringPhases.filter(p => p.priority === 'feature')"
                    :key="phase.fileName"
                    class="bg-slate-800/50 border rounded-lg p-3"
                    :class="
                      phase.completed
                        ? 'border-emerald-700'
                        : 'border-slate-700'
                    "
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-white">
                          {{ phase.name.replace(/^[^:]+: /, '') }}
                        </div>
                        <div class="text-sm text-slate-400">
                          {{ phase.description }}
                        </div>
                      </div>
                      <div
                        :class="
                          phase.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-400'
                        "
                        class="px-3 py-1 rounded text-sm font-medium"
                      >
                        {{ phase.completed ? '✓ Complete' : 'Pending' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Logger Monitor Tab -->
        <TabsContent
          value="logging"
          class="overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6">
              Real-time Logger Monitor
            </h2>

            <div
              class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6"
            >
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-white">
                  Live Log Stream
                </h3>
                <button
                  @click="logHistory = []"
                  class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Clear Logs
                </button>
              </div>
              
              <div
                class="bg-slate-900/50 border border-slate-600 rounded-lg max-h-96 overflow-y-auto"
              >
                <div
                  v-if="logHistory.length === 0"
                  class="p-8 text-center text-slate-400"
                >
                  No logs captured yet. Interact with the app to see logs.
                </div>
                <div v-else class="p-4 font-mono text-sm">
                  <div
                    v-for="log in logHistory"
                    :key="log.id"
                    class="flex gap-3 py-1 border-b border-slate-700 last:border-0"
                    :class="{
                      'text-blue-400': log.level === 'dev',
                      'text-yellow-400': log.level === 'warn',
                      'text-red-400': log.level === 'error',
                    }"
                  >
                    <span class="text-slate-500 text-xs min-w-[80px]">
                      {{ log.time }}
                    </span>
                    <span class="font-bold text-xs min-w-[50px]">
                      {{ log.level.toUpperCase() }}
                    </span>
                    <span class="break-all">{{ log.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Debug Tools Tab -->
        <TabsContent
          value="debugging"
          class="overflow-y-auto max-h-[calc(100vh-200px)]"
        >
          <div class="space-y-6">
            <h2 class="text-2xl font-bold text-emerald-400 mb-6">
              Developer Debug Tools
            </h2>

            <!-- Store Inspector -->
            <div
              class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6"
            >
              <h3 class="text-xl font-semibold text-white mb-4">
                🔍 Store Inspector
              </h3>
              
              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-3">
                  <h4 class="text-sm font-semibold text-slate-400 uppercase">
                    Music Store
                  </h4>
                  <div class="bg-slate-900/50 rounded p-3 font-mono text-xs">
                    <div>key: <span class="text-emerald-400">{{ musicStore.currentKey }}</span></div>
                    <div>mode: <span class="text-emerald-400">{{ musicStore.currentMode }}</span></div>
                    <div>activeNotes: <span class="text-emerald-400">{{ activeNotesCount }}</span></div>
                    <div>scale: <span class="text-emerald-400">{{ musicStore.currentScale }}</span></div>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <h4 class="text-sm font-semibold text-slate-400 uppercase">
                    Instrument Store
                  </h4>
                  <div class="bg-slate-900/50 rounded p-3 font-mono text-xs">
                    <div>current: <span class="text-emerald-400">{{ instrumentStore.currentInstrument }}</span></div>
                    <div>available: <span class="text-emerald-400">{{ instrumentStore.availableInstruments.length }}</span></div>
                    <div>loading: <span class="text-emerald-400">{{ instrumentStore.isLoading }}</span></div>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <h4 class="text-sm font-semibold text-slate-400 uppercase">
                    Sequencer Store
                  </h4>
                  <div class="bg-slate-900/50 rounded p-3 font-mono text-xs">
                    <div>playing: <span class="text-emerald-400">{{ sequencerStore.config?.globalIsPlaying }}</span></div>
                    <div>tempo: <span class="text-emerald-400">{{ sequencerStore.config?.tempo }}</span></div>
                    <div>sequencers: <span class="text-emerald-400">{{ sequencerStore.sequencers.length }}</span></div>
                  </div>
                </div>
                
                <div class="space-y-3">
                  <h4 class="text-sm font-semibold text-slate-400 uppercase">
                    Visual Config Store
                  </h4>
                  <div class="bg-slate-900/50 rounded p-3 font-mono text-xs">
                    <div>config: <span class="text-emerald-400">{{ visualConfigStore.config ? 'Loaded' : 'Not loaded' }}</span></div>
                    <div>effects: <span class="text-emerald-400">Multiple configured</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div
              class="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6"
            >
              <h3 class="text-xl font-semibold text-white mb-4">
                ⚡ Quick Debug Actions
              </h3>
              
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 class="text-sm font-semibold text-slate-400 uppercase mb-3">
                    Music Actions
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    <button
                      @click="musicStore.setKey('C')"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Set Key: C
                    </button>
                    <button
                      @click="musicStore.setKey('G')"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Set Key: G
                    </button>
                    <button
                      @click="musicStore.setMode(musicStore.currentMode === 'major' ? 'minor' : 'major')"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Toggle Mode
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 class="text-sm font-semibold text-slate-400 uppercase mb-3">
                    Sequencer Actions
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    <button
                      @click="logger.dev('Sequencer playback toggle clicked')"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Log Sequencer Info
                    </button>
                    <button
                      @click="sequencerStore.setTempo(120)"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Tempo: 120
                    </button>
                    <button
                      @click="sequencerStore.setTempo(140)"
                      class="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm"
                    >
                      Tempo: 140
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
  <div v-else class="min-h-screen bg-slate-900 flex items-center justify-center">
    <div class="text-center text-slate-400">
      <h1 class="text-2xl font-bold mb-2">System Check</h1>
      <p>Only available in development environment</p>
    </div>
  </div>
</template>