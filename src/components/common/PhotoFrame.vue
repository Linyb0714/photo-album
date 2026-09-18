<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  styleType?: 'wood' | 'metal' | 'minimal';
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'minimize'): void;
  (e: 'maximize'): void;
}>();

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

onMounted(() => {
  // 窗口拖动逻辑
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
});

const startDrag = (e: MouseEvent) => {
  if (props.styleType === 'minimal') return; // 极简风格不支持拖动
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  };
};

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const deltaX = e.clientX - dragOffset.value.x;
  const deltaY = e.clientY - dragOffset.value.y;
  
  // 使用 Tauri API 移动窗口
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    (window as any).__TAURI__.window.appWindow.translate(deltaX, deltaY);
  }
  
  dragOffset.value = { x: e.clientX, y: e.clientY };
};

const stopDrag = () => {
  isDragging.value = false;
};

const handleClose = () => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    (window as any).__TAURI__.window.appWindow.close();
  }
};

const handleMinimize = () => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    (window as any).__TAURI__.window.appWindow.minimize();
  }
};

const handleMaximize = () => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    (window as any).__TAURI__.window.appWindow.toggleMaximize();
  }
};
</script>

<template>
  <div 
    class="photo-frame relative"
    :class="[`frame-${styleType || 'wood'}`]"
  >
    <!-- 木质相框风格 -->
    <div v-if="styleType === 'wood'" class="wood-frame">
      <div class="wood-texture"></div>
      <div class="wood-border-top"></div>
      <div class="wood-border-bottom"></div>
      <div class="wood-border-left"></div>
      <div class="wood-border-right"></div>
      
      <!-- 标题栏 -->
      <div 
        class="frame-title-bar"
        @mousedown="startDrag"
      >
        <div class="window-controls">
          <button @click="handleClose" class="control-btn close">
            <span>✕</span>
          </button>
          <button @click="handleMinimize" class="control-btn minimize">
            <span>−</span>
          </button>
          <button @click="handleMaximize" class="control-btn maximize">
            <span>◻</span>
          </button>
        </div>
        <div class="frame-title">{{ title || '给爱的你' }}</div>
      </div>
      
      <!-- 装饰钉 -->
      <div class="frame-nail nail-top-left"></div>
      <div class="frame-nail nail-top-right"></div>
      <div class="frame-nail nail-bottom-left"></div>
      <div class="frame-nail nail-bottom-right"></div>
    </div>

    <!-- 金属相框风格 -->
    <div v-else-if="styleType === 'metal'" class="metal-frame">
      <div class="metal-gradient"></div>
      <div class="metal-border"></div>
      
      <!-- 标题栏 -->
      <div 
        class="frame-title-bar metal-title"
        @mousedown="startDrag"
      >
        <div class="window-controls">
          <button @click="handleClose" class="control-btn close metal">
            <span>✕</span>
          </button>
          <button @click="handleMinimize" class="control-btn minimize metal">
            <span>−</span>
          </button>
          <button @click="handleMaximize" class="control-btn maximize metal">
            <span>◻</span>
          </button>
        </div>
        <div class="frame-title">{{ title || '给爱的你' }}</div>
      </div>
      
      <!-- 金属螺丝 -->
      <div class="metal-screw screw-top-left"></div>
      <div class="metal-screw screw-top-right"></div>
      <div class="metal-screw screw-bottom-left"></div>
      <div class="metal-screw screw-bottom-right"></div>
    </div>

    <!-- 极简风格 -->
    <div v-else class="minimal-frame">
      <div class="minimal-border"></div>
      
      <!-- 标题栏 -->
      <div 
        class="frame-title-bar minimal-title"
        @mousedown="startDrag"
      >
        <div class="frame-title">{{ title || '给爱的你' }}</div>
        <div class="window-controls minimal">
          <button @click="handleClose" class="control-btn">
            <span>✕</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="frame-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.photo-frame {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 木质相框 */
.wood-frame {
  position: absolute;
  inset: 0;
  background: #8B4513;
  border: 20px solid #654321;
  box-shadow: 
    inset 0 0 50px rgba(0,0,0,0.5),
    0 10px 30px rgba(0,0,0,0.5);
}

.wood-texture {
  position: absolute;
  inset: 0;
  background: 
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.1) 2px,
      rgba(0,0,0,0.1) 4px
    ),
    linear-gradient(
      to bottom,
      #8B4513,
      #654321,
      #8B4513
    );
  opacity: 0.6;
}

.wood-border-top,
.wood-border-bottom,
.wood-border-left,
.wood-border-right {
  position: absolute;
  background: linear-gradient(
    45deg,
    #654321,
    #8B4513,
    #654321
  );
}

.wood-border-top {
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.3);
}

