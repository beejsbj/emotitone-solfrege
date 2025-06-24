<template>
  <div v-if="showLoading" class="piano-loading">
    <div class="loading-content">
      <div class="piano-icon">🎹</div>
      <div class="loading-text">Loading Piano Samples...</div>
      <div class="loading-bar">
        <div class="loading-progress"></div>
      </div>
      <div class="loading-subtitle">Using fallback synth until loaded</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useInstrumentStore } from '@/stores/instrument'

const instrumentStore = useInstrumentStore()

// Show loading for piano specifically
const showLoading = computed(() => {
  return instrumentStore.currentInstrument === 'piano' && instrumentStore.pianoLoading
})

// Auto-hide after a reasonable timeout (in case loading fails)
const forceHide = ref(false)

onMounted(() => {
  // Hide loading indicator after 30 seconds regardless
  setTimeout(() => {
    forceHide.value = true
  }, 30000)
})

const finalShowLoading = computed(() => showLoading.value && !forceHide.value)
</script>

<style scoped>
.piano-loading {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  min-width: 250px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.piano-icon {
  font-size: 2rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.loading-text {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
}

.loading-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 2px;
  animation: loading 2s infinite;
}

@keyframes loading {
  0% {
    width: 0%;
    transform: translateX(-100%);
  }
  50% {
    width: 100%;
    transform: translateX(0%);
  }
  100% {
    width: 100%;
    transform: translateX(100%);
  }
}

.loading-subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  text-align: center;
  line-height: 1.3;
}

@media (max-width: 768px) {
  .piano-loading {
    top: 10px;
    right: 10px;
    left: 10px;
    min-width: unset;
  }
  
  .piano-icon {
    font-size: 1.5rem;
  }
  
  .loading-text {
    font-size: 0.8rem;
  }
  
  .loading-subtitle {
    font-size: 0.7rem;
  }
}
</style>
