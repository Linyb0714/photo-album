import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Photo, Album, PhotoEdit, PhotoEditMap } from '@/types';
import { isEdited } from '@/utils/photoEdit';

export const useAlbumStore = defineStore('album', () => {
  const photos = ref<Photo[]>([]);
  const albums = ref<Album[]>([]);
  const currentAlbumId = ref<string | null>(null);
  const currentIndex = ref(0);
  /** photoId -> 编辑参数（非破坏性，原图文件永不改动） */
  const edits = ref<PhotoEditMap>({});

  // 从持久化数据恢复
  function hydrate(data: {
    photos: Photo[];
    albums: Album[];
    currentAlbumId: string | null;
    edits?: PhotoEditMap;
  }) {
    photos.value = data.photos.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    }));
    albums.value = data.albums.map(a => ({
      ...a,
      createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
      updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
    }));
    currentAlbumId.value = data.currentAlbumId;
    currentIndex.value = 0;
    edits.value = data.edits ? { ...data.edits } : {};
    const editedCount = Object.keys(edits.value).length;
    if (editedCount > 0) {
      console.log('[AlbumStore] ✏️ 已恢复', editedCount, '张照片的编辑参数');
    }
    console.log('[AlbumStore] 💾 已恢复持久化数据：', photos.value.length, '张照片,', albums.value.length, '个相册');
  }

  /**
   * 同步相册照片：用新扫描的照片列表更新指定相册
   * - 按 path 去重合并：保留旧照片的收藏状态（isFavorite），更新路径等字段
   * - 移除新列表中不存在（已被删除）的旧照片
   * - 添加新出现的照片
   * - 更新相册的 photoIds
   */
  function syncAlbumPhotos(albumId: string, newPhotos: Photo[]) {
    const album = albums.value.find(a => a.id === albumId);
    if (!album) {
      console.warn('[AlbumStore] syncAlbumPhotos: 相册不存在', albumId);
      return;
    }

    // 旧照片按 path 建立索引，保留收藏状态
    const oldByPath = new Map<string, Photo>();
    album.photoIds.forEach(id => {
      const p = photos.value.find(ph => ph.id === id);
      if (p && p.path) oldByPath.set(p.path, p);
    });

    // 构建新的 photoIds 列表
    const newPhotoIds: string[] = [];
    const photosToAdd: Photo[] = [];

    for (const np of newPhotos) {
      const old = np.path ? oldByPath.get(np.path) : undefined;
      if (old) {
        // 已存在：更新字段，保留收藏状态和 id
        Object.assign(old, {
          ...np,
          id: old.id,
          isFavorite: old.isFavorite,
        });
        newPhotoIds.push(old.id);
      } else {
        // 新照片：直接添加
        newPhotoIds.push(np.id);
        photosToAdd.push(np);
      }
    }

    // 移除不再存在的旧照片
    const newPathSet = new Set(newPhotos.map(p => p.path));
    const toRemove: string[] = [];
    album.photoIds.forEach(id => {
      const p = photos.value.find(ph => ph.id === id);
      if (p && p.path && !newPathSet.has(p.path)) {
        toRemove.push(id);
      }
    });
    if (toRemove.length > 0) {
      photos.value = photos.value.filter(p => !toRemove.includes(p.id));
    }

    // 添加新照片
    photosToAdd.forEach(p => photos.value.push(p));

    // 更新相册的 photoIds
    album.photoIds = newPhotoIds;
    album.updatedAt = new Date();
    console.log('[AlbumStore] 🔄 已同步相册照片:', album.name, '| 新:', newPhotoIds.length, '| 移除:', toRemove.length, '| 新增:', photosToAdd.length);
  }

  const currentAlbum = computed(() => {
    if (!currentAlbumId.value) return null;
    return albums.value.find(a => a.id === currentAlbumId.value) || null;
  });

  const currentPhotos = computed(() => {
    if (!currentAlbum.value) return photos.value;
    return currentAlbum.value.photoIds
      .map(id => photos.value.find(p => p.id === id))
      .filter((p): p is Photo => p !== undefined);
  });

  const currentPhoto = computed(() => {
    if (currentPhotos.value.length === 0) return null;
    return currentPhotos.value[currentIndex.value] || null;
  });

  const favoritePhotos = computed(() => {
    return photos.value.filter(p => p.isFavorite);
  });

  function addPhoto(photo: Photo) {
    console.log('[AlbumStore] ➕ 添加照片:', photo.name, '| ID:', photo.id);
    console.log('[AlbumStore]   尺寸:', photo.width, 'x', photo.height, '| 路径:', photo.path);
    photos.value.push(photo);
    if (currentAlbum.value) {
      currentAlbum.value.photoIds.push(photo.id);
      console.log('[AlbumStore]   已添加到当前相册:', currentAlbum.value.name);
    } else {
      console.warn('[AlbumStore] ⚠️ 当前没有激活的相册');
    }
  }

  // 清空所有照片
  function clearPhotos() {
    console.log('[AlbumStore] 🗑️ 清空所有照片');
    photos.value = [];
  }

  // 创建相册
  function createAlbum(album: Album) {
    console.log('[AlbumStore] 📁 创建相册:', album.name);
    albums.value.push(album);
    // 自动设为当前相册
    currentAlbumId.value = album.id;
  }

  // 删除相册
  function deleteAlbum(albumId: string) {
    const album = albums.value.find(a => a.id === albumId);
    if (album) {
      console.log('[AlbumStore] 🗑️ 删除相册:', album.name);
      albums.value = albums.value.filter(a => a.id !== albumId);
      if (currentAlbumId.value === albumId) {
        currentAlbumId.value = albums.value.length > 0 ? albums.value[0].id : null;
      }
    }
  }

  // 更新相册
  function updateAlbum(albumId: string, updates: Partial<Album>) {
    const index = albums.value.findIndex(a => a.id === albumId);
    if (index !== -1) {
      console.log('[AlbumStore] ✏️ 更新相册:', albumId, updates);
      albums.value[index] = { ...albums.value[index], ...updates };
    }
  }

  // 添加照片到指定相册（不添加到主列表）
  function addPhotoToAlbum(albumId: string, photoId: string) {
    const album = albums.value.find(a => a.id === albumId);
    if (album && !album.photoIds.includes(photoId)) {
      console.log('[AlbumStore] ➕ 添加照片到相册:', photoId, '->', album.name);
      album.photoIds.push(photoId);
    }
  }

  // 从相册中移除照片（不删除照片本身）
  function removePhotoFromAlbum(albumId: string, photoId: string) {
    const album = albums.value.find(a => a.id === albumId);
    if (album) {
      const index = album.photoIds.indexOf(photoId);
      if (index !== -1) {
        console.log('[AlbumStore] ➖ 从相册移除照片:', photoId, 'from', album.name);
        album.photoIds.splice(index, 1);
      }
    }
  }

  function toggleFavorite(photoId: string, newStatus?: boolean) {
    const photo = photos.value.find(p => p.id === photoId);
    if (photo) {
      const oldStatus = photo.isFavorite;
      if (newStatus !== undefined) {
        photo.isFavorite = newStatus;
      } else {
        photo.isFavorite = !photo.isFavorite;
      }
      console.log('[AlbumStore] ❤️ 切换收藏:', photo.name);
      console.log('[AlbumStore]   旧状态:', oldStatus, '→ 新状态:', photo.isFavorite);
      console.log('[AlbumStore]   当前收藏总数:', favoritePhotos.value.length);
    } else {
      console.warn('[AlbumStore] ⚠️ 未找到照片:', photoId);
    }
  }

  function removePhoto(photoId: string, isFavorite = false) {
    console.log('[AlbumStore] ➖ 删除照片:', photoId, '| 收藏模式:', isFavorite);
    
    if (isFavorite) {
      // 如果是收藏图片，返回 false 表示需要确认
      console.log('[AlbumStore]   收藏照片，需要二次确认');
      return false;
    }
    
    const index = photos.value.findIndex(p => p.id === photoId);
    if (index !== -1) {
      console.log('[AlbumStore]   ✅ 照片已从主列表删除');
      photos.value.splice(index, 1);
    } else {
      console.warn('[AlbumStore] ⚠️ 照片未找到:', photoId);
    }
    
    albums.value.forEach(album => {
      const photoIndex = album.photoIds.indexOf(photoId);
      if (photoIndex !== -1) {
        album.photoIds.splice(photoIndex, 1);
      }
    });
    
    return true;
  }

  function confirmRemoveFavorite(photoId: string) {
    const index = photos.value.findIndex(p => p.id === photoId);
    if (index !== -1) {
      photos.value.splice(index, 1);
    }
    
    albums.value.forEach(album => {
      const photoIndex = album.photoIds.indexOf(photoId);
      if (photoIndex !== -1) {
        album.photoIds.splice(photoIndex, 1);
      }
    });
    
    return true;
  }

  // ===== 照片编辑（非破坏性，只存参数） =====
  function getEdit(photoId: string): PhotoEdit | null {
    return edits.value[photoId] || null;
  }

  function hasEdit(photoId: string): boolean {
    return isEdited(edits.value[photoId]);
  }

  /** 保存编辑参数；传 null 表示清除编辑（回到原图） */
  function setEdit(photoId: string, edit: PhotoEdit | null) {
    if (!edit || !isEdited(edit)) {
      delete edits.value[photoId];
      console.log('[AlbumStore] ↩️ 已清除编辑，恢复原图:', photoId);
      return;
    }
    edits.value[photoId] = { ...edit, updatedAt: Date.now() };
    console.log('[AlbumStore] ✏️ 已保存编辑参数:', photoId);
  }

  function setCurrentAlbum(albumId: string) {
    currentAlbumId.value = albumId;
    currentIndex.value = 0;
  }

  function resetIndex() {
    currentIndex.value = 0;
    console.log('[AlbumStore] 🔄 重置索引到第一张');
  }

  function setCurrentIndex(index: number) {
    const photos = currentPhotos.value;
    const maxIndex = photos.length - 1;
    
    console.log('[AlbumStore] 📊 setCurrentIndex 调用 - 传入 index:', index, '| 当前 currentIndex:', currentIndex.value, '| 照片总数:', photos.length, '| maxIndex:', maxIndex);
    
    if (maxIndex < 0) {
      console.log('[AlbumStore] ❌ 没有照片，返回');
      return;
    }
    
    // 循环播放：超过最大值回到 0，小于 0 回到最大值
    let newIndex = index;
    if (newIndex > maxIndex) {
      console.log('[AlbumStore] ↩️ 超过最大值', maxIndex, '，回到 0');
      newIndex = 0;
    } else if (newIndex < 0) {
      console.log('[AlbumStore] ↩️ 小于 0，回到末尾', maxIndex);
      newIndex = maxIndex;
    }
    
    console.log('[AlbumStore] 🔄 切换图片:', currentIndex.value, '->', newIndex, '| 总数:', photos.length);
    currentIndex.value = newIndex;
  }

  function nextPhoto() {
    console.log('[AlbumStore] ⏭️ 下一张');
    setCurrentIndex(currentIndex.value + 1);
  }

  function prevPhoto() {
    console.log('[AlbumStore] ⏮️ 上一张');
    setCurrentIndex(currentIndex.value - 1);
  }

  return {
    photos,
    albums,
    currentAlbumId,
    currentIndex,
    currentAlbum,
    currentPhotos,
    currentPhoto,
    favoritePhotos,
    edits,
    getEdit,
    hasEdit,
    setEdit,
    resetIndex,
    addPhoto,
    removePhoto,
    toggleFavorite,
    confirmRemoveFavorite,
    setCurrentAlbum,
    setCurrentIndex,
    nextPhoto,
    prevPhoto,
    clearPhotos,
    // 相册管理
    createAlbum,
    deleteAlbum,
    updateAlbum,
    addPhotoToAlbum,
    removePhotoFromAlbum,
    // 持久化
    hydrate,
    // 同步相册照片
    syncAlbumPhotos,
  };
});
