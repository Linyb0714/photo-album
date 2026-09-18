<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { Photo, PhotoEdit, CropRect } from '@/types';
import { getMediaSrc, isVideoPhoto } from '@/utils/tauriApi';
import { useAlbumStore } from '@/stores/album';
import {
  createDefaultEdit,
  isEdited,
  buildFilter,
  buildCropStyle,
  buildTemperatureStyle,
  buildVignetteStyle,
  FULL_CROP,
} from '@/utils/photoEdit';

const props = defineProps<{
  photo: Photo | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', photoId: string): void;
}>();

const albumStore = useAlbumStore();

type NumberKey =
  | 'brightness' | 'contrast' | 'saturation' | 'temperature'
  | 'hue' | 'grayscale' | 'sepia' | 'blur' | 'vignette';

const draft = ref<PhotoEdit>(createDefaultEdit());
const showOriginal = ref(false);

const groups: { title: string; items: { key: NumberKey; label: string; min: number; max: number; step: number; reset: number }[] }[] = [
  {
    title: '光效',
    items: [
      { key: 'brightness', label: '亮度', min: 50, max: 150, step: 1, reset: 100 },
      { key: 'contrast', label: '对比度', min: 50, max: 150, step: 1, reset: 100 },
    ],
  },
  {
    title: '色彩',
    items: [
      { key: 'saturation', label: '饱和度', min: 0, max: 200, step: 1, reset: 100 },
      { key: 'temperature', label: '色温', min: -100, max: 100, step: 1, reset: 0 },
      { key: 'hue', label: '色相', min: -180, max: 180, step: 1, reset: 0 },
      { key: 'grayscale', label: '黑白', min: 0, max: 100, step: 1, reset: 0 },
      { key: 'sepia', label: '复古', min: 0, max: 100, step: 1, reset: 0 },
    ],
  },
  {
    title: '氛围',
    items: [
      { key: 'blur', label: '柔化', min: 0, max: 10, step: 0.5, reset: 0 },
      { key: 'vignette', label: '暗角', min: 0, max: 100, step: 1, reset: 0 },
    ],
  },
];

const isVideo = computed(() => (props.photo ? isVideoPhoto(props.photo as any) || props.photo.mediaType === 'video' : false));
const mediaSrc = computed(() => (props.photo ? getMediaSrc(props.photo) : ''));
const alreadyEdited = computed(() => (props.photo ? albumStore.hasEdit(props.photo.id) : false));

// 打开/切换照片时，用已保存的编辑参数作为起点（可以反复微调）
watch(
  () => props.photo?.id,
  () => {
    if (!props.photo) return;
    const saved = albumStore.getEdit(props.photo.id);
    draft.value = saved ? { ...saved } : createDefaultEdit();
    showOriginal.value = false;
  },
  { immediate: true }
);

const previewEdit = computed(() => (showOriginal.value ? null : draft.value));
const previewFilter = computed(() => buildFilter(previewEdit.value));
const temperatureStyle = computed(() => buildTemperatureStyle(previewEdit.value));
const vignetteStyle = computed(() => buildVignetteStyle(previewEdit.value));

const isDirty = computed(() => isEdited(draft.value));

/* ================= 圈选（展示区域） ================= */
const cropMode = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
/** 相框内照片展示区的宽高比（用于约束选区比例） */
const areaAspect = ref(1.5);
/** 素材自身宽高比 */
const imgAspect = ref(1.5);
const cropHandles = ['nw', 'ne', 'se', 'sw'];

const crop = computed<CropRect>(() => draft.value.crop || { ...FULL_CROP });
const hasCrop = computed(() => !!draft.value.crop);

// 选区覆盖层的位置（相对预览舞台的百分比）
const cropBoxStyle = computed(() => ({
  left: `${crop.value.x * 100}%`,
  top: `${crop.value.y * 100}%`,
  width: `${crop.value.w * 100}%`,
  height: `${crop.value.h * 100}%`,
}));

