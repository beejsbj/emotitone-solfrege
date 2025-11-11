<script setup>
import { usePatternsStore } from "@/stores/patterns";
import { useColorSystem } from "@/composables/useColorSystem";
import { watch, nextTick, ref } from "vue";

const patterns = usePatternsStore();
const { getStaticPrimaryColor } = useColorSystem();

const listRef = ref(null);

watch(
  () => patterns.loggedNotes.length,
  async () => {
    await nextTick(); // wait until DOM updates
    if (listRef.value) {
      listRef.value.scrollLeft = listRef.value.scrollWidth;
    }
  }
);
</script>

<template>
  <div>
    <ul ref="listRef" class="flex overflow-x-auto justify-end">
      <li
        v-for="note in patterns.loggedNotes"
        :key="note.id"
        class="flex-1 p-2"
        :style="{
          backgroundColor: getStaticPrimaryColor(
            note.solfege.name,
            note.mode,
            note.octave
          ),
        }"
      >
        <span class="relative z-10">
          {{ note.note }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
ul {
  max-width: 100vw;
  scroll-behavior: smooth;
  position: relative;
}

/* line */
ul::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  /* translate:  */
  height: 2px;
  width: 100%;
  background-color: black;
}
</style>
