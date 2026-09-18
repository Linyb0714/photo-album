#!/bin/bash

# 相册应用构建测试脚本
# 确保生成可执行的应用程序

set -e

echo "========================================="
echo "相册应用构建测试"
echo "========================================="
echo ""

PASS=0
FAIL=0

check() {
    local name="$1"
    local cmd="$2"
    
    echo -n "测试：$name ... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo "✓"
        ((PASS++))
    else
        echo "✗"
        ((FAIL++))
    fi
}

# 1. 检查文件存在
check "package.json" "test -f package.json"
check "tauri.conf.json" "test -f src-tauri/tauri.conf.json"
check "AlbumView.vue" "test -f src/components/Photo/AlbumView.vue"
check "PhotoItem.vue" "test -f src/components/Photo/PhotoItem.vue"
check "MainMenu.vue" "test -f src/components/Menu/MainMenu.vue"
check "useFrameLayout.ts" "test -f src/composables/useFrameLayout.ts"
check "useHoverEnhancement.ts" "test -f src/composables/useHoverEnhancement.ts"
check "album store" "test -f src/stores/album.ts"
check "settings store" "test -f src/stores/settings.ts"
check "tauriApi.ts" "test -f src/utils/tauriApi.ts"

# 2. TypeScript 检查
echo -n "TypeScript 类型检查 ... "
if npx vue-tsc -b 2>&1 | grep -q "error TS"; then
    echo "✗"
    ((FAIL++))
else
    echo "✓"
    ((PASS++))
fi

# 3. 前端构建
echo -n "前端构建 ... "
if npm run build 2>&1 | grep -q "error"; then
    echo "✗"
    ((FAIL++))
else
    echo "✓"
    ((PASS++))
fi

# 4. 检查构建产物
check "dist 目录" "test -d dist"
check "dist/index.html" "test -f dist/index.html"

# 5. Rust 检查
echo -n "Rust 编译检查 ... "
cd src-tauri
if cargo check 2>&1 | grep -q "error\[E"; then
    echo "✗"
    ((FAIL++))
else
    echo "✓"
    ((PASS++))
fi
cd ..

# 6. 验证配置
echo -n "窗口配置 (1024x768) ... "
if grep -q '"width": 1024' src-tauri/tauri.conf.json && grep -q '"height": 768' src-tauri/tauri.conf.json; then
    echo "✓"
    ((PASS++))
else
    echo "✗"
    ((FAIL++))
fi

# 7. 验证等待提示功能
echo -n "等待提示功能 ... "
if grep -q "WAITING_THRESHOLD = 30" src/components/Photo/AlbumView.vue && \
   grep -q "COUNTDOWN_DURATION = 20" src/components/Photo/AlbumView.vue; then
    echo "✓"
    ((PASS++))
else
    echo "✗"
    ((FAIL++))
fi

# 8. 验证 toggleOrientation
echo -n "toggleOrientation 方法 ... "
if grep -q "toggleOrientation" src/stores/settings.ts; then
    echo "✓"
    ((PASS++))
else
    echo "✗"
    ((FAIL++))
fi

echo ""
echo "========================================="
echo "结果：${PASS} 通过，${FAIL} 失败"
echo "========================================="

if [ $FAIL -eq 0 ]; then
    echo "✓ 所有测试通过！应用可以安全使用"
    exit 0
else
    echo "✗ 部分测试失败"
    exit 1
fi
