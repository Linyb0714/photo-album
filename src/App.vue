<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAlbumStore } from '@/stores/album';
import { useSettingsStore } from '@/stores/settings';
import { selectFolder, readFolder, readMyLoveAlbum, readMyLoveAlbumWeb } from '@/utils/tauriApi';
import { loadState, debouncedSave, type PersistedState } from '@/utils/persistence';
import { applyPresetToWindow } from '@/utils/windowSize';
import type { Photo, Album } from '@/types';
import { initializeDefaultAlbum } from '@/data/jayChouAlbum';
import MainMenu from '@/components/Menu/MainMenu.vue';
import PhotoGrid from '@/components/Photo/PhotoGrid.vue';
import AlbumManager from '@/components/Album/AlbumManager.vue';
import AppFrame from '@/components/Frame/AppFrame.vue';
import PhotoEditor from '@/components/Editor/PhotoEditor.vue';
import WeatherIcon from '@/components/common/WeatherIcon.vue';
import { getWeather, loadCachedWeather, type WeatherInfo } from '@/utils/weather';

// 扩展 Window 类型
declare global {
  interface Window {
    __TAURI__?: any;
    handleAddPhoto?: () => void;
  }
}

const albumStore = useAlbumStore();
const settingsStore = useSettingsStore();

const menuTimer = ref<number | null>(null);
const menuRemaining = ref(15); // 菜单自动关闭剩余秒数（供底部倒计时显示）
const photosLoaded = ref(false);

// 读取菜单自动关闭时长（毫秒），最小 15 秒
const getMenuAutoCloseTime = (): number => {
  const t = settingsStore.settings.menuAutoCloseTime || 15000;
  return Math.max(15000, t);
};
const isLoading = ref(false);
const errorMessage = ref('');
// 相框外观风格（持久化在 settings store，与设置面板中的"相框风格"联动）
const frameStyle = computed({
  get: () => settingsStore.settings.frameStyle,
  set: (value: 'wood' | 'metal' | 'minimal') => settingsStore.setFrameStyle(value),
});
const showAlbumManager = ref(false);

// 图片编辑器：当前正在编辑的照片（null = 关闭）
const editingPhoto = ref<Photo | null>(null);

// 任一界面（菜单 / 编辑器 / 相册管理）打开时挂起轮播，全部关闭后继续播放
const shouldHoldCarousel = computed(() =>
  settingsStore.menuState.visible || !!editingPhoto.value || showAlbumManager.value
);
watch(shouldHoldCarousel, (hold) => {
  if (hold) {
    settingsStore.holdCarousel();
    console.log('[App] ⏸️ 轮播已挂起（菜单/编辑器/相册管理打开）');
  } else {
    settingsStore.releaseCarousel();
    console.log('[App] ▶️ 轮播已恢复');
  }
});

// 当前显示的图片（根据方向过滤）
const photos = computed(() => {
  const allPhotos = albumStore.currentPhotos;
  
  // 应用方向过滤
  const orientation = settingsStore.settings.orientation;
  if (orientation === 'landscape') {
    return allPhotos.filter(p => p.aspectRatio >= 1);
  } else if (orientation === 'portrait') {
    return allPhotos.filter(p => p.aspectRatio < 1);
  }
  
  return allPhotos;
});

const orientationLabels = {
  auto: '自动',
  landscape: '横向',
  portrait: '纵向'
};

// 当前时间
const currentTime = ref(new Date());
const updateTime = () => {
  currentTime.value = new Date();
};

// 天气（联网获取，失败/离线则沿用上次缓存；30 分钟刷新一次）
const weather = ref<WeatherInfo | null>(loadCachedWeather());
let weatherTimer: number | null = null;

const refreshWeather = async () => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const info = await getWeather();
  if (info) weather.value = info;
};

// 悬停显示完整位置 + 天气
const weatherTooltip = computed(() => {
  const w = weather.value;
  if (!w) return '';
  const place = [w.region, w.city, w.area].filter(Boolean).join(' ');
  return `${place ? place + ' · ' : ''}${w.label} ${w.temp}°`;
});

