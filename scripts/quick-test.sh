#!/bin/bash

# 快速验证脚本 - 确保应用可执行

echo "========================================="
echo "相册应用快速验证"
echo "========================================="
echo ""

ERRORS=0

# 1. TypeScript 检查
echo -n "1. TypeScript 类型检查 ... "
if npx vue-tsc -b 2>&1 | grep -q "error TS"; then
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ 通过"
fi

# 2. 前端构建
echo -n "2. 前端构建 ... "
if npm run build > /tmp/build.log 2>&1; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
    cat /tmp/build.log | tail -10
fi

# 3. 检查构建产物
echo -n "3. 检查 dist 目录 ... "
if [ -d dist ] && [ -f dist/index.html ]; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

# 4. 验证窗口配置
echo -n "4. 窗口配置 (1024x768) ... "
if grep -q '"width": 1024' src-tauri/tauri.conf.json && grep -q '"height": 768' src-tauri/tauri.conf.json; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

# 5. 验证等待提示功能
echo -n "5. 等待提示功能 (30s/20s) ... "
if grep -q "WAITING_THRESHOLD = 30" src/components/Photo/AlbumView.vue && \
   grep -q "COUNTDOWN_DURATION = 20" src/components/Photo/AlbumView.vue; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

# 6. 验证 toggleOrientation
echo -n "6. toggleOrientation 方法 ... "
if grep -q "toggleOrientation" src/stores/settings.ts; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

# 7. 检查关键组件
echo -n "7. 关键组件文件 ... "
if [ -f src/components/Photo/AlbumView.vue ] && \
   [ -f src/components/Photo/PhotoItem.vue ] && \
   [ -f src/components/Menu/MainMenu.vue ]; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

# 8. 检查 CSP 策略
echo -n "8. CSP 策略 (本地图片) ... "
if grep -q "img-src 'self' data: blob:" src-tauri/tauri.conf.json; then
    echo "✓ 通过"
else
    echo "✗ 失败"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "========================================="
echo "验证结果：$ERRORS 个错误"
echo "========================================="

if [ $ERRORS -eq 0 ]; then
    echo "✓ 应用验证通过，可以安全使用"
    echo ""
    echo "运行命令:"
    echo "  npm run tauri dev   # 开发模式"
    echo "  npm run tauri build # 构建发布版"
    exit 0
else
    echo "✗ 应用存在错误，请修复后再使用"
    exit 1
fi
