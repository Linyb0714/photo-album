<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  frameStyle: 'wood' | 'metal' | 'minimal';
}>();

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const handles: Dir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const rootRef = ref<HTMLElement | null>(null);
const frameWidth = ref(0);
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// 风格 id 与外观类名解耦（metal 槽位现在是"杰伦·太阳之子"）
const frameClassMap: Record<string, string> = {
  wood: 'frame-wood',
  metal: 'frame-jay',
  minimal: 'frame-white',
};
const frameClass = computed(() => frameClassMap[props.frameStyle] || 'frame-wood');

// 窗口太窄时徽章/签名会挤在一起，直接不显示
const showSign = computed(() => props.frameStyle === 'metal' && frameWidth.value >= 560);

const measure = () => {
  frameWidth.value = rootRef.value?.clientWidth || window.innerWidth;
};

const tauriWindow = async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
};

/** 拖动相框边框 = 移动整个应用窗口（浏览器环境下无法移动，忽略） */
const startWindowDrag = async (e: MouseEvent) => {
  if (!isTauri || e.button !== 0) return;
  e.preventDefault();
  try {
    const win = await tauriWindow();
    await win.startDragging();
  } catch (err) {
    console.error('[AppFrame] 拖动窗口失败:', err);
  }
};

const RESIZE_DIR: Record<Dir, string> = {
  n: 'North', s: 'South', e: 'East', w: 'West',
  ne: 'NorthEast', nw: 'NorthWest', se: 'SouthEast', sw: 'SouthWest',
};

/** 拉伸相框边框 = 缩放应用窗口 */
const startWindowResize = async (e: MouseEvent, dir: Dir) => {
  e.stopPropagation();
  if (!isTauri || e.button !== 0) return;
  e.preventDefault();
  try {
    const win = await tauriWindow();
    await win.startResizeDragging(RESIZE_DIR[dir] as any);
  } catch (err) {
    console.error('[AppFrame] 缩放窗口失败:', err);
  }
};

/** 按在相框边框/卡纸/铭牌上才生效，按在内容区交给内容自己处理 */
const onFrameMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null;
  if (!target || target.closest('[data-frame-content]')) return;
  startWindowDrag(e);
};

onMounted(() => {
  measure();
  window.addEventListener('resize', measure);
});

onUnmounted(() => {
  window.removeEventListener('resize', measure);
});

</script>

<template>
  <div
    ref="rootRef"
    class="photo-frame relative w-full h-full"
    :class="[frameClass]"
    @mousedown="onFrameMouseDown"
  >
    <!-- 相框本体（即应用窗口边界） -->
    <div class="frame-outer">
        <div class="frame-bevel pointer-events-none"></div>

        <!-- 卡纸（留白）+ 照片 -->
        <div class="frame-mat">
          <div class="frame-content" data-frame-content>
            <slot />
          </div>
          <!-- 卡纸开口的厚度：盖在照片边缘上，让照片看起来沉在卡纸之下 -->
          <div class="frame-mat-edge pointer-events-none"></div>
          <div class="frame-glass pointer-events-none"></div>
        </div>

        <!-- 杰伦·太阳徽章 + 签名（窗口太窄时隐藏） -->
        <span v-if="showSign" class="frame-badge"></span>
        <span v-if="showSign" class="frame-sign">Jay Chou</span>

        <!-- 缩放把手（Tauri 下映射为窗口缩放） -->
        <div
          v-for="h in handles"
          :key="h"
          class="resize-handle"
          :class="`h-${h}`"
          @mousedown.stop.prevent="startWindowResize($event, h)"
        ></div>
      </div>
  </div>
</template>

<style scoped>
/* ============ 相框 = 应用窗口边界 ============ */
.photo-frame {
  position: relative;
  touch-action: none;
}

.frame-outer {
  position: absolute;
  inset: 0;
  border-radius: var(--frame-radius);
  background: var(--frame-bg);
  box-shadow: var(--frame-shadow);
  cursor: grab;
}

.frame-outer:active {
  cursor: grabbing;
}

/* 斜面高光 */
.frame-bevel {
  position: absolute;
  inset: 5px;
  border-radius: calc(var(--frame-radius) * 0.7);
  box-shadow:
    inset 2px 2px 3px rgba(255, 255, 255, 0.16),
    inset -2px -2px 6px rgba(0, 0, 0, 0.5);
}

/* 卡纸 */
.frame-mat {
  position: absolute;
  inset: var(--fb);
  border-radius: calc(var(--frame-radius) * 0.45);
  background: var(--mat-bg);
  box-shadow: var(--mat-shadow);
  overflow: hidden;
}

