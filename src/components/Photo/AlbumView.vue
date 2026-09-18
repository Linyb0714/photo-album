<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAlbumStore } from '@/stores/album';
import { useSettingsStore } from '@/stores/settings';
import { getMediaSrc, isVideoPhoto } from '@/utils/tauriApi';
import type { Photo } from '@/types';
import PhotoItem from './PhotoItem.vue';

const albumStore = useAlbumStore();
const settingsStore = useSettingsStore();

// 当前视图模式
const currentTemplate = computed(() => settingsStore.settings.frameTemplate);
const photos = computed(() => albumStore.currentPhotos);
const currentIndex = computed(() => albumStore.currentIndex);
const isPlaying = computed(() => settingsStore.settings.carousel.enabled);

// 全量预加载：进入相册后预加载所有图片和视频到浏览器缓存
// 避免轮播切换时加载延迟导致动画不流畅
const preloadController = ref<AbortController | null>(null);
const preloadProgress = ref(0);

const preloadAllMedia = (list: typeof photos.value) => {
  if (!list || list.length === 0) return;

  // 取消上一次的预加载
  if (preloadController.value) {
    preloadController.value.abort();
  }
  const controller = new AbortController();
  preloadController.value = controller;

  let completed = 0;
  const total = list.length;
  preloadProgress.value = 0;
  console.log(`[AlbumView] 📦 开始预加载 ${total} 个素材...`);

  const markOne = (name: string, ok: boolean) => {
    completed++;
    preloadProgress.value = Math.round((completed / total) * 100);
    if (ok) {
      console.log(`[AlbumView] ✅ 预加载完成 (${completed}/${total}):`, name);
    } else {
      console.warn(`[AlbumView] ⚠️ 预加载失败 (${completed}/${total}):`, name);
    }
  };

  list.forEach(photo => {
    const src = getMediaSrc(photo as any);
    if (!src) { markOne(photo.name, false); return; }

    if (isVideoPhoto(photo as any)) {
      // 视频：用 fetch 预加载到浏览器缓存
      fetch(src, { method: 'GET', signal: controller.signal })
        .then(res => markOne(photo.name, res.ok))
        .catch(err => markOne(photo.name, err.name !== 'AbortError'));
    } else {
      // 图片：用 Image 对象预加载
      const img = new Image();
      img.onload = () => markOne(photo.name, true);
      img.onerror = () => markOne(photo.name, false);
      img.src = src;
    }
  });
};

// 监听素材列表变化，触发全量预加载（进入相册或切换相册时）
watch(photos, (newList) => {
  preloadAllMedia(newList);
}, { immediate: true });

// 处理喜爱
const handleFavorite = (photo: any, isFavorite: boolean) => {
  albumStore.toggleFavorite(photo.id, isFavorite);
  console.log('[AlbumView] ❤️', isFavorite ? '收藏' : '取消收藏', photo.name);
};

// 从指定照片开始播放
const emit = defineEmits<{
  (e: 'edit', photo: Photo): void;
}>();

// 点击照片 → 打开编辑器（原图不会被修改，只保存编辑参数）
const handleEdit = (photo: any) => {
  emit('edit', photo);
};

const handlePlay = (_photo: any, index: number) => {
  albumStore.setCurrentIndex(index);
  settingsStore.updateCarousel({ enabled: true });
  console.log('[AlbumView] ▶️ 从第', index + 1, '张开始播放');
};

// 媒体加载失败：轮播模式下自动跳到下一张，避免卡死
const handleError = (_photo: any, _index: number) => {
  console.warn('[AlbumView] ⚠️ 媒体加载失败，当前轮播:', isPlaying.value);
  if (isPlaying.value && photos.value.length > 1) {
    // 短暂延迟后自动跳到下一张
    window.setTimeout(() => {
      console.log('[AlbumView] ⏭️ 自动跳到下一张');
      nextPhoto();
    }, 800);
  }
};

// 轮播相关
const carouselTimer = ref<number | null>(null);
const idleTimer = ref<number | null>(null);
const lastActivityTime = ref(Date.now());

// 停止轮播计时（唯一入口，任何切换前都必须先清掉旧的，避免两套计时并存）
const stopCarousel = () => {
  if (carouselTimer.value !== null) {
    clearTimeout(carouselTimer.value);
    carouselTimer.value = null;
  }
};