// 持久化：收集 store 数据并防抖保存
let isHydrated = false;

function triggerSave() {
  if (!isHydrated) return;
  const state: PersistedState = {
    version: 1,
    settings: settingsStore.settings,
    album: {
      photos: albumStore.photos,
      albums: albumStore.albums,
      currentAlbumId: albumStore.currentAlbumId,
      edits: albumStore.edits,
    },
  };
  debouncedSave(state);
}

// 自动保存监听（放在 setup 顶层，避免 onMounted 异步作用域问题）
watch(
  () => settingsStore.settings,
  () => triggerSave(),
  { deep: true }
);
watch(
  () => [albumStore.photos, albumStore.albums, albumStore.currentAlbumId, albumStore.edits],
  () => triggerSave(),
  { deep: true }
);

// 锁定状态下切换相框风格：边框厚度变了（木质 124 / 杰伦 112 / 纯白 76），
// 同样的窗口尺寸会得出不同的内容区比例，所以按新内缩重算一次窗口尺寸
watch(
  () => settingsStore.settings.frameStyle,
  async (style) => {
    const { presetId, orientation, lockAspect } = settingsStore.settings.frameSize;
    if (!lockAspect || !presetId) return;
    await applyPresetToWindow(presetId, orientation, style);
  }
);

onMounted(async () => {
  updateTime();
  setInterval(updateTime, 1000);

  // 天气：启动取一次，之后每 30 分钟刷新
  refreshWeather();
  weatherTimer = window.setInterval(refreshWeather, 30 * 60 * 1000);
  window.addEventListener('online', refreshWeather);

  // 检测是否在 Tauri 环境中运行
  const isTauriEnv = '__TAURI__' in window;
  console.log('运行环境:', isTauriEnv ? 'Tauri 桌面应用' : 'Web 浏览器');

  // 1. 尝试恢复持久化数据（保留收藏、自定义相册等状态）
  const persisted = await loadState();
  if (persisted && persisted.album && persisted.album.photos.length > 0) {
    console.log('[App] 💾 恢复持久化数据...');
    albumStore.hydrate(persisted.album); // 内含 edits（照片编辑参数）
    if (persisted.settings) {
      settingsStore.hydrate(persisted.settings);
    }
    console.log('[App] ✅ 持久化数据已恢复：', albumStore.photos.length, '张照片,', albumStore.albums.length, '个相册');
  } else {
    // 没有持久化数据，走完整初始化流程
    if (isTauriEnv) {
      await loadSystemFolders();
    } else {
      const { album, photos: defaultPhotos } = initializeDefaultAlbum();
      albumStore.createAlbum(album);
      albumStore.clearPhotos();
      defaultPhotos.forEach(photo => {
        albumStore.addPhoto(photo as any);
      });
      console.log(`[App] 🎵 已加载默认相册：${album.name} (${defaultPhotos.length}张照片)`);
    }
  }

  // 2. 启用自动保存（后续扫描产生的变更会被持久化）
  isHydrated = true;

  // 2.5 恢复上次选的相框尺寸（相框即窗口边界）。
  //     必须放在这里而不是 AppFrame 的 onMounted：子组件的 onMounted 早于 hydrate，
  //     那时读不到持久化的 presetId。
  const savedFrameSize = settingsStore.settings.frameSize;
  if (isTauriEnv && savedFrameSize.presetId) {
    console.log('[App] 📐 恢复相框尺寸:', savedFrameSize.presetId, savedFrameSize.orientation);
    await applyPresetToWindow(
      savedFrameSize.presetId,
      savedFrameSize.orientation,
      settingsStore.settings.frameStyle,
    );
  }

  // 3. 确保【爱你❤️】默认相册存在（持久化数据里可能没有，需要补充扫描）
  //    Tauri 环境用后端扫描目录，浏览器环境用 manifest.json
  //    两种环境都能看到"爱你❤️"相册
  await ensureLoveAlbum();

  // 3.5 兜底：确保周杰伦精选默认相册存在（爱你❤️扫描失败时至少有内容可看）
  const jayAlbumExisting = albumStore.albums.find(a => a.id === 'jay-chou-default');
  if (!jayAlbumExisting || jayAlbumExisting.photoIds.length === 0) {
    console.log('[App] 🎵 补充加载周杰伦精选默认相册...');
    const { album: jayAlbum, photos: jayPhotos } = initializeDefaultAlbum();
    if (!jayAlbumExisting) {
      albumStore.createAlbum(jayAlbum);
    }
    const targetAlbumId = 'jay-chou-default';
    jayPhotos.forEach(photo => {
      // 避免重复添加
      if (!albumStore.photos.find(p => p.id === photo.id)) {
        albumStore.addPhoto(photo as any);
      }
    });
    // 重建 photoIds 关联
    const jayAlbumObj = albumStore.albums.find(a => a.id === targetAlbumId);
    if (jayAlbumObj) {
      jayAlbumObj.photoIds = jayPhotos.map(p => p.id);
    }
    console.log(`[App] 🎵 周杰伦精选相册已就绪：${jayPhotos.length} 张照片`);
  }

  // 4. 默认切换到【爱你❤️】相册（如果有照片），让用户进入应用就能看到
  const loveAlbum = albumStore.albums.find(a => a.id === 'love-default');
  if (loveAlbum && loveAlbum.photoIds.length > 0) {
    albumStore.setCurrentAlbum('love-default');
  } else {
    // 没有爱你❤️相册，切到周杰伦精选
    const jayAlbum = albumStore.albums.find(a => a.id === 'jay-chou-default');
    if (jayAlbum) {
      albumStore.setCurrentAlbum('jay-chou-default');
    }
  }

  // 5. 确保从第一张开始并自动播放幻灯片
  albumStore.resetIndex();
  if (!settingsStore.settings.carousel.enabled) {
    settingsStore.updateCarousel({ enabled: true });
  }

  photosLoaded.value = true;
  console.log('照片已加载，数量:', albumStore.photos.length, '| 当前相册:', albumStore.currentAlbum?.name);

  // 监听用户操作，重置菜单计时器
  window.addEventListener('click', handleUserInteraction);
  window.addEventListener('mousemove', handleUserInteraction);
  window.addEventListener('keydown', handleUserInteraction);

  // 只监听 ESC 键
  document.addEventListener('keydown', handleKeyDown);

  // 点击空白区域关闭菜单
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  if (weatherTimer !== null) clearInterval(weatherTimer);
  window.removeEventListener('online', refreshWeather);
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('click', handleUserInteraction);
  window.removeEventListener('mousemove', handleUserInteraction);
  window.removeEventListener('keydown', handleUserInteraction);
  document.removeEventListener('click', handleDocumentClick);
  if (menuTimer.value) {
    clearTimeout(menuTimer.value);
  }
});

