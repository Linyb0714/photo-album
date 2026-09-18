#!/bin/bash
# 给爱的你 - Windows 安装包打包脚本（在 Windows 机器上通过 Git Bash / MSYS2 执行）
# 用法：bash build-windows.sh

set -e

echo "======================================"
echo "  给爱的你 - Windows 安装包打包"
echo "======================================"

# 检查 Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ 未检测到 cargo，请先安装 Rust: https://rustup.rs"
    exit 1
fi
echo "🔧 Rust 版本：$(cargo --version)"

# 检查 node / npm
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到 npm，请先安装 Node.js"
    exit 1
fi
echo "🔧 Node 版本：$(node --version)"

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
npm install

# 打包（自动先执行 npm run build，再执行 tauri build）
echo ""
echo "🖥️  开始打包 Windows 安装包..."
npm run tauri build

echo ""
echo "======================================"
echo "  ✅ 打包完成！"
echo "======================================"
echo ""
echo "产物位置："
echo "  NSIS 安装包: src-tauri/target/release/bundle/nsis/PhotoAlbum_*_x64-setup.exe"
echo "  MSI  安装包: src-tauri/target/release/bundle/msi/PhotoAlbum_*_x64_zh-CN.msi"
