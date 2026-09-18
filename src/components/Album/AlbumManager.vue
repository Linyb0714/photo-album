<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAlbumStore } from '@/stores/album';
import type { Photo, Album } from '@/types';
import { selectFolder, readFolder, readMyLoveAlbum, readMyLoveAlbumWeb, getMediaSrc } from '@/utils/tauriApi';

const albumStore = useAlbumStore();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'addPhoto', photo: Photo): void;
  (e: 'removePhoto', photoId: string): void;
  (e: 'playAlbum'): void;
  (e: 'refreshAll'): void;
}>();

// 刷新状态
const isRefreshing = ref(false);

/**
 * 全量刷新：
 * 1. 确保【爱你❤️】默认相册存在并同步（保留收藏）
 * 2. 重新扫描所有本地文件夹相册，同步照片（保留收藏）
 * 3. 输出诊断日志，便于排查加载异常
 */
const refreshPhotos = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  console.log('[AlbumManager] 🔄 开始全量刷新...');

  try {
    // 诊断：刷新前的相册状态
    console.log('[AlbumManager] 刷新前相册列表:', albumStore.albums.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      path: a.path,
      photoCount: a.photoIds.length,
    })));

    // 1. 确保【爱你❤️】默认相册存在并同步
    //    Tauri 环境用后端扫描，浏览器环境用 manifest.json
    console.log('[AlbumManager] ❤️ 扫描"爱你❤️"默认相册...');
    const isTauriEnv = typeof window !== 'undefined' && '__TAURI__' in window;
    const loveResult = isTauriEnv
      ? await readMyLoveAlbum()
      : await readMyLoveAlbumWeb();
    if (loveResult && loveResult.photos.length > 0) {
      const { folder, photos } = loveResult;
      const mappedPhotos: Photo[] = photos.map(photo => ({
        id: photo.id,
        path: photo.path,
        name: photo.name,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.aspect_ratio,
        createdAt: new Date(photo.created_at),
        thumbnail: photo.thumbnail,
        mediaType: photo.media_type as 'image' | 'video',
        duration: photo.duration,
        albumIds: ['love-default'],
      } as any));

      const existing = albumStore.albums.find(a => a.id === 'love-default');
      if (existing) {
        existing.path = folder.path;
        existing.updatedAt = new Date();
        albumStore.syncAlbumPhotos('love-default', mappedPhotos);
        console.log(`[AlbumManager] ❤️ 已同步"爱你❤️"相册：${mappedPhotos.length} 个素材`);
      } else {
        const loveAlbum: Album = {
          id: 'love-default',
          name: '爱你❤️',
          description: '记录我们的每一帧心动时光',
          type: 'folder',
          path: folder.path,
          photoIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: true,
        };
        albumStore.createAlbum(loveAlbum);
        mappedPhotos.forEach(photo => albumStore.addPhoto(photo));
        console.log(`[AlbumManager] ❤️ 已创建"爱你❤️"相册：${mappedPhotos.length} 个素材`);
      }
    } else {
      console.warn('[AlbumManager] ⚠️ 未找到"爱你❤️"相册素材');
    }

    // 2. 重新扫描所有本地文件夹相册（排除已处理的 love-default）
    const folderAlbums = albumStore.albums.filter(a =>
      a.type === 'folder' && a.path && a.id !== 'love-default'
    );
    for (const album of folderAlbums) {
      if (!album.path) continue;
      console.log('[AlbumManager] 📂 重新扫描本地相册:', album.name, '| 路径:', album.path);
      try {
        const photos = await readFolder(album.path);
        const mappedPhotos: Photo[] = photos.map(photo => ({
          id: photo.id,
          path: photo.path,
          name: photo.name,
          width: photo.width,
          height: photo.height,
          aspectRatio: photo.aspect_ratio,
          createdAt: new Date(photo.created_at),
          thumbnail: photo.thumbnail,
          mediaType: photo.media_type as 'image' | 'video',
          duration: photo.duration,
          albumIds: [album.id],
        } as any));
        albumStore.syncAlbumPhotos(album.id, mappedPhotos);
        console.log(`[AlbumManager] ✅ 已同步"${album.name}"：${mappedPhotos.length} 个素材`);
      } catch (err) {
        console.error(`[AlbumManager] ❌ 扫描"${album.name}"失败:`, err);
      }
    }

    // 诊断：刷新后的相册状态
    console.log('[AlbumManager] 刷新后相册列表:', albumStore.albums.map(a => ({
      id: a.id,
      name: a.name,
      photoCount: a.photoIds.length,
    })));

    // 3. 通知父组件刷新完成（可用于重置轮播等）
    emit('refreshAll');
    console.log('[AlbumManager] ✅ 全量刷新完成');
  } catch (error) {
    console.error('[AlbumManager] ❌ 刷新失败:', error);
  } finally {
    isRefreshing.value = false;
  }
};

