import type { FrameSizeOrientation } from '@/types';

/**
 * 常规冲印尺寸预设
 *
 * 比例一律以**英寸**为准 —— 英寸之间是精确的简单分数（6×4 = 1.5），
 * 毫米是四舍五入后的近似值，只用于界面展示，不参与比例计算。
 * 长 / 短 = 长边 / 短边，取值恒 ≥ 1。
 */
export interface PhotoSizePreset {
  id: string;
  /** 中文尺寸名，如「六寸」 */
  name: string;
  /** 行业别名，如「4R」；可能为空 */
  aliases: string[];
  longIn: number;
  shortIn: number;
  /** 仅用于展示 */
  mmLong: number;
  mmShort: number;
}

export const PHOTO_SIZE_PRESETS: PhotoSizePreset[] = [
  { id: 'size-5',  name: '五寸',   aliases: ['3R'], longIn: 5,  shortIn: 3.5, mmLong: 127, mmShort: 89 },
  { id: 'size-6',  name: '六寸',   aliases: ['4R'], longIn: 6,  shortIn: 4,   mmLong: 152, mmShort: 102 },
  { id: 'size-7',  name: '七寸',   aliases: ['5R'], longIn: 7,  shortIn: 5,   mmLong: 178, mmShort: 127 },
  { id: 'size-8',  name: '八寸',   aliases: ['6R'], longIn: 8,  shortIn: 6,   mmLong: 203, mmShort: 152 },
  { id: 'size-10', name: '十寸',   aliases: [],     longIn: 10, shortIn: 8,   mmLong: 254, mmShort: 203 },
  { id: 'size-12', name: '十二寸', aliases: [],     longIn: 12, shortIn: 10,  mmLong: 305, mmShort: 254 },
];

/** 该预设在这条横/纵方向下，照片**内容区**的宽高比（宽 / 高） */
export function presetContentRatio(preset: PhotoSizePreset, orientation: FrameSizeOrientation): number {
  const ratio = preset.longIn / preset.shortIn;
  return orientation === 'landscape' ? ratio : 1 / ratio;
}

export function findPresetById(id: string | null | undefined): PhotoSizePreset | undefined {
  if (!id) return undefined;
  return PHOTO_SIZE_PRESETS.find((p) => p.id === id);
}

/** 预设的中文名（含别名），用于提示文案 */
export function presetLabel(preset: PhotoSizePreset): string {
  return preset.aliases.length ? `${preset.name} ${preset.aliases.join('/')}` : preset.name;
}

/**
 * 按实际宽高比反查预设，找不到返回 null（= 自定义）。
 *
 * 容差 0.8% 的取值理由：五寸(1.4286) 与七寸(1.4) 只相差 2%，必须能区分开；
 * 而窗口尺寸取整带来的误差 ≤ 0.3%，必须能被吸收。
 */
export function matchPresetByRatio(
  ratio: number,
  orientation: FrameSizeOrientation,
  tolerance = 0.008,
): PhotoSizePreset | null {
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return (
    PHOTO_SIZE_PRESETS.find((p) => {
      const target = presetContentRatio(p, orientation);
      return Math.abs(ratio - target) / target < tolerance;
    }) ?? null
  );
}