/**
 * 重排下一张的计时：先清掉当前定时器，再按最新间隔重新排一个。
 * 所有会改变计时状态的入口（开始播放、切图、改间隔、悬停恢复）都走这里。
 */
const scheduleNext = () => {
  stopCarousel();
  if (!settingsStore.settings.carousel.enabled) return;
  if (settingsStore.carouselStopped) return; // 手动暂停或菜单/编辑器等界面打开时挂起
  if (isHoverPaused.value) return; // 悬停暂停期间不排队，恢复时再重排
  carouselTimer.value = window.setTimeout(() => {
    nextPhoto();
  }, settingsStore.settings.carousel.interval);
};

// 切换下一张并重置计时器（用 setTimeout 而非 setInterval，避免累积误差）
const nextPhoto = () => {
  albumStore.nextPhoto();
  scheduleNext();
};

// 切换上一张并重置计时器
const prevPhoto = () => {
  albumStore.prevPhoto();
  scheduleNext();
};

// 悬停暂停：鼠标在幻灯片上移动时暂停倒计时；
// 指针停住 2.5 秒或移出画面后自动恢复，避免光标恰好停在画面上导致永远不切换
const HOVER_IDLE_MS = 2500;
const isHoverPaused = ref(false);
let hoverIdleTimer: number | null = null;

const clearHoverIdle = () => {
  if (hoverIdleTimer !== null) {
    clearTimeout(hoverIdleTimer);
    hoverIdleTimer = null;
  }
};

const pauseByHover = () => {
  if (!isPlaying.value) return;
  if (!isHoverPaused.value) {
    isHoverPaused.value = true;
    stopCarousel();
  }
  clearHoverIdle();
  hoverIdleTimer = window.setTimeout(() => {
    hoverIdleTimer = null;
    resumeByHover();
  }, HOVER_IDLE_MS);
};

const resumeByHover = () => {
  clearHoverIdle();
  if (!isHoverPaused.value) return;
  isHoverPaused.value = false;
  scheduleNext();
};

// 监听轮播开关
watch(isPlaying, (newVal) => {
  if (newVal) {
    scheduleNext();
  } else {
    stopCarousel();
  }
}, { immediate: true });

// 监听间隔变化：直接重排，旧定时器在 scheduleNext 里被清掉，不会出现两套计时
watch(() => settingsStore.settings.carousel.interval, () => {
  if (settingsStore.settings.carousel.enabled) {
    scheduleNext();
  }
});

// 监听暂停状态：手动暂停、或菜单/编辑器/相册管理打开时停止计时，恢复后继续播放
watch(() => settingsStore.carouselStopped, (paused) => {
  if (paused) {
    stopCarousel();
  } else if (settingsStore.settings.carousel.enabled) {
    scheduleNext();
  }
});

// 闲置检测
const resetIdleTimer = () => {
  lastActivityTime.value = Date.now();
  
  if (idleTimer.value) {
    clearTimeout(idleTimer.value);
  }
  
  idleTimer.value = window.setTimeout(() => {
    // 30 秒无操作后检查是否应该自动播放
    const idleTime = Date.now() - lastActivityTime.value;
    if (idleTime > 30000 && !isPlaying.value && photos.value.length > 1) {
      // 显示提示
      console.log('[AlbumView] 闲置 30 秒，准备自动播放');
    }
  }, 30000);
};

// 监听用户活动
const handleActivity = () => {
  resetIdleTimer();
};

onMounted(() => {
  window.addEventListener('click', handleActivity);
  window.addEventListener('mousemove', handleActivity);
  window.addEventListener('keydown', handleActivity);
  resetIdleTimer();
});

onUnmounted(() => {
  window.removeEventListener('click', handleActivity);
  window.removeEventListener('mousemove', handleActivity);
  window.removeEventListener('keydown', handleActivity);
  clearHoverIdle();
  stopCarousel();
  if (idleTimer.value) {
    clearTimeout(idleTimer.value);
  }
  // 取消未完成的视频预加载
  if (preloadController.value) {
    preloadController.value.abort();
    preloadController.value = null;
  }
});
</script>

