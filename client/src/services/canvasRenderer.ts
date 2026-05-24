import type { CharacterAppearance } from '../components/character';

export interface RenderParams {
  faceShape: number;      // 0-1, 颜值影响: 0=圆/方, 1=精致瓜子
  eyeSharpness: number;   // 0-1, 智商影响: 0=柔和, 1=锐利
  eyeSize: number;        // 0.6-1.2, 基础大小
  hairStyle: number;      // 0-1, 天赋影响: 0=简单短发, 1=华丽长发/特殊
  hairVolume: number;     // 0.8-1.5, 天赋影响发量
  bodyWidth: number;      // 0.8-1.4, 体质影响肩宽
  outfitDetail: number;   // 0-1, 家境影响服装华丽度
  auraIntensity: number;  // 0-1, 天赋+运气影响灵气强度
  auraColor: string;      // 灵气颜色
  hasGlasses: boolean;    // 智商高时可能有
  luckyCharm: boolean;    // 运气高时可能有装饰
}

const PANEL_SIZE = 256;
const COLS = 3;
const ROWS = 2;
const SHEET_WIDTH = PANEL_SIZE * COLS;
const SHEET_HEIGHT = PANEL_SIZE * ROWS;

const INK = '#1a1a1a';
const SKIN = '#f5e6d3';
const SKIN_SHADOW = '#e8d5c0';
const HAIR_BASE = '#0d0d0d';
const HAIR_HIGHLIGHT = '#2a2a2a';
const OUTFIT_BASE = '#2c3e50';
const OUTFIT_ACCENT = '#8e44ad';
const EYE_COLOR = '#2980b9';
const AURA_COLORS = ['#d4a017', '#8e44ad', '#c0392b', '#2980b9', '#27ae60'];

export function buildRenderParams(appearance: CharacterAppearance): RenderParams {
  const { talent, appearance: app, intelligence, physique, family, luck } = appearance;

  return {
    faceShape: Math.min(1, app / 10),
    eyeSharpness: Math.min(1, intelligence / 10),
    eyeSize: 0.7 + (app / 20),
    hairStyle: Math.min(1, talent / 10),
    hairVolume: 0.9 + (talent / 15),
    bodyWidth: 0.85 + (physique / 15),
    outfitDetail: Math.min(1, family / 10),
    auraIntensity: Math.min(1, (talent + luck) / 16),
    auraColor: AURA_COLORS[Math.floor((talent + luck) % AURA_COLORS.length)],
    hasGlasses: intelligence >= 7,
    luckyCharm: luck >= 7,
  };
}

/**
 * Generate a manga-style spritesheet via Canvas.
 * Returns a data URL (PNG) of a 768x512 spritesheet with 6 expressions.
 */
export async function generateSpritesheetCanvas(
  appearance: CharacterAppearance,
): Promise<string> {
  const params = buildRenderParams(appearance);

  const canvas = document.createElement('canvas');
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Fill paper background
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

  // Draw grid lines (subtle separator between panels)
  ctx.strokeStyle = '#e0d8c8';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * PANEL_SIZE, 0);
    ctx.lineTo(c * PANEL_SIZE, SHEET_HEIGHT);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * PANEL_SIZE);
    ctx.lineTo(SHEET_WIDTH, r * PANEL_SIZE);
    ctx.stroke();
  }

  const expressions: ExpressionDef[] = [
    { type: 'neutral', browAngle: 0, browCurve: 0, mouth: 'neutral', eyeOpen: 1, mouthOpen: 0 },
    { type: 'happy', browAngle: -0.2, browCurve: 0.3, mouth: 'smile', eyeOpen: 0.85, mouthOpen: 0.1 },
    { type: 'angry', browAngle: 0.5, browCurve: -0.2, mouth: 'grit', eyeOpen: 0.9, mouthOpen: 0 },
    { type: 'sad', browAngle: -0.4, browCurve: 0.1, mouth: 'frown', eyeOpen: 0.75, mouthOpen: 0 },
    { type: 'surprised', browAngle: -0.3, browCurve: 0.4, mouth: 'o', eyeOpen: 1.15, mouthOpen: 0.4 },
    { type: 'determined', browAngle: 0.2, browCurve: -0.1, mouth: 'firm', eyeOpen: 0.95, mouthOpen: 0 },
  ];

  for (let i = 0; i < expressions.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const offsetX = col * PANEL_SIZE;
    const offsetY = row * PANEL_SIZE;
    drawPanel(ctx, offsetX, offsetY, params, expressions[i]);
  }

  // Add subtle paper texture overlay
  addPaperTexture(ctx);

  return canvas.toDataURL('image/png');
}

