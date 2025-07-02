<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { SEQUENCER_ICONS, SEQUENCER_COLOR_PALETTES } from "@/data";
import FloatingDropdown from "@/components/FloatingDropdown.vue";
import { Settings, X, Trash } from "lucide-vue-next";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface Props {
  sequencerId: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  delete: [sequencerId: string];
}>();

// Store
const multiSequencerStore = useMultiSequencerStore();

// Get current sequencer
const sequencer = computed(() =>
  props.sequencerId
    ? multiSequencerStore.sequencers.find((s) => s.id === props.sequencerId)
    : null
);

// Local state for editing
const editedName = ref("");
const selectedIcon = ref("");
const selectedColor = ref<string | undefined>(undefined);

// Watch for sequencer changes to update local state
watch(
  () => sequencer.value,
  (newSequencer) => {
    if (newSequencer) {
      editedName.value = newSequencer.name;
      selectedIcon.value = newSequencer.icon;
      selectedColor.value = newSequencer.color;
    }
  },
  { immediate: true }
);

// Methods
const updateName = () => {
  if (sequencer.value && editedName.value.trim()) {
    multiSequencerStore.updateSequencer(sequencer.value.id, {
      name: editedName.value.trim(),
    });
    triggerUIHaptic();
  }
};

const selectIcon = (icon: string) => {
  if (sequencer.value) {
    selectedIcon.value = icon;
    multiSequencerStore.updateSequencer(sequencer.value.id, { icon });
    triggerUIHaptic();
  }
};

const selectColor = (colorId: string | undefined) => {
  if (sequencer.value) {
    selectedColor.value = colorId;
    multiSequencerStore.updateSequencer(sequencer.value.id, { color: colorId });
    triggerUIHaptic();
  }
};

const deleteSequencer = () => {
  if (sequencer.value) {
    emit("delete", sequencer.value.id);
    emit("close");
    triggerUIHaptic();
  }
};

const close = () => {
  emit("close");
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="sequencer && props.sequencerId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="close"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="close"
      ></div>

      <!-- Modal -->
      <div
        class="relative bg-gray-900 border border-white/10 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-white/10"
        >
          <h3 class="text-white font-medium flex items-center gap-2">
            <Settings :size="16" />
            Sequencer Settings
          </h3>
          <button
            @click="close"
            class="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X :size="18" class="text-white/60" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <!-- Name -->
          <div>
            <label class="block text-xs text-white/60 mb-2">Name</label>
            <input
              v-model="editedName"
              @change="updateName"
              @keyup.enter="updateName"
              class="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded text-white text-sm focus:border-white/30 focus:outline-none"
              placeholder="Sequencer name..."
            />
          </div>

          <!-- Icon Selection -->
          <div>
            <label class="block text-xs text-white/60 mb-2">Icon</label>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="icon in SEQUENCER_ICONS"
                :key="icon"
                @click="selectIcon(icon)"
                :class="[
                  'p-3 rounded border transition-all',
                  selectedIcon === icon
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-gray-800 border-white/10 hover:border-white/20',
                ]"
              >
                <span class="text-lg">{{ icon }}</span>
              </button>
            </div>
          </div>

          <!-- Color Selection -->
          <div>
            <label class="block text-xs text-white/60 mb-2">Color Theme</label>
            <div class="grid grid-cols-3 gap-2">
              <!-- No color option -->
              <button
                @click="selectColor(undefined)"
                :class="[
                  'p-3 rounded border transition-all flex items-center justify-center',
                  selectedColor === undefined
                    ? 'bg-gray-700 border-white/30'
                    : 'bg-gray-800 border-white/10 hover:border-white/20',
                ]"
              >
                <span class="text-xs text-white/60">Default</span>
              </button>

              <!-- Color options -->
              <button
                v-for="palette in SEQUENCER_COLOR_PALETTES"
                :key="palette.id"
                @click="selectColor(palette.id)"
                :class="[
                  'p-3 rounded border transition-all',
                  selectedColor === palette.id
                    ? 'border-white/30'
                    : 'border-white/10 hover:border-white/20',
                ]"
                :style="{
                  background: `linear-gradient(135deg, ${palette.primary}33, ${palette.secondary}33)`,
                  borderColor:
                    selectedColor === palette.id ? palette.accent : undefined,
                }"
              >
                <div class="flex items-center justify-center">
                  <div
                    class="w-4 h-4 rounded-full"
                    :style="{ backgroundColor: palette.primary }"
                  ></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Delete Button -->
          <div class="pt-4 border-t border-white/10">
            <button
              @click="deleteSequencer"
              class="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <Trash :size="14" />
              Delete Sequencer
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Ensure modal is above everything */
.z-50 {
  z-index: 9999;
}
</style>
