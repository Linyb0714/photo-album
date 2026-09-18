<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { PHOTO_SIZE_PRESETS, findPresetById, matchPresetByRatio, presetContentRatio } from '@/data/photoSizes';
import { contentRatio as calcContentRatio, contentSize } from '@/utils/frameGeometry';
import { applyPresetToWindow } from '@/utils/windowSize';
import type { FrameSizeOrientation } from '@/types';

const props = defineProps<{
  frameStyle: 'wood' | 'metal' | 'minimal';
}>();

const emit = defineEmits<{
  (e: 'update:frameStyle', style: 'wood' | 'metal' | 'minimal'): void;
  (e: 'close'): void;
}>();

const settingsStore = useSettingsStore();

const templates = [
  { id: 'grid', name: '网格', icon: '▦' },
  { id: 'masonry', name: '瀑布', icon: '▤' },
  { id: 'collage', name: '拼贴', icon: '▧' },
  { id: 'timeline', name: '时间', icon: '▸' },
  { id: 'gallery', name: '画廊', icon: '◷' },
  { id: 'magazine', name: '杂志', icon: '◪' },
];

const animations = [
  { id: 'fade', name: '淡入淡出' },
  { id: 'slide', name: '滑动' },
  { id: 'zoom', name: '缩放' },
  { id: 'cube', name: '立方体' },
];

const minInterval = 3000; // 3 秒
const maxInterval = 10800000; // 3 小时

// 手动输入的间隔（以秒为单位）
// 用本地 ref 承载输入，避免输入过程中被 store 回写打断；
// 只有点「确定/失焦/回车」时才落库（updateManualInterval）
const manualInterval = ref(Math.round(settingsStore.settings.carousel.interval / 1000));

// store 变化（滑块、预设按钮、持久化恢复）时同步回输入框
watch(
  () => settingsStore.settings.carousel.interval,
  (ms) => {
    const seconds = Math.round(ms / 1000);
    if (seconds !== manualInterval.value) manualInterval.value = seconds;
  }
);

const currentTemplate = computed({
  get: () => settingsStore.settings.frameTemplate,
  set: (value) => settingsStore.updateSettings({ frameTemplate: value }),
});

const carouselEnabled = computed({
  get: () => settingsStore.settings.carousel.enabled,
  set: (value) => settingsStore.updateCarousel({ enabled: value }),
});

const carouselInterval = computed({
  get: () => settingsStore.settings.carousel.interval,
  set: (value) => settingsStore.updateCarousel({ interval: value }),
});

const carouselAnimation = computed({
  get: () => settingsStore.settings.carousel.animation,
  set: (_value: string) => {
    // 在模板中直接处理类型转换
  },
});

const autoPlayAfterIdle = computed({
  get: () => settingsStore.settings.carousel.autoPlayAfterIdle,
  set: (value) => settingsStore.updateCarousel({ autoPlayAfterIdle: value }),
});

const hoverEnhancement = computed({
  get: () => settingsStore.settings.hoverEnhancement,
  set: (value) => settingsStore.updateSettings({ hoverEnhancement: value }),
});

// 格式化间隔时间显示
const formatInterval = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
  }
};

// 更新手动输入的间隔（秒 → 毫秒），范围 3 秒 ~ 3 小时
const updateManualInterval = () => {
  const raw = Number(manualInterval.value);
  let seconds = Number.isFinite(raw) ? Math.round(raw) : 0;
  seconds = Math.max(3, Math.min(seconds, 10800));
  manualInterval.value = seconds;
  settingsStore.updateCarousel({ interval: seconds * 1000 });
  console.log('[Settings] ⏱️ 轮播间隔已更新为', seconds, '秒');
};

const frameStyles = [
  { id: 'wood', name: '木质', icon: '🌲' },
  { id: 'metal', name: '杰伦', icon: '🎤' },
  { id: 'minimal', name: '纯白', icon: '◇' },
];

/* ==================== 常规相框尺寸 ==================== */

const photoSizes = PHOTO_SIZE_PRESETS;
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

const frameOrientations: { id: FrameSizeOrientation; name: string }[] = [
  { id: 'landscape', name: '横向' },
  { id: 'portrait', name: '纵向' },
];

const frameSize = computed(() => settingsStore.settings.frameSize);

/** 当前窗口照片内容区的宽高比；浏览器环境为 null */
const currentContentRatio = computed(() => {
  const viewport = settingsStore.frameViewport;
  if (!viewport) return null;
  return calcContentRatio(viewport.width, viewport.height, props.frameStyle);
});

/**
 * 实际匹配到的预设，null = 自定义。
 * 由**实时比例**推导而不是由存的 presetId 推导，所以解锁后手动拉到偏离比例时，
 * 预设高亮会自动消失并出现「自定义」。
 */
const effectivePresetId = computed(() => {
  const ratio = currentContentRatio.value;
  if (ratio === null) return frameSize.value.presetId; // 浏览器环境退回已存意图
  return matchPresetByRatio(ratio, frameSize.value.orientation)?.id ?? null;
});

