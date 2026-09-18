<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import type { Photo } from '@/types';
import { useAlbumStore } from '@/stores/album';
import { useSettingsStore } from '@/stores/settings';
import { getImagePosition } from '@/utils/imagePosition';
import { getMediaSrc, isVideoPhoto } from '@/utils/tauriApi';
import { buildFilter, buildCropStyle, buildTemperatureStyle, buildVignetteStyle } from '@/utils/photoEdit';

const props = defineProps<{
  photo: Photo & { color?: string; url?: string; thumbnail?: string };
  index: number;
  isCarouselMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', photo: Photo): void;
  (e: 'edit', photo: Photo): void;
  (e: 'favorite', photo: Photo, isFavorite: boolean): void;
  (e: 'play', photo: Photo, index: number): void;
  (e: 'error', photo: Photo, index: number): void;
}>();

const albumStore = useAlbumStore();
const settingsStore = useSettingsStore();

const imageLoaded = ref(false);
const imageError = ref(false);
const isImageLoading = ref(true);

// 是否为视频
const isVideo = computed(() => isVideoPhoto(props.photo as any) || props.photo.mediaType === 'video');

// 是否为竖图
const isPortrait = computed(() => props.photo.aspectRatio < 1);

// 竖图展示模式
const portraitFitMode = computed(() => settingsStore.settings.portraitFitMode);

// 计算图片裁剪位置
const objectPosition = computed(() => {
  return getImagePosition(props.photo.id, props.photo.aspectRatio);
});

// 统一媒体源
const mediaSrc = computed(() => getMediaSrc(props.photo));

// 图片展示样式类：根据竖图模式决定 object-fit
const imageFitClass = computed(() => {
  if (!isPortrait.value) {
    // 横图：统一用 cover
    return 'object-cover';
  }
  // 竖图：根据模式
  if (portraitFitMode.value === 'contain') {
    return 'object-contain';
  }
  return 'object-cover';
});

// 编辑参数（非破坏性：只影响渲染，不改动原图）
const edit = computed(() => albumStore.getEdit(props.photo.id));
const hasEdit = computed(() => albumStore.hasEdit(props.photo.id));
const mediaFilter = computed(() => buildFilter(edit.value));
const temperatureStyle = computed(() => buildTemperatureStyle(edit.value));
const vignetteStyle = computed(() => buildVignetteStyle(edit.value));
const cropStyle = computed(() => buildCropStyle(edit.value?.crop));
const hasCrop = computed(() => !!edit.value?.crop);

// 媒体（图片/视频）最终样式：影调 + 圈选
const mediaStyle = computed(() => {
  const style: Record<string, string> = {
    objectPosition: isPortrait.value && portraitFitMode.value !== 'cover' ? 'center' : objectPosition.value,
    opacity: imageLoaded.value ? '1' : '0',
    transition: props.isCarouselMode ? 'opacity 0.2s ease' : 'opacity 0.5s ease-in-out',
    filter: mediaFilter.value,
  };
  if (hasCrop.value) {
    // 有圈选时由选区决定展示范围，object-position 不再生效
    delete style.objectPosition;
    Object.assign(style, cropStyle.value);
  }
  return style;
});

// 是否启用 Ken Burns 缓慢纵向滑动（圈选会占用 transform，故让位）
const enableKenBurns = computed(() =>
  isPortrait.value &&
  isVideo.value === false &&
  portraitFitMode.value === 'ken-burns' &&
  !!props.isCarouselMode &&
  !hasCrop.value
);

const openEditor = (e: MouseEvent) => {
  e.stopPropagation();
  emit('edit', props.photo);
};

// 暂停 / 继续轮播（暂停只冻结计时，不切换视图模式）
const playPaused = computed(() => settingsStore.carouselPaused);
const togglePlay = () => {
  settingsStore.toggleCarouselPaused();
};

// 视频时长格式化（mm:ss）
const formattedDuration = computed(() => {
  const d = props.photo.duration;
  if (!d) return '';
  const total = Math.floor(d);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

// 预加载图片（仅图片类型，视频由 <video> 自行加载）
const preloadImages = () => {
  if (!props.isCarouselMode) return;
  
  const photos = albumStore.currentPhotos;
  const currentIndex = albumStore.currentIndex;
  
  // 预加载上一张和下一张
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
  const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
  
  [prevIndex, nextIndex].forEach(idx => {
    const photo = photos[idx];
    if (photo && !isVideoPhoto(photo as any)) {
      const src = getMediaSrc(photo);
      if (src) {
        const img = new Image();
        img.src = src;
        console.log('[PhotoItem] 🔮 预加载图片:', photo.name);
      }
    }
  });
};

// 监听当前图片变化，触发预加载
watch(() => albumStore.currentIndex, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    preloadImages();
  }
}, { immediate: true });

