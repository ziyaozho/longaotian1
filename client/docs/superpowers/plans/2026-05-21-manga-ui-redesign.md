# 黑白漫画风格 UI 重设计 实现计划

> **面向 AI 代理的工作者：** 步骤使用复选框（`- [x]`）语法来跟踪进度。

**目标：** 将"人生重开模拟器"从深色科幻系统流 UI 改造为黑白漫画风格（航海王画风参考），保留 HP绿/MP蓝/金成就/红伤害作为功能色点缀。

**架构：** 新建 6 个漫画组件（MangaPanel、MangaTitle、SpeedLines、Screentone、Onomatopoeia、HalftoneBar）作为包装层，逐屏包裹现有 UI 组件。不改游戏逻辑，只替换 CSS 全局样式和组件外层标记。

**技术栈：** React 19 + TypeScript 6 + Tailwind CSS 4 + Framer Motion 12

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `index.html` | 引入 Google Fonts (Bangers + Noto Sans SC) |
| 修改 | `src/index.css` | 全局色板重定义、漫画工具类、删除旧组件类 |
| 创建 | `src/components/manga/MangaPanel.tsx` | 粗黑边框容器，替代 game-card |
| 创建 | `src/components/manga/MangaTitle.tsx` | Bangers 手写体标题，支持旋转和抖动 |
| 创建 | `src/components/manga/Screentone.tsx` | 网点纸半透明覆盖层 |
| 创建 | `src/components/manga/HalftoneBar.tsx` | 网点纸填充进度条 |
| 创建 | `src/components/manga/SpeedLines.tsx` | 集中线/速度线 SVG 装饰 |
| 创建 | `src/components/manga/Onomatopoeia.tsx` | 拟声词气泡组件 |
| 创建 | `src/components/manga/index.ts` | 桶导出 |
| 修改 | `src/components/ParticleBackground.tsx` | Canvas 改为墨迹飞溅效果 |
| 修改 | `src/components/screens/StartScreen.tsx` | 漫画风格封面页 |
| 修改 | `src/components/screens/CharacterCreate.tsx` | HalftoneBar 替代进度条 |
| 修改 | `src/components/screens/SceneSelect.tsx` | MangaPanel 包装卡片 |
| 修改 | `src/components/screens/SystemSelect.tsx` | MangaPanel 包装卡片 |
| 修改 | `src/components/screens/GameMain.tsx` | 最大改造量——全部 UI 用漫画组件包裹 |
| 修改 | `src/components/screens/GameOver.tsx` | 漫画表彰框 + 墨色印章 |
| 修改 | `src/components/screens/AchievementPanel.tsx` | MangaPanel + 网点背景 |
| 修改 | `src/App.tsx` | 更新根背景色和过渡动画 |

---

### 任务 1：全局 CSS 重写 + Google Fonts 引入

**文件：**
- 修改：`index.html`
- 修改：`src/index.css`

- [x] **步骤 1：在 index.html 中添加 Google Fonts 链接**

在 `<head>` 标签内，`</head>` 之前添加：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet" />
```

- [x] **步骤 2：重写 `src/index.css` — 替换全部内容**

```css
@import "tailwindcss";

@theme {
  --color-game-bg: #f5f0e8;
  --color-game-card: #ffffff;
  --color-game-card-hover: #f0ebe0;
  --color-game-accent: #1a1a1a;
  --color-game-gold: #d4a017;
  --color-game-green: #27ae60;
  --color-game-blue: #2980b9;
  --color-game-red: #c0392b;
  --color-game-text: #1a1a1a;
  --color-game-text-muted: #8c8c8c;
}

:root {
  --game-bg: #f5f0e8;
  --game-card: #ffffff;
  --game-card-hover: #f0ebe0;
  --game-accent: #1a1a1a;
  --game-gold: #d4a017;
  --game-green: #27ae60;
  --game-blue: #2980b9;
  --game-red: #c0392b;
  --game-text: #1a1a1a;
  --game-text-muted: #8c8c8c;
}

body {
  margin: 0;
  padding: 0;
  background: var(--game-bg);
  color: var(--game-text);
  font-family: 'Noto Sans SC', sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

#root {
  min-height: 100vh;
  width: 100%;
}

@layer components {
  /* 漫画面板 —— 替代 game-card */
  .manga-panel {
    background: #ffffff;
    border: 3px solid #1a1a1a;
    border-radius: 2px;
    padding: 1.5rem;
    box-shadow: 4px 4px 0 #1a1a1a;
    position: relative;
  }

  /* 纸张纹理背景 */
  .paper-bg {
    background: #f5f0e8;
    background-image: repeating-conic-gradient(#f5f0e8 0% 25%, #f0ebe0 0% 50%);
    background-size: 8px 8px;
  }

  /* 墨黑实心按钮 */
  .manga-btn {
    background: #1a1a1a;
    color: #f5f0e8;
    border: 3px solid #1a1a1a;
    border-radius: 2px;
    padding: 0.75rem 1.5rem;
    font-weight: 900;
    font-family: 'Bangers', cursive;
    letter-spacing: 1px;
    cursor: pointer;
    box-shadow: 3px 3px 0 #888;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .manga-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 #888;
  }

  /* 反色按钮 */
  .manga-btn-outline {
    background: #f5f0e8;
    color: #1a1a1a;
    border: 3px solid #1a1a1a;
    border-radius: 2px;
    padding: 0.75rem 1.5rem;
    font-weight: 900;
    font-family: 'Bangers', cursive;
    letter-spacing: 1px;
    cursor: pointer;
    box-shadow: 3px 3px 0 #888;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .manga-btn-outline:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 #888;
  }

  /* 网点纸 10% */
  .screentone-10 {
    background-image: repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%);
    background-size: 4px 4px;
  }

  /* 网点纸 30% */
  .screentone-30 {
    background-image: repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%);
    background-size: 3px 3px;
  }

  /* 交叉网线 */
  .screentone-cross {
    background-image:
      repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 1px, transparent 1px, transparent 4px),
      repeating-linear-gradient(-45deg, #1a1a1a 0px, #1a1a1a 1px, transparent 1px, transparent 4px);
  }

  /* 漫画标题 */
  .manga-title {
    font-family: 'Bangers', cursive;
    color: #1a1a1a;
    letter-spacing: 2px;
    text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.1);
  }

  /* 手写风输入框 */
  .manga-input {
    background: #ffffff;
    border: 3px solid #1a1a1a;
    border-radius: 2px;
    padding: 0.75rem 1rem;
    font-family: 'Noto Sans SC', sans-serif;
    font-size: 1rem;
    color: #1a1a1a;
    outline: none;
    transition: box-shadow 0.15s;
  }
  .manga-input:focus {
    box-shadow: 3px 3px 0 #1a1a1a;
  }

  /* 墨色标签 */
  .manga-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 0;
    font-size: 12px;
    font-weight: 900;
    background: #1a1a1a;
    color: #f5f0e8;
  }

  /* 系统日志条目 */
  .log-entry {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    color: #8c8c8c;
    border-left: 3px solid #1a1a1a;
  }
}

