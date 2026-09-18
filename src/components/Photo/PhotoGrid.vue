<script setup lang="ts">
import type { Photo } from '@/types';
import AlbumView from './AlbumView.vue';

const emit = defineEmits<{
  (e: 'edit', photo: Photo): void;
}>();
</script>

<template>
  <AlbumView @edit="(photo) => emit('edit', photo)" />
</template>