.frame-content {
  position: absolute;
  inset: var(--mw);
  overflow: hidden;
  background: #0b0b0d;
  border-radius: var(--inner-radius, 2px);
  cursor: auto;
}

/* 卡纸开口：一层压在照片上的斜面 + 投影，制造"卡纸比照片高"的厚度 */
.frame-mat-edge {
  position: absolute;
  inset: var(--mw);
  border-radius: var(--inner-radius, 2px);
  z-index: 8;
  box-shadow:
    /* 卡纸切口的亮边（朝外，看起来像一层纸板压在照片上） */
    0 0 0 1px var(--mat-cut, rgba(255, 255, 255, 0.8)),
    /* 卡纸压在照片上的投影，上/左重、下/右带一点反光 */
    var(--mat-depth, inset 4px 4px 8px rgba(0, 0, 0, 0.5)),
    /* 照片自身的凹陷描边 */
    inset 0 0 0 1px rgba(0, 0, 0, 0.55);
}

/* 玻璃反光 */
.frame-glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(255, 255, 255, 0.05) 16%,
    rgba(255, 255, 255, 0) 36%,
    rgba(255, 255, 255, 0) 66%,
    rgba(255, 255, 255, 0.07) 100%
  );
}


/* 杰伦签名：手书体 + 轻微倾斜，像烫金签在框上 */
.frame-sign {
  position: absolute;
  right: 18px;
  bottom: 2px;
  font-family: 'Snell Roundhand', 'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive;
  font-size: 17px;
  font-style: italic;
  line-height: 20px;
  letter-spacing: 0.5px;
  transform: rotate(-4deg);
  white-space: nowrap;
  color: rgba(255, 246, 216, 0.92);
  text-shadow:
    0 1px 0 rgba(120, 74, 8, 0.55),
    0 0 7px rgba(255, 208, 118, 0.45);
  z-index: 21;
  pointer-events: none;
}

/* 杰伦·太阳徽章 */
.frame-badge {
  position: absolute;
  left: 18px;
  bottom: 2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Didot', 'Bodoni 72', Georgia, serif;
  font-size: 13px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  color: rgba(96, 58, 6, 0.9);
  background:
    /* 徽章齿边（太阳光芒） */
    repeating-conic-gradient(
      from 0deg at 50% 50%,
      rgba(255, 250, 220, 0.55) 0deg 5deg,
      rgba(120, 74, 8, 0.35) 5deg 10deg
    ),
    radial-gradient(circle at 34% 28%, #fff6d8 0%, #f4cd72 45%, #b8801f 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 252, 232, 0.9),
    inset 0 -1px 2px rgba(120, 74, 8, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.45),
    0 0 8px rgba(255, 200, 90, 0.35);
  text-shadow: 0 1px 0 rgba(255, 248, 214, 0.75);
  z-index: 21;
  pointer-events: none;
  background-color: #e8bd63;
}

/* 徽章内圈（把"J"垫在亮金盘上） */
.frame-badge::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fff8e2 0%, #f0c163 55%, #cf9a35 100%);
  box-shadow: inset 0 0 0 1px rgba(140, 92, 12, 0.45);
}

