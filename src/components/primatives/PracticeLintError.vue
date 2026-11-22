<script setup lang="ts">
import { useMusicStore } from '@/stores/music'
const store = useMusicStore()
</script>

<template><div>{{ store }}</div></template>
