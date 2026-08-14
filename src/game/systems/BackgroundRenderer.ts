/**
 * Fundo dinâmico da arena por nível de Prestígio.
 * Camada estática em offscreen (cache); animações leves no frame.
 */

import {
  getDefaultDimensionForPrestige,
  getDimensionFilter,
  getDimensionTheme,
  type DimensionId,
} from "@/src/game/prestigeVisual";

export type PrestigeBgTier = DimensionId;

export function getPrestigeBgTier(prestigeLevel: number): PrestigeBgTier {
  return getDefaultDimensionForPrestige(prestigeLevel);
}

type StarSpec = { x: number; y: number; r: number; twinkle: number };
type FloatSpec = {
  x: number;
  y: number;
  size: number;
  rot: number;
  speed: number;
  kind: "hex" | "tri";
};

type BgCache = {
  key: string;
  canvas: HTMLCanvasElement;
  stars: StarSpec[];
  floats: FloatSpec[];
};

let cache: BgCache | null = null;

function cacheKey(w: number, h: number, theme: DimensionId): string {
  return `${getDimensionTheme(theme)}:${Math.round(w)}x${Math.round(h)}`;
}

function ensureOffscreen(w: number, h: number): HTMLCanvasElement {
  const c =
    typeof document !== "undefined"
      ? document.createElement("canvas")
      : (null as unknown as HTMLCanvasElement);
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  return c;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Tier 0 — Rua / Bairro */
function paintStreet(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#222222");
  base.addColorStop(0.35, "#1a1a1a");
  base.addColorStop(1, "#141414");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Paralelepípedos / grade de asfalto
  ctx.strokeStyle = "rgba(90, 90, 90, 0.14)";
  ctx.lineWidth = 1;
  const cell = 36;
  for (let y = 0; y < h; y += cell) {
    const offset = (Math.floor(y / cell) % 2) * (cell / 2);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
    for (let x = -cell + offset; x < w + cell; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, y);
      ctx.lineTo(x + 0.5, y + cell);
      ctx.stroke();
    }
  }

  // Silhueta de prédios (topo)
  const rand = seededRand(42);
  ctx.fillStyle = "rgba(8, 8, 10, 0.85)";
  let bx = -20;
  while (bx < w + 40) {
    const bw = 40 + rand() * 70;
    const bh = 40 + rand() * (h * 0.18);
    ctx.fillRect(bx, 0, bw, bh);
    // Janelas
    ctx.fillStyle = "rgba(255, 200, 120, 0.06)";
    for (let wy = 8; wy < bh - 8; wy += 12) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
        if (rand() > 0.45) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    ctx.fillStyle = "rgba(8, 8, 10, 0.85)";
    bx += bw + 4 + rand() * 18;
  }

  // Postes de luz nas laterais
  const poles = [
    { x: 28, y: h * 0.35 },
    { x: 28, y: h * 0.7 },
    { x: w - 28, y: h * 0.35 },
    { x: w - 28, y: h * 0.7 },
  ];
  for (const p of poles) {
    ctx.strokeStyle = "rgba(160, 160, 160, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 70);
    ctx.lineTo(p.x, p.y + 20);
    ctx.stroke();
    ctx.strokeStyle = "rgba(160, 160, 160, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 70);
    ctx.lineTo(p.x + (p.x < w / 2 ? 18 : -18), p.y - 62);
    ctx.stroke();
    const glow = ctx.createRadialGradient(p.x, p.y - 62, 2, p.x, p.y - 62, 48);
    glow.addColorStop(0, "rgba(255, 214, 140, 0.18)");
    glow.addColorStop(1, "rgba(255, 214, 140, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x + (p.x < w / 2 ? 12 : -12), p.y - 58, 48, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Tier 1 — Ginásio / Subterrâneo */
function paintGym(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#0e1420");
  base.addColorStop(0.5, "#121824");
  base.addColorStop(1, "#0a1018");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Grade aço
  const step = 44;
  ctx.strokeStyle = "rgba(120, 160, 200, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Grades de ferro nas laterais
  const drawFence = (x0: number, inward: number) => {
    ctx.strokeStyle = "rgba(150, 170, 190, 0.22)";
    ctx.lineWidth = 2;
    for (let y = 20; y < h - 20; y += 28) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + inward * 22, y + 14);
      ctx.lineTo(x0, y + 28);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x0 + inward * 8, 10);
    ctx.lineTo(x0 + inward * 8, h - 10);
    ctx.stroke();
  };
  drawFence(10, 1);
  drawFence(w - 10, -1);

  // Correntes
  ctx.strokeStyle = "rgba(170, 180, 200, 0.18)";
  ctx.lineWidth = 1.5;
  for (const side of [0, 1] as const) {
    const cx = side === 0 ? 48 : w - 48;
    for (let i = 0; i < 5; i++) {
      const y = h * 0.15 + i * 28;
      ctx.beginPath();
      ctx.ellipse(cx, y, 7, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Tier 2 — Arena Cibernética / Neon */
function paintCyber(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createRadialGradient(w * 0.5, h * 0.15, 20, w * 0.5, h * 0.6, Math.max(w, h));
  base.addColorStop(0, "#1a0a2e");
  base.addColorStop(0.45, "#0c1220");
  base.addColorStop(1, "#050810");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow
  const band = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.55);
  band.addColorStop(0, "rgba(168, 85, 247, 0)");
  band.addColorStop(0.5, "rgba(34, 211, 238, 0.12)");
  band.addColorStop(1, "rgba(168, 85, 247, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.4, w, h * 0.2);

  // Synthwave perspective grid (precomputed once into cache canvas)
  const horizon = h * 0.48;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    const y = horizon + (h - horizon) * (t * t);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const vanishingX = w * 0.5;
  for (let i = -10; i <= 10; i++) {
    const edgeX = vanishingX + i * (w * 0.12);
    ctx.beginPath();
    ctx.moveTo(vanishingX, horizon);
    ctx.lineTo(edgeX, h);
    ctx.stroke();
  }

  // Telões pixelados
  const panels = [
    { x: w * 0.08, y: h * 0.08, pw: 70, ph: 44 },
    { x: w * 0.78, y: h * 0.1, pw: 80, ph: 50 },
    { x: w * 0.42, y: h * 0.04, pw: 96, ph: 36 },
  ];
  for (const p of panels) {
    ctx.fillStyle = "rgba(10, 14, 30, 0.75)";
    ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(p.x, p.y, p.pw, p.ph);
    ctx.strokeRect(p.x, p.y, p.pw, p.ph);
    const cell = 6;
    for (let py = p.y + 4; py < p.y + p.ph - 4; py += cell) {
      for (let px = p.x + 4; px < p.x + p.pw - 4; px += cell) {
        const on = ((px * 13 + py * 7) % 17) > 9;
        ctx.fillStyle = on
          ? "rgba(34, 211, 238, 0.35)"
          : "rgba(168, 85, 247, 0.12)";
        ctx.fillRect(px, py, cell - 1, cell - 1);
      }
    }
  }

  // Linhas de energia estáticas (pulse no frame)
  ctx.strokeStyle = "rgba(168, 85, 247, 0.2)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const y = h * (0.18 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, y);
    ctx.bezierCurveTo(w * 0.3, y - 12, w * 0.7, y + 12, w * 0.95, y);
    ctx.stroke();
  }
}

/** Tier 3 — Infernal / Abissal */
function paintInfernal(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createRadialGradient(w * 0.5, h * 0.7, 20, w * 0.5, h * 0.4, Math.max(w, h));
  base.addColorStop(0, "#3b0a0a");
  base.addColorStop(0.45, "#1a0608");
  base.addColorStop(1, "#0a0204");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Chão rachado
  ctx.strokeStyle = "rgba(220, 38, 38, 0.12)";
  ctx.lineWidth = 1.5;
  const rand = seededRand(77);
  for (let i = 0; i < 18; i++) {
    let x = rand() * w;
    let y = h * 0.45 + rand() * h * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rand() - 0.5) * 60;
      y += rand() * 28;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Brasas no chão
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = h * 0.5 + rand() * h * 0.5;
    ctx.fillStyle = `rgba(249, 115, 22, ${0.08 + rand() * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Silhueta de picos
  ctx.fillStyle = "rgba(20, 4, 4, 0.9)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.28);
  let px = 0;
  while (px < w) {
    const peak = h * (0.08 + rand() * 0.18);
    ctx.lineTo(px + 30, peak);
    ctx.lineTo(px + 60, h * 0.28);
    px += 60 + rand() * 40;
  }
  ctx.lineTo(w, h * 0.28);
  ctx.lineTo(w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
}

/** Tier 4 — Glacial */
function paintGlacial(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#0b1329");
  base.addColorStop(0.45, "#0a1020");
  base.addColorStop(1, "#060a14");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const rand = seededRand(512);
  ctx.strokeStyle = "rgba(186, 230, 253, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const x = rand() * w;
    const y = h * 0.2 + rand() * h * 0.75;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      const nx = x + (rand() - 0.5) * 40;
      const ny = y - 12 - rand() * 28;
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
  }

  // Cristais no chão
  for (let i = 0; i < 22; i++) {
    const x = rand() * w;
    const y = h * 0.55 + rand() * h * 0.42;
    ctx.fillStyle = `rgba(147, 197, 253, ${0.06 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 10);
    ctx.lineTo(x + 4, y + 10);
    ctx.closePath();
    ctx.fill();
  }
}

/** Tier 5 — Vulcânico (lava nas bordas) */
function paintVolcanic(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createRadialGradient(w * 0.5, h * 0.85, 10, w * 0.5, h * 0.5, Math.max(w, h));
  base.addColorStop(0, "#3d1510");
  base.addColorStop(0.4, "#1a0f0d");
  base.addColorStop(1, "#0c0605");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const rand = seededRand(909);
  // Rachaduras de lava
  ctx.strokeStyle = "rgba(251, 146, 60, 0.22)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    let x = rand() * w;
    let y = h * 0.65 + rand() * h * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 50;
      y -= rand() * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Bordas incandescentes
  const edgeGlow = ctx.createLinearGradient(0, 0, w, 0);
  edgeGlow.addColorStop(0, "rgba(234, 88, 12, 0.35)");
  edgeGlow.addColorStop(0.08, "rgba(234, 88, 12, 0)");
  edgeGlow.addColorStop(0.92, "rgba(234, 88, 12, 0)");
  edgeGlow.addColorStop(1, "rgba(234, 88, 12, 0.35)");
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
}

/** Tier 6 — Ciber-Abissal (Matrix) */
function paintCyberAbyss(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#051a0e");
  base.addColorStop(0.5, "#031208");
  base.addColorStop(1, "#020805");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const rand = seededRand(1337);
  const cols = Math.max(8, Math.floor(w / 28));
  ctx.font = "10px monospace";
  for (let c = 0; c < cols; c++) {
    const x = (c + 0.5) * (w / cols);
    const len = 4 + Math.floor(rand() * 8);
    for (let r = 0; r < len; r++) {
      const y = h * 0.08 + r * 14;
      const ch = rand() > 0.5 ? "1" : "0";
      ctx.fillStyle = `rgba(74, 222, 128, ${0.04 + (len - r) * 0.018})`;
      ctx.fillText(ch, x, y);
    }
  }

  ctx.strokeStyle = "rgba(34, 197, 94, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = h * (0.15 + i * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (i % 2 === 0 ? 6 : -6));
    ctx.stroke();
  }
}

/** Tier 7 — Dimensão Poligonal / Cósmica */
function paintCosmic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stars: StarSpec[],
): void {
  const base = ctx.createRadialGradient(
    w * 0.5,
    h * 0.45,
    10,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.85,
  );
  base.addColorStop(0, "#1a0a28");
  base.addColorStop(0.4, "#0d0614");
  base.addColorStop(1, "#050208");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Stars (base positions; twinkle in animate pass)
  for (const s of stars) {
    ctx.fillStyle = `rgba(230, 220, 255, ${0.25 + s.twinkle * 0.35})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hex grid sutil
  const hexR = 28;
  const hexH = hexR * Math.sqrt(3);
  ctx.strokeStyle = "rgba(196, 181, 253, 0.06)";
  ctx.lineWidth = 1;
  for (let row = -1; row < h / hexH + 2; row++) {
    const y = row * hexH;
    const xOff = (row % 2) * hexR * 1.5;
    for (let col = -1; col < w / (hexR * 3) + 2; col++) {
      const cx = col * hexR * 3 + xOff;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = cx + hexR * Math.cos(a);
        const py = y + hexR * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function buildStars(w: number, h: number, count: number): StarSpec[] {
  const rand = seededRand(9001 + Math.floor(w) * 7 + Math.floor(h));
  const out: StarSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rand() * w,
      y: rand() * h,
      r: 0.6 + rand() * 1.6,
      twinkle: rand(),
    });
  }
  return out;
}

function buildFloats(w: number, h: number, count: number): FloatSpec[] {
  const rand = seededRand(4242 + Math.floor(w) + Math.floor(h) * 3);
  const out: FloatSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rand() * w,
      y: rand() * h,
      size: 6 + rand() * 14,
      rot: rand() * Math.PI * 2,
      speed: 0.15 + rand() * 0.35,
      kind: rand() > 0.5 ? "hex" : "tri",
    });
  }
  return out;
}

function rebuildCache(w: number, h: number, dimension: DimensionId): BgCache {
  const canvas = ensureOffscreen(w, h);
  const ctx = canvas.getContext("2d");
  const theme = getDimensionTheme(dimension);
  const stars = theme === 7 ? buildStars(w, h, 90) : [];
  const floats = theme === 7 ? buildFloats(w, h, 18) : [];
  if (ctx) {
    if (theme === 0) paintStreet(ctx, w, h);
    else if (theme === 1) paintGym(ctx, w, h);
    else if (theme === 2) paintCyber(ctx, w, h);
    else if (theme === 3) paintInfernal(ctx, w, h);
    else if (theme === 4) paintGlacial(ctx, w, h);
    else if (theme === 5) paintVolcanic(ctx, w, h);
    else if (theme === 6) paintCyberAbyss(ctx, w, h);
    else paintCosmic(ctx, w, h, stars);
  }
  return { key: cacheKey(w, h, dimension), canvas, stars, floats };
}

function getCache(w: number, h: number, dimension: DimensionId): BgCache {
  const key = cacheKey(w, h, dimension);
  if (!cache || cache.key !== key) {
    cache = rebuildCache(w, h, dimension);
  }
  return cache;
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawTri(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = rot + (Math.PI * 2 * i) / 3;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Desenha o fundo da arena conforme a dimensão ativa.
 * Camada estática via offscreen cache; overlays animados leves.
 */
export function drawArenaBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dimension: DimensionId,
  timeMs = 0,
): void {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const theme = getDimensionTheme(dimension);
  const bg = getCache(w, h, theme);

  ctx.save();
  ctx.filter = getDimensionFilter(dimension);
  ctx.drawImage(bg.canvas, 0, 0);

  const t = timeMs / 1000;

  if (theme === 2) {
    // Neon pulse nas linhas de energia (overlay barato)
    const pulse = 0.35 + 0.25 * Math.sin(t * 2.2);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const y = h * (0.2 + i * 0.09) + Math.sin(t + i) * 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, y);
      ctx.bezierCurveTo(w * 0.35, y - 10, w * 0.65, y + 10, w * 0.92, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (theme === 3) {
    // Brasas flutuantes (overlay leve)
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const px = ((i * 97 + t * 18) % (w + 20)) - 10;
      const py = h * 0.55 + ((i * 53 + t * 12) % (h * 0.4));
      ctx.globalAlpha = 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.fillStyle = i % 2 === 0 ? "#f97316" : "#fbbf24";
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (theme === 4) {
    // Flocos de neve / cristais caindo
    ctx.save();
    for (let i = 0; i < 28; i++) {
      const px = ((i * 113 + t * 22) % (w + 30)) - 15;
      const py = ((i * 67 + t * (18 + (i % 5) * 3)) % (h + 20)) - 10;
      const size = 1.2 + (i % 4) * 0.6;
      ctx.globalAlpha = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      ctx.fillStyle = i % 3 === 0 ? "#bae6fd" : "#e0f2fe";
      if (i % 5 === 0) {
        ctx.beginPath();
        ctx.moveTo(px, py - size * 2);
        ctx.lineTo(px, py + size * 2);
        ctx.moveTo(px - size * 2, py);
        ctx.lineTo(px + size * 2, py);
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (theme === 5) {
    // Brasas subindo + pulso de lava nas bordas
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const px = ((i * 89 + t * 14) % w);
      const py = h - ((i * 41 + t * 28) % (h * 0.45));
      ctx.globalAlpha = 0.2 + 0.25 * Math.sin(t * 2.5 + i);
      ctx.fillStyle = i % 2 === 0 ? "#fb923c" : "#ef4444";
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    const pulse = 0.25 + 0.15 * Math.sin(t * 1.8);
    const lava = ctx.createLinearGradient(0, h * 0.82, 0, h);
    lava.addColorStop(0, `rgba(234, 88, 12, ${pulse})`);
    lava.addColorStop(1, "rgba(220, 38, 38, 0)");
    ctx.fillStyle = lava;
    ctx.fillRect(0, h * 0.82, w, h * 0.18);
    ctx.restore();
  }

  if (theme === 6) {
    // Colunas de código subindo + glitch
    ctx.save();
    ctx.font = "11px monospace";
    const cols = Math.max(6, Math.floor(w / 32));
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * (w / cols);
      const headY = ((t * (40 + c * 3) + c * 120) % (h + 80)) - 40;
      for (let r = 0; r < 10; r++) {
        const y = headY - r * 14;
        if (y < 0 || y > h) continue;
        const ch = (Math.floor(t * 8 + c + r) % 2) === 0 ? "1" : "0";
        ctx.globalAlpha = Math.max(0, 0.55 - r * 0.05);
        ctx.fillStyle = r === 0 ? "#86efac" : "#22c55e";
        if (Math.sin(t * 12 + c * 3.7 + r * 1.3) > 0.96) {
          ctx.fillStyle = "#bbf7d0";
        }
        ctx.fillText(ch, x + (Math.sin(t * 12 + c) * 1.5), y);
      }
    }
    ctx.restore();
  }

  if (theme === 7) {
    // Poeira cósmica / drift lento das estrelas
    ctx.save();
    for (const s of bg.stars) {
      const drift = ((t * 4 * (0.3 + s.twinkle)) + s.x) % (w + 20);
      const tw =
        0.15 +
        0.55 * (0.5 + 0.5 * Math.sin(t * (1.2 + s.twinkle * 2) + s.twinkle * 6));
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#e9e0ff";
      ctx.beginPath();
      ctx.arc(drift - 10, (s.y + t * 2 * s.twinkle) % h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(196, 181, 253, 0.7)";
    ctx.lineWidth = 1;
    for (const f of bg.floats) {
      const fx = (f.x + Math.sin(t * f.speed + f.rot) * 18 + w) % w;
      const fy = (f.y + t * f.speed * 6 + h) % h;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(f.rot + t * f.speed * 0.4);
      if (f.kind === "hex") drawHex(ctx, 0, 0, f.size);
      else drawTri(ctx, 0, 0, f.size, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();
}

/** Invalida o cache (ex.: resize extremo ou troca de dimensão). */
export function invalidateArenaBackgroundCache(): void {
  cache = null;
}

/** Flash de Fenda Dimensional sobre a cena (0 = início, 1 = fim). */
export function drawMultiverseRiftFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
): void {
  if (progress <= 0 || progress >= 1) return;
  const peak = progress < 0.35 ? progress / 0.35 : (1 - progress) / 0.65;
  const alpha = Math.max(0, Math.min(0.92, peak * 0.92));
  ctx.save();
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    0,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.65,
  );
  grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  grad.addColorStop(0.35, `rgba(196, 181, 253, ${alpha * 0.75})`);
  grad.addColorStop(1, `rgba(139, 92, 246, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
