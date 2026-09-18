import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CarouselSettings, AppSettings, MenuState, FrameStyle } from '@/types';

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
  });

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
    carouselPaused,
    carouselHold,
    carouselStopped,
    toggleCarouselPaused,
    holdCarousel,
    releaseCarousel,
    updateSettings,
    updateCarousel,
    setFrameStyle,
    showMenu,
    hideMenu,
    toggleMenu,
    toggleOrientation,
    togglePortraitFitMode,
    hydrate,
  };
});
