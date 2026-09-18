// 持久化工具 - 支持 Tauri 桌面端和 Web 浏览器环境
import type { Photo, Album, AppSettings, PhotoEditMap } from '@/types';

const STORAGE_KEY = 'photo-album-data';
const SAVE_DEBOUNCE_MS = 800;

export interface PersistedState {
  version: 1;
  settings: AppSettings;
  album: {
    photos: Photo[];
    albums: Album[];
    currentAlbumId: string | null;
    /** photoId -> 编辑参数（非破坏性） */
    edits?: PhotoEditMap;
  };
}

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// 保存到存储
export async function saveState(state: PersistedState): Promise<void> {
  const json = JSON.stringify(state);

  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_app_data', { json });
    } catch (e) {
      console.error('[Persistence] 保存失败，回退到 localStorage:', e);
      localStorage.setItem(STORAGE_KEY, json);
    }
  } else {
    localStorage.setItem(STORAGE_KEY, json);
  }
}

// 从存储加载
export async function loadState(): Promise<PersistedState | null> {
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const json = await invoke<string | null>('load_app_data');
      if (json) {
        return JSON.parse(json) as PersistedState;
      }
    } catch (e) {
      console.error('[Persistence] 加载失败，回退到 localStorage:', e);
    }
  }

  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      return JSON.parse(local) as PersistedState;
    } catch {
      return null;
    }
  }

  return null;
}

// 防抖保存
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(state: PersistedState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState(state);
  }, SAVE_DEBOUNCE_MS);
}