<template>
  <div class="w-full h-full relative">
    <!-- 轮播模式：图片居中 + 底部进度轴（与标题栏等高 8px） -->
    <div
      v-if="isPlaying"
      class="w-full h-full flex flex-col"
      @mousemove="pauseByHover"
      @mouseleave="resumeByHover"
    >
      <!-- 中间：图片展示区（顶到留白，四周不再留黑边） -->
      <div class="flex-1 flex items-center justify-center relative group overflow-hidden">
        <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
          <!-- 预加载进度提示 -->
          <div
            v-if="preloadProgress < 100"
            class="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/80 text-xs font-medium"
          >
            预加载 {{ preloadProgress }}%
          </div>

          <!-- 轮播过渡：根据设置动态切换动画类型 -->
          <Transition :name="`carousel-${settingsStore.settings.carousel.animation}`">
            <PhotoItem
              v-if="photos[currentIndex]"
              :key="currentIndex"
              :photo="photos[currentIndex]"
              :index="currentIndex"
              :isCarouselMode="true"
              class="absolute inset-0"
              @favorite="handleFavorite" @edit="handleEdit"
              @error="handleError"
            />
          </Transition>
        </div>
        
        <!-- 悬停控制按钮：鼠标悬停时显示
             注意：容器必须一直是 pointer-events-none，否则会盖住整张图，
             导致点击图片无法进入编辑（只有按钮本身接收点击） -->
        <div class="absolute inset-0 flex items-center justify-between px-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style="will-change: opacity;">
          <!-- 上一张按钮 -->
          <button 
            @click.stop="prevPhoto"
            class="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 hover:shadow-lg z-30 pointer-events-none group-hover:pointer-events-auto"
            style="box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
            title="上一张"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <!-- 下一张按钮 -->
          <button 
            @click.stop="nextPhoto"
            class="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 hover:shadow-lg z-30 pointer-events-none group-hover:pointer-events-auto"
            style="box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
            title="下一张"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 底部：半透明信息条（作者 / 进度轴 / 序号） -->
      <div class="flex-shrink-0 h-9 flex items-center justify-between px-6 bg-black/45 backdrop-blur-[2px] border-t border-white/5">
        <!-- 左侧：作者与版本信息（默认显示） -->
        <div class="text-white/70 text-xs font-medium flex-shrink-0">
          By Lin | v1.0.0
        </div>
        
        <!-- 中间：进度条（宽度 50-60%） -->
        <div class="flex-1 mx-4 flex items-center justify-center">
          <div class="w-1/2 flex items-center gap-2">
            <!-- 进度条容器：天际线呼吸灯风格 -->
            <div class="flex-1 h-1 bg-gray-800/60 rounded-full overflow-hidden relative"
                 style="box-shadow: inset 0 0 2px rgba(0,0,0,0.6);">
              <!-- 背景轨道：天际线效果 -->
              <div class="absolute inset-0 flex items-center justify-center gap-[2px]">
                <template v-for="i in 20" :key="'bg-' + i">
                  <div class="flex-1 h-0.5 bg-gray-600/60 rounded-full"
                       :style="{ opacity: 0.5 }"></div>
                </template>
              </div>
              
              <!-- 进度条：纯色透明化 + 呼吸效果 -->
              <div 
                class="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                :style="{ 
                  width: `${((currentIndex + 1) / photos.length) * 100}%`,
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 0 4px rgba(255,255,255,0.6), 0 0 8px rgba(255,255,255,0.4)',
                  animation: 'skyline-breathe 2s ease-in-out infinite'
                }"
              ></div>
            </div>
          </div>
        </div>
        
        <!-- 右侧：序号（默认显示） -->
        <div class="text-white/70 text-xs whitespace-nowrap font-medium flex-shrink-0" style="min-width: 45px; text-align: right;">
          {{ currentIndex + 1 }}/{{ photos.length }}
        </div>
      </div>
    </div>

    <!-- 网格模式 -->
    <div v-else-if="currentTemplate === 'grid'" class="p-6 h-full flex flex-col">
      <div class="grid grid-cols-3 gap-4 flex-1 overflow-y-auto">
        <div 
          v-for="(photo, index) in photos" 
          :key="photo.id"
          class="relative h-full"
        >
          <PhotoItem
            :photo="photo"
            :index="index"
            @favorite="handleFavorite" @edit="handleEdit"
            @play="handlePlay"
            @error="handleError"
          />
        </div>
      </div>
    </div>

    <!-- 瀑布流模式 -->
    <div v-else-if="currentTemplate === 'masonry'" class="p-6 h-full overflow-auto">
      <div class="columns-3 gap-4 space-x-4">
        <div
          v-for="(photo, index) in photos"
          :key="photo.id"
          class="inline-block break-inside-avoid mb-4"
        >
          <PhotoItem
            :photo="photo"
            :index="index"
            @favorite="handleFavorite" @edit="handleEdit"
            @play="handlePlay"
            @error="handleError"
          />
        </div>
      </div>
    </div>

    <!-- 拼贴模式 -->
    <div v-else-if="currentTemplate === 'collage'" class="p-6 h-full flex items-center justify-center overflow-auto">
      <div class="relative w-full max-w-6xl aspect-video bg-gray-900/50 rounded-lg p-4">
        <div class="grid grid-cols-4 grid-rows-3 gap-2 h-full">
          <div 
            v-for="(photo, index) in photos.slice(0, 12)" 
            :key="photo.id"
            class="relative rounded overflow-hidden"
            :class="{
              'col-span-2 row-span-2': index === 0,
              'col-span-2': [1, 5, 9].includes(index),
              'row-span-2': [2, 6, 10].includes(index),
            }"
          >
            <PhotoItem
              :photo="photo"
              :index="index"
              @favorite="handleFavorite" @edit="handleEdit"
              @play="handlePlay"
            @error="handleError"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 时间轴模式 -->
    <div v-else-if="currentTemplate === 'timeline'" class="p-6 h-full overflow-auto">
      <div class="max-w-4xl mx-auto">
        <div class="relative">
          <!-- 时间轴线 -->
          <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-500/50 -translate-x-1/2"></div>
          
          <!-- 照片列表 -->
          <div class="space-y-8">
            <div 
              v-for="(photo, index) in photos" 
              :key="photo.id"
              class="relative flex items-center"
              :class="index % 2 === 0 ? 'justify-start' : 'justify-end'"
            >
              <div 
                class="w-1/3 p-2"
                :class="index % 2 === 0 ? 'text-right' : 'text-left'"
              >
                <div class="text-white/60 text-sm mb-2">
                  {{ new Date(photo.createdAt).toLocaleDateString('zh-CN') }}
                </div>
              </div>
              
              <div class="w-1/3 flex justify-center">
                <div class="relative w-64 rounded-lg overflow-hidden shadow-lg">
                  <PhotoItem
                    :photo="photo"
                    :index="index"
                    @favorite="handleFavorite" @edit="handleEdit"
                    @play="handlePlay"
            @error="handleError"
                  />
                </div>
              </div>
              
              <div class="w-1/3"></div>
              
              <!-- 时间轴点 -->
              <div class="absolute left-1/2 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 border-2 border-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 画廊模式 -->
    <div v-else-if="currentTemplate === 'gallery'" class="p-6 h-full flex flex-col">
      <!-- 主展示区 -->
      <div class="flex-1 flex items-center justify-center mb-4">
        <div class="relative w-full max-w-5xl aspect-video rounded-lg overflow-hidden shadow-2xl">
          <PhotoItem
            v-if="photos.length > 0"
            :photo="photos[0]"
            :index="0"
            @favorite="handleFavorite" @edit="handleEdit"
            @play="handlePlay"
            @error="handleError"
          />
        </div>
      </div>
      
      <!-- 缩略图列表 -->
      <div class="h-32 flex gap-3 overflow-x-auto pb-2">
        <div 
          v-for="(photo, index) in photos" 
          :key="photo.id"
          class="flex-shrink-0 w-40 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          :class="index === 0 ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'"
        >
          <PhotoItem
            :photo="photo"
            :index="index"
            @favorite="handleFavorite" @edit="handleEdit"
            @play="handlePlay"
            @error="handleError"
          />
        </div>
      </div>
    </div>

    <!-- 杂志模式 -->
    <div v-else-if="currentTemplate === 'magazine'" class="p-6 h-full overflow-auto">
      <div class="max-w-6xl mx-auto">
        <!-- 封面大图 -->
        <div v-if="photos.length > 0" class="mb-6 rounded-xl overflow-hidden shadow-2xl">
          <PhotoItem
            :photo="photos[0]"
            :index="0"
            @favorite="handleFavorite" @edit="handleEdit"
            @play="handlePlay"
            @error="handleError"
          />
        </div>

        <!-- 内容网格 -->
        <div class="grid grid-cols-2 gap-6">
          <div
            v-for="(photo, index) in photos.slice(1)"
            :key="photo.id"
            class="rounded-lg overflow-hidden shadow-lg"
            :class="index % 4 === 0 ? 'row-span-2' : ''"
          >
            <PhotoItem
              :photo="photo"
              :index="index + 1"
              @favorite="handleFavorite" @edit="handleEdit"
              @play="handlePlay"
            @error="handleError"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="photos.length === 0" class="flex items-center justify-center h-full">
      <div class="text-center text-gray-500">
        <p class="text-lg mb-2">暂无照片</p>
        <p class="text-sm">点击"相册管理"添加照片</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 天际线呼吸灯动画 */