/** 屏幕装不下所选比例时的提示文案 */
const sizeHint = ref('');

async function applyPreset(
  presetId: string,
  orientation: FrameSizeOrientation,
  baseContentWidth?: number | null,
) {
  const result = await applyPresetToWindow(presetId, orientation, props.frameStyle, baseContentWidth);
  const preset = findPresetById(presetId);
  sizeHint.value =
    result?.ratioBroken && preset
      ? `${preset.name}${orientation === 'portrait' ? '纵向' : '横向'}比屏幕可用高度还大，为保持比例窗口会超出屏幕`
      : '';
}

const selectSize = (presetId: string) => {
  sizeHint.value = '';
  settingsStore.setFrameSizePreset(presetId);
  void applyPreset(presetId, frameSize.value.orientation);
};

/** 切换横/纵：保持内容区长边长度不变，只交换长边的方向 */
const frameOrientation = computed({
  get: () => frameSize.value.orientation,
  set: (orientation: FrameSizeOrientation) => {
    settingsStore.setFrameSizeOrientation(orientation);
    const presetId = frameSize.value.presetId;
    const preset = findPresetById(presetId);
    if (!presetId || !preset) return;
    const viewport = settingsStore.frameViewport;
    let baseContentWidth: number | null = null;
    if (viewport) {
      const content = contentSize(viewport.width, viewport.height, props.frameStyle);
      const longEdge = Math.max(content.width, content.height);
      baseContentWidth = longEdge * presetContentRatio(preset, orientation);
    }
    void applyPreset(presetId, orientation, baseContentWidth);
  },
});

