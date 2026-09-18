import { ref, onUnmounted } from 'vue';
import type { CarouselSettings } from '@/types';

export function useCarousel(settings: CarouselSettings) {
  const isPlaying = ref(false);
  const currentTime = ref(0);

  let timer: number | null = null;

  const start = () => {
    if (!settings.enabled || isPlaying.value) return;
    
    isPlaying.value = true;
    currentTime.value = 0;
    
    timer = window.setInterval(() => {
      currentTime.value += 100;
      if (currentTime.value >= settings.interval) {
        currentTime.value = 0;
        // 触发下一张的逻辑由父组件处理
        const event = new CustomEvent('carousel-next');
        window.dispatchEvent(event);
      }
    }, 100);
  };

  const stop = () => {
    isPlaying.value = false;
    currentTime.value = 0;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const toggle = () => {
    if (isPlaying.value) {
      stop();
    } else {
      start();
    }
  };

  onUnmounted(() => {
    stop();
  });

  return {
    isPlaying,
    currentTime,
    start,
    stop,
    toggle,
  };
}