// 播放相册
// 标签页
const activeTab = ref<'all' | 'albums' | 'favorite'>('all');
const searchQuery = ref('');
const showCreateAlbumForm = ref(false);
const showAddPhotoForm = ref(false);
const selectedAlbumId = ref<string | null>(null);

// 计算属性用于类型检查
const isAllTab = computed(() => activeTab.value === 'all');
const isAlbumsTab = computed(() => activeTab.value === 'albums');
const isFavoriteTab = computed(() => activeTab.value === 'favorite');

// 创建相册表单
const newAlbumName = ref('');
const newAlbumDescription = ref('');
const newAlbumType = ref<'online' | 'local'>('online');
const newAlbumFolderPath = ref('');
const isCreatingAlbum = ref(false);

// 添加照片表单（仅线上相册使用）
const newPhotoUrl = ref('');
const newPhotoName = ref('');
const newPhotoWidth = ref(1920);
const newPhotoHeight = ref(1080);

// 编辑相册模式
const editingAlbumId = ref<string | null>(null);
const editingAlbumName = ref('');

// 过滤照片（全部/收藏）
const filteredPhotos = computed(() => {
  // 调试日志：检查 albumStore.photos 的状态
  if (albumStore.photos.length === 0) {
    console.warn('[AlbumManager] ⚠️ albumStore.photos 为空！activeTab:', activeTab.value, 'albums.length:', albumStore.albums.length);
  }
  
  let photos = albumStore.photos;
  
  if (activeTab.value === 'favorite') {
    photos = photos.filter(p => p.isFavorite);
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    photos = photos.filter(p => p.name.toLowerCase().includes(query));
  }
  
  return photos;
});

// 当前选中的相册
const currentAlbum = computed(() => {
  if (!selectedAlbumId.value) return null;
  return albumStore.albums.find(a => a.id === selectedAlbumId.value) || null;
});

// 当前相册的照片
const currentAlbumPhotos = computed(() => {
  if (!currentAlbum.value) return [];
  const albumPhotoIds = new Set(currentAlbum.value.photoIds);
  return albumStore.photos.filter(p => albumPhotoIds.has(p.id));
});

// 创建新相册
const handleCreateAlbum = async () => {
  if (!newAlbumName.value.trim()) {
    alert('请输入相册名称');
    return;
  }
  
  // 本地相册需要选择文件夹
  if (newAlbumType.value === 'local' && !newAlbumFolderPath.value) {
    alert('请选择本地文件夹');
    return;
  }
  
  const album: Album = {
    id: `album-${Date.now()}`,
    name: newAlbumName.value.trim(),
    description: newAlbumDescription.value.trim(),
    type: newAlbumType.value === 'local' ? 'folder' : 'virtual',
    path: newAlbumFolderPath.value || undefined,
    photoIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    coverPhotoId: null,
  };
  
  albumStore.createAlbum(album);
  console.log('[AlbumManager] ✅ 创建相册:', album.name, '| 类型:', album.type);
  
  // 如果是本地相册，自动扫描文件夹
  if (album.type === 'folder' && album.path) {
    isCreatingAlbum.value = true;
    console.log('[AlbumManager] 🔄 开始扫描本地文件夹，请稍候...');
    
    try {
      await scanLocalFolder(album);
    } finally {
      isCreatingAlbum.value = false;
    }
  }
  
  // 切换到相册标签页并选中新相册
  activeTab.value = 'albums';
  selectedAlbumId.value = album.id;
  
  // 重置表单
  newAlbumName.value = '';
  newAlbumDescription.value = '';
  newAlbumType.value = 'online';
  newAlbumFolderPath.value = '';
  showCreateAlbumForm.value = false;
};

