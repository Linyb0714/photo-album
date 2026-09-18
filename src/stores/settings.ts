import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  CarouselSettings,
  AppSettings,
  MenuState,
  FrameStyle,
  FrameSizeSettings,
  FrameSizeOrientation,
} from '@/types';
import { findPresetById } from '@/data/photoSizes';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    frameTemplate: 'grid',
    frameStyle: 'wood',
    carousel: {
      enabled: true,
      interval: 12000,
      animation: 'fade',
      autoPlayAfterIdle: true,
    },
    menuAutoCloseTime: 12000,
    hoverEnhancement: true,
    theme: 'dark',
    orientation: 'auto',
    portraitFitMode: 'ken-burns',
    // presetId 默认 null = 不动窗口，避免首次启动就改变窗口尺寸
    frameSize: { presetId: null, orientation: 'landscape', lockAspect: false },
  });

  /**
   * 当前窗口内容区的逻辑尺寸。
   * **刻意放在 settings 之外，不持久化**：它是显示器相关的运行时状态，
   * 存下来会在换屏/换 DPI 后恢复出一个离谱的窗口尺寸。
   * 同样也因此不会被 App.vue 的持久化 watch 观察到。
   */
  const frameViewport = ref<{ width: number; height: number } | null>(null);

  function setFrameViewport(width: number, height: number) {
    frameViewport.value = { width, height };
  }

  /**
   * 轮播暂停状态（都不持久化）：
   * - carouselPaused：用户手动点「暂停轮播」（悬停操作栏里）
   * - carouselHold：菜单 / 编辑器 / 相册管理等界面遮挡时临时挂起
   * 与 carousel.enabled 区分开：enabled 会切换视图模式并写盘，这里只影响计时。
   */
  const carouselPaused = ref(false);
  const carouselHold = ref(false);
  const carouselStopped = computed(() => carouselPaused.value || carouselHold.value);

  /** 手动暂停/继续轮播 */
  function toggleCarouselPaused() {
    carouselPaused.value = !carouselPaused.value;
    console.log('[Settings] 轮播', carouselPaused.value ? '已暂停' : '继续播放');
  }

  /** 界面遮挡时挂起轮播（幂等） */
  function holdCarousel() {
    carouselHold.value = true;
  }

  /** 解除遮挡挂起（幂等） */
  function releaseCarousel() {
    carouselHold.value = false;
  }

  const menuState = ref<MenuState>({
    visible: false,
    position: 'left',
    autoCloseTime: 12000,
  });

  // 从持久化数据恢复
  function hydrate(data: Partial<AppSettings>) {
    if (data.frameTemplate) settings.value.frameTemplate = data.frameTemplate;
    if (data.frameStyle) settings.value.frameStyle = data.frameStyle;
    if (data.carousel) settings.value.carousel = { ...settings.value.carousel, ...data.carousel };
    if (data.menuAutoCloseTime) settings.value.menuAutoCloseTime = data.menuAutoCloseTime;
    if (data.hoverEnhancement !== undefined) settings.value.hoverEnhancement = data.hoverEnhancement;
    if (data.theme) settings.value.theme = data.theme;
    if (data.orientation) settings.value.orientation = data.orientation;
    if (data.portraitFitMode) settings.value.portraitFitMode = data.portraitFitMode;
    // 用对象展开而不是逐字段真值判断：frameSize 里既有 false 又有 null，
    // 沿用上面的 `if (data.x)` 写法会把它们丢掉
    if (data.frameSize) {
      settings.value.frameSize = { ...settings.value.frameSize, ...data.frameSize };
      // 兼容持久化数据里已被删除的预设 id
      if (settings.value.frameSize.presetId && !findPresetById(settings.value.frameSize.presetId)) {
        settings.value.frameSize.presetId = null;
      }
    }
    console.log('[SettingsStore] 💾 已恢复持久化设置');
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings };
  }

  function updateCarousel(newCarousel: Partial<CarouselSettings>) {
    settings.value.carousel = { ...settings.value.carousel, ...newCarousel };
  }

  /** 更新相框风格（同时兼容旧的 updateSettings 调用） */
  function setFrameStyle(style: FrameStyle) {
    settings.value.frameStyle = style;
  }

  /** 常规相框尺寸（窗口尺寸）：只存"意图"，实际像素尺寸不持久化 */
  function setFrameSize(next: Partial<FrameSizeSettings>) {
    settings.value.frameSize = { ...settings.value.frameSize, ...next };
  }

  function setFrameSizePreset(presetId: string | null) {
    settings.value.frameSize.presetId = presetId;
  }

  function setFrameSizeOrientation(orientation: FrameSizeOrientation) {
    settings.value.frameSize.orientation = orientation;
  }

  function setFrameLockAspect(lockAspect: boolean) {
    settings.value.frameSize.lockAspect = lockAspect;
  }

  function showMenu(position: 'left' | 'right' = 'left') {
    menuState.value.visible = true;
    menuState.value.position = position;
  }

  function hideMenu() {
    menuState.value.visible = false;
  }

  function toggleMenu() {
    if (menuState.value.visible) {
      hideMenu();
    } else {
      showMenu();
    }
  }

  function toggleOrientation() {
    const orientations: ('auto' | 'landscape' | 'portrait')[] = ['auto', 'landscape', 'portrait'];
    const currentIndex = orientations.indexOf(settings.value.orientation);
    const nextIndex = (currentIndex + 1) % orientations.length;
    settings.value.orientation = orientations[nextIndex];
  }

  function togglePortraitFitMode() {
    const modes: ('ken-burns' | 'contain' | 'cover')[] = ['ken-burns', 'contain', 'cover'];
    const currentIndex = modes.indexOf(settings.value.portraitFitMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    settings.value.portraitFitMode = modes[nextIndex];
  }

  return {
    settings,
    menuState,
    frameViewport,
    setFrameViewport,
    carouselPaused,
    carouselHold,
    carouselStopped,
    toggleCarouselPaused,
    holdCarousel,
    releaseCarousel,
    updateSettings,
    updateCarousel,
    setFrameStyle,
    setFrameSize,
    setFrameSizePreset,
    setFrameSizeOrientation,
    setFrameLockAspect,
    showMenu,
    hideMenu,
    toggleMenu,
    toggleOrientation,
    togglePortraitFitMode,
    hydrate,
  };
});