const quotes = [
  "最美的不是下雨天，是曾与你躲过雨的屋檐",
  "而我已经分不清，你是友情，还是错过的爱情",
  "天青色等烟雨，而我在等你",
  "乘着风游荡在蓝天边，一片云掉落在我面前",
  "我送你离开，千里之外，你无声黑白",
  "从前从前，有个人爱你很久",
  "故事的小黄花，从出生那年就飘着",
  "雨下整夜，我的爱溢出就像雨水",
  "转身离开，分手说不出来",
  "听妈妈的话，别让她受伤",
  "缓缓飘落的枫叶像思念，我点燃烛火温暖岁末的秋天",
  "我一路向北，离开有你的季节",
  "你的美，已经给了谁，追了又追，我要不回",
  "最美的不是下雨天，是曾与你躲过雨的屋檐",
  "而我已经分不清，你是友情，还是错过的爱情",
];

const getQuote = () => {
  const hash = props.photo.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return quotes[hash % quotes.length];
};

let lastClickTime = 0;
const handleClick = (e: MouseEvent) => {
  const now = Date.now();
  if (now - lastClickTime < 200) {
    return;
  }
  lastClickTime = now;
  
  if ((e.target as HTMLElement).closest('.favorite-btn')) {
    return;
  }
  emit('click', props.photo);
};

const handleFavorite = (e: MouseEvent) => {
  e.stopPropagation();
  const newStatus = !props.photo.isFavorite;
  albumStore.toggleFavorite(props.photo.id, newStatus);
  emit('favorite', props.photo, newStatus);
};

const handlePlay = (e: MouseEvent) => {
  e.stopPropagation();
  emit('play', props.photo, props.index);
};

// 视频事件处理
const handleVideoLoaded = () => {
  console.log('[PhotoItem] ✅ 视频加载成功:', props.photo.name);
  imageLoaded.value = true;
  isImageLoading.value = false;
};
const handleVideoError = () => {
  console.error('[PhotoItem] ❌ 视频加载失败:', props.photo.name, '| URL:', mediaSrc.value);
  imageError.value = true;
  isImageLoading.value = false;
  // 通知父组件：轮播模式下可自动跳过
  emit('error', props.photo, props.index);
};

const loadImage = () => {
  // 视频由 <video> 标签自行加载，跳过 Image 预加载
  if (isVideo.value) {
    isImageLoading.value = true;
    return;
  }

  const imageUrl = getMediaSrc(props.photo);

  if (!imageUrl) {
    isImageLoading.value = false;
    imageError.value = true;
    return;
  }

  console.log('[PhotoItem] 加载图片:', props.photo.name, '| URL:', imageUrl);

  // 加载超时保护：15 秒未加载完成则标记为失败，避免永远 loading
  let timeoutId: number | undefined;
  const clearTimeout_ = () => { if (timeoutId) window.clearTimeout(timeoutId); };

  const img = new Image();
  img.onload = () => {
    clearTimeout_();
    console.log('[PhotoItem] ✅ 图片加载成功:', props.photo.name);
    // 浏览器环境加载爱你❤️相册时尺寸未知（width/height=0），用真实尺寸补全
    // 这样 isPortrait/Ken Burns 等依赖 aspectRatio 的逻辑才能正确工作
    if (props.photo.width === 0 || props.photo.height === 0) {
      props.photo.width = img.naturalWidth;
      props.photo.height = img.naturalHeight;
      if (img.naturalHeight > 0) {
        props.photo.aspectRatio = img.naturalWidth / img.naturalHeight;
      }
      console.log('[PhotoItem] 📐 补全尺寸:', props.photo.name, `${img.naturalWidth}x${img.naturalHeight}`, '比例:', props.photo.aspectRatio.toFixed(2));
    }
    imageLoaded.value = true;
    isImageLoading.value = false;
  };
  img.onerror = () => {
    clearTimeout_();
    console.error('[PhotoItem] ❌ 图片加载失败:', props.photo.name, '| URL:', imageUrl);
    imageError.value = true;
    isImageLoading.value = false;
    emit('error', props.photo, props.index);
  };
  img.src = imageUrl;

  timeoutId = window.setTimeout(() => {
    if (isImageLoading.value && !imageLoaded.value && !imageError.value) {
      console.error('[PhotoItem] ⏰ 图片加载超时:', props.photo.name, '| URL:', imageUrl);
      imageError.value = true;
      isImageLoading.value = false;
      emit('error', props.photo, props.index);
    }
  }, 15000);
};

