export type MediaType = 'image' | 'video';

export interface Photo {
  id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: Date;
  albumId?: string;
  albumIds?: string[];
  url?: string;
  thumbnail?: string;
  isFavorite?: boolean;
  /** 媒体类型，默认 image */
  mediaType?: MediaType;
  /** 视频时长（秒），仅 video 有效 */
  duration?: number;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  type: 'folder' | 'virtual';
  path?: string;
  photoIds: string[];
  createdAt: Date;
  updatedAt: Date;
  coverPhotoId?: string | null;
  isDefault?: boolean;
}

export interface FrameTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface CarouselSettings {
  enabled: boolean;
  interval: number; // 毫秒
  animation: 'fade' | 'slide' | 'zoom' | 'cube';
  autoPlayAfterIdle: boolean; // 闲置后自动播放
}

/** 相框风格：木质 / 杰伦 / 黑金 */
export type FrameStyle = 'wood' | 'metal' | 'minimal';

/**
 * 相框（=应用窗口）的横/纵方向。
 * 注意：与 AppSettings.orientation（按照片 aspectRatio 过滤照片）完全无关，勿混用。
 */
export type FrameSizeOrientation = 'landscape' | 'portrait';

/**
 * 常规相框尺寸：控制**整个应用窗口**的尺寸（本项目里相框边界即窗口边界）。
 * 比例换算在 src/utils/frameGeometry.ts，预设清单在 src/data/photoSizes.ts。
 */
export interface FrameSizeSettings {
  /** 选中的标准冲印尺寸 id（PHOTO_SIZE_PRESETS[].id）；null = 自定义 */
  presetId: string | null;
  /** 横/纵方向，只决定宽高哪边是长边 */
  orientation: FrameSizeOrientation;
  /** 等比例锁定：拖拽相框手柄时保持照片内容区的宽高比 */
  lockAspect: boolean;
}

/**
 * 照片编辑参数（非破坏性：只存参数，不改动原图，也不生成新文件）
 * 只做影调/色彩调整，**不提供大小与位置的编辑**（照片始终铺满相框）
 */
/** 圈选区域（归一化到原图：0~1），表示"展示照片的哪一块"，替代大小/位置编辑 */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhotoEdit {
  brightness: number;   // 亮度 50~150，100 原始
  contrast: number;     // 对比度 50~150
  saturation: number;   // 饱和度 0~200
  temperature: number;  // 色温 -100(冷) ~ 100(暖)
  vignette: number;     // 暗角 0~100
  blur: number;         // 柔化 0~10 px
  grayscale: number;    // 黑白 0~100
  sepia: number;        // 复古 0~100
  hue: number;          // 色相 -180~180 deg
  crop: CropRect | null; // 展示区域（圈选），null = 整张
  updatedAt: number;    // 最后一次保存时间
}

/** photoId -> 编辑参数 */
export type PhotoEditMap = Record<string, PhotoEdit>;

export interface MenuState {
  visible: boolean;
  position: 'left' | 'right';
  autoCloseTime: number;
}

export interface AppSettings {
  frameTemplate: string;
  /** 相框外观风格（应用窗口边框） */
  frameStyle: FrameStyle;
  carousel: CarouselSettings;
  menuAutoCloseTime: number;
  hoverEnhancement: boolean;
  theme: 'light' | 'dark';
  orientation: 'auto' | 'landscape' | 'portrait';
  /** 竖图展示模式：ken-burns(缓慢纵向滑动) | contain(完整显示) | cover(填满裁剪) */
  portraitFitMode: 'ken-burns' | 'contain' | 'cover';
  /** 常规相框尺寸（窗口尺寸）。与上面按 aspectRatio 过滤照片的 orientation 无关 */
  frameSize: FrameSizeSettings;
}