// 预览舞台：圈选模式按素材比例显示整张；否则按相框展示区比例显示最终效果
const stageStyle = computed(() => ({
  aspectRatio: String(cropMode.value ? imgAspect.value : areaAspect.value),
  height: '64vh',
  maxWidth: '100%',
}));

// 预览媒体：圈选模式显示整张；否则按选区渲染
const previewMediaStyle = computed(() => {
  const style: Record<string, string> = { filter: previewFilter.value };
  if (cropMode.value || showOriginal.value) {
    style.objectFit = 'contain';
    style.width = '100%';
    style.height = '100%';
  } else {
    Object.assign(style, buildCropStyle(draft.value.crop), { width: '100%', height: '100%', objectFit: 'cover' });
  }
  return style;
});

/* 跟随鼠标的亮光：光标位置在玻璃底上打一层柔光 */
const spot = ref({ x: 0, y: 0, on: false });
const onSpotMove = (e: MouseEvent) => {
  const rect = rootRef.value?.getBoundingClientRect();
  if (!rect) return;
  spot.value = {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top),
    on: true,
  };
};
const onSpotLeave = () => {
  spot.value = { ...spot.value, on: false };
};

const measureArea = () => {
  if (rootRef.value && rootRef.value.clientHeight > 0) {
    areaAspect.value = rootRef.value.clientWidth / rootRef.value.clientHeight;
  }
};

const onMediaLoad = (e: Event) => {
  const el = e.target as HTMLImageElement | HTMLVideoElement;
  const w = (el as HTMLImageElement).naturalWidth || (el as HTMLVideoElement).videoWidth || 0;
  const h = (el as HTMLImageElement).naturalHeight || (el as HTMLVideoElement).videoHeight || 0;
  if (w > 0 && h > 0) imgAspect.value = w / h;
};

// 选区高度 = 宽度 ×（素材比例 / 展示区比例），保证选区比例与相框一致、不会变形
const heightForWidth = (w: number) => Math.min(1, (w * imgAspect.value) / areaAspect.value);
const widthForHeight = (h: number) => Math.min(1, (h * areaAspect.value) / imgAspect.value);

const clampCrop = (c: CropRect): CropRect => {
  let w = Math.min(Math.max(c.w, 0.05), 1);
  let h = Math.min(Math.max(c.h, 0.05), 1);
  if (w * imgAspect.value / areaAspect.value > 1) w = widthForHeight(1);
  h = heightForWidth(w);
  if (h > 1) { h = 1; w = widthForHeight(1); }
  let x = Math.min(Math.max(c.x, 0), 1 - w);
  let y = Math.min(Math.max(c.y, 0), 1 - h);
  return { x, y, w, h };
};

const setCrop = (c: CropRect) => {
  const next = clampCrop(c);
  draft.value.crop = isFullCropLike(next) ? null : next;
};

const isFullCropLike = (c: CropRect) =>
  c.x <= 0.002 && c.y <= 0.002 && c.w >= 0.998 && c.h >= 0.998;

// 舞台坐标 → 归一化坐标
const toNorm = (e: MouseEvent) => {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return { nx: 0, ny: 0 };
  return {
    nx: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
    ny: Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
  };
};

type CropDrag = { mode: 'draw' | 'move' | 'resize'; handle: string; nx: number; ny: number; origin: CropRect } | null;
let cropDrag: CropDrag = null;