.frame-badge::after {
  content: 'J';
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 缩放把手 */
.resize-handle {
  position: absolute;
  z-index: 30;
  background: var(--handle-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.photo-frame:hover .resize-handle {
  opacity: 0.8;
}

.h-n, .h-s { left: 50%; margin-left: -16px; width: 32px; height: 6px; border-radius: 3px; }
.h-e, .h-w { top: 50%; margin-top: -16px; width: 6px; height: 32px; border-radius: 3px; }
.h-n { top: 3px; cursor: ns-resize; }
.h-s { bottom: 3px; cursor: ns-resize; }
.h-e { right: 3px; cursor: ew-resize; }
.h-w { left: 3px; cursor: ew-resize; }

.h-ne, .h-nw, .h-se, .h-sw {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.h-ne { top: 3px; right: 3px; cursor: nesw-resize; }
.h-nw { top: 3px; left: 3px; cursor: nwse-resize; }
.h-se { bottom: 3px; right: 3px; cursor: nwse-resize; }
.h-sw { bottom: 3px; left: 3px; cursor: nesw-resize; }

/* ============ 樱桃木相框（抛光实木，平实不做立体花活） ============ */
.frame-wood {
  --frame-radius: 12px;
  --fb: 34px;
  --mw: 28px;
  --inner-radius: 5px;
  --handle-bg: rgba(255, 234, 208, 0.92);
  --frame-bg:
    /* 山形纹（樱桃木特有的弧线木纹），两组错开、极淡 */
    repeating-radial-gradient(
      ellipse 240px 72px at 20% 18%,
      rgba(96, 48, 22, 0.09) 0 1.5px,
      transparent 1.5px 15px
    ),
    repeating-radial-gradient(
      ellipse 280px 86px at 80% 84%,
      rgba(96, 48, 22, 0.07) 0 1.5px,
      transparent 1.5px 19px
    ),
    /* 直纹：细密的棕眼（深浅双线，走向略斜） */
    repeating-linear-gradient(
      92deg,
      rgba(255, 226, 196, 0.05) 0 1px,
      rgba(86, 44, 20, 0.07) 1px 2px,
      rgba(158, 92, 54, 0.04) 2px 4px,
      transparent 4px 9px
    ),
    /* 底色：抛光樱桃木（暖红棕，中段沉、两端略亮） */
    linear-gradient(158deg, #bd7f55 0%, #a5623c 26%, #8b4b2a 56%, #9f5e37 78%, #b97b50 100%);
  /* 只留一圈发丝线与柔和外投影，去掉内嵌高光/暗角等立体处理 */
  --frame-shadow:
    inset 0 0 0 1px rgba(78, 36, 14, 0.45),
    0 20px 42px rgba(0, 0, 0, 0.48),
    0 3px 10px rgba(0, 0, 0, 0.28);
  /* 内层留白：白色纸面 */
  --mat-bg:
    radial-gradient(circle at 30% 30%, rgba(150, 130, 96, 0.05) 0 1px, transparent 1.6px) 0 0 / 7px 7px,
    repeating-linear-gradient(94deg, rgba(122, 102, 70, 0.035) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(4deg, rgba(122, 102, 70, 0.03) 0 1px, transparent 1px 4px),
    radial-gradient(130% 100% at 32% -10%, rgba(255, 255, 255, 0.95) 0%, transparent 60%),
    linear-gradient(160deg, #fffdf9 0%, #f7f2e7 52%, #ebe3d1 100%);
  --mat-shadow:
    inset 0 0 0 1px rgba(120, 92, 48, 0.35),
    inset 0 2px 6px rgba(90, 68, 34, 0.22);
  /* 卡纸切口与厚度（比之前收敛） */
  --mat-cut: rgba(255, 253, 246, 0.92);
  --mat-depth:
    inset 3px 3px 7px rgba(58, 42, 16, 0.42),
    inset -1px -1px 2px rgba(255, 255, 255, 0.5);
}

/* 樱桃木不做斜角高光，只在最外沿留一道极淡的抛光边线 */
.frame-wood .frame-bevel {
  inset: 1px;
  border-radius: calc(var(--frame-radius) * 0.9);
  box-shadow: inset 0 0 0 1px rgba(255, 230, 202, 0.14);
}


/* ============ 杰伦·太阳之子相框（赤金 + 放射光芒） ============ */
.frame-jay {
  --frame-radius: 10px;
  --fb: 32px;
  --mw: 24px;
  --inner-radius: 5px;
  --handle-bg: rgba(255, 228, 152, 0.95);
  --frame-bg:
    /* 中心受光的日晕 */
    radial-gradient(120% 100% at 50% 8%, rgba(255, 252, 234, 0.45) 0%, transparent 58%),
    /* 太阳放射光芒 */
    repeating-conic-gradient(
      from 0deg at 50% 50%,
      rgba(255, 253, 238, 0.3) 0deg 2.2deg,
      rgba(126, 74, 8, 0.14) 2.2deg 4.4deg
    ),
    /* 锤纹：手工敲打出的金面凹凸 */
    radial-gradient(
        circle at 32% 30%,
        rgba(255, 255, 255, 0.22) 0 1.5px,
        rgba(0, 0, 0, 0.07) 2px 3px,
        rgba(0, 0, 0, 0) 4px
      )
      0 0 / 12px 12px,
    /* 抛光丝纹 */
    repeating-linear-gradient(
      96deg,
      rgba(255, 255, 255, 0.06) 0 1px,
      rgba(120, 74, 8, 0.05) 1px 2px,
      transparent 2px 4px
    ),
    /* 赤金本体：亮金 → 赤金 → 深铜 → 回亮 */
    linear-gradient(
      150deg,
      #fdf0c6 0%,
      #f2d183 16%,
      #e0ab4a 34%,
      #c8942c 50%,
      #a9701a 64%,
      #d9a63f 82%,
      #fbe7b2 100%
    );
  /* 三层描边：外沿深铜 → 亮金高光 → 内圈暗铜，金边更有厚度 */
  --frame-shadow:
    inset 0 0 0 1px rgba(122, 74, 8, 0.75),
    inset 0 0 0 2px rgba(255, 248, 214, 0.4),
    inset 0 0 0 3px rgba(146, 92, 12, 0.5),
    inset 0 1px 0 rgba(255, 253, 234, 0.95),
    inset 0 -2px 4px rgba(120, 74, 8, 0.45),
    inset 0 0 24px rgba(120, 74, 8, 0.22),
    0 26px 52px rgba(0, 0, 0, 0.55),
    0 0 38px rgba(255, 190, 80, 0.22);
  /* 深蓝绒面：细绒纹 + 顶部微光 */
  --mat-bg:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 1px, transparent 1px 3px),
    radial-gradient(130% 100% at 40% 0%, rgba(130, 180, 240, 0.12) 0%, transparent 58%),
    linear-gradient(160deg, #234a74 0%, #102540 100%);
  --mat-shadow:
    inset 0 0 0 1px rgba(243, 206, 132, 0.4),
    inset 0 4px 12px rgba(0, 0, 0, 0.6);
  --mat-cut: rgba(255, 236, 190, 0.6);
  --mat-depth:
    inset 5px 5px 10px rgba(0, 0, 0, 0.62),
    inset -2px -2px 3px rgba(255, 226, 160, 0.14);
}

/* 兜底：老 WebView 不支持 conic-gradient 时整个 background 会失效，
   这里补一层纯金色，保证相框不会变成透明 */
.frame-jay .frame-outer {
  background-color: #d9a63f;
}

/* 锤金倒角 + 内圈亮金线 */
.frame-jay .frame-bevel {
  inset: 4px;
  border-radius: calc(var(--frame-radius) * 0.6);
  box-shadow:
    inset 0 0 0 1px rgba(255, 242, 196, 0.38),
    inset 0 -1px 0 rgba(120, 74, 8, 0.35);
}



/* ============ 纯白相框（极简白） ============ */
.frame-white {
  --frame-radius: 8px;
  /* 没有卡纸：边框直接吃掉原来卡纸的宽度，照片紧贴边框内沿 */
  --fb: 38px;
  --mw: 0px;
  /* 微圆角做在相框内沿上 */
  --inner-radius: 6px;
  --handle-bg: rgba(120, 132, 150, 0.9);
  --frame-bg:
    /* 玻璃斜向高光带（一道清晰的反光） */
    linear-gradient(
      112deg,
      rgba(255, 255, 255, 0) 18%,
      rgba(255, 255, 255, 0.95) 36%,
      rgba(255, 255, 255, 0.4) 48%,
      rgba(255, 255, 255, 0) 64%
    ),
    /* 玻璃磨砂微纹：极淡的斜向细丝，只在近处看得出来 */
    repeating-linear-gradient(
      104deg,
      rgba(150, 165, 185, 0.05) 0 1px,
      rgba(255, 255, 255, 0.06) 1px 2px,
      rgba(150, 165, 185, 0.03) 2px 4px
    ),
    /* 玻璃本体：顶部清透、中部微暗、底部回亮 */
    linear-gradient(
      168deg,
      #ffffff 0%,
      #fafbfc 26%,
      #eef1f4 56%,
      #f5f7f9 80%,
      #ffffff 100%
    );
  --frame-shadow:
    /* 玻璃边缘：外一圈淡灰细线 + 内侧上下高光 */
    inset 0 0 0 1px rgba(255, 255, 255, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(152, 164, 180, 0.4),
    inset 0 0 20px rgba(150, 165, 185, 0.14),
    0 0 0 1px rgba(150, 162, 178, 0.35),
    0 22px 46px rgba(0, 0, 0, 0.42),
    0 2px 8px rgba(0, 0, 0, 0.22);
  /* 无卡纸 */
  --mat-bg: transparent;
  --mat-shadow: none;
  /* 照片内沿：一圈淡灰细线 + 上/左的浅浅凹陷，边框有厚度但不喧宾夺主 */
  --mat-cut: rgba(150, 162, 178, 0.45);
  --mat-depth:
    inset 3px 3px 7px rgba(96, 108, 126, 0.28),
    inset -1px -1px 2px rgba(255, 255, 255, 0.85);
}


/* 白色内圈细线 */
.frame-white .frame-bevel {
  inset: 4px;
  border-radius: calc(var(--frame-radius) * 0.5);
  box-shadow:
    inset 0 0 0 1px rgba(140, 152, 170, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 1),
    inset 0 -1px 0 rgba(150, 160, 175, 0.28);
}

.frame-white .frame-mat {
  border-radius: var(--inner-radius);
}

/* 白框无卡纸：玻璃反光不再压在照片上 */
.frame-white .frame-glass {
  display: none;
}


</style>