interface ExpressionDef {
  type: string;
  browAngle: number;
  browCurve: number;
  mouth: 'neutral' | 'smile' | 'grit' | 'frown' | 'o' | 'firm';
  eyeOpen: number;
  mouthOpen: number;
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  p: RenderParams,
  expr: ExpressionDef,
): void {
  const cx = ox + PANEL_SIZE / 2;
  const cy = oy + PANEL_SIZE / 2 + 10;

  // --- Background aura ---
  if (p.auraIntensity > 0.1) {
    drawAura(ctx, cx, cy - 20, p.auraIntensity, p.auraColor);
  }

  // --- Body / Outfit ---
  drawBody(ctx, cx, cy + 35, p);

  // --- Neck ---
  ctx.fillStyle = SKIN_SHADOW;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 14 * p.bodyWidth, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- Head ---
  drawHead(ctx, cx, cy - 15, p);

  // --- Hair (back layer) ---
  drawHairBack(ctx, cx, cy - 15, p);

  // --- Ears ---
  drawEar(ctx, cx - 38 * (0.9 + p.faceShape * 0.2), cy - 8, -1);
  drawEar(ctx, cx + 38 * (0.9 + p.faceShape * 0.2), cy - 8, 1);

  // --- Face features ---
  drawEyes(ctx, cx, cy - 18, p, expr);
  drawEyebrows(ctx, cx, cy - 32, p, expr);
  drawNose(ctx, cx, cy - 5);
  drawMouth(ctx, cx, cy + 12, p, expr);

  // --- Hair (front layer) ---
  drawHairFront(ctx, cx, cy - 15, p);

  // --- Glasses (if intelligent) ---
  if (p.hasGlasses) {
    drawGlasses(ctx, cx, cy - 18, p);
  }

  // --- Lucky charm ---
  if (p.luckyCharm) {
    drawLuckyCharm(ctx, cx + 30, cy + 35);
  }

  // --- Expression-specific effects ---
  if (expr.type === 'angry') {
    drawAngerMark(ctx, cx + 45, cy - 45);
  }
  if (expr.type === 'sad') {
    drawTear(ctx, cx + 18, cy - 5);
  }
}