const onCropMouseMove = (e: MouseEvent) => {
  if (!cropDrag) return;
  const { nx, ny } = toNorm(e);
  const o = cropDrag.origin;

  if (cropDrag.mode === 'draw') {
    const sx = cropDrag.nx;
    const sy = cropDrag.ny;
    let w = Math.abs(nx - sx);
    let h = Math.abs(ny - sy);
    // 按展示区比例取较大者，保证比例正确
    w = Math.max(w, widthForHeight(h));
    h = heightForWidth(w);
    const x = nx < sx ? sx - w : sx;
    const y = ny < sy ? sy - h : sy;
    setCrop({ x, y, w, h });
    return;
  }

  if (cropDrag.mode === 'move') {
    setCrop({ ...o, x: o.x + (nx - cropDrag.nx), y: o.y + (ny - cropDrag.ny) });
    return;
  }

  if (cropDrag.mode === 'resize') {
    const hd = cropDrag.handle;
    let { x, y, w, h } = o;
    const right = o.x + o.w;
    const bottom = o.y + o.h;
    if (hd.includes('e')) w = nx - o.x;
    if (hd.includes('w')) { w = right - nx; x = nx; }
    if (hd.includes('s')) h = ny - o.y;
    if (hd.includes('n')) { h = bottom - ny; y = ny; }
    // 以宽度为准保持比例
    h = heightForWidth(Math.max(w, 0.05));
    if (hd.includes('n')) y = bottom - h;
    if (hd.includes('w')) x = right - w;
    setCrop({ x, y, w, h });
  }
};

const onCropMouseUp = () => {
  cropDrag = null;
  window.removeEventListener('mousemove', onCropMouseMove);
  window.removeEventListener('mouseup', onCropMouseUp);
};

const startCropDrag = (e: MouseEvent, mode: 'draw' | 'move' | 'resize', handle = '') => {
  if (e.button !== 0) return;
  e.preventDefault();
  const { nx, ny } = toNorm(e);
  cropDrag = { mode, handle, nx, ny, origin: { ...crop.value } };
  window.addEventListener('mousemove', onCropMouseMove);
  window.addEventListener('mouseup', onCropMouseUp);
};

const resetCrop = () => {
  draft.value.crop = null;
};

const toggleCropMode = () => {
  cropMode.value = !cropMode.value;
  if (cropMode.value) measureArea();
};

const resetAll = () => {
  draft.value = createDefaultEdit();
};
const resetOne = (item: { key: NumberKey; reset: number }) => {
  draft.value[item.key] = item.reset;
};
const clearEdit = () => {
  if (!props.photo) return;
  albumStore.setEdit(props.photo.id, null);
  emit('saved', props.photo.id);
  emit('close');
};
const save = () => {
  if (!props.photo) return;
  albumStore.setEdit(props.photo.id, isDirty.value ? draft.value : null);
  emit('saved', props.photo.id);
  emit('close');
};
const cancel = () => {
  emit('close');
};

const onKeydown = (e: KeyboardEvent) => {
  if (!props.photo) return;
  if (e.key === 'Escape') {
    e.stopPropagation();
    cancel();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('resize', measureArea);
  measureArea();
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true);
  window.removeEventListener('resize', measureArea);
  onCropMouseUp();
});
</script>

