<script setup lang="ts">
import { onMounted } from 'vue'
import AnimatedBackground from './components/AnimatedBackground.vue'
import KeySelector from './components/KeySelector.vue'
import ModeToggle from './components/ModeToggle.vue'
import SolfegePalette from './components/SolfegePalette.vue'
import Sequencer from './components/Sequencer.vue'
import PredefinedPatterns from './components/PredefinedPatterns.vue'

onMounted(() => {
  console.log('Emotitone Solfege App mounted')
})
</script>

<template>
  <div class="app-container relative min-h-screen overflow-hidden">
    <!-- Animated Background -->
    <AnimatedBackground />

    <!-- Main Content -->
    <div class="relative z-10 min-h-screen flex flex-col">
      <!-- Header -->
      <header class="px-6 py-8 text-center">
        <h1 class="text-4xl md:text-6xl font-display font-[200] tracking-wide mb-2">
          Emotitone Solfege
        </h1>
        <p class="text-lg text-secondary opacity-80">Feel the emotional DNA of music</p>
      </header>

      <!-- Controls -->
      <div class="px-6 mb-8 flex flex-wrap justify-center gap-4">
        <KeySelector />
        <ModeToggle />
      </div>

      <!-- Main Interaction Area -->
      <main class="flex-1 px-4 pb-8">
        <!-- Solfege Palette -->
        <section class="mb-12">
          <SolfegePalette />
        </section>

        <!-- Sequencer -->
        <section class="mb-12 max-w-4xl mx-auto">
          <h2 class="text-2xl font-display font-[300] text-center mb-6">Melody Sequencer</h2>
          <Sequencer />
        </section>

        <!-- Predefined Patterns -->
        <section class="max-w-4xl mx-auto">
          <h2 class="text-2xl font-display font-[300] text-center mb-6">Explore Patterns</h2>
          <PredefinedPatterns />
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%);
}

.text-secondary {
  color: var(--color-text-secondary);
}
</style>
 
