# 黑白漫画风格 UI 重设计

> 将"人生重开模拟器"从深色科幻系统流 UI 改造为黑白漫画风格，画风参考航海王（One Piece），保留游戏 UI 功能性。

**目标：** 全局视觉风格从深色科技风转为纸质漫画风，保留 HP绿/MP蓝/金成就/红伤害作为功能色点缀

**策略：** 渐进包裹——不改游戏逻辑，新建漫画组件库逐层包裹现有 UI

**技术栈：** React 19 + TypeScript 6 + Tailwind CSS 4 + Framer Motion 12

---

## 一、色板重定义

| Token | 当前值 | 新值 | 用途 |
|-------|--------|------|------|
| `--game-bg` | `#0f0f1a` | `#f5f0e8` | 主背景（和纸白） |
| `--game-card` | `#1a1a2e` | `#ffffff` | 卡片/对白框 |
| `--game-card-hover` | `#252545` | `#f0ebe0` | 悬停泛黄 |
| `--game-accent` | `#e94560` | `#1a1a1a` | 强调色（墨汁黑） |
| `--game-text` | `#e2e8f0` | `#1a1a1a` | 正文 |
| `--game-text-muted` | `#94a3b8` | `#8c8c8c` | 次要文字 |
| `--game-green` | `#00d9a3` | `#27ae60` | HP（保留） |
| `--game-blue` | `#4facfe` | `#2980b9` | MP（保留） |
| `--game-gold` | `#ffd700` | `#d4a017` | 成就（保留） |
| `--game-red` | 新增 | `#c0392b` | 伤害/警告 |

### 全局纹理

- **纸张纹理**：`repeating-conic-gradient(#f5f0e8 0% 25%, #f0ebe0 0% 50%)` 8px
- **网点纸 10%**：`repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)` 4px
- **网点纸 30%**：同上，3px 密度
- **交叉网线**：`repeating-linear-gradient` 45° + -45° 叠加

### 边框风格

- `border-2` 或 `border-3` 实心黑边
- `rounded-sm`(2px) 替代 `rounded-xl`(12px)
- `box-shadow: 3px 3px 0 #1a1a1a` 漫画投影
- 分格右上角网点圆形角标

---

## 二、字体

| 用途 | 字体 | 来源 |
|------|------|------|
| 标题 | Bangers (cursive) | Google Fonts |
| 正文 | Noto Sans SC (sans-serif) | Google Fonts |
| 拟声词 | Bangers (cursive) | 复用标题字体 |

---

## 三、漫画组件库 (`src/components/manga/`)

### 3.1 MangaPanel

粗黑边框容器，替代 `game-card`。

```tsx
interface MangaPanelProps {
  children: ReactNode;
  pageNumber?: number;     // 右上角页码角标
  screentone?: '10' | '30' | 'cross';  // 背景网点
  className?: string;
}
```

### 3.2 MangaTitle

手写体标题，1-2° 随机旋转 + 可选抖动动画。

```tsx
interface MangaTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  shake?: boolean;   // 抖动动画
  className?: string;
}
```

### 3.3 SpeedLines

集中线/速度线装饰，SVG 实现。用于高潮场景和高亮区域。

```tsx
interface SpeedLinesProps {
  active: boolean;        // 是否显示
  intensity?: 'low' | 'high';
  className?: string;
}
```

### 3.4 Screentone

网点纸半透明覆盖层。

```tsx
interface ScreentoneProps {
  density: '10' | '30' | 'cross';
  className?: string;
}
```

### 3.5 Onomatopoeia

拟声词气泡组件，战斗/事件触发时弹出。

```tsx
interface OnomatopoeiaProps {
  text: string;        // "ドン！" "嗖—" "砰！"
  variant?: 'impact' | 'movement' | 'emphasis';
  className?: string;
}
```

### 3.6 HalftoneBar

网点纸填充进度条，替代 `stat-bar`。

```tsx
interface HalftoneBarProps {
  value: number;
  max: number;
  label: string;
  color?: 'ink' | 'green' | 'blue' | 'red';
  className?: string;
}
```

---

## 四、各屏幕改造

### 4.1 全局样式 (`index.css`)

- `@theme` 颜色变量全部替换
- 删除 `.game-card` `.game-button` `.game-title` `.stat-bar` 等旧组件类
- 新增 `.paper-bg` `.ink-border` `.screentone-10` `.screentone-30` `.screentone-cross` 工具类
- `<body>` 字体改为 `'Noto Sans SC', sans-serif`
- 引入 Google Fonts

### 4.2 ParticleBackground → 墨迹飞溅

Canvas 改为绘制随机墨点：
- 尺寸：2-8px，不规则
- 颜色：仅 `#1a1a1a`
- 透明度：0.03-0.08
- 不再画连接线

### 4.3 StartScreen

```
MangaPanel (纸张背景)
├── 墨迹飞溅背景 (替换发光球体)
├── MangaTitle "人生重开模拟器" (Bangers)
├── 网点纸分隔线 (Screentone density="10")
├── SpeedLines (按钮区域背景, intensity="low")
└── MangaPanel (按钮组)
    ├── 墨黑按钮 "开始新游戏"
    └── 反色按钮 "继续游戏"
```

### 4.4 CharacterCreate

- 属性分配区用 HalftoneBar 替代进度条
- 加减按钮：方角小黑框
- 角色名输入框：手绘风边框

### 4.5 SceneSelect / SystemSelect

- 卡片 grid 改为 MangaPanel 包覆
- 每张场景卡右上角加页码角标
- 锁定卡片用交叉网点遮罩

### 4.6 GameMain（最大改造量）

- 顶栏：MangaPanel 包裹，网点背景
- 场景描述：白底对白框 + MangaTitle
- 选择按钮：墨黑方角按钮，hover 网点填充
- HP/MP 条：HalftoneBar
- 系统日志：网点浅色背景列表
- 高潮事件时 SpeedLines 覆盖激活
- Onomatopoeia 在战斗/关键事件弹出

### 4.7 GameOver

- 评分面板：漫画表彰框（粗黑边框 + 网点阴影）
- 成就徽章：墨色印章风格

### 4.8 AchievementPanel

- 成就卡片：MangaPanel + 网点背景
- 解锁/锁定状态用网点密度区分

---

## 五、动画调整

| 当前 | 改为 |
|------|------|
| `opacity` 淡入淡出 | 保留 |
| `y: 20` 上移入场 | 保留 |
| `scale: 1.05` 悬停放大 | 移除，改为按钮投影位移 `translate(2px, 2px)` |
| `spring` 弹性动画 | 保留 |
| 发光 `box-shadow` | 改为 `box-shadow: 4px 4px 0 #1a1a1a` 实体投影 |
| 颗粒漂移 | 墨点静止/微动 |

---

## 六、实施顺序

1. `index.css` — 全局色板 + 工具类重写
2. `src/components/manga/` — 6 个漫画组件
3. ParticleBackground → 墨迹飞溅
4. StartScreen — 封面页
5. CharacterCreate — 角色面板
6. SceneSelect / SystemSelect — 选择页
7. GameMain — 主游戏界面
8. GameOver / AchievementPanel — 结算页
9. Google Fonts 引入 + Framer Motion 动画微调
10. 最终构建验证