.wood-border-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  box-shadow: inset 0 -2px 5px rgba(0,0,0,0.3);
}

.wood-border-left {
  top: 0;
  bottom: 0;
  left: 0;
  width: 20px;
  box-shadow: inset 2px 0 5px rgba(0,0,0,0.3);
}

.wood-border-right {
  top: 0;
  bottom: 0;
  right: 0;
  width: 20px;
  box-shadow: inset -2px 0 5px rgba(0,0,0,0.3);
}

/* 金属相框 */
.metal-frame {
  position: absolute;
  inset: 0;
  background: #2C3E50;
  border: 25px solid #34495E;
  box-shadow: 
    inset 0 0 30px rgba(0,0,0,0.3),
    0 10px 40px rgba(0,0,0,0.4);
}

.metal-gradient {
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(
      135deg,
      rgba(255,255,255,0.1) 0%,
      transparent 50%,
      rgba(0,0,0,0.2) 100%
    );
  pointer-events: none;
}

.metal-border {
  position: absolute;
  inset: -25px;
  background: linear-gradient(
    45deg,
    #34495E,
    #2C3E50,
    #34495E,
    #2C3E50
  );
  border: 3px solid #7F8C8D;
  box-shadow: 
    inset 0 0 20px rgba(0,0,0,0.5),
    0 0 10px rgba(255,255,255,0.1);
}

/* 极简风格 */
.minimal-frame {
  position: absolute;
  inset: 0;
  background: transparent;
}

.minimal-border {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  pointer-events: none;
}

/* 标题栏 */
.frame-title-bar {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  cursor: grab;
  user-select: none;
  z-index: 1000;
}

.frame-title-bar:active {
  cursor: grabbing;
}

.wood-frame .frame-title-bar {
  background: linear-gradient(
    to bottom,
    #A0522D,
    #8B4513
  );
  border-radius: 8px 8px 0 0;
  border: 2px solid #654321;
  border-bottom: none;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.metal-frame .frame-title-bar {
  background: linear-gradient(
    to bottom,
    #4A5568,
    #2D3748
  );
  border-radius: 8px 8px 0 0;
  border: 2px solid #718096;
  border-bottom: none;
  box-shadow: 0 2px 5px rgba(0,0,0,0.4);
}

.minimal-frame .frame-title-bar {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px 8px 0 0;
  border: 1px solid rgba(255,255,255,0.1);
  border-bottom: none;
}

.frame-title {
  color: #8B4513;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(255,255,255,0.2);
}

.wood-frame .frame-title {
  color: #F5DEB3;
}

.metal-frame .frame-title {
  color: #E2E8F0;
}

.minimal-frame .frame-title {
  color: #FFFFFF;
}

/* 窗口控制按钮 */
.window-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
  background: #95a5a6;
  color: transparent;
}

.control-btn:hover {
  transform: scale(1.1);
}

.control-btn.close {
  background: #e74c3c;
}

.control-btn.minimize {
  background: #f39c12;
}

.control-btn.maximize {
  background: #27ae60;
}

.wood-frame .control-btn {
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
}

.metal-frame .control-btn.metal {
  background: #7F8C8D;
  border: 1px solid #95A5A6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

/* 装饰钉 */
.frame-nail {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    #FFD700,
    #B8860B
  );
  box-shadow: 
    0 2px 4px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(255,255,255,0.5);
}

.nail-top-left {
  top: 10px;
  left: 10px;
}

.nail-top-right {
  top: 10px;
  right: 10px;
}

.nail-bottom-left {
  bottom: 10px;
  left: 10px;
}

.nail-bottom-right {
  bottom: 10px;
  right: 10px;
}

/* 金属螺丝 */
.metal-screw {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    #BDC3C7,
    #7F8C8D
  );
  box-shadow: 
    0 2px 4px rgba(0,0,0,0.4),
    inset 0 1px 2px rgba(255,255,255,0.3);
}

.metal-screw::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 2px;
  background: #5D6D7E;
  transform: translate(-50%, -50%) rotate(45deg);
}

.screw-top-left {
  top: 12px;
  left: 12px;
}

.screw-top-right {
  top: 12px;
  right: 12px;
}

.screw-bottom-left {
  bottom: 12px;
  left: 12px;
}

.screw-bottom-right {
  bottom: 12px;
  right: 12px;
}

/* 内容区域 */
.frame-content {
  flex: 1;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.8);
  margin: 20px;
  border-radius: 4px;
}

.wood-frame .frame-content {
  margin: 40px 20px 20px 20px;
}

.metal-frame .frame-content {
  margin: 45px 20px 20px 20px;
}

.minimal-frame .frame-content {
  margin: 40px 15px 15px 15px;
}
</style>
