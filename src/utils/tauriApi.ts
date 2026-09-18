// Tauri API 封装 - 支持 Web 和 Tauri 双环境

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export type RustMediaType = 'image' | 'video';

export interface PhotoInfo {
  id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  aspect_ratio: number;
  created_at: string;
  thumbnail?: string;
  media_type: RustMediaType;
  duration?: number;
}

export interface FolderInfo {
  path: string;
  name: string;
  photo_count: number;
}

// 选择文件夹
export async function selectFolder(): Promise<string | null> {
  if (!isTauri) {
    console.warn('Web 环境不支持文件夹选择');
    return null;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<string | null>('select_folder');
    return result;
  } catch (error) {
    console.error('选择文件夹失败:', error);
    return null;
  }
}

// 读取文件夹中的照片
export async function readFolder(path: string): Promise<PhotoInfo[]> {
  if (!isTauri) {
    console.warn('Web 环境不支持文件夹读取');
    return [];
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<PhotoInfo[]>('read_folder', { path });
    return result;
  } catch (error) {
    console.error('读取文件夹失败:', error);
    return [];
  }
}

// 获取系统常用文件夹
export async function getSystemFolders(): Promise<FolderInfo[]> {
  if (!isTauri) {
    console.warn('Web 环境不支持系统文件夹检测');
    return [];
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<FolderInfo[]>('get_system_folders');
    return result;
  } catch (error) {
    console.error('获取系统文件夹失败:', error);
    return [];
  }
}

/**
 * 自动定位并扫描【爱你❤️】默认相册
 * 后端会按以下优先级查找：
 *   1. 应用资源目录下的 my-love
 *   2. 项目 public/my-love
 *   3. ~/Pictures/爱你❤️
 * 返回 FolderInfo 和素材列表（含图片和视频）
 */
export async function readMyLoveAlbum(): Promise<{ folder: FolderInfo; photos: PhotoInfo[] } | null> {
  if (!isTauri) {
    console.warn('Web 环境不支持【爱你❤️】相册自动扫描，请使用 Tauri 桌面端');
    return null;
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<[FolderInfo, PhotoInfo[]]>('read_my_love_album');
    return { folder: result[0], photos: result[1] };
  } catch (error) {
    console.error('读取【爱你❤️】相册失败:', error);
    return null;
  }
}

/**
 * 浏览器环境加载【爱你❤️】相册
 * 通过 fetch public/my-love/manifest.json 获取素材列表
 * 图片/视频用 /my-love/xxx 公网路径加载（Vite dev server 提供）
 * 注意：浏览器下无法获取图片真实尺寸，需加载后异步获取
 */
export async function readMyLoveAlbumWeb(): Promise<{ folder: FolderInfo; photos: PhotoInfo[] } | null> {
  try {
    const resp = await fetch('/my-love/manifest.json');
    if (!resp.ok) {
      console.warn('[Web] 无法加载 manifest.json:', resp.status);
      return null;
    }
    const manifest = await resp.json() as {
      name: string;
      description: string;
      items: { file: string; type: 'image' | 'video' }[];
    };
    if (!manifest.items || manifest.items.length === 0) {
      console.warn('[Web] manifest.json 无素材');
      return null;
    }

    // 按图片在前、视频在后排序
    const sorted = [...manifest.items].sort((a, b) => {
      if (a.type === 'image' && b.type === 'video') return -1;
      if (a.type === 'video' && b.type === 'image') return 1;
      return a.file.localeCompare(b.file);
    });

    const photos: PhotoInfo[] = sorted.map(item => {
      const isVideo = item.type === 'video';
      return {
        id: `love-web-${item.file}`,
        path: `/my-love/${item.file}`,
        name: item.file,
        width: 0,
        height: 0,
        aspect_ratio: isVideo ? 16 / 9 : 1,
        created_at: '0',
        thumbnail: undefined,
        media_type: isVideo ? 'video' : 'image',
        duration: undefined,
      };
    });

    return {
      folder: {
        path: '/my-love',
        name: manifest.name || '爱你❤️',
        photo_count: photos.length,
      },
      photos,
    };
  } catch (error) {
    console.error('[Web] 加载【爱你❤️】manifest 失败:', error);
    return null;
  }
}

// 获取照片缩略图
export async function getPhotoThumbnail(path: string, width: number = 200, height: number = 200): Promise<string> {
  if (!isTauri) {
    console.warn('Web 环境不支持缩略图生成');
    return '';
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<string>('get_photo_thumbnail', { path, width, height });
    return result;
  } catch (error) {
    console.error('获取缩略图失败:', error);
    return '';
  }
}

// 导出照片
export async function exportPhotos(photos: PhotoInfo[], outputPath: string, format: string): Promise<string> {
  if (!isTauri) {
    console.warn('Web 环境不支持导出');
    return '';
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<string>('export_photos', { photos, output_path: outputPath, format });
    return result;
  } catch (error) {
    console.error('导出照片失败:', error);
    return '';
  }
}

// 检测运行环境
export function getEnvironment(): 'tauri' | 'web' {
  return isTauri ? 'tauri' : 'web';
}

/**
 * 获取媒体文件（图片或视频）的可显示 URL
 * 优先级: url(网络) > thumbnail(data:URI) > convertFileSrc(path)
 * 本地文件路径需通过 convertFileSrc 转为 asset:// 协议才能在 webview 中加载
 */
export function getMediaSrc(photo: { url?: string; thumbnail?: string; path?: string }): string {
  // 网络图片
  if (photo.url) return photo.url;
  // base64 缩略图
  if (photo.thumbnail) return photo.thumbnail;
  // 本地文件路径 → asset:// 协议
  if (photo.path) {
    if (isTauri) {
      // 使用 Tauri 官方的 convertFileSrc（Rust 内部实现，正确处理路径编码）
      // __TAURI_INTERNALS__.convertFileSrc 是同步函数
      const internals = (window as any).__TAURI_INTERNALS__;
      if (internals && typeof internals.convertFileSrc === 'function') {
        return internals.convertFileSrc(photo.path, 'asset');
      }
      // fallback：不编码斜杠，仅替换特殊字符
      return `asset://localhost/${photo.path}`;
    }
    return photo.path;
  }
  return '';
}

/**
 * 获取图片的可显示 URL（兼容旧调用名）
 * @deprecated 请使用 getMediaSrc
 */
export const getImageSrc = getMediaSrc;

/**
 * 判断媒体是否为视频
 */
export function isVideoPhoto(photo: { mediaType?: string; media_type?: string }): boolean {
  const t = photo.mediaType ?? photo.media_type;
  return t === 'video';
}
