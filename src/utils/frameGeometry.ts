import type { FrameStyle } from '@/types';

/**
 * 相框几何换算 —— 纯函数，不依赖 Vue / Tauri，便于单独核对。
 *
 * 相框就是应用窗口边界，照片内容区 = 窗口尺寸 减去 边框厚度。
 * 边框厚度是**固定像素**（不随窗口缩放），且三种风格不同，所以比例换算必须带上它，
 * 否则照片区的实际比例会明显偏离预设。
 */

/**
 * 每轴总内缩 = 2 × (--fb + --mw)
 * 来源：AppFrame.vue 的 .frame-mat { inset: var(--fb) } 与 .frame-content { inset: var(--mw) }
 * 修改 AppFrame.vue 里的 CSS 变量时，这里必须同步。
 */
export const FRAME_INSETS: Record<FrameStyle, { x: number; y: number }> = {
  wood: { x: 124, y: 124 }, // 2 × (34 + 28)，.frame-wood
  metal: { x: 112, y: 112 }, // 2 × (32 + 24)，.frame-jay
  minimal: { x: 76, y: 76 }, // 2 × (38 + 0)，.frame-white
};

/** 必须与 src-tauri/tauri.conf.json 的 minWidth / minHeight 保持一致 */
export const MIN_WINDOW = { width: 800, height: 600 };

export interface WorkArea {
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** 照片内容区尺寸 */
export function contentSize(
  windowWidth: number,
  windowHeight: number,
  style: FrameStyle,
): { width: number; height: number } {
  const inset = FRAME_INSETS[style];
  return {
    width: Math.max(1, windowWidth - inset.x),
    height: Math.max(1, windowHeight - inset.y),
  };
}

/** 照片内容区的宽高比（宽 / 高） */
export function contentRatio(windowWidth: number, windowHeight: number, style: FrameStyle): number {
  const content = contentSize(windowWidth, windowHeight, style);
  return content.width / content.height;
}

/** 已知内容区宽度和目标比例，反推窗口尺寸 */
export function windowSizeForContent(
  contentWidth: number,
  ratio: number,
  style: FrameStyle,
): { width: number; height: number } {
  const inset = FRAME_INSETS[style];
  return {
    width: Math.round(contentWidth + inset.x),
    height: Math.round(contentWidth / ratio + inset.y),
  };
}

/**
 * 把两轴的最小/最大尺寸都折算到「内容区宽度」这一个变量上，
 * 这样按比例缩放时两轴都不会越界。
 *
 * fits = false 表示屏幕装不下这个比例（maxCw < minCw）：此时调用方应
 * **按 minCw 严格保比例**，允许窗口超出屏幕，而不是为了塞进屏幕破坏比例。
 */
export function contentWidthBounds(
  ratio: number,
  style: FrameStyle,
  min: WorkArea,
  workArea: WorkArea | null,
): { minCw: number; maxCw: number; fits: boolean } {
  const inset = FRAME_INSETS[style];
  const minCw = Math.max(min.width - inset.x, (min.height - inset.y) * ratio);

  // 读不到工作区时不设上限（clamp 的 max 允许为 Infinity）
  if (!workArea) return { minCw, maxCw: Number.POSITIVE_INFINITY, fits: true };

  const maxCw = Math.min(workArea.width - inset.x, (workArea.height - inset.y) * ratio);
  return { minCw, maxCw, fits: maxCw >= minCw };
}
