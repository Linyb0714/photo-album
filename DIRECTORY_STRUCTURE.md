# 📁 周杰伦主题相册 - 目录结构

## 物料存放目录

```
public/
└── jay-chou/
    ├── covers/           # 专辑封面 (横向图片 16:9, 3:2, 4:3)
    │   ├── fantasy_cover.jpg          # 范特西
    │   ├── ye_hui_mei_cover.jpg       # 叶惠美
    │   ├── qi_li_xiang_cover.jpg      # 七里香
    │   ├── november_chopin.jpg        # 十一月的肖邦
    │   ├── still_fantasy.jpg          # 依然范特西
    │   ├── across_time.jpg            # 跨时代
    │   ├── exclamation.jpg            # 惊叹号
    │   ├── 12_new_works.jpg           # 十二新作
    │   ├── oh_yeah.jpg                # 哎呦不错哦
    │   └── bedtime_stories.jpg        # 床边故事
    │
    ├── concert/          # 演唱会/造型 (纵向图片 9:16, 2:3, 3:4)
    │   ├── cowboy.jpg     # 牛仔造型
    │   ├── classic.jpg    # 古典造型
    │   ├── hiphop.jpg     # 嘻哈造型
    │   ├── gentleman.jpg  # 绅士造型
    │   ├── sports.jpg     # 运动造型
    │   └── piano.jpg      # 钢琴演奏
    │
    ├── photos/           # 生活写真 (混合比例)
    │   ├── guitar.jpg       # 吉他独奏
    │   ├── director.jpg     # 导演工作照
    │   ├── stage.jpg        # 演唱会舞台
    │   └── fang_wenshan.jpg # 方文山合作
    │
    ├── backgrounds/      # 背景图片 (1920x1080)
    │
    └── README.md          # 本目录说明
```

## 数据文件

```
src/
└── data/
    └── jayChouAlbum.ts    # 默认相册配置和照片数据
```

## 图片规格建议

### 专辑封面类 (横向)
- **推荐尺寸**: 1920×1080, 2560×1440
- **比例**: 16:9, 3:2, 4:3, 8:5
- **用途**: 轮播展示、网格布局

### 演唱会类 (纵向)
- **推荐尺寸**: 1080×1920, 1280×1920
- **比例**: 9:16, 2:3, 3:4, 5:8
- **用途**: 瀑布流、时间轴

### 生活写真类 (混合)
- **推荐尺寸**: 1080×1080 (方形), 1200×1600
- **比例**: 1:1, 3:4, 4:5
- **用途**: 画廊、杂志布局

## 使用方法

### 1. 准备周杰伦照片
将周杰伦相关照片放入对应目录：
- 专辑封面 → `covers/`
- 演唱会造型 → `concert/`
- 生活写真 → `photos/`

### 2. 命名规范
```
专辑封面：jay_{专辑名}_cover.jpg
演唱会：jay_concert_{造型名}.jpg
生活照：jay_{场景名}.jpg
```

### 3. 自动加载
应用启动时会自动加载默认相册"周杰伦精选"，包含 20 张精选照片。

### 4. 自定义相册
后续可以通过相册管理功能创建自定义相册。

## 当前默认相册

**周杰伦精选** (20 张照片)
- ✅ 10 张专辑封面风格
- ✅ 6 张演唱会造型
- ✅ 4 张生活写真

使用 picsum.photos 固定 ID 图片，确保一致性。

## 下一步

1. 将真实周杰伦照片放入 `public/jay-chou/` 对应目录
2. 更新 `src/data/jayChouAlbum.ts` 中的照片路径
3. 创建自定义相册（后续功能）
