import type { PhotoEdit, CropRect } from '@/types';

/** 完整展示（无圈选） */
export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

/** 默认（无修改）参数 */
export const DEFAULT_EDIT: PhotoEdit = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  vignette: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hue: 0,
  crop: null,
  updatedAt: 0,
};

export function createDefaultEdit(): PhotoEdit {
  return { ...DEFAULT_EDIT };
}

/** 是否为"无修改"状态（用于判断要不要显示已编辑标识） */
export function isEdited(edit?: PhotoEdit | null): boolean {
  if (!edit) return false;
  return (
    edit.brightness !== DEFAULT_EDIT.brightness ||
    edit.contrast !== DEFAULT_EDIT.contrast ||
    edit.saturation !== DEFAULT_EDIT.saturation ||
    edit.temperature !== DEFAULT_EDIT.temperature ||
    edit.vignette !== DEFAULT_EDIT.vignette ||
    edit.blur !== DEFAULT_EDIT.blur ||
    edit.grayscale !== DEFAULT_EDIT.grayscale ||
    edit.sepia !== DEFAULT_EDIT.sepia ||
    edit.hue !== DEFAULT_EDIT.hue ||
    !!edit.crop
  );
}

/** 圈选区域 → 铺满容器的渲染样式（宽高按选区放大，再平移到选区左上角） */
export function buildCropStyle(crop?: CropRect | null): Record<string, string> {
  if (!crop || crop.w <= 0 || crop.h <= 0) return {};
  return {
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    objectFit: 'cover',
    transform: `translate(${(-crop.x * 100).toFixed(3)}%, ${(-crop.y * 100).toFixed(3)}%)`,
  };
}

/** 选区是否接近完整（用于判断"没选"） */
export function isFullCrop(crop?: CropRect | null): boolean {
  if (!crop) return true;
  return crop.x <= 0.001 && crop.y <= 0.001 && crop.w >= 0.999 && crop.h >= 0.999;
}

/** 参数 → CSS filter */
export function buildFilter(edit?: PhotoEdit | null): string {
  if (!edit) return 'none';
  const parts = [
    `brightness(${edit.brightness}%)`,
    `contrast(${edit.contrast}%)`,
    `saturate(${edit.saturation}%)`,
  ];
  if (edit.grayscale > 0) parts.push(`grayscale(${edit.grayscale}%)`);
  if (edit.sepia > 0) parts.push(`sepia(${edit.sepia}%)`);
  if (edit.hue !== 0) parts.push(`hue-rotate(${edit.hue}deg)`);
  if (edit.blur > 0) parts.push(`blur(${edit.blur}px)`);
  return parts.join(' ');
}

/** 色温覆盖层：暖光 / 冷光，用 soft-light 混合，比 hue-rotate 更自然 */
export function buildTemperatureStyle(edit?: PhotoEdit | null): Record<string, string> {
  if (!edit || edit.temperature === 0) return { opacity: '0' };
  const t = edit.temperature;
  const alpha = Math.min(Math.abs(t) / 100, 1) * 0.55;
  return {
    background: t > 0 ? 'rgba(255, 168, 60, 1)' : 'rgba(70, 140, 255, 1)',
    opacity: String(alpha),
    mixBlendMode: 'soft-light',
  };
}

/** 暗角覆盖层 */
export function buildVignetteStyle(edit?: PhotoEdit | null): Record<string, string> {
  if (!edit || edit.vignette <= 0) return { opacity: '0' };
  const v = edit.vignette / 100;
  return {
    background: `radial-gradient(ellipse at center, transparent ${Math.round(55 - v * 30)}%, rgba(0,0,0,${(0.85 * v).toFixed(2)}) 100%)`,
    opacity: '1',
  };
}
