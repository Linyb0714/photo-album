# Tauri 本地相册使用指南

## 🚀 启动应用

### 开发模式
```bash
npm run tauri dev
```

### 生产构建
```bash
npm run tauri build
```

## 📁 创建本地相册步骤

### 1. 打开相册管理
- 点击左侧菜单的 "📁 相册管理"

### 2. 创建新相册
- 点击 "+ 创建相册" 按钮

### 3. 选择相册类型
- 点击 "📁 本地相册" 选项

### 4. 选择文件夹
- 点击 "选择" 按钮
- 在弹出的系统对话框中选择文件夹
- **重要**：确保文件夹包含图片文件（.jpg, .png, .webp 等）

### 5. 确认创建
- 输入相册名称
- 可选：输入描述
- 点击 "创建"

### 6. 自动扫描
- 系统会自动扫描文件夹中的所有图片
- 显示扫描进度和结果
- 第一张图片自动设为封面

## 🔍 控制台日志

### 成功执行
```
[AlbumManager] 📂 打开文件夹选择对话框...
[AlbumManager]   环境检测：Tauri
[AlbumManager] ✅ 选中文件夹：/Users/xxx/Pictures/旅行
[Tauri] select_folder 命令被调用
[Tauri] 选中文件夹：Some("/Users/xxx/Pictures/旅行")
[AlbumManager] 📁 创建相册：旅行照片 | 类型：folder
[AlbumManager] 📂 开始扫描本地文件夹：/Users/xxx/Pictures/旅行
[AlbumManager] 📊 找到 15 张照片
[AlbumManager]   ✅ 添加：IMG_001.jpg
[AlbumManager]   ✅ 添加：IMG_002.jpg
...
[AlbumManager] ✅ 文件夹扫描完成
```

### 用户取消
```
[AlbumManager] 📂 打开文件夹选择对话框...
[AlbumManager]   环境检测：Tauri
[AlbumManager] ℹ️ 用户取消选择或选择失败
```

### Web 环境（不支持）
```
[AlbumManager] 📂 打开文件夹选择对话框...
[AlbumManager]   环境检测：Web
[AlbumManager] ❌ Web 环境不支持文件夹选择
```
→ 弹出 alert 提示

## ⚠️ 常见问题

### 问题 1: 点击"选择"后无响应
**原因**: macOS 权限问题

**解决方法**:
1. 打开 "系统偏好设置" → "安全性与隐私" → "隐私"
2. 检查 "文件夹" 权限
3. 确保 "PhotoAlbum" 有访问权限
4. 如果没有，点击 "+" 添加应用

### 问题 2: 扫描后没有照片
**原因**: 文件夹中没有支持的图片格式

**解决方法**:
- 确保文件夹包含以下格式的图片:
  - .jpg, .jpeg
  - .png
  - .gif
  - .webp
  - .bmp
  - .heic, .heif

### 问题 3: 编译错误
**原因**: Rust 依赖问题

**解决方法**:
```bash
cd src-tauri
cargo clean
cargo build
```

### 问题 4: 对话框卡在后台
**原因**: macOS 窗口焦点问题

**解决方法**:
- 点击应用窗口使其成为前台窗口
- 重新点击"选择"按钮

## 🛠️ 调试技巧

### 查看 Rust 日志
```bash
# 在终端运行
npm run tauri dev 2>&1 | grep -i "tauri\|select_folder"
```

### 查看前端日志
打开浏览器开发者工具 (F12) → Console 标签

### 测试文件夹选择
在控制台中运行:
```javascript
window.__TAURI__.core.invoke('select_folder').then(result => {
  console.log('选中:', result);
}).catch(err => {
  console.error('失败:', err);
});
```

## 📋 支持的图片格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| JPEG | .jpg, .jpeg | 最常用 |
| PNG | .png | 支持透明 |
| WebP | .webp | 现代格式 |
| GIF | .gif | 支持动画 |
| BMP | .bmp | 位图 |
| HEIC | .heic, .heif | Apple 格式 |

## 🔄 更新相册内容

本地相册的内容由文件夹决定:
1. 在文件夹中添加/删除/修改图片
2. 在应用中**刷新页面** (Cmd+R)
3. 系统重新扫描文件夹
4. 相册内容自动更新

## 💡 提示

- **性能**: 大文件夹扫描可能需要几秒到几分钟
- **缩略图**: 目前使用原始路径，后续会生成缩略图缓存
- **权限**: 首次访问文件夹时 macOS 会请求权限，请允许
- **路径**: 建议使用英文路径，避免特殊字符