const loadSystemFolders = async () => {
  // 仅在完全没有持久化数据时作为兜底初始化
  isLoading.value = true;
  errorMessage.value = '';

  try {
    // 加载周杰伦精选默认相册（作为兜底默认相册）
    const { album: jayAlbum, photos: jayPhotos } = initializeDefaultAlbum();
    albumStore.clearPhotos();
    albumStore.createAlbum(jayAlbum);
    jayPhotos.forEach(photo => {
      albumStore.addPhoto(photo as any);
    });

    photosLoaded.value = true;
  } catch (error) {
    console.error('初始化默认相册失败:', error);
    photosLoaded.value = true;
  } finally {
    isLoading.value = false;
  }
};

/**
 * 确保【爱你❤️】默认相册存在且照片路径有效
 * - 若已存在：重新扫描并同步照片（保留收藏状态，更新路径）
 * - 若不存在：创建并扫描
 * - 同时支持图片和视频素材
 * - 任何异常都不阻断应用初始化，失败时降级到周杰伦精选相册
 */
const ensureLoveAlbum = async () => {
  console.log('[App] ❤️ 扫描"爱你❤️"相册...');
  try {
    // 根据环境选择加载方式：Tauri 用后端扫描，浏览器用 manifest.json
    const isTauriEnv = '__TAURI__' in window;
    const loveResult = isTauriEnv
      ? await readMyLoveAlbum()
      : await readMyLoveAlbumWeb();
    if (!loveResult || loveResult.photos.length === 0) {
      console.warn('[App] ⚠️ 未找到"爱你❤️"相册素材，请将照片/视频放入 public/my-love 目录');
      return;
    }

    const { folder, photos } = loveResult;
    const videoCount = photos.filter(p => p.media_type === 'video').length;
    const imageCount = photos.length - videoCount;

    // 将 Rust 返回的 PhotoInfo 转换为前端 Photo 类型
    const mappedPhotos: Photo[] = photos.map(photo => ({
      id: photo.id,
      path: photo.path,
      name: photo.name,
      width: photo.width,
      height: photo.height,
      aspectRatio: photo.aspect_ratio,
      createdAt: new Date(photo.created_at),
      thumbnail: photo.thumbnail,
      mediaType: photo.media_type as 'image' | 'video',
      duration: photo.duration,
      albumIds: ['love-default'],
    } as any));

    const existing = albumStore.albums.find(a => a.id === 'love-default');
    if (existing) {
      // 已存在：同步照片（保留收藏状态，更新路径）
      existing.path = folder.path;
      existing.updatedAt = new Date();
      albumStore.syncAlbumPhotos('love-default', mappedPhotos);
      console.log(`[App] ❤️ 已同步"爱你❤️"相册：共 ${photos.length} 个素材（图片 ${imageCount}，视频 ${videoCount}）`);
    } else {
      // 不存在：创建相册
      const loveAlbum: Album = {
        id: 'love-default',
        name: '爱你❤️',
        description: '记录我们的每一帧心动时光',
        type: 'folder',
        path: folder.path,
        photoIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true,
      };
      albumStore.createAlbum(loveAlbum);
      mappedPhotos.forEach(photo => {
        albumStore.addPhoto(photo);
      });
      console.log(`[App] ❤️ 已创建"爱你❤️"相册：共 ${photos.length} 个素材（图片 ${imageCount}，视频 ${videoCount}）`);
    }
  } catch (error) {
    // 不阻断初始化：爱你❤️扫描失败时仍让应用可用（降级到周杰伦精选）
    console.error('[App] ❌ "爱你❤️"相册扫描失败，降级使用默认相册:', error);
  }
};

