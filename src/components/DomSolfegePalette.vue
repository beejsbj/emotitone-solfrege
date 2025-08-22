<template>
  <div class="fixed inset-x-0 bottom-0 z-50">
    <div class="flex justify-center mb-1">
      <button class="p-2 text-white bg-gray-800 rounded-t" @click="toggleDrawer">
        {{ drawerOpen ? 'Hide' : 'Show' }} Keys
      </button>
    </div>
    <div
      class="bg-black text-white transition-transform duration-300"
      :class="drawerOpen ? 'translate-y-0' : 'translate-y-full'"
    >
      <div class="flex justify-center gap-2 p-2">
        <button class="octave-down px-2 py-1 bg-gray-700 rounded" @click="octaveDown">Oct-</button>
        <span class="octave-display px-2 py-1">Octave {{ mainOctave }}</span>
        <button class="octave-up px-2 py-1 bg-gray-700 rounded" @click="octaveUp">Oct+</button>
        <button class="rows-down px-2 py-1 bg-gray-700 rounded" @click="removeRow">Rows-</button>
        <button class="rows-up px-2 py-1 bg-gray-700 rounded" @click="addRow">Rows+</button>
      </div>
      <div class="flex flex-col items-center gap-1 pb-2">
        <div
          v-for="oct in octaves"
          :key="oct"
          class="solfege-row flex gap-1"
        >
          <button
            v-for="(name, idx) in solfegeNames"
            :key="idx"
            class="w-12 h-12 rounded bg-gray-700 active:bg-gray-500 flex items-center justify-center"
            @click="playNote(idx, oct)"
          >
            {{ name }}{{ oct }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMusicStore } from '@/stores/music'

const musicStore = useMusicStore()

const mainOctave = ref(4)
const rows = ref(3)
const drawerOpen = ref(true)

const solfegeNames = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']

const octaves = computed(() => {
  const result: number[] = []
  const half = Math.floor((rows.value - 1) / 2)
  for (let i = half; i >= -half; i--) {
    const o = mainOctave.value + i
    if (o >= 1 && o <= 6) {
      result.push(o)
    }
  }
  return result
})

async function playNote(idx: number, oct: number) {
  await musicStore.playNoteWithDuration(idx, oct, '1n')
}

function octaveUp() {
  if (mainOctave.value < 6) mainOctave.value++
}
function octaveDown() {
  if (mainOctave.value > 1) mainOctave.value--
}
function addRow() {
  if (rows.value < 6) rows.value++
}
function removeRow() {
  if (rows.value > 1) rows.value--
}
function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
}

</script>

<style scoped>
/* mobile drawer styles handled via tailwind classes */
</style>