@layer utilities {
  .ink-border {
    border: 3px solid #1a1a1a;
  }
  .ink-shadow {
    box-shadow: 4px 4px 0 #1a1a1a;
  }
  .ink-shadow-sm {
    box-shadow: 2px 2px 0 #1a1a1a;
  }
}

/* 滚动条 */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #f0ebe0; }
::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: #333; }
```

- [x] **步骤 3：验证构建**

```powershell
npm run build
```

预期：`tsc -b` 和 `vite build` 均通过。CSS 中删除了 `.game-card`、`.game-button`、`.game-title`、`.stat-bar`、`.stat-bar-fill`、`.choice-button` 等旧类，但此时组件仍在使用它们——构建不会报错，只是运行时样式丢失。后续任务会逐屏替换。

- [x] **步骤 4：Commit**

```bash
git add index.html src/index.css
git commit -m "feat: rewrite global CSS for manga style — new color palette, Google Fonts, manga utility classes"
```

---

### 任务 2：MangaPanel 组件

**文件：**
- 创建：`src/components/manga/MangaPanel.tsx`

- [x] **步骤 1：创建组件文件**

```tsx
import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MangaPanelProps {
  children: ReactNode;
  pageNumber?: number;
  screentone?: '10' | '30' | 'cross';
  className?: string;
  animate?: boolean;
}

export default function MangaPanel({
  children,
  pageNumber,
  screentone,
  className = '',
  animate = true,
}: MangaPanelProps) {
  const baseClass = 'manga-panel';
  const toneClass = screentone ? `screentone-${screentone}` : '';

  const panel = (
    <div className={`${baseClass} ${toneClass} ${className}`}>
      {pageNumber !== undefined && (
        <div className="absolute top-2 right-3 flex items-center justify-center">
          <div
            className="w-5 h-5 flex items-center justify-center text-xs font-bold"
            style={{
              background: 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
              backgroundSize: '3px 3px',
              borderRadius: '50%',
              color: '#1a1a1a',
            }}
          >
            {pageNumber}
          </div>
        </div>
      )}
      {children}
    </div>
  );

  if (!animate) return panel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {panel}
    </motion.div>
  );
}
```

- [x] **步骤 2：验证构建**

```powershell
npm run build
```

- [x] **步骤 3：Commit**

```bash
git add src/components/manga/MangaPanel.tsx
git commit -m "feat: add MangaPanel component — black-bordered container with page number and screentone"
```

---

### 任务 3：MangaTitle + Screentone 组件

**文件：**
- 创建：`src/components/manga/MangaTitle.tsx`
- 创建：`src/components/manga/Screentone.tsx`

- [x] **步骤 1：创建 MangaTitle.tsx**

```tsx
import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MangaTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  shake?: boolean;
  className?: string;
}

export default function MangaTitle({
  children,
  as: Tag = 'h1',
  shake = false,
  className = '',
}: MangaTitleProps) {
  const baseClass = 'manga-title';
  const sizeClass =
    Tag === 'h1' ? 'text-5xl md:text-6xl' :
    Tag === 'h2' ? 'text-3xl md:text-4xl' :
    'text-xl md:text-2xl';

  const element = (
    <Tag
      className={`${baseClass} ${sizeClass} ${className}`}
      style={{ transform: `rotate(${(Math.random() - 0.5) * 2}deg)` }}
    >
      {children}
    </Tag>
  );

  if (!shake) return element;

  return (
    <motion.div
      animate={{
        x: [0, -2, 2, -1, 1, 0],
        y: [0, 1, -1, 0.5, -0.5, 0],
      }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        repeatDelay: 3,
      }}
    >
      {element}
    </motion.div>
  );
}
```

- [x] **步骤 2：创建 Screentone.tsx**

```tsx
interface ScreentoneProps {
  density: '10' | '30' | 'cross';
  className?: string;
}

export default function Screentone({ density, className = '' }: ScreentoneProps) {
  return (
    <div
      className={`screentone-${density} ${className}`}
      style={{ minHeight: 4 }}
      aria-hidden="true"
    />
  );
}
```

- [x] **步骤 3：验证构建**

```powershell
npm run build
```

- [x] **步骤 4：Commit**

```bash
git add src/components/manga/MangaTitle.tsx src/components/manga/Screentone.tsx
git commit -m "feat: add MangaTitle and Screentone components"
```

---

### 任务 4：HalftoneBar + SpeedLines + Onomatopoeia 组件

**文件：**
- 创建：`src/components/manga/HalftoneBar.tsx`
- 创建：`src/components/manga/SpeedLines.tsx`
- 创建：`src/components/manga/Onomatopoeia.tsx`

- [x] **步骤 1：创建 HalftoneBar.tsx**

```tsx
interface HalftoneBarProps {
  value: number;
  max: number;
  label: string;
  color?: 'ink' | 'green' | 'blue' | 'red';
  className?: string;
}

const colorMap: Record<string, string> = {
  ink: '#1a1a1a',
  green: '#27ae60',
  blue: '#2980b9',
  red: '#c0392b',
};

