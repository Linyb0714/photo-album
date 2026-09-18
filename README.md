# 相册应用 - 桌面端版本

## 🎉 项目状态

这是一个跨平台的桌面端相册应用，基于 **Tauri 2.0** + **Vue 3** 构建。

### ✨ 核心功能

#### 1. 智能交互
- **点击唤醒菜单**：点击任意位置弹出功能菜单
- **智能贴边检测**：点击左侧边缘 (<100px) 菜单从右侧弹出，默认左侧
- **12 秒自动关闭**：菜单不动 12 秒后自动消失
- **ESC/点击关闭**：手动关闭菜单

#### 2. 3D 悬停效果
- **3 秒触发**：鼠标静止悬停 3 秒激活
- **马赛克碎片化**：照片间距增加，像碎片一样分散
- **明显阴影**：深阴影增强立体感
- **3D 浮现**：照片向上浮起，带透视效果
- **浮动动画**：照片上下轻微浮动
- **视差跟随**：鼠标移动时照片有轻微视差效果

#### 3. 6 种相框模版
- **网格相框**：规则 3x2 网格布局
- **瀑布流**：Masonry 布局，适合竖图横图混合
- **拼贴相框**：智能 bin-packing 拼接
- **时间轴**：按时间顺序线性排列
- **画廊**：大图主图 + 缩略图导航
- **杂志**：不规则艺术排版

#### 4. 完整功能菜单
- ✅ 添加相册（选择本地文件夹）
- ✅ 删除照片
- ✅ 上一张/下一张
- ✅ 轮播开关
- ✅ 全屏模式
- ✅ 导出（GIF/MP4/WebM）
- ✅ 设置面板
- ✅ 切换模版

#### 5. 桌面端特性
- 🖥️ **原生文件系统访问**：直接读取本地照片文件夹
- 📁 **自动扫描**：支持递归扫描子文件夹
- 🖼️ **缩略图生成**：自动创建缩略图提升性能
- 📊 **系统文件夹检测**：自动发现 Pictures、Desktop 等常用文件夹
- 🎨 **跨平台支持**：macOS、Windows、Linux

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- Rust >= 1.77
- Xcode Command Line Tools (macOS)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# Web 开发（浏览器）
npm run dev

# Tauri 桌面应用开发
npm run tauri dev
```

### 构建桌面应用

```bash
# 构建所有平台
npm run tauri build

# macOS
npm run tauri build -- --target aarch64-apple-darwin

# Windows
npm run tauri build -- --target x86_64-pc-windows-msvc

# Linux
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

构建产物位于 `src-tauri/target/release/`

## 📁 项目结构

```
photo-album/
├── src/                          # Vue 前端源码
│   ├── components/
│   │   ├── Menu/
│   │   │   ├── MainMenu.vue      # 主菜单
│   │   │   └── SettingsPanel.vue # 设置面板
│   │   ├── Photo/
│   │   │   ├── PhotoGrid.vue     # 照片网格
│   │   │   └── PhotoItem.vue     # 单张照片
│   │   └── common/
│   │       └── Placeholder.vue   # 占位图
│   ├── composables/
│   │   ├── useCarousel.ts        # 轮播逻辑
│   │   ├── useFrameLayout.ts     # 布局计算
│   │   └── useHoverEnhancement.ts # 悬停效果
│   ├── stores/
│   │   ├── album.ts              # 相册管理
│   │   └── settings.ts           # 设置管理
│   ├── utils/
│   │   ├── tauriApi.ts           # Tauri API 封装
│   │   └── image.ts              # 图片处理
│   ├── types/
│   │   └── index.ts              # 类型定义
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 入口文件
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── lib.rs                # 核心逻辑
│   │   └── main.rs               # 入口
│   ├── icons/                    # 应用图标
│   ├── Cargo.toml                # Rust 依赖
│   └── tauri.conf.json           # Tauri 配置
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🔧 技术栈

### 前端
- **Vue 3** + **TypeScript**
- **Vite** - 极速开发体验
- **TailwindCSS 3** - 实用优先 CSS
- **Pinia** - 状态管理
- **@vueuse/core** - Vue 组合式 API 工具集

### 桌面端
- **Tauri 2.0** - 轻量级桌面框架
- **Rust** - 高性能后端逻辑
- **image** - 图片处理
- **walkdir** - 递归目录扫描
- **tauri-plugin-fs** - 文件系统插件
- **tauri-plugin-dialog** - 对话框插件

## 📝 使用说明

### 添加相册
1. 点击页面任意位置打开菜单
2. 点击"添加照片"按钮
3. 选择包含照片的文件夹
4. 应用会自动扫描并加载所有照片

### 切换模版
1. 打开菜单
2. 点击"切换模版"
3. 选择喜欢的相框样式

### 设置
1. 打开菜单
2. 点击"设置"
3. 配置：
   - 相框模版
   - 轮播间隔（3s/5s/10s/30s/1m）
   - 轮播动画
   - 悬停 3D 效果开关
   - 菜单自动关闭时间

### 快捷键
- `ESC` - 关闭菜单
- `←` - 上一张
- `→` - 下一张
- `F` - 全屏
- `Space` - 暂停/继续轮播

## 🎯 待实现功能

### 高优先级
- [ ] GIF/MP4/WebM 导出功能
- [ ] 照片编辑（旋转、裁剪）
- [ ] 相册分类管理
- [ ] 搜索和过滤

### 中优先级
- [ ] 照片元数据读取（EXIF）
- [ ] 更多切换动画
- [ ] 主题切换（深色/浅色）
- [ ] 快捷键自定义

### 低优先级
- [ ] 云端同步
- [ ] 社交分享
- [ ] AI 智能分类
- [ ] 照片识别

## 📦 打包发布

### macOS
```bash
npm run tauri build
# 产物：src-tauri/target/release/bundle/dmg/PhotoAlbum_*.dmg
```

### Windows
```bash
npm run tauri build
# 产物：src-tauri/target/release/bundle/msi/PhotoAlbum_*.msi
```

### Linux
```bash
npm run tauri build
# 产物：src-tauri/target/release/bundle/deb/PhotoAlbum_*.deb
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
