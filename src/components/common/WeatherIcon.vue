<script setup lang="ts">
import type { WeatherIconKey } from '@/utils/weather';

defineProps<{
  name: WeatherIconKey;
}>();
</script>

<template>
  <svg
    class="w-4 h-4 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 晴 -->
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </template>

    <!-- 大部晴 / 多云 -->
    <template v-else-if="name === 'partly'">
      <circle cx="8.5" cy="8.5" r="3" />
      <path d="M8.5 2.5v1.5M2.5 8.5H4M4.2 4.2l1 1M13 4.2l-1 1" />
      <path d="M17 20H8a4 4 0 0 1-.6-7.95A5 5 0 0 1 17 13.5a3.5 3.5 0 0 1 0 6.5z" />
    </template>

    <!-- 阴 -->
    <template v-else-if="name === 'cloud'">
      <path d="M17.5 19H7a4.5 4.5 0 0 1-.7-8.95A5.5 5.5 0 0 1 17 10.7a4.2 4.2 0 0 1 .5 8.3z" />
    </template>

    <!-- 雾 -->
    <template v-else-if="name === 'fog'">
      <path d="M17.5 15H7a4.5 4.5 0 0 1-.7-8.95A5.5 5.5 0 0 1 17 6.7a4.2 4.2 0 0 1 .5 8.3z" />
      <path d="M4 19h11M6 22h13" />
    </template>

    <!-- 雨 / 阵雨 -->
    <template v-else-if="name === 'rain'">
      <path d="M17.5 15H7a4.5 4.5 0 0 1-.7-8.95A5.5 5.5 0 0 1 17 6.7a4.2 4.2 0 0 1 .5 8.3z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </template>

    <!-- 雪 / 阵雪 -->
    <template v-else-if="name === 'snow'">
      <path d="M17.5 14H7a4.5 4.5 0 0 1-.7-8.95A5.5 5.5 0 0 1 17 5.7a4.2 4.2 0 0 1 .5 8.3z" />
      <path d="M8 18.5h.01M12 20.5h.01M16 18.5h.01" />
    </template>

    <!-- 雷阵雨 -->
    <template v-else>
      <path d="M17.5 14H7a4.5 4.5 0 0 1-.7-8.95A5.5 5.5 0 0 1 17 5.7a4.2 4.2 0 0 1 .5 8.3z" />
      <path d="M12.5 16.5l-2 3h2.5l-1.5 3" />
    </template>
  </svg>
</template>
