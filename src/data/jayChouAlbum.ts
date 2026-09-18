import type { Photo, Album } from '@/types'

/**
 * 周杰伦精选默认相册数据
 * 使用本地图片路径
 */

// 默认相册配置
export const DEFAULT_ALBUM: Album = {
  id: 'jay-chou-default',
  name: '周杰伦精选',
  description: '周杰伦经典专辑封面、演唱会造型及生活写真精选',
  type: 'virtual',
  photoIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDefault: true,
  coverPhotoId: 'jay1'
}

// 默认照片数据 - 19 张 (全部使用本地图片)
export const DEFAULT_PHOTOS: Photo[] = [
  // ===== 横向图片 (4 张) =====
  {
    id: 'jay1',
    name: '专辑封面 1',
    width: 570,
    height: 380,
    aspectRatio: 3/2,
    path: '/jay-chou/photos/jay_landscape_01.webp',
    url: '/jay-chou/photos/jay_landscape_01.webp',
    thumbnail: '/jay-chou/photos/jay_landscape_01.webp',
    isFavorite: false,
    createdAt: new Date('2001-09-14'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay2',
    name: '专辑封面 2',
    width: 800,
    height: 500,
    aspectRatio: 8/5,
    path: '/jay-chou/photos/jay_landscape_02.webp',
    url: '/jay-chou/photos/jay_landscape_02.webp',
    thumbnail: '/jay-chou/photos/jay_landscape_02.webp',
    isFavorite: false,
    createdAt: new Date('2003-07-31'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay3',
    name: '专辑封面 3',
    width: 1067,
    height: 800,
    aspectRatio: 4/3,
    path: '/jay-chou/photos/jay_landscape_03.webp',
    url: '/jay-chou/photos/jay_landscape_03.webp',
    thumbnail: '/jay-chou/photos/jay_landscape_03.webp',
    isFavorite: false,
    createdAt: new Date('2004-08-03'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay4',
    name: '专辑封面 4',
    width: 688,
    height: 500,
    aspectRatio: 4/3,
    path: '/jay-chou/photos/jay_landscape_04.webp',
    url: '/jay-chou/photos/jay_landscape_04.webp',
    thumbnail: '/jay-chou/photos/jay_landscape_04.webp',
    isFavorite: false,
    createdAt: new Date('2005-11-01'),
    albumIds: ['jay-chou-default']
  },
  
  // ===== 纵向图片 (15 张) =====
  {
    id: 'jay5',
    name: '造型写真 1',
    width: 333,
    height: 499,
    aspectRatio: 333/499,
    path: '/jay-chou/photos/jay_portrait_01.webp',
    url: '/jay-chou/photos/jay_portrait_01.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_01.webp',
    isFavorite: false,
    createdAt: new Date('2006-09-05'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay6',
    name: '造型写真 2',
    width: 333,
    height: 500,
    aspectRatio: 333/500,
    path: '/jay-chou/photos/jay_portrait_02.webp',
    url: '/jay-chou/photos/jay_portrait_02.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_02.webp',
    isFavorite: false,
    createdAt: new Date('2007-05-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay7',
    name: '造型写真 3',
    width: 500,
    height: 573,
    aspectRatio: 500/573,
    path: '/jay-chou/photos/jay_portrait_05.webp',
    url: '/jay-chou/photos/jay_portrait_05.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_05.webp',
    isFavorite: false,
    createdAt: new Date('2008-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay8',
    name: '造型写真 4',
    width: 500,
    height: 532,
    aspectRatio: 500/532,
    path: '/jay-chou/photos/jay_portrait_06.webp',
    url: '/jay-chou/photos/jay_portrait_06.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_06.webp',
    isFavorite: false,
    createdAt: new Date('2009-03-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay9',
    name: '造型写真 5',
    width: 500,
    height: 597,
    aspectRatio: 500/597,
    path: '/jay-chou/photos/jay_portrait_07.webp',
    url: '/jay-chou/photos/jay_portrait_07.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_07.webp',
    isFavorite: false,
    createdAt: new Date('2010-05-18'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay10',
    name: '造型写真 6',
    width: 500,
    height: 502,
    aspectRatio: 500/502,
    path: '/jay-chou/photos/jay_portrait_08.webp',
    url: '/jay-chou/photos/jay_portrait_08.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_08.webp',
    isFavorite: false,
    createdAt: new Date('2011-11-11'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay11',
    name: '造型写真 7',
    width: 500,
    height: 583,
    aspectRatio: 500/583,
    path: '/jay-chou/photos/jay_portrait_09.webp',
    url: '/jay-chou/photos/jay_portrait_09.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_09.webp',
    isFavorite: false,
    createdAt: new Date('2012-12-28'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay12',
    name: '造型写真 8',
    width: 500,
    height: 750,
    aspectRatio: 2/3,
    path: '/jay-chou/photos/jay_portrait_10.webp',
    url: '/jay-chou/photos/jay_portrait_10.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_10.webp',
    isFavorite: false,
    createdAt: new Date('2014-12-25'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay13',
    name: '造型写真 9',
    width: 500,
    height: 625,
    aspectRatio: 4/5,
    path: '/jay-chou/photos/jay_portrait_11.webp',
    url: '/jay-chou/photos/jay_portrait_11.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_11.webp',
    isFavorite: false,
    createdAt: new Date('2016-06-24'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay14',
    name: '造型写真 10',
    width: 500,
    height: 1084,
    aspectRatio: 500/1084,
    path: '/jay-chou/photos/jay_portrait_12.webp',
    url: '/jay-chou/photos/jay_portrait_12.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_12.webp',
    isFavorite: false,
    createdAt: new Date('2004-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay15',
    name: '造型写真 11',
    width: 800,
    height: 1000,
    aspectRatio: 4/5,
    path: '/jay-chou/photos/jay_portrait_13.webp',
    url: '/jay-chou/photos/jay_portrait_13.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_13.webp',
    isFavorite: false,
    createdAt: new Date('2003-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay16',
    name: '造型写真 12',
    width: 800,
    height: 1185,
    aspectRatio: 800/1185,
    path: '/jay-chou/photos/jay_portrait_14.webp',
    url: '/jay-chou/photos/jay_portrait_14.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_14.webp',
    isFavorite: false,
    createdAt: new Date('2005-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay17',
    name: '方形写真',
    width: 500,
    height: 500,
    aspectRatio: 1,
    path: '/jay-chou/photos/jay_square_01.webp',
    url: '/jay-chou/photos/jay_square_01.webp',
    thumbnail: '/jay-chou/photos/jay_square_01.webp',
    isFavorite: false,
    createdAt: new Date('2007-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay18',
    name: '造型写真 13',
    width: 445,
    height: 530,
    aspectRatio: 445/530,
    path: '/jay-chou/photos/jay_portrait_03.webp',
    url: '/jay-chou/photos/jay_portrait_03.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_03.webp',
    isFavorite: false,
    createdAt: new Date('2010-01-01'),
    albumIds: ['jay-chou-default']
  },
  {
    id: 'jay19',
    name: '造型写真 14',
    width: 445,
    height: 530,
    aspectRatio: 445/530,
    path: '/jay-chou/photos/jay_portrait_04.webp',
    url: '/jay-chou/photos/jay_portrait_04.webp',
    thumbnail: '/jay-chou/photos/jay_portrait_04.webp',
    isFavorite: false,
    createdAt: new Date('2015-01-01'),
    albumIds: ['jay-chou-default']
  }
]

/**
 * 初始化默认相册和照片
 */
export function initializeDefaultAlbum() {
  console.log('[AlbumData] 🎵 初始化周杰伦精选默认相册')
  
  return {
    album: DEFAULT_ALBUM,
    photos: DEFAULT_PHOTOS
  }
}