<template>
  <div
    v-if="photo"
    ref="rootRef"
    class="editor-glass absolute inset-0 z-[60] flex flex-col"
    @click.stop
    @mousedown.stop
    @mousemove="onSpotMove"
    @mouseleave="onSpotLeave"
  >
    <!-- 跟随光标的亮光（在玻璃底之上、内容之下） -->
    <div
      class="editor-spotlight pointer-events-none"
      :class="{ 'is-on': spot.on }"
      :style="{
        background: `radial-gradient(460px circle at ${spot.x}px ${spot.y}px, rgba(150, 182, 232, 0.10), transparent 68%), radial-gradient(200px circle at ${spot.x}px ${spot.y}px, rgba(196, 218, 255, 0.10), transparent 70%)`,
      }"
    ></div>

    <!-- 顶部栏 -->
    <div class="flex-shrink-0 h-12 px-5 flex items-center justify-between border-b border-white/10">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-white text-sm font-medium">编辑照片</span>
        <span class="text-white/40 text-xs truncate max-w-[40%]">{{ photo.name }}</span>
        <span
          v-if="alreadyEdited"
          class="px-2 py-0.5 rounded-full bg-amber-500/85 text-black/80 text-[10px] font-semibold"
        >
          已编辑
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="!isVideo"
          class="px-3 py-1.5 rounded-lg text-xs transition-colors"
          :class="cropMode ? 'bg-amber-500/85 text-black' : 'text-white/80 bg-white/10 hover:bg-white/20'"
          @click="toggleCropMode"
        >
          {{ cropMode ? '完成选区' : '圈选区域' }}
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-xs text-white/80 bg-white/10 hover:bg-white/20 transition-colors"
          @click="showOriginal = !showOriginal"
        >
          {{ showOriginal ? '显示效果' : '对比原图' }}
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-xs text-white/80 bg-white/10 hover:bg-white/20 transition-colors"
          @click="resetAll"
        >
          复位参数
        </button>
      </div>
    </div>

    <!-- 主体：预览 + 参数 -->
    <div class="flex-1 flex min-h-0">
      <!-- 预览 -->
      <div class="flex-1 min-w-0 p-5 flex items-center justify-center">
        <div
          ref="stageRef"
          class="relative overflow-hidden rounded-lg"
          :class="cropMode && !isVideo ? 'cursor-crosshair' : ''"
          :style="stageStyle"
          @mousedown="cropMode && !isVideo ? startCropDrag($event, 'draw') : undefined"
        >
          <img
            v-if="!isVideo && mediaSrc"
            :src="mediaSrc"
            :alt="photo.name"
            class="absolute inset-0 block"
            :style="previewMediaStyle"
            @load="onMediaLoad"
          />
          <video
            v-else-if="isVideo && mediaSrc"
            :src="mediaSrc"
            :muted="true"
            :loop="true"
            :autoplay="true"
            :controls="false"
            playsinline
            class="absolute inset-0 block"
            :style="previewMediaStyle"
            @loadeddata="onMediaLoad"
          />
          <p v-else class="text-gray-500 text-sm">无法预览该素材</p>

          <!-- 编辑覆盖层（与相册内渲染完全一致） -->
          <div class="absolute inset-0 pointer-events-none" :style="temperatureStyle"></div>
          <div class="absolute inset-0 pointer-events-none" :style="vignetteStyle"></div>

          <!-- 圈选：选区外压暗，选区可拖动，四角可缩放 -->
          <div
            v-if="cropMode && !isVideo"
            class="crop-box"
            :style="cropBoxStyle"
            @mousedown.stop="startCropDrag($event, 'move')"
          >
            <span
              v-for="h in cropHandles"
              :key="h"
              class="crop-handle"
              :class="`ch-${h}`"
              @mousedown.stop.prevent="startCropDrag($event, 'resize', h)"
            ></span>
          </div>

          <span
            v-if="showOriginal"
            class="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs z-10"
          >
            原图
          </span>
          <span
            v-else-if="cropMode"
            class="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white/80 text-xs z-10"
          >
            拖动画框选择要展示的区域
          </span>
        </div>
      </div>

      <!-- 参数面板：横向渐变「全透明 → 半透明」，让功能区从预览区自然过渡出来 -->
      <div
        class="flex-shrink-0 w-72 border-l border-white/10 overflow-y-auto p-4 space-y-5"
        style="background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.13) 100%);"
      >
        <!-- 展示区域（圈选） -->
        <div v-if="!isVideo" class="space-y-3">
          <h3 class="text-white/50 text-xs tracking-wider">展示区域</h3>
          <p class="text-white/35 text-[11px] leading-relaxed">
            用「圈选区域」选出照片中想展示的那一块，相当于调整它在相框里的大小与位置。
          </p>
          <div class="flex items-center justify-between">
            <span class="text-white/70 text-xs">
              {{ hasCrop ? `已选 ${Math.round(crop.w * 100)}% × ${Math.round(crop.h * 100)}%` : '整张展示' }}
            </span>
            <button
              class="px-2 py-1 rounded text-[11px] text-white/70 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
              :disabled="!hasCrop"
              @click="resetCrop"
            >
              重置选区
            </button>
          </div>
          <button
            class="w-full py-2 rounded-lg text-xs transition-colors"
            :class="cropMode ? 'bg-amber-500/85 text-black' : 'bg-white/10 hover:bg-white/20 text-white/80'"
            @click="toggleCropMode"
          >
            {{ cropMode ? '完成选区' : '开始圈选' }}
          </button>
        </div>

        <!-- 重置：把所有参数（含圈选）恢复默认，保存后指示灯消失 -->
        <div class="space-y-2 pt-1">
          <button
            class="w-full py-2 rounded-lg text-xs text-white/80 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            :disabled="!isDirty"
            @click="resetAll"
          >
            重置参数
          </button>
          <p class="text-white/30 text-[11px] leading-relaxed">
            重置所有调整与圈选，保存后回到原图，照片上的编辑指示灯也会消失
          </p>
        </div>

        <div v-for="group in groups" :key="group.title" class="space-y-3">
          <h3 class="text-white/50 text-xs tracking-wider">{{ group.title }}</h3>
          <div v-for="item in group.items" :key="item.key" class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-white/70 text-xs">{{ item.label }}</span>
              <div class="flex items-center gap-2">
                <span class="text-white/40 text-[10px] tabular-nums">{{ draft[item.key] }}</span>
                <button
                  class="text-white/30 hover:text-white/70 transition-colors"
                  :title="`重置${item.label}`"
                  @click="resetOne(item)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <input
              type="range"
              :min="item.min"
              :max="item.max"
              :step="item.step"
              v-model.number="draft[item.key]"
              class="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="flex-shrink-0 h-14 px-5 flex items-center justify-between border-t border-white/10">
      <p class="text-white/35 text-xs">
        只保存调整参数，原图文件不会被修改，随时可以再次调整或清除
      </p>
      <div class="flex items-center gap-2">
        <button
          v-if="alreadyEdited"
          class="px-4 py-2 rounded-lg text-xs text-red-300 bg-red-500/15 hover:bg-red-500/25 transition-colors"
          @click="clearEdit"
        >
          清除编辑
        </button>
        <button
          class="px-4 py-2 rounded-lg text-xs text-white/80 bg-white/10 hover:bg-white/20 transition-colors"
          @click="cancel"
        >
          取消
        </button>
        <button
          class="px-5 py-2 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black transition-colors"
          @click="save"
        >
          保存效果
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 液态玻璃：高不透明度的深色玻璃 + 强背景模糊与饱和度提升 + 内沿高光，
   比单纯的半透明遮罩更"实"，照片不会透出来干扰取色 */