const loadFolder = async () => {
  console.log('[App] 📁 开始加载本地文件夹...');
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    console.log('[App] 📂 调用 selectFolder API...');
    const folderPath = await selectFolder();
    
    if (!folderPath) {
      console.log('[App] ❌ 用户取消选择或选择失败');
      isLoading.value = false;
      return;
    }
    
    console.log('[App] ✅ 选中文件夹:', folderPath);
    console.log('[App] 📖 开始读取文件夹内容...');
    const photos = await readFolder(folderPath);
    
    console.log('[App] 📊 读取到', photos.length, '张照片');
    
    if (photos.length > 0) {
      console.log('[App] 🗑️ 清空当前相册数据');
      // 清空当前相册
      albumStore.$patch({ photos: [], albums: [] });
      
      console.log('[App] ➕ 添加照片到相册...');
      photos.forEach((photo, index) => {
        console.log(`[App]   [${index + 1}/${photos.length}] ${photo.name} (${photo.width}x${photo.height})`);
        albumStore.addPhoto({
          ...photo,
          aspectRatio: photo.aspect_ratio,
          createdAt: new Date(photo.created_at),
          mediaType: photo.media_type,
          duration: photo.duration,
        });
      });
      
      photosLoaded.value = true;
      console.log('[App] ✅ 文件夹加载完成，共', photos.length, '张照片');
    } else {
      console.warn('[App] ⚠️ 文件夹中没有找到照片');
      errorMessage.value = '该文件夹中没有找到照片';
    }
  } catch (error) {
    console.error('[App] 💥 加载文件夹失败:', error);
    errorMessage.value = '加载失败，请重试';
  } finally {
    isLoading.value = false;
    console.log('[App] 🏁 loadFolder 完成');
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && settingsStore.menuState.visible) {
    hideMenu();
  }
};