onMounted(() => {
  console.log('[PhotoItem] 初始化:', props.photo.name, '| 类型:', isVideo.value ? '视频' : '图片', '| 尺寸:', props.photo.width, 'x', props.photo.height);
  loadImage();
});
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg cursor-pointer flex items-center justify-center w-full h-full bg-gray-900 group"
    @click="handleClick"
    :style="{
      aspectRatio: isCarouselMode ? 'auto' : `${photo.width} / ${photo.height}`,
    }"
  >
    <!-- 加载状态 -->
    <div v-if="isImageLoading" class="absolute inset-0 flex items-center justify-center bg-gray-800">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
    </div>

    <!-- 加载失败显示占位 -->
    <div v-if="!isImageLoading && imageError" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 gap-2">
      <svg v-if="isVideo" class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
      <svg v-else class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <p class="text-gray-500 text-sm">{{ isVideo ? '视频无法播放（可能格式不支持）' : '图片加载失败' }}</p>
      <p class="text-gray-600 text-xs truncate max-w-full px-4">{{ photo.name }}</p>
    </div>

  <!-- 实际图片 -->
  <img
    v-if="!isVideo && !isImageLoading && !imageError && mediaSrc"
    :src="mediaSrc"
    :alt="photo.name"
    class="absolute inset-0 w-full h-full"
    :class="[
      imageFitClass,
      enableKenBurns ? 'ken-burns-portrait' : '',
      !isPortrait ? (objectPosition.includes('top') ? 'object-top' : 'object-center') : '',
      !isPortrait ? '' : (portraitFitMode === 'cover' ? 'object-top' : '')
    ]"
    :style="mediaStyle"
  />

  <!-- 实际视频：轮播模式静音自动播放，非轮播模式作为静态海报帧 -->
  <video
    v-if="isVideo && !imageError && mediaSrc"
    :src="mediaSrc"
    :poster="photo.thumbnail || undefined"
    :autoplay="isCarouselMode"
    :muted="true"
    :loop="isCarouselMode"
    :controls="false"
    :playsinline="true"
    preload="auto"
    class="absolute inset-0 w-full h-full object-contain"
    :style="mediaStyle"
    @loadeddata="handleVideoLoaded"
    @error="handleVideoError"
  />

  <!-- 编辑效果覆盖层：色温（soft-light）+ 暗角 -->
  <div
    v-if="hasEdit && !imageError && mediaSrc"
    class="absolute inset-0 pointer-events-none"
    style="z-index: 5;"
    :style="temperatureStyle"
  ></div>
  <div
    v-if="hasEdit && !imageError && mediaSrc"
    class="absolute inset-0 pointer-events-none"
    style="z-index: 6;"
    :style="vignetteStyle"
  ></div>

  <!-- 视频角标（左上角，仅视频显示） -->
  <div
    v-if="isVideo && !imageError && mediaSrc && imageLoaded"
    class="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs font-medium z-10"
  >
    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <span>视频</span>
    <span v-if="formattedDuration" class="text-gray-300">· {{ formattedDuration }}</span>
  </div>

  <!-- 悬停信息显示（仅底部文字） -->
  <div
    v-if="!isImageLoading && !imageError && mediaSrc"
    class="lyric-layer absolute inset-0"
    :class="isCarouselMode ? 'is-carousel' : 'is-grid'"
    style="will-change: opacity, transform;"
  >
      <!-- 底部渐变 + 主题话语：预留两行高度并垂直居中，
           这样单行时也居中（两行的表现与之前一致） -->
      <div
        class="absolute bottom-0 left-0 right-0 px-4 py-4 flex items-center justify-center"
        style="min-height: 5.5rem; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);"
      >
        <p class="text-yellow-400 text-lg font-medium italic text-center px-4"
           style="
             text-shadow: 0 0 10px rgba(250, 204, 21, 0.8),
                          0 0 20px rgba(250, 204, 21, 0.6),
                          0 0 30px rgba(250, 204, 21, 0.4);
             letter-spacing: 1px;
           ">
          "{{ getQuote() }}"
        </p>
      </div>

      <!-- 中心播放按钮（仅非轮播模式） -->
      <button
        v-if="!isCarouselMode"
        @click.stop="handlePlay"
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 play-btn"
        style="box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
        :title="isVideo ? '播放视频' : '从这张开始播放'"
      >
        <svg class="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <!-- 非轮播模式：右上角操作区（编辑 + 收藏），同样只在悬停时出现 -->
      <div
        v-if="!isCarouselMode"
        class="absolute top-2 right-2 flex items-center gap-2"
      >
        <button
          @click.stop="openEditor"
          class="edit-btn relative p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          :title="hasEdit ? '已编辑，点击继续调整' : '编辑这张照片'"
        >
          <span v-if="hasEdit" class="edit-dot"></span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          @click.stop="handleFavorite"
          class="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors favorite-btn"
          :title="photo.isFavorite ? '取消收藏' : '收藏'"
        >
          <svg
            class="w-4 h-4"
            :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 轮播模式：悬停时浮出的操作菜单（暂停播放 + 编辑 + 收藏）
         背景自下而上「半透明 → 全透明」，形成一条贴着照片下沿的菜单 -->
    <div
      v-if="isCarouselMode && !isImageLoading && !imageError && mediaSrc"
      class="photo-actions absolute bottom-0 left-0 right-0 flex items-center justify-end gap-3 px-6 py-4 z-20"
    >
      <!-- 暂停 / 继续播放 -->
      <button
        @click.stop="togglePlay"
        class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        style="box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
        :title="playPaused ? '继续播放' : '暂停播放'"
      >
        <svg v-if="playPaused" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        </svg>
        <span class="text-xs font-medium">{{ playPaused ? '继续' : '暂停' }}</span>
      </button>

      <button
        @click.stop="openEditor"
        class="edit-btn relative flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
        style="box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
        :title="hasEdit ? '已编辑，点击继续调整' : '编辑这张照片'"
      >
        <span v-if="hasEdit" class="edit-dot"></span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="text-xs font-medium">编辑</span>
      </button>

      <button
        @click.stop="handleFavorite"
        class="favorite-btn flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        style="box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
        :title="photo.isFavorite ? '取消收藏' : '收藏'"
      >
        <svg
          class="w-5 h-5"
          :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span class="text-xs font-medium">{{ photo.isFavorite ? '已收藏' : '收藏' }}</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