@keyframes skyline-breathe {
  0%, 100% {
    opacity: 0.6;
    box-shadow: 0 0 2px rgba(255,255,255,0.4), 0 0 4px rgba(255,255,255,0.3);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.6);
  }
}

/* 轮播交叉过渡：仅用 opacity + transform（GPU 合成层，流畅不卡顿）。
   去掉 blur（GPU 高开销，是卡顿主因）。时长 0.6s，更利落明显。
   新旧图片同时进出（默认 mode），绝对定位重叠实现交叉效果。 */
.carousel-fade-enter-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.carousel-fade-leave-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
/* 新图：从轻微放大 淡入到正常 */
.carousel-fade-enter-from {
  opacity: 0;
  transform: scale(1.06);
}
.carousel-fade-enter-to {
  opacity: 1;
  transform: scale(1);
}
/* 旧图：从正常 淡出到轻微缩小 */
.carousel-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}
.carousel-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* 滑动切换：新图从右侧滑入，旧图向左侧滑出 */
.carousel-slide-enter-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.carousel-slide-leave-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.carousel-slide-enter-from {
  opacity: 0;
  transform: translateX(8%);
}
.carousel-slide-enter-to {
  opacity: 1;
  transform: translateX(0);
}
.carousel-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
.carousel-slide-leave-to {
  opacity: 0;
  transform: translateX(-8%);
}