// 扫描本地文件夹
const scanLocalFolder = async (album: Album) => {
  console.log('[AlbumManager] 📂 开始扫描本地文件夹:', album.path);

  if (!album.path) return;

  try {
    const photos = await readFolder(album.path);
    console.log('[AlbumManager] 📊 找到', photos.length, '个素材');

    if (photos.length === 0) {
      alert('该文件夹中没有找到照片或视频');
      return;
    }

    // 添加照片到相册（保留 path，由 getMediaSrc 生成 asset URL；不设 url 避免误用 base64 缩略图）
    for (const photo of photos) {
      const photoObj: Photo = {
        id: photo.id,
        path: photo.path,
        name: photo.name,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.aspect_ratio,
        createdAt: new Date(parseInt(photo.created_at) * 1000 || Date.now()),
        thumbnail: photo.thumbnail || '',
        mediaType: photo.media_type as 'image' | 'video',
        duration: photo.duration,
        isFavorite: false,
        albumIds: [album.id],
      } as any;

      albumStore.addPhoto(photoObj);
      albumStore.addPhotoToAlbum(album.id, photoObj.id);
      console.log('[AlbumManager]   ✅ 添加:', photo.name, '| 类型:', photo.media_type);
    }

    // 设置封面
    if (photos.length > 0) {
      albumStore.updateAlbum(album.id, { coverPhotoId: photos[0].id });
    }

    console.log('[AlbumManager] ✅ 文件夹扫描完成，共添加', photos.length, '个素材');
  } catch (error) {
    console.error('[AlbumManager] ❌ 扫描文件夹失败:', error);
    alert('扫描文件夹失败：' + (error as Error).message);
  }
};

// 选择本地文件夹
const handleSelectFolder = async () => {
  console.log('[AlbumManager] 📂 打开文件夹选择对话框...');
  console.log('[AlbumManager]   环境检测:', typeof window !== 'undefined' && '__TAURI__' in window ? 'Tauri' : 'Web');
  
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    alert('⚠️ 本地相册功能需要在 Tauri 桌面应用中运行\n\n请在终端运行：npm run tauri dev');
    console.log('[AlbumManager] ❌ Web 环境不支持文件夹选择');
    return;
  }
  
  const folderPath = await selectFolder();
  
  if (folderPath) {
    newAlbumFolderPath.value = folderPath;
    console.log('[AlbumManager] ✅ 选中文件夹:', folderPath);
  } else {
    console.log('[AlbumManager] ℹ️ 用户取消选择或选择失败');
  }
};

// 删除相册
const handleDeleteAlbum = (album: Album, event: Event) => {
  event.stopPropagation();
  
  const message = album.type === 'folder' 
    ? `确定要删除相册"${album.name}"吗？\n注意：这只是删除相册，不会删除本地文件夹中的照片。`
    : `确定要删除相册"${album.name}"吗？\n注意：这不会删除照片本身，只是从相册中移除。`;
  
  if (!confirm(message)) {
    return;
  }
  
  albumStore.deleteAlbum(album.id);
  console.log('[AlbumManager] ❌ 删除相册:', album.name);
  
  if (selectedAlbumId.value === album.id) {
    selectedAlbumId.value = null;
  }
};

// 开始编辑相册名称
const startEditAlbum = (album: Album, event: Event) => {
  event.stopPropagation();
  editingAlbumId.value = album.id;
  editingAlbumName.value = album.name;
};

// 保存相册名称编辑
const saveAlbumEdit = (albumId: string) => {
  if (!editingAlbumName.value.trim()) {
    alert('相册名称不能为空');
    return;
  }
  
  albumStore.updateAlbum(albumId, { name: editingAlbumName.value.trim() });
  console.log('[AlbumManager] ✏️ 更新相册名称:', editingAlbumName.value);
  
  editingAlbumId.value = null;
  editingAlbumName.value = '';
};

// 取消编辑
const cancelEdit = () => {
  editingAlbumId.value = null;
  editingAlbumName.value = '';
};