const frameLockAspect = computed({
  get: () => frameSize.value.lockAspect,
  set: (lockAspect: boolean) => {
    if (lockAspect) {
      // 开启瞬间按"当前屏幕上的实际比例"反查预设，也就是"锁住你现在看到的"
      const ratio = currentContentRatio.value;
      if (ratio !== null) {
        settingsStore.setFrameSizePreset(matchPresetByRatio(ratio, frameSize.value.orientation)?.id ?? null);
      }
    }
    settingsStore.setFrameLockAspect(lockAspect);
  },
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 固定头部：标题和完成按钮 -->
    <div class="flex-shrink-0 p-6 border-b border-gray-700 flex items-center justify-between">
      <h2 class="text-base font-semibold text-white">设置</h2>
      <button 
        @click="emit('close')"
        class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors font-medium"
      >
        完成
      </button>
    </div>

    <!-- 滚动内容区域 -->
    <div class="flex-1 overflow-y-auto p-6 pt-4 space-y-6">

    <!-- 相框模版 -->
    <div class="space-y-2">
      <label class="text-gray-300 text-xs">布局</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="template in templates"
          :key="template.id"
          @click="currentTemplate = template.id"
          class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          :class="{ 'ring-2 ring-blue-500': currentTemplate === template.id }"
        >
          <span class="text-base block mb-0.5 text-gray-200">{{ template.icon }}</span>
          <span class="text-xs text-gray-200">{{ template.name }}</span>
        </button>
      </div>
    </div>

    <!-- 相框风格 -->
    <div class="space-y-2">
      <label class="text-gray-300 text-sm">相框风格</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="style in frameStyles"
          :key="style.id"
          @click="emit('update:frameStyle', style.id as 'wood' | 'metal' | 'minimal')"
          class="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          :class="{ 'ring-2 ring-blue-500': props.frameStyle === style.id }"
        >
          <span class="text-base block mb-1 text-gray-200">{{ style.icon }}</span>
          <span class="text-xs text-gray-200">{{ style.name }}</span>
        </button>
      </div>
    </div>

    <!-- 常规相框尺寸（控制整个应用窗口的尺寸） -->
    <div class="space-y-2">
      <label class="text-gray-300 text-sm">常规相框尺寸</label>

      <!-- 横向 / 纵向 -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="orientation in frameOrientations"
          :key="orientation.id"
          @click="frameOrientation = orientation.id"
          class="px-3 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors text-white"
          :class="{ 'ring-1 ring-blue-500': frameSize.orientation === orientation.id }"
        >
          {{ orientation.name }}
        </button>
      </div>

      <!-- 等比例锁定 -->
      <div class="flex items-center justify-between">
        <div>
          <label class="text-gray-300 text-sm block">等比例锁定</label>
          <p class="text-gray-300 text-xs">拖动手柄时保持相片比例</p>
        </div>
        <button
          @click="frameLockAspect = !frameLockAspect"
          class="w-12 h-6 rounded-full transition-colors flex-shrink-0"
          :class="frameLockAspect ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <div
            class="w-5 h-5 rounded-full bg-white transition-transform"
            :class="{ 'translate-x-6': frameLockAspect }"
          ></div>
        </button>
      </div>

      <!-- 常见冲印尺寸 -->
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="size in photoSizes"
          :key="size.id"
          @click="selectSize(size.id)"
          class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          :class="{ 'ring-2 ring-blue-500': effectivePresetId === size.id }"
        >
          <span class="text-xs block text-gray-200">{{ size.name }}</span>
          <span class="text-[10px] block text-gray-300">
            {{ size.aliases.length ? size.aliases.join('/') + ' · ' : '' }}{{ size.mmLong }}×{{ size.mmShort }}
          </span>
        </button>
        <div
          v-if="effectivePresetId === null"
          class="p-2 rounded-lg bg-gray-700 ring-2 ring-blue-500 text-center"
        >
          <span class="text-xs block text-gray-200">自定义</span>
          <span class="text-[10px] block text-gray-300">
            {{ currentContentRatio ? '比例 ' + currentContentRatio.toFixed(2) : '自由调整' }}
          </span>
        </div>
      </div>

      <p v-if="sizeHint" class="text-amber-400 text-xs">{{ sizeHint }}</p>
      <p v-if="!isTauri" class="text-gray-400 text-xs">浏览器预览环境无法调整窗口大小，尺寸在桌面应用中生效</p>
    </div>

    <!-- 轮播设置 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-gray-300 text-sm">自动轮播</label>
        <button
          @click="carouselEnabled = !carouselEnabled"
          class="w-12 h-6 rounded-full transition-colors"
          :class="carouselEnabled ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <div 
            class="w-5 h-5 rounded-full bg-white transition-transform"
            :class="{ 'translate-x-6': carouselEnabled }"
          ></div>
        </button>
      </div>

      <div v-if="carouselEnabled" class="space-y-4 pl-4">
        <!-- 闲置后自动播放 -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-gray-300 text-sm block mb-1">闲置后自动播放</label>
            <p class="text-gray-300 text-xs">30 秒无操作后提示，15 秒后自动播放</p>
          </div>
          <button
            @click="autoPlayAfterIdle = !autoPlayAfterIdle"
            class="w-12 h-6 rounded-full transition-colors"
            :class="autoPlayAfterIdle ? 'bg-blue-500' : 'bg-gray-600'"
          >
            <div 
              class="w-5 h-5 rounded-full bg-white transition-transform"
              :class="{ 'translate-x-6': autoPlayAfterIdle }"
            ></div>
          </button>
        </div>

        <div class="space-y-4 border-t border-gray-700 pt-4">
        <div>
          <label class="text-gray-300 text-xs block mb-2">切换间隔</label>
          
          <!-- 滑块 -->
          <div class="mb-3">
            <input
              type="range"
              v-model.number="carouselInterval"
              :min="minInterval"
              :max="maxInterval"
              step="1000"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-300 mt-1">
              <span>3 秒</span>
              <span class="text-blue-400 font-semibold">{{ formatInterval(carouselInterval) }}</span>
              <span>3 小时</span>
            </div>
          </div>
          
          <!-- 手动输入 -->
          <div class="flex items-center gap-2">
            <input
              type="number"
              v-model.number="manualInterval"
              @change="updateManualInterval"
              @keyup.enter="updateManualInterval"
              @blur="updateManualInterval"
              class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入间隔（秒）"
              min="3"
              max="10800"
            />
            <span class="text-gray-200 text-sm">秒</span>
          </div>
        </div>

        <div>
          <label class="text-gray-300 text-xs">切换动画</label>
          <div class="grid grid-cols-4 gap-2 mt-1">
            <button
              v-for="anim in animations"
              :key="anim.id"
              @click="settingsStore.updateCarousel({ animation: anim.id as 'fade' | 'slide' | 'zoom' | 'cube' })"
              class="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
              :class="{ 'ring-1 ring-blue-500': carouselAnimation === anim.id }"
            >
              {{ anim.name }}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 悬停效果 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-gray-300 text-sm">悬停 3D 效果</label>
        <button
          @click="hoverEnhancement = !hoverEnhancement"
          class="w-12 h-6 rounded-full transition-colors"
          :class="hoverEnhancement ? 'bg-blue-500' : 'bg-gray-600'"
        >
          <div 
            class="w-5 h-5 rounded-full bg-white transition-transform"
            :class="{ 'translate-x-6': hoverEnhancement }"
          ></div>
        </button>
      </div>
      <p class="text-gray-300 text-xs">鼠标静止悬停 3 秒后显示 3D 效果</p>
    </div>

    <!-- 自动关闭时间 -->
    <div class="space-y-2">
      <label class="text-gray-300 text-sm">菜单自动关闭时间</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="time in [15000, 20000, 30000]"
          :key="time"
          @click="settingsStore.updateSettings({ menuAutoCloseTime: time })"
          class="px-3 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors text-white"
          :class="{ 'ring-1 ring-blue-500': settingsStore.settings.menuAutoCloseTime === time }"
        >
          {{ time / 1000 }}秒
        </button>
      </div>
    </div>
    </div>
  </div>
</template>
