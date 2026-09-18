# 快速启动指南

## 当前状态

✅ **已完成功能：**
- Vue 3 + TypeScript 项目初始化
- TailwindCSS 样式配置
- Pinia 状态管理
- 6 种相框模版框架
- 点击唤醒菜单（智能左右方向 + 贴边检测）
- 12 秒自动关闭菜单
- 悬停 3 秒触发增强模式
- 3D 浮动和视差效果
- 轮播功能框架
- 设置面板

## 启动开发服务器

```bash
# 开发服务器已在运行
# 访问：http://localhost:5173
```

## 功能使用说明

### 1. 点击唤醒菜单
- 点击页面任意位置
- 菜单会从左侧或右侧滑出（取决于点击位置）
- 点击左侧边缘（< 100px）→ 菜单从右侧弹出
- 默认点击 → 菜单从左侧弹出

### 2. 菜单自动关闭
- 菜单打开后 12 秒自动关闭
- 点击空白处手动关闭
- 按 ESC 键关闭

### 3. 悬停 3D 效果
- 鼠标静止悬停 3 秒
- 照片会产生 3D 浮动效果
- 明显阴影和视差跟随
- 鼠标移动后退出增强模式

### 4. 切换模版
- 点击菜单中的"切换模版"
- 选择 6 种相框模版：
  - 网格相框
  - 瀑布流
  - 拼贴相框
  - 时间轴
  - 画廊
  - 杂志

### 5. 设置
- 点击菜单中的"设置"
- 可以配置：
  - 相框模版
  - 轮播间隔（3s/5s/10s/30s/1m）
  - 轮播动画
  - 悬停 3D 效果开关
  - 菜单自动关闭时间

## 待实现功能

### 高优先级
- [ ] Tauri 桌面应用集成
- [ ] 本地文件扫描和加载
- [ ] 导出功能（GIF/MP4/WebM）
- [ ] 相册分类管理

### 中优先级
- [ ] 缩略图缓存优化
- [ ] 照片元数据读取（EXIF）
- [ ] 更多切换动画
- [ ] 主题切换

### 低优先级
- [ ] 照片编辑功能
- [ ] 云端同步
- [ ] 社交分享

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **UI**: TailwindCSS
- **状态管理**: Pinia
- **工具库**: @vueuse/core
- **桌面框架**: Tauri 2.0（待集成）

## 开发提示

### 添加新模版
1. 在 `src/composables/useFrameLayout.ts` 中添加新的布局计算函数
2. 在 `src/components/Photo/PhotoGrid.vue` 中添加模版渲染逻辑
3. 在菜单中添加模版选项

### 自定义效果
- 3D 效果参数在 `src/composables/useHoverEnhancement.ts`
- 菜单配置在 `src/stores/settings.ts`
- CSS 动画在组件的 `<style>` 标签中

## 调试

打开浏览器开发者工具（F12）查看：
- Console: 查看日志和错误
- Vue DevTools: 查看组件和状态
- Network: 查看图片加载

## 构建生产版本

```bash
npm run build
npm run preview  # 预览生产版本
```

## 打包桌面应用（需要 Rust）

```bash
# 安装 Tauri CLI
npm install -D @tauri-apps/cli

# 初始化 Tauri
npx tauri init

# 开发模式
npm run tauri dev

# 构建桌面应用
npm run tauri build
```