function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, p: RenderParams): void {
  ctx.save();
  ctx.translate(x, y);

  // Face shape: blend between round and sharp based on appearance
  const w = 42 * (0.95 + p.faceShape * 0.15);
  const h = 52 * (0.95 + p.faceShape * 0.1);

  // Jaw: more angular for high appearance (protagonist look)
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, -h * 0.3);
  ctx.quadraticCurveTo(-w, -h * 0.1, -w * 0.85, h * 0.2);
  ctx.quadraticCurveTo(-w * 0.7, h * 0.6, -w * 0.3, h * 0.75);
  ctx.quadraticCurveTo(0, h * 0.82, w * 0.3, h * 0.75);
  ctx.quadraticCurveTo(w * 0.7, h * 0.6, w * 0.85, h * 0.2);
  ctx.quadraticCurveTo(w, -h * 0.1, w * 0.6, -h * 0.3);
  ctx.quadraticCurveTo(0, -h * 1.05, -w * 0.6, -h * 0.3);
  ctx.closePath();

  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Cheek shading (manga style)
  ctx.fillStyle = 'rgba(232, 180, 160, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.45, h * 0.15, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.45, h * 0.15, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHairBack(ctx: CanvasRenderingContext2D, x: number, y: number, p: RenderParams): void {
  ctx.save();
  ctx.translate(x, y);

  const volume = p.hairVolume;
  const style = p.hairStyle;

  ctx.fillStyle = HAIR_BASE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;

  // Back hair mass
  ctx.beginPath();
  ctx.moveTo(-45 * volume, -25);
  ctx.quadraticCurveTo(-55 * volume, 10, -50 * volume, 40);
  ctx.quadraticCurveTo(-40 * volume, 55, -20 * volume, 50);
  ctx.lineTo(20 * volume, 50);
  ctx.quadraticCurveTo(40 * volume, 55, 50 * volume, 40);
  ctx.quadraticCurveTo(55 * volume, 10, 45 * volume, -25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hair spikes for shonen style
  const spikeCount = 4 + Math.floor(style * 6);
  for (let i = 0; i < spikeCount; i++) {
    const angle = -Math.PI * 0.8 + (i / (spikeCount - 1)) * Math.PI * 0.6;
    const len = 20 + style * 25 + Math.random() * 10;
    const sx = Math.sin(angle) * len * volume;
    const sy = -35 - Math.cos(angle) * len * 0.5;

    ctx.beginPath();
    ctx.moveTo((i - spikeCount / 2) * 12, -30);
    ctx.quadraticCurveTo((i - spikeCount / 2) * 15, -45, sx, sy);
    ctx.quadraticCurveTo((i - spikeCount / 2) * 10, -35, (i - spikeCount / 2) * 8, -25);
    ctx.fillStyle = HAIR_BASE;
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawHairFront(ctx: CanvasRenderingContext2D, x: number, y: number, p: RenderParams): void {
  ctx.save();
  ctx.translate(x, y);

  const volume = p.hairVolume;
  const style = p.hairStyle;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillStyle = HAIR_BASE;

  // Bangs / front hair
  ctx.beginPath();
  ctx.moveTo(-42 * volume, -35);
  ctx.quadraticCurveTo(-20 * volume, -15, 0, -20);
  ctx.quadraticCurveTo(20 * volume, -15, 42 * volume, -35);
  ctx.quadraticCurveTo(35 * volume, -5, 30 * volume, 15);
  ctx.quadraticCurveTo(15 * volume, 5, 0, 10);
  ctx.quadraticCurveTo(-15 * volume, 5, -30 * volume, 15);
  ctx.quadraticCurveTo(-35 * volume, -5, -42 * volume, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Highlight strands
  ctx.strokeStyle = HAIR_HIGHLIGHT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-25 * volume, -25);
  ctx.quadraticCurveTo(-10 * volume, -10, -5 * volume, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5 * volume, -20);
  ctx.quadraticCurveTo(15 * volume, -8, 20 * volume, 8);
  ctx.stroke();

  // Extra strands for high style
  if (style > 0.5) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-35 * volume, -20);
    ctx.quadraticCurveTo(-45 * volume, 0, -40 * volume, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(35 * volume, -20);
    ctx.quadraticCurveTo(45 * volume, 0, 40 * volume, 25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: RenderParams,
  expr: ExpressionDef,
): void {
  const eyeW = 14 * p.eyeSize;
  const eyeH = 10 * p.eyeSize * expr.eyeOpen;
  const spacing = 22;

  for (let side of [-1, 1]) {
    const ex = x + side * spacing;
    const ey = y;

    ctx.save();
    ctx.translate(ex, ey);

    // Eye shape: sharper for high intelligence
    const sharpness = p.eyeSharpness;
    ctx.beginPath();
    ctx.moveTo(-eyeW, 0);
    ctx.quadraticCurveTo(-eyeW * 0.5, -eyeH * (1 + sharpness * 0.3), 0, -eyeH * 0.7);
    ctx.quadraticCurveTo(eyeW * 0.5, -eyeH * (1 + sharpness * 0.3), eyeW, 0);
    ctx.quadraticCurveTo(eyeW * 0.5, eyeH * 0.8, 0, eyeH * 0.5);
    ctx.quadraticCurveTo(-eyeW * 0.5, eyeH * 0.8, -eyeW, 0);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();

    // Iris
    const irisSize = eyeW * 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, irisSize, 0, Math.PI * 2);
    ctx.fillStyle = EYE_COLOR;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(0, 0, irisSize * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();

    // Highlight (manga style)
    ctx.beginPath();
    ctx.arc(-irisSize * 0.3, -irisSize * 0.3, irisSize * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Upper eyelid line (thicker for sharp eyes)
    ctx.beginPath();
    ctx.moveTo(-eyeW, 0);
    ctx.quadraticCurveTo(-eyeW * 0.5, -eyeH * (1 + sharpness * 0.3), 0, -eyeH * 0.7);
    ctx.quadraticCurveTo(eyeW * 0.5, -eyeH * (1 + sharpness * 0.3), eyeW, 0);
    ctx.lineWidth = 2 + sharpness * 1.5;
    ctx.strokeStyle = INK;
    ctx.stroke();

    // Eyelashes for high appearance
    if (p.faceShape > 0.5) {
      ctx.beginPath();
      ctx.moveTo(eyeW * 0.8, -eyeH * 0.3);
      ctx.lineTo(eyeW * 1.2, -eyeH * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: RenderParams,
  expr: ExpressionDef,
): void {
  const browW = 16;
  const spacing = 22;
  const angle = expr.browAngle;

  for (let side of [-1, 1]) {
    const bx = x + side * spacing;
    const by = y + (side === -1 ? angle * 8 : -angle * 8);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(side * angle * 0.8);

    ctx.beginPath();
    ctx.moveTo(-browW, 0);
    ctx.quadraticCurveTo(0, -4 + expr.browCurve * 6, browW, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = HAIR_BASE;
    ctx.stroke();

    ctx.restore();
  }
}

function drawNose(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 2, y + 6);
  ctx.lineTo(x + 3, y + 6);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: RenderParams,
  expr: ExpressionDef,
): void {
  ctx.save();
  ctx.translate(x, y);

  switch (expr.mouth) {
    case 'smile': {
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.quadraticCurveTo(0, 8 + expr.mouthOpen * 8, 12, -2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // Teeth hint
      if (expr.mouthOpen > 0) {
        ctx.beginPath();
        ctx.moveTo(-8, 2);
        ctx.quadraticCurveTo(0, 6, 8, 2);
        ctx.lineTo(6, 5);
        ctx.quadraticCurveTo(0, 8, -6, 5);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      break;
    }
    case 'grit': {
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // Teeth lines
      for (let i = -10; i <= 10; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -3);
        ctx.lineTo(i, 3);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      break;
    }
    case 'frown': {
      ctx.beginPath();
      ctx.moveTo(-10, 3);
      ctx.quadraticCurveTo(0, -2, 10, 3);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
    case 'o': {
      ctx.beginPath();
      ctx.ellipse(0, 0, 5 + expr.mouthOpen * 4, 7 + expr.mouthOpen * 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a2c2c';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
    case 'firm': {
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(0, 1, 10, 0);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
    default: { // neutral
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(0, 2, 8, 0);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, p: RenderParams): void {
  const w = 45 * p.bodyWidth;
  const h = 55;

  // Shoulders / torso
  ctx.beginPath();
  ctx.moveTo(-w, -10);
  ctx.quadraticCurveTo(-w * 0.9, h * 0.3, -w * 0.7, h);
  ctx.lineTo(w * 0.7, h);
  ctx.quadraticCurveTo(w * 0.9, h * 0.3, w, -10);
  ctx.closePath();

  ctx.fillStyle = OUTFIT_BASE;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Collar
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.quadraticCurveTo(0, 5, 20, -8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Outfit details based on family wealth
  if (p.outfitDetail > 0.3) {
    // Gold trim
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, 5);
    ctx.lineTo(-w * 0.6, 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.6, 5);
    ctx.lineTo(w * 0.6, 40);
    ctx.stroke();

    // Collar accent
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.quadraticCurveTo(0, 8, 15, -5);
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (p.outfitDetail > 0.6) {
    // Ornate patterns
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(0, 25, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shoulder pads
    ctx.fillStyle = OUTFIT_ACCENT;
    ctx.beginPath();
    ctx.ellipse(-w + 5, 0, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w - 5, 0, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawEar(ctx: CanvasRenderingContext2D, x: number, y: number, side: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 9, side * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawGlasses(ctx: CanvasRenderingContext2D, x: number, y: number, p: RenderParams): void {
  const eyeW = 14 * p.eyeSize;
  const spacing = 22;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;

  for (let side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * spacing, y, eyeW + 4, eyeW * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Bridge
  ctx.beginPath();
  ctx.moveTo(x - spacing + eyeW + 4, y - 2);
  ctx.lineTo(x + spacing - eyeW - 4, y - 2);
  ctx.stroke();
}

function drawAura(ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number, color: string): void {
  const radius = 60 + intensity * 30;
  const gradient = ctx.createRadialGradient(x, y, 20, x, y, radius);
  gradient.addColorStop(0, color + Math.floor(intensity * 40).toString(16).padStart(2, '0'));
  gradient.addColorStop(1, color + '00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Aura particles (fixed positions for deterministic output)
  if (intensity > 0.5) {
    ctx.fillStyle = color + '60';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.5;
      const px = x + Math.cos(angle) * (radius * 0.7);
      const py = y + Math.sin(angle) * (radius * 0.7);
      ctx.beginPath();
      ctx.arc(px, py, 2 + intensity * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawAngerMark(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 6);
  ctx.lineTo(x + 6, y + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 6);
  ctx.lineTo(x - 6, y + 6);
  ctx.stroke();
}

function drawTear(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLuckyCharm(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Star shape inside
  ctx.fillStyle = '#f5f0e8';
  drawStar(ctx, x, y, 3, 3, 5);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function addPaperTexture(ctx: CanvasRenderingContext2D): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Only add noise to non-transparent areas
    if (data[i + 3] > 0) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