/* 缩放切换：新图从放大淡入到正常，旧图缩小淡出 */
.carousel-zoom-enter-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.carousel-zoom-leave-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.carousel-zoom-enter-from {
  opacity: 0;
  transform: scale(1.25);
}
.carousel-zoom-enter-to {
  opacity: 1;
  transform: scale(1);
}
.carousel-zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}
.carousel-zoom-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* 立方体切换：新图从右侧旋转进入，旧图向左侧旋转离开（3D 透视） */
.carousel-cube-enter-active,
.carousel-cube-leave-active {
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  will-change: transform, opacity;
}
.carousel-cube-enter-from {
  opacity: 0;
  transform: rotateY(90deg) translateZ(50px);
}
.carousel-cube-enter-to {
  opacity: 1;
  transform: rotateY(0) translateZ(0);
}
.carousel-cube-leave-from {
  opacity: 1;
  transform: rotateY(0) translateZ(0);
}
.carousel-cube-leave-to {
  opacity: 0;
  transform: rotateY(-90deg) translateZ(50px);
}

/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .carousel-fade-enter-active,
  .carousel-fade-leave-active,
  .carousel-slide-enter-active,
  .carousel-slide-leave-active,
  .carousel-zoom-enter-active,
  .carousel-zoom-leave-active,
  .carousel-cube-enter-active,
  .carousel-cube-leave-active {
    transition: opacity 0.3s ease;
  }
  .carousel-fade-enter-from,
  .carousel-fade-leave-to,
  .carousel-slide-enter-from,
  .carousel-slide-leave-to,
  .carousel-zoom-enter-from,
  .carousel-zoom-leave-to,
  .carousel-cube-enter-from,
  .carousel-cube-leave-to {
    transform: none;
  }
}
</style>