/* Ken Burns 缓慢纵向滑动：竖图在轮播模式下从上往下滑动再回来，
   避免脸部被裁切，同时保留沉浸感。
   scale 放大约 18%，translateY 上下平移约 8%，配合 ease-in-out 循环。 */
/* 轮播悬停操作菜单：默认完全隐藏，悬停时随渐变一起淡入
   提前提升为独立合成层（will-change + translateZ），避免首次悬停时才创建图层造成卡顿 */
.photo-actions {
  opacity: 0;
  pointer-events: none;
  /* 默认藏在照片下沿之外（下滑状态），悬停时上滑进入 */
  transform: translate3d(0, 100%, 0);
  transition: opacity 0.18s ease, transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
  backface-visibility: hidden;
  /* 由下至上：贴着照片下沿最实，向上自然消隐 */
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.82) 0%,
    rgba(0, 0, 0, 0.5) 42%,
    rgba(0, 0, 0, 0.14) 75%,
    rgba(0, 0, 0, 0) 100%
  );
}

.group:hover .photo-actions {
  opacity: 1;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
}

/* 歌词层：幻灯片播放时常显，悬停时下滑退场，离开时上滑回位 */
.lyric-layer {
  transition: opacity 0.26s ease, transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.lyric-layer.is-carousel {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.group:hover .lyric-layer.is-carousel {
  opacity: 0;
  transform: translate3d(0, 26px, 0);
}

/* 网格等模式：仍然悬停才出现，方向同样是自下而上 */
.lyric-layer.is-grid {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  pointer-events: none;
}

.group:hover .lyric-layer.is-grid {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .photo-actions,
  .lyric-layer {
    transition: opacity 0.2s ease;
  }
}

/* 已编辑：只在编辑按钮左上角点一颗状态灯，不改动整个按钮的样式 */
.edit-dot {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow:
    0 0 0 2px rgba(12, 12, 14, 0.75),
    0 0 6px rgba(245, 158, 11, 0.75);
}

/* Ken Burns 缓慢纵向滑动：竖图在轮播模式下从上往下滑动再回来，
   避免脸部被裁切，同时保留沉浸感。
   scale 放大约 18%，translateY 上下平移约 8%，配合 ease-in-out 循环。 */
.ken-burns-portrait {
  animation: kenBurnsPortrait 14s ease-in-out infinite;
  will-change: transform;
}

@keyframes kenBurnsPortrait {
  0% {
    transform: scale(1.18) translateY(-8%);
  }
  50% {
    transform: scale(1.18) translateY(8%);
  }
  100% {
    transform: scale(1.18) translateY(-8%);
  }
}

/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .ken-burns-portrait {
    animation: none;
    transform: scale(1.05);
  }
}
</style>
