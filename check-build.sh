#!/bin/bash
echo "======================================"
echo "  检查桌面应用构建状态"
echo "======================================"

BUILD_DIR="/Volumes/Macintosh HD/code/innovate/photo-album/src-tauri/target/release"

if [ -d "$BUILD_DIR" ]; then
  echo ""
  echo "📦 构建产物:"
  ls -lh "$BUILD_DIR"/PhotoAlbum* 2>/dev/null || echo "  应用正在构建中..."
  
  echo ""
  echo "📁 安装包位置:"
  ls -lh "$BUILD_DIR/bundle/dmg/"*.dmg 2>/dev/null && echo "  ✅ macOS DMG 已就绪" || echo "  ⏳ macOS DMG 尚未完成"
  ls -lh "$BUILD_DIR/bundle/msi/"*.msi 2>/dev/null && echo "  ✅ Windows MSI 已就绪" || echo "  ⏳ Windows MSI 尚未完成"
  ls -lh "$BUILD_DIR/bundle/deb/"*.deb 2>/dev/null && echo "  ✅ Linux DEB 已就绪" || echo "  ⏳ Linux DEB 尚未完成"
else
  echo "⏳ 构建目录不存在，正在后台构建..."
fi

echo ""
echo "🔍 后台进程:"
ps aux | grep -E "(cargo|rustc)" | grep -v grep | wc -l | xargs -I {} echo "  正在运行 {} 个 Rust 编译进程"