// 点击空白区域关闭菜单（但不用于打开菜单）
const handleDocumentClick = (e: MouseEvent) => {
  if (!settingsStore.menuState.visible) return;
  
  // 检查点击的是否是菜单内部或标题栏
  const target = e.target as HTMLElement;
  const isMenuOrTitle = target.closest('[data-menu]') || 
                        target.closest('[data-title-bar]') ||
                        target.closest('[data-menu-trigger]');
  
  console.log('[App] 点击检测:', {
    visible: settingsStore.menuState.visible,
    isMenuOrTitle,
    target: target.tagName,
    class: target.className
  });
  
  if (!isMenuOrTitle) {
    console.log('[App] 点击空白区域，关闭菜单');
    hideMenu();
  }
};

const showMenu = (position: 'left' | 'right') => {
  settingsStore.showMenu(position);
  
  // 清除之前的计时器
  if (menuTimer.value) {
    clearTimeout(menuTimer.value);
    menuTimer.value = null;
  }
  
  startMenuCountdown();
};

const hideMenu = () => {
  settingsStore.hideMenu();
  if (menuTimer.value) {
    clearTimeout(menuTimer.value);
    menuTimer.value = null;
  }
  menuRemaining.value = getMenuAutoCloseTime() / 1000;
};

const toggleMenu = () => {
  if (settingsStore.menuState.visible) {
    hideMenu();
  } else {
    // 从左侧弹出
    showMenu('left');
  }
};

// 重置菜单自动关闭计时器
const resetMenuTimer = () => {
  if (menuTimer.value) {
    clearTimeout(menuTimer.value);
    menuTimer.value = null;
  }
  
  // 菜单还显示时重新开始倒计时
  if (settingsStore.menuState.visible) {
    startMenuCountdown();
  }
};

// 启动菜单自动关闭倒计时（含剩余秒数递减，供底部进度条同步）
const startMenuCountdown = () => {
  const total = getMenuAutoCloseTime();
  menuRemaining.value = total / 1000;
  const tick = 1000;
  const startAt = Date.now();
  menuTimer.value = window.setInterval(() => {
    const elapsed = Date.now() - startAt;
    const remainMs = total - elapsed;
    if (remainMs <= 0) {
      if (menuTimer.value) {
        clearInterval(menuTimer.value);
        menuTimer.value = null;
      }
      menuRemaining.value = 0;
      if (settingsStore.menuState.visible) {
        hideMenu();
      }
    } else {
      menuRemaining.value = Math.ceil(remainMs / 1000);
    }
  }, tick);
};

// 监听用户操作，重置菜单计时器
const handleUserInteraction = (e?: Event) => {
  if (!settingsStore.menuState.visible) return;
  
  // 如果是点击事件，检查是否在菜单内部
  if (e && e.type === 'click') {
    const target = e.target as HTMLElement;
    const isMenuOrTitle = target.closest('[data-menu]') || 
                          target.closest('[data-title-bar]') ||
                          target.closest('[data-menu-trigger]');
    
    // 菜单内部点击不重置计时器（由 handleDocumentClick 处理关闭）
    if (isMenuOrTitle) {
      return;
    }
  }
  
  resetMenuTimer();
};