// 添加照片到当前相册（仅线上相册）
const handleAddPhoto = () => {
  if (!newPhotoUrl.value || !newPhotoName.value) {
    alert('请输入照片名称和 URL');
    return;
  }
  
  if (!currentAlbum.value) {
    alert('请先选择一个相册');
    return;
  }
  
  if (currentAlbum.value.type === 'folder') {
    alert('本地文件夹相册不能手动添加照片，请修改文件夹中的文件');
    return;
  }
  
  const photo: Photo = {
    id: `photo-${Date.now()}`,
    path: newPhotoUrl.value,
    name: newPhotoName.value,
    width: newPhotoWidth.value,
    height: newPhotoHeight.value,
    aspectRatio: newPhotoWidth.value / newPhotoHeight.value,
    createdAt: new Date(),
    thumbnail: newPhotoUrl.value.includes('/id/') 
      ? newPhotoUrl.value.replace(/\/(\d+)\/(\d+)$/, '/200/113')
      : newPhotoUrl.value,
    isFavorite: false,
  };
  
  albumStore.addPhoto(photo);
  albumStore.addPhotoToAlbum(currentAlbum.value.id, photo.id);
  
  console.log('[AlbumManager] ✅ 添加照片到相册:', photo.name, '->', currentAlbum.value.name);
  
  // 更新相册封面（如果是第一张照片）
  if (currentAlbum.value.photoIds.length === 0) {
    albumStore.updateAlbum(currentAlbum.value.id, { coverPhotoId: photo.id });
  }
  
  // 重置表单
  newPhotoUrl.value = '';
  newPhotoName.value = '';
  newPhotoWidth.value = 1920;
  newPhotoHeight.value = 1080;
  showAddPhotoForm.value = false;
  
  emit('addPhoto', photo);
};

// 从当前相册移除照片（不删除照片本身）
const handleRemoveFromAlbum = (photoId: string, event: Event) => {
  if (!currentAlbum.value) return;
  
  if (!confirm('确定要将这张照片从相册中移除吗？')) {
    return;
  }
  
  albumStore.removePhotoFromAlbum(currentAlbum.value.id, photoId);
  console.log('[AlbumManager] ➖ 从相册移除照片:', photoId);
  
  if (event) event.stopPropagation();
};

// 删除照片（从所有相册和收藏中删除）
const handleDeletePhoto = (photo: Photo, event: Event) => {
  event.stopPropagation();
  
  if (photo.isFavorite) {
    if (!confirm(`"${photo.name}" 是收藏的图片，确定要永久删除吗？`)) {
      return;
    }
    albumStore.confirmRemoveFavorite(photo.id);
  } else {
    if (!confirm(`确定要永久删除"${photo.name}"吗？`)) {
      return;
    }
  }
  
  albumStore.removePhoto(photo.id);
  console.log('[AlbumManager] 💥 永久删除照片:', photo.name);
  
  emit('removePhoto', photo.id);
};

// 切换收藏状态
const toggleFavorite = (photo: Photo, event: Event) => {
  event.stopPropagation();
  const newStatus = !photo.isFavorite;
  albumStore.toggleFavorite(photo.id, newStatus);
  console.log('[AlbumManager] ❤️ 切换收藏:', photo.name, newStatus ? '收藏' : '取消收藏');
};

// 播放当前相册
const playCurrentAlbum = () => {
  console.log('[AlbumManager] ▶️ 播放当前相册:', currentAlbum.value?.name);
  // 关键：把选中的相册设为 store 的当前相册，否则主视图不会切换
  if (selectedAlbumId.value) {
    albumStore.setCurrentAlbum(selectedAlbumId.value);
    console.log('[AlbumManager] ✅ 已切换 store 当前相册为:', currentAlbum.value?.name);
  }
  // 关闭弹窗
  emit('close');
  // 触发播放事件
  emit('playAlbum');
};

// 切换到相册标签页并选中
const selectAlbum = (albumId: string) => {
  selectedAlbumId.value = albumId;
  activeTab.value = 'albums';
};

