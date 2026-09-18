#!/bin/bash

# 相册应用构建和发布脚本

set -e

echo "========================================="
echo "相册应用构建发布"
echo "========================================="
echo ""

# 1. 运行快速验证
echo "步骤 1/5: 运行验证测试..."
./scripts/quick-test.sh || exit 1

# 2. 清理旧构建
echo ""
echo "步骤 2/5: 清理旧构建..."
rm -rf dist
rm -rf src-tauri/target/release/*.app

# 3. 前端构建
echo ""
echo "步骤 3/5: 构建前端..."
npm run build

# 4. Rust 构建
echo ""
echo "步骤 4/5: 构建 Rust 后端 (这可能需要几分钟)..."
cd src-tauri
cargo build --release
cd ..

# 5. 显示构建产物
echo ""
echo "步骤 5/5: 构建产物..."
echo ""
echo "前端构建:"
ls -lh dist/ | head -10

echo ""
echo "桌面应用:"
if [ -d src-tauri/target/release/bundle/macos ]; then
    ls -lh src-tauri/target/release/bundle/macos/
else
    echo "macOS 应用未找到"
fi

echo ""
echo "========================================="
echo "✓ 构建完成！"
echo "========================================="
echo ""
echo "应用位置:"
echo "  macOS: src-tauri/target/release/bundle/macos/PhotoAlbum.app"
echo ""
echo "可以直接拖拽到应用程序文件夹使用"