export default function HalftoneBar({
  value,
  max,
  label,
  color = 'ink',
  className = '',
}: HalftoneBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillColor = colorMap[color] || colorMap.ink;

  return (
    <div className={className}>
      <div className="flex justify-between text-xs font-bold mb-1" style={{ color: '#1a1a1a' }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div
        className="h-3 border-2 overflow-hidden"
        style={{
          borderColor: '#1a1a1a',
          background: 'repeating-conic-gradient(#ccc 0% 25%, #e0e0e0 0% 50%)',
          backgroundSize: '4px 4px',
        }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}
```

- [x] **步骤 2：创建 SpeedLines.tsx**

```tsx
import { motion, AnimatePresence } from 'framer-motion';

interface SpeedLinesProps {
  active: boolean;
  intensity?: 'low' | 'high';
  className?: string;
}

export default function SpeedLines({
  active,
  intensity = 'low',
  className = '',
}: SpeedLinesProps) {
  const lineCount = intensity === 'high' ? 24 : 12;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            {Array.from({ length: lineCount }).map((_, i) => {
              const angle = (i / lineCount) * 360;
              const rad = (angle * Math.PI) / 180;
              const cx = 50 + Math.cos(rad) * 40;
              const cy = 50 + Math.sin(rad) * 40;
              const len = intensity === 'high' ? 30 + Math.random() * 20 : 15 + Math.random() * 10;
              const endX = 50 + Math.cos(rad) * (40 + len);
              const endY = 50 + Math.sin(rad) * (40 + len);

              return (
                <line
                  key={i}
                  x1={`${cx}%`}
                  y1={`${cy}%`}
                  x2={`${endX}%`}
                  y2={`${endY}%`}
                  stroke="#1a1a1a"
                  strokeWidth={0.5 + Math.random() * 1.5}
                  opacity={0.15 + Math.random() * 0.15}
                />
              );
            })}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [x] **步骤 3：创建 Onomatopoeia.tsx**

```tsx
import { motion, AnimatePresence } from 'framer-motion';

interface OnomatopoeiaProps {
  text: string;
  variant?: 'impact' | 'movement' | 'emphasis';
  className?: string;
}

const variantStyles: Record<string, { rotate: number; scale: number }> = {
  impact: { rotate: -5, scale: 1.5 },
  movement: { rotate: 8, scale: 1.2 },
  emphasis: { rotate: -3, scale: 1.3 },
};

export default function Onomatopoeia({
  text,
  variant = 'impact',
  className = '',
}: OnomatopoeiaProps) {
  const style = variantStyles[variant] || variantStyles.impact;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: style.scale }}
        exit={{ opacity: 0, scale: 2 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className={className}
        style={{
          fontFamily: "'Bangers', cursive",
          fontSize: '3rem',
          color: '#1a1a1a',
          textShadow: '4px 4px 0 #ccc',
          transform: `rotate(${style.rotate}deg)`,
          display: 'inline-block',
          pointerEvents: 'none',
        }}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [x] **步骤 4：验证构建**

```powershell
npm run build
```

- [x] **步骤 5：Commit**

```bash
git add src/components/manga/HalftoneBar.tsx src/components/manga/SpeedLines.tsx src/components/manga/Onomatopoeia.tsx
git commit -m "feat: add HalftoneBar, SpeedLines, and Onomatopoeia manga components"
```

---

### 任务 5：漫画组件桶导出 + ParticleBackground 改墨迹飞溅

**文件：**
- 创建：`src/components/manga/index.ts`
- 修改：`src/components/ParticleBackground.tsx`

- [x] **步骤 1：创建桶导出文件**

```ts
export { default as MangaPanel } from './MangaPanel';
export { default as MangaTitle } from './MangaTitle';
export { default as Screentone } from './Screentone';
export { default as HalftoneBar } from './HalftoneBar';
export { default as SpeedLines } from './SpeedLines';
export { default as Onomatopoeia } from './Onomatopoeia';
```

- [x] **步骤 2：重写 ParticleBackground.tsx 为墨迹飞溅**

```tsx
import { useEffect, useRef } from 'react';

interface InkSpot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let spots: InkSpot[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createSpots = () => {
      spots = [];
      const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 30000));
      for (let i = 0; i < count; i++) {
        spots.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2 + Math.random() * 6,
          opacity: 0.03 + Math.random() * 0.05,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
        });
      }
    };

    const drawSpot = (spot: InkSpot) => {
      ctx.beginPath();
      // Irregular shape: slight random offsets from center
      const cx = spot.x;
      const cy = spot.y;
      const r = spot.size / 2;
      const points = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const rr = r * (0.6 + Math.random() * 0.4);
        const px = cx + Math.cos(angle) * rr;
        const py = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(26, 26, 26, ${spot.opacity})`;
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const spot of spots) {
        spot.x += spot.vx;
        spot.y += spot.vy;
        if (spot.x < 0 || spot.x > canvas.width) spot.vx *= -1;
        if (spot.y < 0 || spot.y > canvas.height) spot.vy *= -1;
        drawSpot(spot);
      }
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createSpots();
    animate();

    window.addEventListener('resize', () => {
      resize();
      createSpots();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
```

- [x] **步骤 3：验证构建**

```powershell
npm run build
```

- [x] **步骤 4：Commit**

```bash
git add src/components/manga/index.ts src/components/ParticleBackground.tsx
git commit -m "feat: add manga barrel export, rewrite ParticleBackground as ink splash"
```

---

### 任务 6：StartScreen 漫画风格改造

**文件：**
- 修改：`src/components/screens/StartScreen.tsx`

- [x] **步骤 1：重写 StartScreen.tsx**

用 MangaPanel、MangaTitle 替换原有深色科技风标记：

```tsx
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSaves, getGlobalAchievements } from '../../utils/storage';
import { motion } from 'framer-motion';
import { Play, BookOpen, Trophy, RotateCcw } from 'lucide-react';
import { MangaPanel, MangaTitle, Screentone } from '../manga';

export default function StartScreen() {
  const { setScreen } = useGameStore();
  const { setPlayer } = usePlayerStore();

  const handleNewGame = () => setScreen('create');

  const handleContinue = () => {
    const saves = getSaves();
    if (saves.lastSaveId) {
      const player = saves.saves.find((s) => s.id === saves.lastSaveId);
      if (player) {
        setPlayer(player);
        setScreen('game');
      }
    }
  };

  const handleAchievements = () => setScreen('achievements');

  const hasSave = getSaves().saves.length > 0;
  const globalAchievements = getGlobalAchievements();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <MangaPanel pageNumber={1} className="max-w-lg mx-auto">
          {/* Title */}
          <MangaTitle as="h1" shake>
            人生重开模拟器
          </MangaTitle>

          <Screentone density="10" className="my-4 h-2" />

          <p className="text-sm text-game-text-muted mb-2">AI+系统流 · 多Agent驱动</p>
          <p className="text-xs text-game-text-muted/60 mb-8">绑定系统，随机场景，无限可能</p>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3">
            <motion.button
              onClick={handleNewGame}
              className="manga-btn flex items-center gap-2 text-lg px-8 py-4 w-full justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <Play className="w-5 h-5" />
              开始新游戏
            </motion.button>

            {hasSave && (
              <motion.button
                onClick={handleContinue}
                className="manga-btn-outline flex items-center gap-2 w-full justify-center"
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw className="w-5 h-5" />
                继续游戏
              </motion.button>
            )}

            <motion.button
              onClick={handleAchievements}
              className="manga-btn-outline flex items-center gap-2 w-full justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <Trophy className="w-5 h-5" />
              成就墙 ({globalAchievements.length})
            </motion.button>
          </div>
        </MangaPanel>

        {/* Footer stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-game-text-muted text-xs">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>5个基础场景</span>
          </div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1">
            <span>10+系统可选</span>
          </div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            <span>30+成就待解锁</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 2：验证构建**

```powershell
npm run build
```

- [x] **步骤 3：Commit**

```bash
git add src/components/screens/StartScreen.tsx
git commit -m "feat: restyle StartScreen with manga panel, title, and ink buttons"
```

---

### 任务 7：CharacterCreate 漫画风格改造

**文件：**
- 修改：`src/components/screens/CharacterCreate.tsx`

- [x] **步骤 1：重写 CharacterCreate.tsx**

```tsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Attributes } from '../../types';
import { ATTRIBUTE_DEFS, INITIAL_POINTS, MIN_ATTRIBUTE, MAX_ATTRIBUTE } from '../../data/attributes';
import { motion } from 'framer-motion';
import { RotateCcw, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';
import { MangaPanel, MangaTitle, HalftoneBar } from '../manga';

const attrMaxValues: Record<keyof Attributes, number> = {
  talent: 10, appearance: 10, intelligence: 10, physique: 10, family: 10, luck: 10,
};

export default function CharacterCreate() {
  const { setScreen } = useGameStore();
  const [name, setName] = useState('');
  const [attributes, setAttributes] = useState<Attributes>({
    talent: 3, appearance: 3, intelligence: 3, physique: 3, family: 3, luck: 3,
  });

  const usedPoints = Object.values(attributes).reduce((a, b) => a + b, 0);
  const remainingPoints = INITIAL_POINTS - usedPoints;

  const adjustAttribute = (key: keyof Attributes, delta: number) => {
    setAttributes((prev) => {
      const newVal = prev[key] + delta;
      if (newVal < MIN_ATTRIBUTE || newVal > MAX_ATTRIBUTE) return prev;
      if (delta > 0 && remainingPoints <= 0) return prev;
      return { ...prev, [key]: newVal };
    });
  };

  const handleContinue = () => {
    if (!name.trim()) return;
    if (remainingPoints !== 0) return;
    sessionStorage.setItem('temp_name', name);
    sessionStorage.setItem('temp_attributes', JSON.stringify(attributes));
    setScreen('scene_select');
  };

  const handleReset = () => {
    setAttributes({ talent: 3, appearance: 3, intelligence: 3, physique: 3, family: 3, luck: 3 });
  };

  const isValid = name.trim().length > 0 && remainingPoints === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <MangaPanel pageNumber={2}>
          <MangaTitle as="h2" className="text-center mb-6">
            创建角色
          </MangaTitle>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2" style={{ color: '#1a1a1a' }}>
              角色名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="输入你的名字..."
              className="manga-input w-full"
            />
            <p className="text-xs text-game-text-muted mt-1">{name.length}/12</p>
          </div>

          {/* Points display */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">剩余点数</span>
            <motion.span
              key={remainingPoints}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className={`text-2xl font-bold ${remainingPoints === 0 ? 'text-game-green' : 'text-game-accent'}`}
            >
              {remainingPoints}
            </motion.span>
          </div>

          {/* Attribute allocation */}
          <div className="space-y-4 mb-6">
            {(Object.keys(ATTRIBUTE_DEFS) as (keyof Attributes)[]).map((key, i) => {
              const def = ATTRIBUTE_DEFS[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold w-16">{def.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustAttribute(key, -1)}
                        disabled={attributes[key] <= MIN_ATTRIBUTE}
                        className="w-7 h-7 flex items-center justify-center ink-border bg-white disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-lg">{attributes[key]}</span>
                      <button
                        onClick={() => adjustAttribute(key, 1)}
                        disabled={attributes[key] >= MAX_ATTRIBUTE || remainingPoints <= 0}
                        className="w-7 h-7 flex items-center justify-center ink-border bg-white disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                    <HalftoneBar
                      value={attributes[key]}
                      max={attrMaxValues[key]}
                      label=""
                      color="ink"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-game-text-muted mt-1 ml-19">{def.effect}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleReset}
              className="manga-btn-outline flex items-center gap-2 flex-1 justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </motion.button>
            <motion.button
              onClick={handleContinue}
              disabled={!isValid}
              className="manga-btn flex items-center gap-2 flex-1 justify-center disabled:opacity-40"
              whileTap={isValid ? { scale: 0.97 } : {}}
            >
              <ArrowRight className="w-4 h-4" />
              继续
            </motion.button>
          </div>
        </MangaPanel>
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 2：验证构建**

```powershell
npm run build
```

- [x] **步骤 3：Commit**

```bash
git add src/components/screens/CharacterCreate.tsx
git commit -m "feat: restyle CharacterCreate with HalftoneBar and manga panels"
```

---

### 任务 8：SceneSelect + SystemSelect 漫画风格改造

**文件：**
- 修改：`src/components/screens/SceneSelect.tsx`
- 修改：`src/components/screens/SystemSelect.tsx`

- [x] **步骤 1：重写 SceneSelect.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { SCENES, getAvailableScenes } from '../../data/scenes';
import { getGlobalAchievements, getVisitedScenes } from '../../utils/storage';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, MapPin } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';
import type { SceneType } from '../../types';

const difficultyLabels: Record<number, string> = {
  1: '简单', 2: '简单', 3: '中等', 4: '中等', 5: '困难', 6: '困难', 7: '极难', 8: '极难',
};

export default function SceneSelect() {
  const { setScreen } = useGameStore();
  const globalAchievements = getGlobalAchievements();
  const visitedScenes = getVisitedScenes();
  const availableScenes = getAvailableScenes(globalAchievements);

  const handleSelectScene = (sceneId: SceneType) => {
    sessionStorage.setItem('temp_scene', sceneId);
    setScreen('system_select');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <MangaTitle as="h2" className="text-center mb-6">选择重生场景</MangaTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENES.map((scene, i) => {
            const unlocked = availableScenes.some((s) => s.id === scene.id);
            const visited = visitedScenes.includes(scene.id);

            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {unlocked ? (
                  <MangaPanel
                    pageNumber={i + 3}
                    screentone={visited ? '10' : undefined}
                    className="cursor-pointer h-full"
                  >
                    <div onClick={() => handleSelectScene(scene.id as SceneType)}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{scene.name}</h3>
                        <span className="manga-badge">{difficultyLabels[scene.difficulty] || '中等'}</span>
                      </div>
                      <p className="text-sm text-game-text-muted mb-2">{scene.description}</p>
                      <div className="flex items-center justify-between text-xs text-game-text-muted">
                        <span>最大年龄: {scene.maxAge}岁</span>
                        {visited && <span className="text-game-accent font-bold">已探索</span>}
                      </div>
                    </div>
                  </MangaPanel>
                ) : (
                  <MangaPanel screentone="cross" className="opacity-50 h-full">
                    <div className="flex flex-col items-center justify-center h-full py-4">
                      <Lock className="w-8 h-8 text-game-text-muted mb-2" />
                      <p className="text-sm text-game-text-muted font-bold">???</p>
                      <p className="text-xs text-game-text-muted mt-1">{scene.unlockCondition}</p>
                    </div>
                  </MangaPanel>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <button onClick={() => setScreen('create')} className="manga-btn-outline flex items-center gap-2 mx-auto">
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 2：重写 SystemSelect.tsx**

```tsx
import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { SYSTEMS, getAvailableSystems } from '../../data/systems';
import { getGlobalAchievements } from '../../utils/storage';
import { createInitialPlayer } from '../../store/playerStore';
import { motion } from 'framer-motion';
import { Cpu, Lock, ArrowRight } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';

const rarityLabels: Record<string, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说', hidden: '隐藏',
};

export default function SystemSelect() {
  const { setScreen } = useGameStore();
  const { setPlayer } = usePlayerStore();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const globalAchievements = getGlobalAchievements();
  const availableSystems = getAvailableSystems(globalAchievements);

  const name = sessionStorage.getItem('temp_name') || '无名';
  const attributesStr = sessionStorage.getItem('temp_attributes');
  const attributes = attributesStr ? JSON.parse(attributesStr) : {};
  const sceneType = sessionStorage.getItem('temp_scene') || 'modern_city';

  const handleConfirm = () => {
    if (!selectedSystem) return;
    const sys = SYSTEMS.find((s) => s.id === selectedSystem);
    if (!sys) return;
    const player = createInitialPlayer(name, attributes, sceneType, sys.id, sys.name);
    setPlayer(player);
    setScreen('game');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <MangaTitle as="h2" className="text-center mb-6">选择绑定系统</MangaTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SYSTEMS.map((sys, i) => {
            const unlocked = availableSystems.some((s) => s.id === sys.id);
            const selected = selectedSystem === sys.id;

            return (
              <motion.div
                key={sys.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {unlocked ? (
                  <MangaPanel
                    pageNumber={i + 1}
                    className={`cursor-pointer h-full ${selected ? 'ring-3 ring-game-accent' : ''}`}
                  >
                    <div onClick={() => setSelectedSystem(sys.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{sys.name}</h3>
                        <span className="manga-badge">{rarityLabels[sys.rarity] || sys.rarity}</span>
                      </div>
                      <p className="text-sm text-game-text-muted mb-2">{sys.description}</p>
                      <p className="text-xs italic text-game-text-muted">"{sys.catchphrase}"</p>
                      <p className="text-xs text-game-text-muted mt-1">最大等级: {sys.maxLevel}</p>
                    </div>
                  </MangaPanel>
                ) : (
                  <MangaPanel screentone="cross" className="opacity-50 h-full">
                    <div className="flex flex-col items-center justify-center h-full py-4">
                      <Lock className="w-8 h-8 text-game-text-muted mb-2" />
                      <p className="text-sm text-game-text-muted font-bold">???</p>
                    </div>
                  </MangaPanel>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setScreen('scene_select')} className="manga-btn-outline flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回
          </button>
          <motion.button
            onClick={handleConfirm}
            disabled={!selectedSystem}
            className="manga-btn flex items-center gap-2 disabled:opacity-40"
            whileTap={selectedSystem ? { scale: 0.97 } : {}}
          >
            开始重生
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 3：验证构建**

```powershell
npm run build
```

- [x] **步骤 4：Commit**

```bash
git add src/components/screens/SceneSelect.tsx src/components/screens/SystemSelect.tsx
git commit -m "feat: restyle SceneSelect and SystemSelect with manga panels and screentone"
```

---

### 任务 9：GameMain 漫画风格改造（最大改造量）

**文件：**
- 修改：`src/components/screens/GameMain.tsx`

这是最大的改动，触及游戏的每个 UI 区域。保留所有逻辑代码（事件处理、状态管理、hooks）不变，只替换 JSX 中的外层结构和 CSS 类名。

- [x] **步骤 1：更新 GameMain.tsx 的 imports**

在文件顶部，添加漫画组件导入，移除不再需要的旧 CSS 引用：

```tsx
// 在现有 imports 后追加:
import { MangaPanel, MangaTitle, HalftoneBar, Screentone, SpeedLines, Onomatopoeia } from '../manga';
```

- [x] **步骤 2：替换顶栏 JSX**

找到顶部状态栏（包含角色名、场景、年龄、回合、HP/MP 条），替换外层 `<div>` 为 `<MangaPanel>`，将 `stat-bar`/`stat-bar-fill` 替换为 `<HalftoneBar>`。

替换前（参考）：
```tsx
<div className="game-card p-4 mb-4">
  <div className="flex items-center justify-between flex-wrap gap-3">
    ...
  </div>
</div>
```

替换后：
```tsx
<MangaPanel className="p-4 mb-4">
  <div className="flex items-center justify-between flex-wrap gap-3">
    {/* 角色名、场景标签、年龄、回合 — 将 badge 类替换为 manga-badge */}
    <span className="font-bold text-lg">{player.name}</span>
    <span className="manga-badge">{sceneName}</span>
    <span className="manga-badge">{player.age}岁</span>
    <span className="manga-badge">第{round}回合</span>

    {/* HP 条 */}
    <div className="flex-1 min-w-[120px]">
      <HalftoneBar value={player.stats.hp} max={player.stats.maxHp} label="HP" color="green" />
    </div>

    {/* MP 条 */}
    <div className="flex-1 min-w-[120px]">
      <HalftoneBar value={player.stats.mp} max={player.stats.maxMp} label="MP" color="blue" />
    </div>

    {/* 等级/财富/战力 — 保持结构，替换样式 */}
    <div className="flex gap-2 text-xs font-bold">
      <span className="manga-badge">Lv.{player.stats.level}</span>
      <span className="manga-badge" style={{ background: '#d4a017', color: '#1a1a1a' }}>
        ¥{player.stats.wealth}
      </span>
      <span className="manga-badge">战力 {player.stats.combatPower}</span>
    </div>
  </div>
</MangaPanel>
```

- [x] **步骤 3：替换场景描述区**

将场景文本卡片从 `game-card` 替换为 `MangaPanel` + `Screentone`：

```tsx
<MangaPanel className="mb-4">
  <MangaTitle as="h3" className="mb-2">
    第{round}回合
  </MangaTitle>
  <Screentone density="10" className="mb-3 h-1" />
  <div className="text-sm leading-relaxed">
    {/* TypewriterText 组件保持不变 */}
    <TypewriterText text={sceneText} />
  </div>
</MangaPanel>
```

- [x] **步骤 4：替换选择按钮**

将 `choice-button` 类替换为 `manga-btn` 样式：

```tsx
{choices.map((choice, i) => (
  <motion.button
    key={choice.id}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.1 }}
    onClick={() => handleChoice(choice.id)}
    disabled={isProcessing}
    className="manga-btn w-full text-left mb-2 flex items-start gap-3"
    whileTap={{ scale: 0.98 }}
  >
    <span className="text-game-text-muted font-bold">{i + 1}.</span>
    <div>
      <p className="font-bold">{choice.text}</p>
      {choice.consequence && (
        <p className="text-xs text-game-text-muted mt-1">{choice.consequence}</p>
      )}
    </div>
  </motion.button>
))}
```

- [x] **步骤 5：替换系统日志区**

```tsx
<MangaPanel screentone="10" className="h-full">
  <h4 className="font-bold text-sm mb-3 manga-title">系统日志</h4>
  <div className="space-y-1 max-h-64 overflow-y-auto">
    {systemLogs.slice(-20).map((log, i) => (
      <div key={i} className="log-entry">{log.text}</div>
    ))}
  </div>
</MangaPanel>
```

- [x] **步骤 6：替换右侧面板（系统信息、装备、背包、属性、任务）**

每个独立区域用 `MangaPanel` 包裹：

```tsx
{/* 系统信息 */}
<MangaPanel className="mb-4">
  <h4 className="font-bold text-sm mb-2 manga-title">
    {player.system.name} Lv.{player.system.level}
  </h4>
  <HalftoneBar
    value={player.system.exp}
    max={player.system.maxExp || 100}
    label="EXP"
    color="ink"
    className="mb-3"
  />
  <div className="flex flex-wrap gap-2">
    {player.system.features.map((f) => (
      <button
        key={f}
        onClick={() => handleSystemFeature(f)}
        className="manga-btn-outline text-xs py-1 px-3"
      >
        {getFeatureDisplayName(f)}
      </button>
    ))}
  </div>
</MangaPanel>

{/* 装备 */}
<MangaPanel className="mb-4">
  <h4 className="font-bold text-sm mb-2 manga-title">装备</h4>
  {/* 装备槽位 content 保持不变 */}
</MangaPanel>

{/* 背包 */}
<MangaPanel className="mb-4">
  <h4 className="font-bold text-sm mb-2 manga-title">背包</h4>
  {/* 物品列表 content 保持不变 */}
</MangaPanel>

{/* 属性 */}
<MangaPanel className="mb-4">
  <h4 className="font-bold text-sm mb-2 manga-title">属性</h4>
  {(Object.keys(player.attributes) as (keyof typeof player.attributes)[]).map((key) => (
    <div key={key} className="mb-2">
      <HalftoneBar
        value={player.attributes[key]}
        max={10}
        label={ATTRIBUTE_DEFS[key]?.label || key}
        color="ink"
      />
    </div>
  ))}
</MangaPanel>

{/* 任务 */}
<MangaPanel>
  <h4 className="font-bold text-sm mb-2 manga-title">任务</h4>
  {/* 任务进度 content 保持不变 */}
</MangaPanel>
```

- [x] **步骤 7：添加 SpeedLines 和 Onomatopoeia 触发**

在 JSX 顶部区域（高潮事件时激活）：

```tsx
{/* SpeedLines 覆盖——在战斗/高潮事件时 active */}
<SpeedLines active={currentEvent !== null} intensity="low" />

{/* Onomatopoeia——在关键事件弹出 */}
{showEvent && currentEvent && (
  <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50">
    <Onomatopoeia text="ドン！" variant="impact" />
  </div>
)}
```

- [x] **步骤 8：验证构建**

```powershell
npm run build
```

预期：`tsc -b` 和 `vite build` 均通过。如果 GameMain.tsx 中引用了不存在的 store 字段或旧 CSS 类名，会在这里暴露。根据错误修正即可（主要是类名替换）。

- [x] **步骤 9：Commit**

```bash
git add src/components/screens/GameMain.tsx
git commit -m "feat: restyle GameMain — manga panels, HalftoneBar, SpeedLines, Onomatopoeia"
```

---

### 任务 10：GameOver + AchievementPanel 漫画风格改造

**文件：**
- 修改：`src/components/screens/GameOver.tsx`
- 修改：`src/components/screens/AchievementPanel.tsx`

- [x] **步骤 1：重写 GameOver.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSceneById } from '../../data/scenes';
import { getAchievementById } from '../../data/achievements';
import { motion } from 'framer-motion';
import { RotateCcw, Home, Star, Clock, Swords, Coins } from 'lucide-react';
import { MangaPanel, MangaTitle, Screentone } from '../manga';

const getRating = (score: number): { letter: string; label: string } => {
  if (score >= 90) return { letter: 'S', label: '传说' };
  if (score >= 75) return { letter: 'A', label: '优秀' };
  if (score >= 60) return { letter: 'B', label: '良好' };
  if (score >= 40) return { letter: 'C', label: '普通' };
  return { letter: 'D', label: '平凡' };
};

export default function GameOver() {
  const { setScreen, resetGame } = useGameStore();
  const { player, resetPlayer } = usePlayerStore();

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <MangaPanel>
          <p className="text-center">没有游戏数据</p>
          <button onClick={() => setScreen('start')} className="manga-btn mt-4 mx-auto block">
            返回主页
          </button>
        </MangaPanel>
      </div>
    );
  }

  const scene = getSceneById(player.sceneId);
  const survivalScore = Math.min(30, (player.age / (scene?.maxAge || 100)) * 30);
  const levelScore = Math.min(30, (player.stats.level / 100) * 30);
  const wealthScore = Math.min(20, (player.stats.wealth / 100000) * 20);
  const combatScore = Math.min(20, (player.stats.combatPower / 1000) * 20);
  const totalScore = Math.round(survivalScore + levelScore + wealthScore + combatScore);
  const { letter, label } = getRating(totalScore);

  const handleBackHome = () => {
    resetGame();
    resetPlayer();
    setScreen('start');
  };

  const handleRebirth = () => {
    resetGame();
    resetPlayer();
    setScreen('create');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="w-full max-w-lg"
      >
        <MangaPanel pageNumber={99}>
          <MangaTitle as="h1" className="text-center mb-2">
            人生终章
          </MangaTitle>

          <Screentone density="10" className="my-3 h-1" />

          <div className="text-center mb-4">
            <p className="text-lg font-bold">{player.name}</p>
            <p className="text-sm text-game-text-muted">
              {scene?.name || '未知'} · {player.age}岁
            </p>
          </div>

          {/* Rating letter */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3, damping: 10, stiffness: 150 }}
            className="text-center mb-6"
          >
            <span
              className="text-8xl font-bold"
              style={{
                fontFamily: "'Bangers', cursive",
                color: '#1a1a1a',
                textShadow: '6px 6px 0 #ccc',
              }}
            >
              {letter}
            </span>
            <p className="text-lg font-bold mt-1">{label}</p>
          </motion.div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="ink-border bg-white p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs text-game-text-muted">存活回合</p>
              <p className="font-bold text-lg">{player.round}</p>
            </div>
            <div className="ink-border bg-white p-3 text-center">
              <Swords className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs text-game-text-muted">战力</p>
              <p className="font-bold text-lg">{player.stats.combatPower}</p>
            </div>
            <div className="ink-border bg-white p-3 text-center">
              <Star className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs text-game-text-muted">等级</p>
              <p className="font-bold text-lg">{player.stats.level}</p>
            </div>
            <div className="ink-border bg-white p-3 text-center">
              <Coins className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs text-game-text-muted">财富</p>
              <p className="font-bold text-lg">¥{player.stats.wealth}</p>
            </div>
          </div>

          {/* Achievements */}
          {player.achievements.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-sm mb-2 manga-title">解锁成就</h3>
              <div className="flex flex-wrap gap-2">
                {player.achievements.map((id) => {
                  const ach = getAchievementById(id);
                  return (
                    <span key={id} className="manga-badge" style={{ background: '#d4a017', color: '#1a1a1a' }}>
                      {ach?.name || id}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleBackHome} className="manga-btn-outline flex items-center gap-2 flex-1 justify-center">
              <Home className="w-4 h-4" />
              返回主页
            </button>
            <button onClick={handleRebirth} className="manga-btn flex items-center gap-2 flex-1 justify-center">
              <RotateCcw className="w-4 h-4" />
              再次重生
            </button>
          </div>
        </MangaPanel>
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 2：重写 AchievementPanel.tsx**

```tsx
import { useGameStore } from '../../store/gameStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import { getGlobalAchievements } from '../../utils/storage';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Star, Skull, Swords, MapPin, Cpu } from 'lucide-react';
import { MangaPanel, MangaTitle, HalftoneBar, Screentone } from '../manga';

const categoryIcons: Record<string, React.ReactNode> = {
  progress: <Star className="w-5 h-5" />,
  combat: <Swords className="w-5 h-5" />,
  social: <Trophy className="w-5 h-5" />,
  secret: <Skull className="w-5 h-5" />,
  system: <Cpu className="w-5 h-5" />,
  explore: <MapPin className="w-5 h-5" />,
};
const categoryLabels: Record<string, string> = {
  progress: '进度', combat: '战斗', social: '社交', secret: '秘密', system: '系统', explore: '探索',
};

export default function AchievementPanel() {
  const { setScreen } = useGameStore();
  const unlocked = new Set(getGlobalAchievements());
  const total = ACHIEVEMENTS.filter((a) => !a.hidden || unlocked.has(a.id)).length;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  const grouped = ACHIEVEMENTS.reduce<Record<string, typeof ACHIEVEMENTS>>((acc, ach) => {
    if (ach.hidden && !unlocked.has(ach.id)) return acc;
    const cat = ach.category || 'progress';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ach);
    return acc;
  }, {});

  return (
    <div className="min-h-screen px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('start')} className="manga-btn-outline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <MangaTitle as="h2">成就墙</MangaTitle>
          <div />
        </div>

        {/* Progress bar */}
        <MangaPanel className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">总进度</span>
            <span className="font-bold text-sm">{unlockedCount}/{total}</span>
          </div>
          <HalftoneBar value={unlockedCount} max={total} label="" color="ink" />
        </MangaPanel>

        {/* Categories */}
        {Object.entries(grouped).map(([cat, achievements], ci) => (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              {categoryIcons[cat]}
              <h3 className="font-bold text-lg manga-title">{categoryLabels[cat] || cat}</h3>
              <Screentone density="10" className="flex-1 h-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((ach, i) => {
                const earned = unlocked.has(ach.id);
                return (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.1 + i * 0.05 }}
                  >
                    <MangaPanel
                      screentone={earned ? '10' : '30'}
                      className={!earned ? 'opacity-50' : ''}
                    >
                      <div className="flex items-start gap-3">
                        {earned ? (
                          <Trophy className="w-6 h-6 flex-shrink-0" style={{ color: '#d4a017' }} />
                        ) : (
                          <Lock className="w-6 h-6 flex-shrink-0 text-game-text-muted" />
                        )}
                        <div>
                          <p className="font-bold text-sm">{ach.name}</p>
                          <p className="text-xs text-game-text-muted">{ach.description}</p>
                        </div>
                      </div>
                    </MangaPanel>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
```

- [x] **步骤 3：验证构建**

```powershell
npm run build
```

- [x] **步骤 4：Commit**

```bash
git add src/components/screens/GameOver.tsx src/components/screens/AchievementPanel.tsx
git commit -m "feat: restyle GameOver and AchievementPanel with manga layouts"
```

---

### 任务 11：App.tsx 最终调整 + 全局构建验证

**文件：**
- 修改：`src/App.tsx`

- [x] **步骤 1：更新 App.tsx 根样式**

将根容器从深色背景切换为和纸背景：

```tsx
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import StartScreen from './components/screens/StartScreen';
import CharacterCreate from './components/screens/CharacterCreate';
import SceneSelect from './components/screens/SceneSelect';
import SystemSelect from './components/screens/SystemSelect';
import GameMain from './components/screens/GameMain';
import GameOver from './components/screens/GameOver';
import AchievementPanel from './components/screens/AchievementPanel';
import ParticleBackground from './components/ParticleBackground';
import { DemoProvider } from './demo/DemoContext';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const screen = useGameStore((state) => state.screen);
  const player = usePlayerStore((state) => state.player);

  const renderScreen = () => {
    switch (screen) {
      case 'start':
        return <StartScreen />;
      case 'create':
        return <CharacterCreate />;
      case 'scene_select':
        return <SceneSelect />;
      case 'system_select':
        return <SystemSelect />;
      case 'game':
        return player ? <GameMain /> : <StartScreen />;
      case 'game_over':
        return <GameOver />;
      case 'achievements':
        return <AchievementPanel />;
      default:
        return <StartScreen />;
    }
  };

  return (
    <DemoProvider>
      <div className="min-h-screen relative" style={{ background: '#f5f0e8', color: '#1a1a1a' }}>
        <ParticleBackground />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DemoProvider>
  );
}

export default App;
```

主要改动：`bg-game-bg text-white` → `style={{ background: '#f5f0e8', color: '#1a1a1a' }}`

- [x] **步骤 2：全局构建验证**

```powershell
npm run build
```

预期：`tsc -b` 零错误，`vite build` 成功。

如果 GameMain.tsx 中有遗漏的旧 CSS 类引用（如 `bg-game-card`、`text-game-text` 等在 Tailwind v4 中仍有效因为它们通过 `@theme` 重新定义为新颜色），构建应该通过——类名仍然存在，只是映射到了新颜色值。

- [x] **步骤 3：启动开发服务器手工验证**

```powershell
npm run dev
```

在浏览器中检查：
- 主页 (StartScreen)：纸张纹理、漫画标题、墨黑按钮
- 角色创建 (CharacterCreate)：HalftoneBar 进度条、方角按钮
- 场景选择 (SceneSelect)：MangaPanel 卡片、页码角标
- 系统选择 (SystemSelect)：选中高亮、锁定遮罩
- 游戏主界面 (GameMain)：顶栏、对白框、选择按钮、系统日志
- 结算页 (GameOver)：评分字母、成就徽章
- 成就墙 (AchievementPanel)：分组展示、进度条

- [x] **步骤 4：Commit**

```bash
git add src/App.tsx
git commit -m "feat: update App root for manga paper background"
```

---

## 注意事项

1. **不改游戏逻辑**：所有 store、agent、service、data 文件保持不变。只改 CSS 和组件 JSX 外层包装。
2. **组件导入路径**：所有漫画组件从 `../manga`（桶导出）导入。
3. **Tailwind v4 `@theme`**：旧 CSS 类名（`bg-game-bg`、`text-game-text` 等）仍然有效——它们通过 `@theme` 映射到了新的漫画色板值。因此未替换的旧类名不会导致样式断裂，只是颜色会自动变为新值。
4. **GameMain.tsx 复杂度**：该文件约 1200 行，改造时只改 JSX return 部分（后 400 行左右），不改任何逻辑函数。
5. **无测试文件**：本项目无测试套件，验证手段为 `tsc -b && vite build` + 浏览器手工检查。
