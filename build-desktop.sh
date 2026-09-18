#!/bin/bash

# 相册应用 - 桌面端构建脚本

echo "======================================"
echo "  相册应用 - 桌面端构建"
echo "======================================"

# 设置环境变量
export PATH="$HOME/.cargo/bin:$PATH"

# 检查 Rust 是否安装
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装或环境变量未配置"
    echo "正在安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 检查 Rust 版本
echo "🔧 Rust 版本："
cargo --version
rustc --version

# 构建前端
echo ""
echo "📦 构建前端..."
npm run build

# 构建桌面应用
echo ""
echo "🖥️  构建桌面应用..."
npm run tauri build

echo ""
echo "======================================"
echo "  ✅ 构建完成！"
echo "======================================"
echo ""
echo "应用位置："
echo "  macOS: src-tauri/target/release/bundle/dmg/"
echo "  Windows: src-tauri/target/release/bundle/msi/"
echo "  Linux: src-tauri/target/release/bundle/deb/"