const toggleCarousel = () => {
  const isEnabled = !settingsStore.settings.carousel.enabled;
  settingsStore.updateCarousel({ enabled: isEnabled });
  
  // 如果启动轮播，重置到第一张照片
  if (isEnabled) {
    albumStore.resetIndex();
    console.log('[App] 🎬 开始播放当前相册');
  } else {
    console.log('[App] ⏸️ 暂停轮播');
  }
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const toggleOrientation = () => {
  settingsStore.toggleOrientation();
};

const handleAlbumAddPhoto = (photo: Photo) => {
  console.log('相册管理中添加照片:', photo.name);
  // 刷新照片列表
  loadFolder();
};

const handleAlbumRemovePhoto = (photoId: string) => {
  console.log('相册管理中删除照片:', photoId);
  // 刷新照片列表
  loadFolder();
};

// 播放相册
const handlePlayAlbum = () => {
  console.log('[App] 播放当前相册');
  // 关闭相册管理弹窗
  showAlbumManager.value = false;
  // 启动轮播
  toggleCarousel();
};

// 打开图片编辑器
const openEditor = (photo: Photo | null) => {
  if (!photo) {
    console.log('[App] ⚠️ 当前没有可编辑的照片');
    return;
  }
  console.log('[App] ✏️ 打开编辑器:', photo.name);
  // 打开编辑器会挂起轮播（见 shouldHoldCarousel），不再切换 carousel.enabled，避免改变视图模式
  editingPhoto.value = photo;
};

// 关闭编辑器：解除挂起，相册按新的编辑效果继续播放
const closeEditor = () => {
  editingPhoto.value = null;
};

const onPhotoEdited = (photoId: string) => {
  console.log('[App] ✅ 编辑已保存:', photoId, '| 原图未改动');
};

// 相册管理刷新完成回调：重置索引到第一张并重启轮播
const handleRefreshAll = () => {
  console.log('[App] 🔄 相册管理刷新完成，重置索引并重启轮播');
  albumStore.resetIndex();
  if (!settingsStore.settings.carousel.enabled) {
    settingsStore.updateCarousel({ enabled: true });
  }
};

// 喜爱功能（由 PhotoItem 调用）
const handleFavoriteById = (_photoId: string, _isFavorite: boolean) => {
  // 由 PhotoItem 直接调用 store
};

// 删除照片（由 PhotoItem 调用）
const handleRemovePhotoById = (photoId: string) => {
  const photo = photos.value.find(p => p.id === photoId);
  if (photo) {
    handleRemovePhoto(photo);
  }
};

const handleRemovePhoto = (photo: Photo) => {
  if (photo.isFavorite) {
    // 如果是收藏图片，显示确认提示
    const confirmed = confirm(`"${photo.name}" 是收藏的图片，确定要删除吗？`);
    if (confirmed) {
      albumStore.confirmRemoveFavorite(photo.id);
    }
  } else {
    albumStore.removePhoto(photo.id);
  }
};

// 计算收藏数量和百分比
const favoriteCount = computed(() => {
  return albumStore.favoritePhotos.length;
});

const favoritePercentage = computed(() => {
  if (photos.value.length === 0) return 0;
  return (favoriteCount.value / photos.value.length) * 100;
});

// 将函数暴露给全局
declare global {
  interface Window {
    handleRemovePhoto?: (photoId: string) => void;
    handleFavorite?: (photoId: string, isFavorite: boolean) => void;
  }
}
window.handleRemovePhoto = handleRemovePhotoById;
window.handleFavorite = handleFavoriteById;
</script>

<template>
  <div class="w-full h-full overflow-hidden">
    <!-- 相框即应用边界：铺满整个窗口 -->
    <AppFrame :frame-style="frameStyle">
      <!-- 自定义标题栏（浮在内容之上，Tauri 下可拖动窗口） -->
      <div
        data-title-bar
        class="absolute top-0 left-0 right-0 h-8 z-30 flex items-center justify-between select-none"
        style="-webkit-app-region: drag; background: linear-gradient(to bottom, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.4) 62%, rgba(0,0,0,0.12) 100%);"
      >
      <!-- 标题栏下方的柔和收尾，避免渐变压出硬边 -->
      <div
        class="absolute top-8 left-0 right-0 h-6 z-20 pointer-events-none"
        style="background: linear-gradient(to bottom, rgba(0,0,0,0.12), rgba(0,0,0,0));"
      ></div>
      <!-- 左侧应用名称 - 点击打开菜单 -->
      <div 
        data-menu-trigger
        class="pl-3 text-white/90 hover:text-white text-sm cursor-pointer transition-colors"
        style="text-shadow: 0 1px 3px rgba(0,0,0,0.75);"
        @click="toggleMenu"
        title="点击打开菜单"
      >
        给爱的你
      </div>
      
      <!-- 右侧窗口控制按钮 -->
      <div 
        class="flex items-center pr-4" 
        style="-webkit-app-region: no-drag;"
        @mousedown.stop
        @click.stop
      >
        <!-- 天气（时间左侧：图标 + 定位到的区域 + 温度） -->
        <div
          v-if="weather"
          class="flex items-center gap-1.5 mr-3 text-white/95"
          style="text-shadow: 0 1px 3px rgba(0,0,0,0.75);"
          :title="weatherTooltip"
        >
          <WeatherIcon :name="weather.icon" />
          <span class="text-xs font-medium whitespace-nowrap">
            {{ weather.area || weather.city || '本地' }} {{ weather.temp }}°
          </span>
        </div>

        <!-- 当前时间 -->
        <div
          class="text-white text-sm font-medium"
          style="text-shadow: 0 1px 3px rgba(0,0,0,0.75);"
        >
          {{ currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
        </div>
      </div>
    </div>

      <div
        class="app-container relative w-full h-full bg-gray-900 overflow-hidden"
        :class="{ 'cursor-default': settingsStore.menuState.visible }"
      >

        <!-- 加载状态 -->
        <div v-if="isLoading" class="relative w-full h-full flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p class="text-gray-300 text-lg">加载中...</p>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="errorMessage && !photosLoaded" class="relative w-full h-full flex items-center justify-center">
          <div class="text-center p-8 bg-gray-800/50 rounded-lg">
            <p class="text-gray-300 text-lg mb-4">{{ errorMessage }}</p>
            <button 
              @click="showAlbumManager = true"
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              管理相册
            </button>
          </div>
        </div>

        <!-- 相册展示区域 -->
        <div v-else class="relative w-full h-full">
          <!-- 照片网格（点击照片可编辑） -->
          <PhotoGrid @edit="openEditor" />

          <!-- 菜单组件 -->
          <MainMenu
  data-menu
  :frameStyle="frameStyle"
  :autoCloseTime="getMenuAutoCloseTime()"
  :remainingSeconds="menuRemaining"
  @update:frameStyle="frameStyle = $event"
  @openAlbumManager="showAlbumManager = true"
  @openEditor="openEditor(albumStore.currentPhoto)"
  @toggleFullscreen="toggleFullscreen"
  @toggleOrientation="toggleOrientation"
/>

          <!-- 方向指示器（仅预览模式显示，轮播时隐藏） -->
          <div 
            v-if="!settingsStore.menuState.visible && photosLoaded && !settingsStore.settings.carousel.enabled" 
            class="absolute top-4 right-4 flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-2 rounded-lg z-50"
          >
            <span class="text-gray-400 text-xs">方向:</span>
            <span class="text-white text-sm font-semibold">
              {{ orientationLabels[settingsStore.settings.orientation] }}
            </span>
            <button 
              @click="settingsStore.toggleOrientation()"
              class="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              切换
            </button>
          </div>

          <!-- 底部爱心滑块（收藏指示器） -->
          <div 
            v-if="!settingsStore.menuState.visible && photosLoaded && !settingsStore.settings.carousel.enabled"
            class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-gray-800/90 backdrop-blur-sm px-6 py-3 rounded-full z-40"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            
            <!-- 爱心滑块 -->
            <div class="relative w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                class="absolute h-full bg-red-500 transition-all duration-300 ease-out"
                :style="{ width: favoritePercentage + '%' }"
              ></div>
            </div>
            
            <span class="text-gray-300 text-sm font-semibold">{{ favoriteCount }}</span>
          </div>
        </div>
      </div>

      <!-- 图片编辑器（非破坏性：只保存参数，原图不动） -->
      <PhotoEditor
        :photo="editingPhoto"
        @close="closeEditor"
        @saved="onPhotoEdited"
      />
    </AppFrame>
    
    <!-- 相册管理弹窗 -->
    <AlbumManager
      :visible="showAlbumManager"
      @close="showAlbumManager = false"
      @addPhoto="handleAlbumAddPhoto"
      @removePhoto="handleAlbumRemovePhoto"
      @playAlbum="handlePlayAlbum"
      @refreshAll="handleRefreshAll"
    />
  </div>
</template>
