# 优化记录日志

## 2024-08-25: 图片加载优化与交互改进

### ✅ 已完成

#### 1. 图片加载优化
- **固定图片 ID**：使用 `picsum.photos/id/{ID}/width/height` 替代 `?random=N`
- **缩略图优先加载**：先加载 200px 缩略图，后台加载高清图，5 秒超时降级
- **效果**：首次 1-2 秒显示低分辨率，后续从缓存读取几乎瞬间

#### 2. 歌词艺术字效果
- **三层金黄色光晕**：`text-shadow: 0 0 10px/20px/30px rgba(250, 204, 21, ...)`
- **字母间距**：`letter-spacing: 1px`
- **字体大小**：歌词 `text-lg`，信息 `text-sm`

#### 3. 默认开启幻灯片播放
- **间隔时间**：12 秒自动切换
- **动画效果**：淡入淡出过渡

#### 4. 幻灯片进度条优化
- **晨光风格**：蓝灰色背景 + 白色晨光进度
- **宽度**：占 1/3，居中显示
- **呼吸动画**：3 秒周期柔和脉动

#### 5. 闲置自动播放功能
- **设置选项**：`autoPlayAfterIdle`（可关闭）
- **逻辑**：30 秒无操作 → 提示 → 15 秒倒计时 → 自动播放
- **防抖机制**：每次操作重置 30 秒计时

#### 6. 交互防抖处理
- **切换按钮防冒泡**：`@click.stop`
- **点击防抖**：200ms 阈值

#### 7. 应用标题更新
- Web 端 & Tauri 客户端：`给爱的你`

### 📂 修改文件

1. `src/App.vue` - 固定图片 ID，添加缩略图 URL
2. `src/components/Photo/PhotoItem.vue` - 缩略图加载、歌词艺术字、点击防抖
3. `src/components/Photo/AlbumView.vue` - 幻灯片逻辑、进度条、闲置自动播放
4. `src/components/Menu/SettingsPanel.vue` - 闲置自动播放开关
5. `src/types/index.ts` - 添加 `autoPlayAfterIdle` 字段
6. `src/stores/settings.ts` - 默认值设置
7. `index.html` & `tauri.conf.json` - 应用标题

### 🎯 下一步计划

- [ ] Tauri 桌面端打包测试
- [ ] 本地文件夹读取功能实现
- [ ] 导出功能（GIF/MP4/WebM）
- [ ] 相册分类管理
