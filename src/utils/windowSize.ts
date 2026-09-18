import { findPresetById, presetContentRatio } from '@/data/photoSizes';
import {
  MIN_WINDOW,
  FRAME_INSETS,
  clamp,
  contentWidthBounds,
  windowSizeForContent,
  type WorkArea,
} from '@/utils/frameGeometry';
import type { FrameSizeOrientation, FrameStyle } from '@/types';

/**
 * 窗口尺寸的 Tauri 适配层。
 *
 * 这里是前端唯一调用窗口尺寸 API 的地方，浏览器环境（npm run dev）下全部 no-op，
 * 所以调用方不需要自己判断 isTauri。
 *
 * 刻意不 import settings store —— 输入一律由参数传入，避免 store ↔ utils 循环依赖。
 */

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/** 应用预设时首次使用的照片内容区宽度（首次没有"当前宽度"可继承） */
const DEFAULT_BASE_CONTENT_WIDTH = 900;

const tauriWindow = async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
};

export interface WindowMetrics extends WorkArea {
  x: number;
  y: number;
  scale: number;
}

/** 当前窗口的**逻辑**尺寸与位置；浏览器环境返回 null */
export async function getWindowMetrics(): Promise<WindowMetrics | null> {
  if (!isTauri) return null;
  try {
    const win = await tauriWindow();
    const scale = await win.scaleFactor();
    const size = (await win.innerSize()).toLogical(scale);
    const position = (await win.outerPosition()).toLogical(scale);
    return { width: size.width, height: size.height, x: position.x, y: position.y, scale };
  } catch (err) {
    console.error('[WindowSize] 读取窗口尺寸失败:', err);
    return null;
  }
}

/** 当前显示器的工作区（已排除 Dock / 任务栏），逻辑像素 */
export async function getWorkAreaLogical(): Promise<WorkArea | null> {
  if (!isTauri) return null;
  try {
    const { currentMonitor } = await import('@tauri-apps/api/window');
    const monitor = await currentMonitor();
    if (!monitor) return null;
    const size = monitor.workArea.size.toLogical(monitor.scaleFactor);
    return { width: size.width, height: size.height };
  } catch (err) {
    console.error('[WindowSize] 读取显示器工作区失败:', err);
    return null;
  }
}

export async function setLogicalSize(width: number, height: number): Promise<void> {
  if (!isTauri) return;
  const { LogicalSize } = await import('@tauri-apps/api/window');
  const win = await tauriWindow();
  await win.setSize(new LogicalSize(Math.round(width), Math.round(height)));
}

export async function setLogicalPosition(x: number, y: number): Promise<void> {
  if (!isTauri) return;
  const { LogicalPosition } = await import('@tauri-apps/api/window');
  const win = await tauriWindow();
  await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
}

/**
 * 订阅窗口尺寸变化（含 DPI 变化），先把当前尺寸立刻回调一次。
 * 返回取消订阅函数；浏览器环境返回 no-op。
 */
export async function subscribeViewport(cb: (size: WorkArea) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  try {
    const win = await tauriWindow();
    let scale = await win.scaleFactor();

    const emit = (width: number, height: number) => cb({ width, height });

    const initial = (await win.innerSize()).toLogical(scale);
    emit(initial.width, initial.height);

    const unlistenResized = await win.onResized(({ payload }) => {
      const logical = payload.toLogical(scale);
      emit(logical.width, logical.height);
    });

    // DPI 变化后 physical → logical 的换算系数变了，要刷新缓存的 scale 并重发一次
    const unlistenScale = await win.onScaleChanged(async () => {
      scale = await win.scaleFactor();
      const size = (await win.innerSize()).toLogical(scale);
      emit(size.width, size.height);
    });

    return () => {
      unlistenResized();
      unlistenScale();
    };
  } catch (err) {
    console.error('[WindowSize] 订阅窗口尺寸失败:', err);
    return () => {};
  }
}

export interface ApplyPresetResult {
  width: number;
  height: number;
  /** true = 屏幕装不下这个比例，已退回按最小尺寸严格保比例（窗口可能超出屏幕） */
  ratioBroken: boolean;
}

/**
 * 把选中的冲印尺寸应用到窗口。
 *
 * baseContentWidth 传入"当前照片内容区宽度"时，切换预设会保持视觉大小稳定，
 * 只让另一条轴变化。
 */
export async function applyPresetToWindow(
  presetId: string | null,
  orientation: FrameSizeOrientation,
  style: FrameStyle,
  baseContentWidth?: number | null,
): Promise<ApplyPresetResult | null> {
  const preset = findPresetById(presetId);
  if (!preset) return null;

  const ratio = presetContentRatio(preset, orientation);
  const workArea = await getWorkAreaLogical();
  const bounds = contentWidthBounds(ratio, style, MIN_WINDOW, workArea);

  const metrics = await getWindowMetrics();
  const currentContentWidth = metrics ? metrics.width - FRAME_INSETS[style].x : null;
  const preferred = baseContentWidth ?? currentContentWidth ?? DEFAULT_BASE_CONTENT_WIDTH;

  // 屏幕装不下这个比例时，按 minCw 严格保比例，绝不为塞进屏幕而破坏比例
  const contentWidth = bounds.fits ? clamp(preferred, bounds.minCw, bounds.maxCw) : bounds.minCw;
  const size = windowSizeForContent(contentWidth, ratio, style);

  await setLogicalSize(size.width, size.height);
  console.log(
    `[WindowSize] 📐 应用相框尺寸 ${preset.name}(${orientation}) → ${size.width}×${size.height}`,
    bounds.fits ? '' : '(屏幕高度不足，严格保比例)',
  );

  return { width: size.width, height: size.height, ratioBroken: !bounds.fits };
}