// 监听弹窗关闭，重置状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时，重置部分状态（保留 activeTab 让用户上次看到的标签页）
    searchQuery.value = '';
    selectedAlbumId.value = null;
    showCreateAlbumForm.value = false;
    showAddPhotoForm.value = false;
    editingAlbumId.value = null;
    newAlbumName.value = '';
    newAlbumDescription.value = '';
    newAlbumType.value = 'online';
    newAlbumFolderPath.value = '';
  } else if (newVal) {
    // 弹窗打开时，默认切换到"相册"标签页（因为这里有内容）
    activeTab.value = 'albums';
    if (albumStore.albums.length > 0) {
      selectedAlbumId.value = albumStore.albums[0].id;
    }
  }
});

// ESC 键关闭
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.visible) {
      emit('close');
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
});
</script>

<template>
  <transition name="modal">
    <div v-if="visible" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="emit('close')">
      <div class="bg-gray-800 rounded-lg w-[90vw] max-w-6xl h-[85vh] flex flex-col shadow-2xl">
        <!-- 头部 -->
        <div class="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <h2 class="text-lg font-bold text-white">相册管理</h2>
          <div class="flex items-center gap-3">
            <!-- 刷新按钮 -->
            <button 
              @click="refreshPhotos" 
              class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              title="刷新照片"
              :disabled="isRefreshing"
            >
              <svg 
                class="w-5 h-5" 
                :class="{ 'animate-spin': isRefreshing }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span v-if="isRefreshing" class="text-sm">获取中...</span>
            </button>
            <button @click="emit('close')" class="text-gray-400 hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 主体内容 -->
        <div class="flex-1 flex overflow-hidden">
          <!-- 左侧：标签页 + 相册列表 -->
          <div class="w-64 bg-gray-900/50 border-r border-gray-700 flex flex-col flex-shrink-0">
            <!-- 标签页 -->
            <div class="flex border-b border-gray-700">
              <button
                @click="activeTab = 'all'"
                class="flex-1 px-2 py-3 text-xs font-medium transition-colors whitespace-nowrap"
                :class="isAllTab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'"
              >
                全部
              </button>
              <button
                @click="activeTab = 'albums'"
                class="flex-1 px-2 py-3 text-xs font-medium transition-colors whitespace-nowrap"
                :class="isAlbumsTab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'"
              >
                相册
              </button>
              <button
                @click="activeTab = 'favorite'"
                class="flex-1 px-2 py-3 text-xs font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1"
                :class="isFavoriteTab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'"
              >
                <svg class="w-3.5 h-3.5" :class="isFavoriteTab ? 'fill-blue-400' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                收藏
              </button>
            </div>
            
            <!-- 相册列表 -->
            <div v-if="isAlbumsTab" class="flex-1 overflow-y-auto p-4">
              <button
                @click="showCreateAlbumForm = true"
                class="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                + 创建相册
              </button>
              
              <div class="space-y-2">
                <div
                  v-for="album in albumStore.albums"
                  :key="album.id"
                  @click="selectAlbum(album.id)"
                  class="p-3 rounded-lg cursor-pointer transition-all group relative"
                  :class="selectedAlbumId === album.id ? 'bg-blue-600/20 border border-blue-500' : 'bg-gray-800 hover:bg-gray-700 border border-transparent'"
                >
                  <!-- 编辑模式 -->
                  <div v-if="editingAlbumId === album.id" class="flex items-center gap-2">
                    <input
                      v-model="editingAlbumName"
                      @keyup.enter="saveAlbumEdit(album.id)"
                      @keyup.esc="cancelEdit"
                      @click.stop
                      class="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                    <button @click="saveAlbumEdit(album.id)" @click.stop class="text-green-400 hover:text-green-300">✓</button>
                    <button @click="cancelEdit" @click.stop class="text-red-400 hover:text-red-300">✕</button>
                  </div>
                  
                  <!-- 显示模式 -->
                  <div v-else>
                    <div class="font-medium text-white text-sm flex items-center gap-2">
                      <span>{{ album.name }}</span>
                      <span class="text-xs px-1.5 py-0.5 rounded" 
                            :class="album.type === 'folder' ? 'bg-green-600/30 text-green-400' : 'bg-blue-600/30 text-blue-400'">
                        {{ album.type === 'folder' ? '本地' : '线上' }}
                      </span>
                    </div>
                    <div class="text-gray-500 text-xs mt-1">{{ album.photoIds.length }} 张照片</div>
                    <div v-if="album.type === 'folder' && album.path" class="text-gray-600 text-xs mt-1 truncate" :title="album.path">
                      📁 {{ album.path }}
                    </div>
                  </div>
                  
                  <!-- 操作按钮 -->
                  <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button @click="startEditAlbum(album, $event)" class="p-1 text-blue-400 hover:text-blue-300" title="编辑">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button @click="handleDeleteAlbum(album, $event)" class="p-1 text-red-400 hover:text-red-300" title="删除">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div v-if="albumStore.albums.length === 0" class="text-center py-8 text-gray-500 text-sm">
                  暂无相册，点击上方按钮创建
                </div>
              </div>
            </div>

            <!-- 全部/收藏标签页的左侧照片缩略图列表 -->
            <div v-else class="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div
                v-for="photo in filteredPhotos"
                :key="photo.id"
                class="flex items-center gap-2.5 p-1.5 rounded-lg transition-colors group cursor-pointer"
                :class="photo.isFavorite ? 'bg-red-500/5' : 'hover:bg-gray-800/60'"
                @click="toggleFavorite(photo, $event)"
              >
                <!-- 缩略图 -->
                <div class="w-10 h-10 rounded-md overflow-hidden bg-gray-700 flex-shrink-0">
                  <img
                    :src="getMediaSrc(photo)"
                    :alt="photo.name"
                    class="w-full h-full object-cover"
                  />
                </div>

                <!-- 名称 -->
                <div class="flex-1 min-w-0">
                  <div class="text-white text-xs truncate">{{ photo.name }}</div>
                </div>

                <!-- 收藏状态图标 -->
                <svg
                  class="w-4 h-4 flex-shrink-0 transition-colors"
                  :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600 fill-none'"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>

              <div v-if="filteredPhotos.length === 0" class="text-center py-8 text-gray-500 text-sm">
                {{ isFavoriteTab ? '暂无收藏照片' : '暂无照片' }}
              </div>
            </div>
          </div>

          <!-- 右侧：相册内容/照片预览 -->
          <div class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
            <!-- 相册标签页：显示相册详情 -->
            <div v-if="isAlbumsTab" class="flex-1 flex flex-col overflow-hidden">
              <!-- 未选择相册 -->
              <div v-if="!currentAlbum" class="flex-1 flex items-center justify-center text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-4">📁</div>
                  <p>选择一个相册查看内容</p>
                </div>
              </div>
              
              <!-- 相册详情 -->
              <div v-else class="flex-1 flex flex-col overflow-hidden">
                <!-- 相册信息和操作栏 -->
              <div class="p-4 border-b border-gray-700 flex items-center justify-between gap-4 flex-shrink-0">
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-bold text-white flex items-center gap-2">
                    <span class="truncate">{{ currentAlbum.name }}</span>
                    <span class="text-xs px-2 py-1 rounded flex-shrink-0" 
                          :class="currentAlbum.type === 'folder' ? 'bg-green-600/30 text-green-400' : 'bg-blue-600/30 text-blue-400'">
                      {{ currentAlbum.type === 'folder' ? '📁 本地相册' : '🌐 线上相册' }}
                    </span>
                  </h3>
                  <p v-if="currentAlbum.description" class="text-gray-400 text-xs mt-1 truncate">{{ currentAlbum.description }}</p>
                  <p class="text-gray-500 text-xs mt-1">{{ currentAlbumPhotos.length }} 张照片</p>
                  <p v-if="currentAlbum.type === 'folder' && currentAlbum.path" class="text-gray-600 text-xs mt-1 truncate max-w-[420px]" :title="currentAlbum.path">
                    📁 {{ currentAlbum.path }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div class="flex items-center gap-2">
                    <!-- 播放按钮 -->
                    <button
                      @click="playCurrentAlbum"
                      class="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                      :disabled="currentAlbumPhotos.length === 0"
                    >
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      播放
                    </button>
                    <button
                      v-if="currentAlbum.type !== 'folder'"
                      @click="showAddPhotoForm = true"
                      class="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-medium"
                    >
                      + 添加
                    </button>
                  </div>
                  <p v-if="currentAlbum.type === 'folder'" class="text-gray-500 text-xs">修改文件夹内容自动更新</p>
                </div>
            </div>

              <!-- 照片网格 -->
              <div v-if="currentAlbumPhotos.length > 0" class="flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-3 gap-4">
                <div
                  v-for="photo in currentAlbumPhotos"
                  :key="photo.id"
                  class="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <img 
                    :src="getMediaSrc(photo)"
                    :alt="photo.name"
                    class="w-full h-full object-cover cursor-pointer"
                    @click="toggleFavorite(photo, $event)"
                  />

                  <!-- 悬停操作按钮 -->
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      @click.stop="toggleFavorite(photo, $event)"
                      class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors favorite-btn"
                      :title="photo.isFavorite ? '取消收藏' : '收藏'"
                    >
                      <svg
                        class="w-4 h-4"
                        :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                    <button @click.stop="handleRemoveFromAlbum(photo.id, $event)" class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-yellow-400" title="从相册移除">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6" />
                      </svg>
                    </button>
                    <button @click.stop="handleDeletePhoto(photo, $event)" class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-red-400" title="永久删除">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                    
                    <!-- 照片信息 -->
                    <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div class="text-white text-xs truncate">{{ photo.name }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空相册 -->
              <div v-else class="flex-1 flex items-center justify-center text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-4">📷</div>
                  <p>{{ currentAlbum?.type === 'folder' ? '文件夹中没有照片' : '这个相册还没有照片' }}</p>
                  <button
                    v-if="currentAlbum?.type !== 'folder'"
                    @click="showAddPhotoForm = true"
                    class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    添加第一张照片
                  </button>
                </div>
              </div>
            </div>
          </div>

            <!-- 全部标签页：显示照片网格 -->
            <div v-if="isAllTab" class="flex-1 flex flex-col overflow-hidden">
              <!-- 顶部：搜索框和标题 -->
              <div class="p-4 border-b border-gray-700 flex-shrink-0">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-bold text-white">
                    全部照片
                    <span class="text-sm font-normal text-gray-400 ml-2">({{ filteredPhotos.length }} 张)</span>
                  </h2>
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索照片..."
                    class="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
                  />
                </div>
              </div>

              <!-- 照片网格 -->
              <div v-if="filteredPhotos.length > 0" class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-4 gap-4">
                  <div
                    v-for="photo in filteredPhotos"
                    :key="photo.id"
                    class="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group hover:ring-2 hover:ring-blue-500 transition-all"
                  >
                    <img 
                      :src="getMediaSrc(photo)" 
                      :alt="photo.name" 
                      class="w-full h-full object-cover cursor-pointer"
                      @click="toggleFavorite(photo, $event)"
                    />
                    
                    <!-- 悬停操作按钮 -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        @click.stop="toggleFavorite(photo, $event)" 
                        class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors favorite-btn"
                        :title="photo.isFavorite ? '取消收藏' : '收藏'"
                      >
                        <svg 
                          class="w-4 h-4" 
                          :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      </button>
                      <button @click.stop="handleDeletePhoto(photo, $event)" class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-red-400" title="永久删除">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <!-- 照片信息 -->
                    <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div class="text-white text-xs truncate">{{ photo.name }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="flex-1 flex items-center justify-center text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-4">📷</div>
                  <p>暂无照片</p>
                </div>
              </div>
            </div>

            <div v-if="isFavoriteTab" class="flex-1 flex flex-col overflow-hidden">
              <!-- 收藏标签页：显示照片网格 -->
              <!-- 顶部：搜索框和标题 -->
              <div class="p-4 border-b border-gray-700 flex-shrink-0">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-bold text-white">
                    收藏照片
                    <span class="text-sm font-normal text-gray-400 ml-2">({{ filteredPhotos.length }} 张)</span>
                  </h2>
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="搜索收藏..."
                    class="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
                  />
                </div>
              </div>

              <!-- 照片网格 -->
              <div v-if="filteredPhotos.length > 0" class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-4 gap-4">
                  <div
                    v-for="photo in filteredPhotos"
                    :key="photo.id"
                    class="relative aspect-square rounded-lg overflow-hidden bg-gray-800 group hover:ring-2 hover:ring-blue-500 transition-all"
                  >
                    <img 
                      :src="getMediaSrc(photo)" 
                      :alt="photo.name" 
                      class="w-full h-full object-cover cursor-pointer"
                      @click="toggleFavorite(photo, $event)"
                    />
                    
                    <!-- 悬停操作按钮 -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        @click.stop="toggleFavorite(photo, $event)" 
                        class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors favorite-btn"
                        :title="photo.isFavorite ? '取消收藏' : '收藏'"
                      >
                        <svg 
                          class="w-4 h-4" 
                          :class="photo.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            stroke-linecap="round" 
                            stroke-linejoin="round" 
                            stroke-width="2" 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      </button>
                      <button @click.stop="handleDeletePhoto(photo, $event)" class="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-red-400" title="永久删除">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <!-- 照片信息 -->
                    <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div class="text-white text-xs truncate">{{ photo.name }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="flex-1 flex items-center justify-center text-gray-500">
                <div class="text-center">
                  <div class="text-4xl mb-4">❤️</div>
                  <p>暂无收藏</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- 创建相册弹窗 -->
  <transition name="modal">
    <div v-if="showCreateAlbumForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showCreateAlbumForm = false">
      <div class="bg-gray-800 rounded-lg w-96 p-6 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-4">创建新相册</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">相册名称 *</label>
            <input
              v-model="newAlbumName"
              type="text"
              placeholder="例如：周杰伦专辑封面"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">相册类型 *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="newAlbumType = 'online'"
                class="px-4 py-3 rounded-lg border-2 transition-all"
                :class="newAlbumType === 'online' ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'"
              >
                🌐 线上相册
              </button>
              <button
                @click="newAlbumType = 'local'"
                class="px-4 py-3 rounded-lg border-2 transition-all"
                :class="newAlbumType === 'local' ? 'border-green-500 bg-green-500/20 text-green-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'"
              >
                📁 本地相册
              </button>
            </div>
          </div>
          
          <div v-if="newAlbumType === 'local'">
            <label class="block text-gray-400 text-sm mb-2">文件夹路径 *</label>
            <div class="flex gap-2">
              <input
                v-model="newAlbumFolderPath"
                type="text"
                placeholder="选择本地文件夹"
                readonly
                class="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none"
              />
              <button
                @click="handleSelectFolder"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                选择
              </button>
            </div>
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">描述（可选）</label>
            <textarea
              v-model="newAlbumDescription"
              placeholder="添加相册描述..."
              rows="3"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            ></textarea>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button 
            @click="showCreateAlbumForm = false" 
            class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            :disabled="isCreatingAlbum"
          >
            取消
          </button>
          <button 
            @click="handleCreateAlbum" 
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            :disabled="isCreatingAlbum"
          >
            <span v-if="isCreatingAlbum" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            <span>{{ isCreatingAlbum ? '创建中...' : '创建' }}</span>
          </button>
        </div>
        
        <!-- 扫描文件夹 loading 遮罩 -->
        <div v-if="isCreatingAlbum" class="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-lg">
          <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p class="text-white text-lg font-medium">正在扫描文件夹...</p>
            <p class="text-gray-400 text-sm mt-2">请稍候，正在读取图片</p>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- 添加照片弹窗 -->
  <transition name="modal">
    <div v-if="showAddPhotoForm" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @click.self="showAddPhotoForm = false">
      <div class="bg-gray-800 rounded-lg w-96 p-6 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-4">添加照片到 "{{ currentAlbum?.name }}"</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">照片名称 *</label>
            <input
              v-model="newPhotoName"
              type="text"
              placeholder="例如：范特西专辑封面"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">图片 URL *</label>
            <input
              v-model="newPhotoUrl"
              type="text"
              placeholder="https://picsum.photos/id/28/1920/1080"
              class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">宽度</label>
              <input
                v-model.number="newPhotoWidth"
                type="number"
                class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">高度</label>
              <input
                v-model.number="newPhotoHeight"
                type="number"
                class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button @click="showAddPhotoForm = false" class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
            取消
          </button>
          <button @click="handleAddPhoto" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            添加
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-gray-800,
.modal-leave-active .bg-gray-800 {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-gray-800,
.modal-leave-to .bg-gray-800 {
  transform: scale(0.95);
}
</style>
