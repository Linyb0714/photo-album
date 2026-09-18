<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import SettingsPanel from './SettingsPanel.vue';

const props = defineProps<{
  frameStyle: 'wood' | 'metal' | 'minimal';
  autoCloseTime: number;
  remainingSeconds: number;
}>();

const emit = defineEmits<{
  (e: 'update:frameStyle', style: 'wood' | 'metal' | 'minimal'): void;
  (e: 'openAlbumManager'): void;
  (e: 'openEditor'): void;
}>();

const settingsStore = useSettingsStore();

const showSettingsPanel = ref(false);
const showExportMenu = ref(false);

const menuPosition = computed(() => settingsStore.menuState.position);

// 竖图展示模式标签
const portraitFitModeLabel = computed(() => {
  const mode = settingsStore.settings.portraitFitMode;
  const labels: Record<string, string> = {
    'ken-burns': '缓慢滑动',
    'contain': '完整显示',
    'cover': '填满裁剪',
  };
  return labels[mode] || mode;
});

// 轮播的暂停/播放已移到幻灯片悬停操作栏，菜单里不再放
const menuItems = computed(() => [
  { icon: '📁', label: '相册管理', action: () => emit('openAlbumManager') },
  { icon: '📐', label: `竖图模式: ${portraitFitModeLabel.value}`, action: () => settingsStore.togglePortraitFitMode() },
  { icon: '⬇️', label: '导出', action: () => (showExportMenu.value = !showExportMenu.value), hasSubmenu: true },
  { icon: '⚙️', label: '设置', action: () => (showSettingsPanel.value = !showSettingsPanel.value), hasSubmenu: true },
]);

const exportFormats = [
  { label: '导出为 GIF', action: () => console.log('导出为 GIF') },
  { label: '导出为 MP4', action: () => console.log('导出为 MP4') },
  { label: '导出为 WebM', action: () => console.log('导出为 WebM') },
];
</script>

<template>
  <transition
    :name="menuPosition === 'left' ? 'menu-left' : 'menu-right'"
    mode="out-in"
  >
    <div 
      v-if="settingsStore.menuState.visible"
      class="menu-container absolute top-0 bottom-0 w-64 bg-gray-800/95 backdrop-blur-md shadow-2xl z-50 flex flex-col"
      :class="[menuPosition === 'left' ? 'left-0' : 'right-0']"
    >
      <!-- 菜单标题 -->
      <div class="p-4 border-b border-gray-700">
        <h2 class="text-white text-base font-semibold">爱你所选</h2>
      </div>

      <!-- 菜单项 -->
      <div class="flex-1 overflow-y-auto py-2">
        <button
          v-for="(item, index) in menuItems"
          :key="index"
          @click="item.action"
          class="w-full px-4 py-3 flex items-center gap-3 text-gray-200 hover:bg-gray-700/50 transition-colors"
        >
          <span class="text-base">{{ item.icon }}</span>
          <span class="flex-1 text-left text-sm">{{ item.label }}</span>
          <span v-if="item.hasSubmenu" class="text-gray-500">›</span>
        </button>

        <!-- 导出子菜单 -->
        <div v-if="showExportMenu" class="pl-8 py-2 space-y-1 border-t border-gray-700 mt-2">
          <button
            v-for="(format, index) in exportFormats"
            :key="index"
            @click="format.action"
            class="w-full px-4 py-2 text-xs text-gray-300 hover:bg-gray-700/50 transition-colors text-left"
          >
            {{ format.label }}
          </button>
        </div>
      </div>

      <!-- 倒计时进度条 -->
      <div class="p-4 border-t border-gray-700">
          <div class="flex items-center gap-2 text-gray-400 text-xs mb-2">
          <span>⏱ 自动关闭 ({{ props.remainingSeconds }}s)</span>
        </div>
        <div class="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-linear"
            :style="{ width: (props.autoCloseTime > 0 ? (props.remainingSeconds / (props.autoCloseTime / 1000)) * 100 : 0) + '%' }"
          ></div>
        </div>
      </div>

      <!-- 设置面板 -->
      <transition name="slide-up">
        <div 
          v-if="showSettingsPanel"
          class="absolute inset-0 bg-gray-900/95 backdrop-blur-md z-10 overflow-y-auto"
        >
          <SettingsPanel 
            :frame-style="props.frameStyle"
            @update:frame-style="(style) => emit('update:frameStyle', style)"
            @close="showSettingsPanel = false"
          />
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.menu-left-enter-active,
.menu-left-leave-active {
  transition: all 0.3s ease-out;
}

.menu-left-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.menu-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.menu-right-enter-active,
.menu-right-leave-active {
  transition: all 0.3s ease-out;
}

.menu-right-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.menu-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@keyframes countdown {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