.editor-glass {
  background:
    /* 顶部一道冷调反光 */
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.09) 0%,
      rgba(255, 255, 255, 0.03) 18%,
      rgba(255, 255, 255, 0) 46%
    ),
    /* 左上角冷色折射 */
    radial-gradient(120% 80% at 18% 0%, rgba(120, 152, 205, 0.12) 0%, rgba(0, 0, 0, 0) 62%),
    /* 玻璃本体：七成不透明的深色 */
    rgba(9, 10, 13, 0.7);
  backdrop-filter: blur(20px) saturate(170%);
  -webkit-backdrop-filter: blur(20px) saturate(170%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
}

/* 内容层压在亮光之上，让光只从半透明的面板/空档里透出来 */
.editor-glass > *:not(.editor-spotlight) {
  position: relative;
  z-index: 2;
}

/* 跟随鼠标的亮光层 */
.editor-spotlight {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.editor-spotlight.is-on {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .editor-spotlight {
    transition: none;
  }
}

/* 圈选框：选区外用超大 box-shadow 压暗，形成裁切预览 */
.crop-box {
  position: absolute;
  z-index: 20;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  outline: 1px solid rgba(255, 255, 255, 0.9);
  cursor: move;
}

.crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.ch-nw { top: -6px; left: -6px; cursor: nwse-resize; }
.ch-ne { top: -6px; right: -6px; cursor: nesw-resize; }
.ch-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
.ch-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
</style>
