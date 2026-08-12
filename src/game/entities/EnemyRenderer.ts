/**
 * Renderização temática de inimigos por prestígio.
 * Apenas visual — hitbox continua sendo o círculo `radius`.
 */

import type { EnemyType } from "@/src/game/entities/Enemy";
import {
  type DimensionId,
} from "@/src/game/prestigeVisual";

export type ThemedEnemyDrawInput = {
  x: number;
  y: number;
  radius: number;
  type: EnemyType;
  /** 0–1 vida restante (tinta). */
  hpPercent: number;
  /** Dimensão visual ativa (Multiverse Loop ou prestígio). */
  visualDimension: DimensionId;
  now: number;
  isAttacking: boolean;
  frozen: boolean;
  burning: boolean;
  /** Cor do catálogo (opcional; temas têm paleta própria). */
  catalogColor?: string;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Ângulo genérico animado (sem vel. no draw input — usa id hash via posição). */
function idleFacing(x: number, y: number, now: number): number {
  return Math.atan2(Math.sin(now * 0.001 + x * 0.01), Math.cos(now * 0.001 + y * 0.01));
}

function mixHp(base: string, hp: number, frozen: boolean, burning: boolean): string {
  if (frozen) return "#7dd3fc";
  if (burning) return "#ea580c";
  // Escurece levemente com dano (mantém legibilidade)
  const dim = 0.55 + 0.45 * clamp01(hp);
  // Se for hex simples, aplica via alpha overlay — fallback retorna base
  void dim;
  return base;
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  lineWidth = 2,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawPoly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number,
  fill: string,
  stroke?: string,
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/* ─── Tier 0 · Rua ─────────────────────────────────────────────── */

function drawStreetNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning } = i;
  const body = mixHp("#4a3728", hp, frozen, burning);
  drawCircle(ctx, x, y, r, body, "#2a1f18", 1.5);
  // Capuz
  ctx.beginPath();
  ctx.arc(x, y - r * 0.15, r * 0.95, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fillStyle = mixHp("#1f2937", hp, frozen, burning);
  ctx.fill();
  // Olhos
  ctx.fillStyle = frozen ? "#e0f2fe" : "#fef08a";
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.05, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.28, y - r * 0.05, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawStreetDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  // Motion lines
  ctx.save();
  ctx.strokeStyle = "rgba(251, 146, 60, 0.45)";
  ctx.lineWidth = 1.5;
  for (let k = 1; k <= 3; k++) {
    const back = ang + Math.PI;
    const d = r + k * 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(back) * d, y + Math.sin(back) * d);
    ctx.lineTo(
      x + Math.cos(back) * (d + 6),
      y + Math.sin(back) * (d + 6),
    );
    ctx.stroke();
  }
  ctx.restore();
  // Corpo esbelto (elipse visual — hitbox ainda é r)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = mixHp("#c2410c", hp, frozen, burning);
  ctx.fill();
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawStreetRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning, isAttacking } = i;
  const ang = idleFacing(x, y, now);
  drawCircle(ctx, x, y, r, mixHp("#334155", hp, frozen, burning), "#0f172a", 2);
  // Braço / mira
  const reach = r + (isAttacking ? 10 : 7);
  ctx.strokeStyle = isAttacking ? "rgba(248, 113, 113, 0.9)" : "rgba(148, 163, 184, 0.8)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang) * reach, y + Math.sin(ang) * reach);
  ctx.stroke();
  // Laser tip
  ctx.fillStyle = isAttacking ? "#f87171" : "#94a3b8";
  ctx.beginPath();
  ctx.arc(
    x + Math.cos(ang) * reach,
    y + Math.sin(ang) * reach,
    2.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawStreetBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning } = i;
  drawCircle(ctx, x, y, r, mixHp("#7f1d1d", hp, frozen, burning), "#fca5a5", 3);
  // Casaco / ombros
  ctx.beginPath();
  ctx.arc(x, y + r * 0.1, r * 0.92, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 6;
  ctx.stroke();
  // Coroa de valentão
  ctx.fillStyle = "#fbbf24";
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x + k * r * 0.22, y - r * 0.55);
    ctx.lineTo(x + k * r * 0.22 + 4, y - r * 0.85);
    ctx.lineTo(x + k * r * 0.22 + 8, y - r * 0.55);
    ctx.closePath();
    ctx.fill();
  }
}

/* ─── Tier 1 · Industrial ──────────────────────────────────────── */

function drawIndustrialNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const rot = now * 0.002;
  drawPoly(ctx, x, y, r, 6, rot, mixHp("#64748b", hp, frozen, burning), "#94a3b8");
  drawCircle(ctx, x, y, r * 0.35, "#1e293b", "#cbd5e1", 1);
  // Rebites
  ctx.fillStyle = "#cbd5e1";
  for (let k = 0; k < 6; k++) {
    const a = rot + (k * Math.PI * 2) / 6;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fumaça sutil
  ctx.fillStyle = `rgba(148, 163, 184, ${0.12 + 0.08 * Math.sin(now * 0.01)})`;
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y - r * 1.1, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawIndustrialDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const spin = now * 0.02;
  drawCircle(ctx, x, y, r * 0.55, mixHp("#475569", hp, frozen, burning), "#94a3b8", 1.5);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  for (let blade = 0; blade < 3; blade++) {
    const a = spin + (blade * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2);
    ctx.stroke();
  }
}

function drawIndustrialRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning, isAttacking } = i;
  const ang = idleFacing(x, y, now);
  drawPoly(ctx, x, y, r * 0.9, 4, Math.PI / 4, mixHp("#334155", hp, frozen, burning), "#64748b");
  // Canhão
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = isAttacking ? "#f97316" : "#94a3b8";
  ctx.fillRect(r * 0.2, -3, r * 0.95, 6);
  ctx.restore();
}

function drawIndustrialBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  drawPoly(ctx, x, y, r, 8, now * 0.001, mixHp("#1e293b", hp, frozen, burning), "#94a3b8");
  drawCircle(ctx, x, y, r * 0.4, "#0f172a", "#38bdf8", 2);
  // Fumaça
  for (let k = 0; k < 3; k++) {
    const a = now * 0.003 + k * 2.1;
    ctx.fillStyle = `rgba(148, 163, 184, ${0.1 + 0.05 * Math.sin(a)})`;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(a) * r * 0.6,
      y - r * 0.9 - k * 4,
      5 + k * 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/* ─── Tier 2 · Cyber ───────────────────────────────────────────── */

function drawCyberNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning, now } = i;
  drawPoly(ctx, x, y, r, 4, Math.PI / 4, mixHp("#0ea5e9", hp, frozen, burning), "#67e8f9");
  // Neon lines
  ctx.strokeStyle = `rgba(103, 232, 249, ${0.5 + 0.3 * Math.sin(now * 0.02)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.lineTo(x + r * 0.5, y);
  ctx.moveTo(x, y - r * 0.5);
  ctx.lineTo(x, y + r * 0.5);
  ctx.stroke();
  drawCircle(ctx, x, y, r * 0.22, "#e0f2fe");
}

function drawCyberDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  // Pixel trail / glitch
  ctx.save();
  for (let k = 1; k <= 4; k++) {
    const back = ang + Math.PI;
    const ox = x + Math.cos(back) * (r + k * 5) + (k % 2) * 2;
    const oy = y + Math.sin(back) * (r + k * 5);
    ctx.fillStyle = `rgba(34, 211, 238, ${0.35 - k * 0.06})`;
    ctx.fillRect(ox - 2, oy - 2, 4, 4);
  }
  ctx.restore();
  drawPoly(ctx, x, y, r, 3, ang, mixHp("#06b6d4", hp, frozen, burning), "#a5f3fc");
}

function drawCyberRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning, isAttacking } = i;
  const ang = idleFacing(x, y, now);
  drawCircle(ctx, x, y, r, mixHp("#7c3aed", hp, frozen, burning), "#c4b5fd", 2);
  // Plasma barrel
  const len = r + (isAttacking ? 12 : 8);
  const gx = x + Math.cos(ang) * len;
  const gy = y + Math.sin(ang) * len;
  ctx.strokeStyle = isAttacking ? "#22d3ee" : "#a78bfa";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(gx, gy);
  ctx.stroke();
  const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 8);
  glow.addColorStop(0, "rgba(34, 211, 238, 0.8)");
  glow.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(gx, gy, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCyberBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.015);
  ctx.save();
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 12 + pulse * 10;
  drawPoly(ctx, x, y, r, 6, now * 0.002, mixHp("#4c1d95", hp, frozen, burning), "#22d3ee");
  ctx.restore();
  drawCircle(ctx, x, y, r * 0.3, `rgba(34, 211, 238, ${0.4 + pulse * 0.4})`);
}

/* ─── Tier 3 · Infernal ────────────────────────────────────────── */

function drawInfernalNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning } = i;
  drawCircle(ctx, x, y, r, mixHp("#b91c1c", hp, frozen, burning), "#7f1d1d", 1.5);
  // Chifres
  ctx.fillStyle = "#450a0a";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r * 0.4);
  ctx.lineTo(x - r * 0.75, y - r * 1.05);
  ctx.lineTo(x - r * 0.25, y - r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.55, y - r * 0.4);
  ctx.lineTo(x + r * 0.75, y - r * 1.05);
  ctx.lineTo(x + r * 0.25, y - r * 0.55);
  ctx.closePath();
  ctx.fill();
  // Olhos
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y, r * 0.14, 0, Math.PI * 2);
  ctx.arc(x + r * 0.25, y, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function drawInfernalDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  // Flame trail
  for (let k = 1; k <= 4; k++) {
    const back = ang + Math.PI;
    const fx = x + Math.cos(back) * (r + k * 5);
    const fy = y + Math.sin(back) * (r + k * 5);
    ctx.fillStyle = `rgba(249, 115, 22, ${0.4 - k * 0.07})`;
    ctx.beginPath();
    ctx.arc(fx, fy, r * (0.45 - k * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.2, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = mixHp("#9a3412", hp, frozen, burning);
  ctx.fill();
  ctx.restore();
}

function drawInfernalRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  drawCircle(ctx, x, y, r, mixHp("#7c2d12", hp, frozen, burning), "#fdba74", 2);
  // Orbes de fogo fatuo
  for (let k = 0; k < 3; k++) {
    const a = now * 0.004 + (k * Math.PI * 2) / 3;
    const ox = x + Math.cos(a) * (r + 6);
    const oy = y + Math.sin(a) * (r + 6);
    const glow = ctx.createRadialGradient(ox, oy, 1, ox, oy, 6);
    glow.addColorStop(0, "rgba(254, 240, 138, 0.9)");
    glow.addColorStop(0.5, "rgba(249, 115, 22, 0.5)");
    glow.addColorStop(1, "rgba(127, 29, 29, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawInfernalBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r + 12);
  glow.addColorStop(0, "rgba(254, 215, 170, 0.35)");
  glow.addColorStop(0.5, "rgba(220, 38, 38, 0.25)");
  glow.addColorStop(1, "rgba(69, 10, 10, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r + 12, 0, Math.PI * 2);
  ctx.fill();
  drawCircle(ctx, x, y, r, mixHp("#7f1d1d", hp, frozen, burning), "#fbbf24", 3);
  // Chifres grandes
  ctx.fillStyle = "#450a0a";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.4, y - r * 0.5);
  ctx.lineTo(x - r * 0.9, y - r * 1.25);
  ctx.lineTo(x - r * 0.1, y - r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.4, y - r * 0.5);
  ctx.lineTo(x + r * 0.9, y - r * 1.25);
  ctx.lineTo(x + r * 0.1, y - r * 0.7);
  ctx.closePath();
  ctx.fill();
  void now;
}

/* ─── Tier 4 · Cósmico ─────────────────────────────────────────── */

function drawCosmicNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const wobble = 1 + 0.08 * Math.sin(now * 0.008 + x);
  const glow = ctx.createRadialGradient(x, y, r * 0.15, x, y, r * 1.2);
  glow.addColorStop(0, "rgba(233, 213, 255, 0.85)");
  glow.addColorStop(0.45, mixHp("rgba(147, 51, 234, 0.75)", hp, frozen, burning));
  glow.addColorStop(1, "rgba(76, 29, 149, 0)");
  ctx.beginPath();
  ctx.arc(x, y, r * wobble, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  drawCircle(ctx, x, y, r * 0.28, "#f5f3ff");
}

function drawCosmicDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  for (let k = 1; k <= 5; k++) {
    const back = ang + Math.PI;
    const px = x + Math.cos(back) * (r + k * 4.5);
    const py = y + Math.sin(back) * (r + k * 4.5);
    ctx.fillStyle = `rgba(196, 181, 253, ${0.45 - k * 0.07})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1, r * 0.35 - k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  drawCircle(ctx, x, y, r, mixHp("#ddd6fe", hp, frozen, burning), "#a78bfa", 1.5);
}

function drawCosmicRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const rot = now * 0.003;
  drawPoly(ctx, x, y, r * 0.85, 3, rot, mixHp("#6d28d9", hp, frozen, burning), "#c4b5fd");
  drawPoly(ctx, x, y, r * 0.55, 3, -rot * 1.4, "rgba(237, 233, 254, 0.5)", "#e9d5ff");
  // Orbitais
  for (let k = 0; k < 3; k++) {
    const a = rot * 2 + (k * Math.PI * 2) / 3;
    ctx.fillStyle = "#e9d5ff";
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCosmicBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r + 16);
  glow.addColorStop(0, "rgba(245, 243, 255, 0.5)");
  glow.addColorStop(0.4, "rgba(139, 92, 246, 0.35)");
  glow.addColorStop(1, "rgba(46, 16, 101, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r + 16, 0, Math.PI * 2);
  ctx.fill();
  drawPoly(ctx, x, y, r, 8, now * 0.0015, mixHp("#4c1d95", hp, frozen, burning), "#e9d5ff");
  drawStarSimple(ctx, x, y, r * 0.45, 5, "#f5f3ff");
}

function drawStarSimple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  points: number,
  color: string,
): void {
  const inner = r * 0.45;
  const rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/* ─── Tier 4 · Glacial ─────────────────────────────────────────── */

function drawGlacialNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning, now } = i;
  drawPoly(ctx, x, y, r, 6, now * 0.001, mixHp("#1e3a5f", hp, frozen, burning), "#93c5fd");
  drawCircle(ctx, x, y, r * 0.25, "#e0f2fe");
}

function drawGlacialDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  for (let k = 1; k <= 4; k++) {
    const back = ang + Math.PI;
    ctx.fillStyle = `rgba(186, 230, 253, ${0.35 - k * 0.07})`;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(back) * (r + k * 5),
      y + Math.sin(back) * (r + k * 5),
      r * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  drawPoly(ctx, x, y, r, 4, ang, mixHp("#0369a1", hp, frozen, burning), "#bae6fd");
}

function drawGlacialRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  drawCircle(ctx, x, y, r, mixHp("#0c4a6e", hp, frozen, burning), "#7dd3fc", 2);
  for (let k = 0; k < 3; k++) {
    const a = now * 0.003 + (k * Math.PI * 2) / 3;
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGlacialBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  drawPoly(ctx, x, y, r, 8, now * 0.0012, mixHp("#1d4ed8", hp, frozen, burning), "#bfdbfe");
  drawStarSimple(ctx, x, y, r * 0.35, 6, "#f0f9ff");
}

/* ─── Tier 5 · Vulcânico ───────────────────────────────────────── */

function drawVolcanicNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning } = i;
  drawCircle(ctx, x, y, r, mixHp("#991b1b", hp, frozen, burning), "#ea580c", 2);
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.05, r * 0.12, 0, Math.PI * 2);
  ctx.arc(x + r * 0.22, y - r * 0.05, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawVolcanicDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  drawInfernalDasher(ctx, i);
}

function drawVolcanicRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  drawInfernalRanged(ctx, i);
}

function drawVolcanicBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r + 14);
  glow.addColorStop(0, "rgba(254, 215, 170, 0.45)");
  glow.addColorStop(1, "rgba(127, 29, 29, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r + 14, 0, Math.PI * 2);
  ctx.fill();
  drawPoly(ctx, x, y, r, 6, now * 0.0018, mixHp("#7f1d1d", hp, frozen, burning), "#fb923c");
}

/* ─── Tier 6 · Ciber-Abissal ───────────────────────────────────── */

function drawAbyssNormal(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, hpPercent: hp, frozen, burning, now } = i;
  drawPoly(ctx, x, y, r, 4, Math.PI / 4, mixHp("#14532d", hp, frozen, burning), "#4ade80");
  ctx.strokeStyle = `rgba(74, 222, 128, ${0.45 + 0.3 * Math.sin(now * 0.025)})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.9);
  drawCircle(ctx, x, y, r * 0.2, "#bbf7d0");
}

function drawAbyssDasher(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const ang = idleFacing(x, y, now);
  for (let k = 1; k <= 4; k++) {
    const back = ang + Math.PI;
    ctx.fillStyle = `rgba(34, 197, 94, ${0.35 - k * 0.06})`;
    ctx.fillRect(
      x + Math.cos(back) * (r + k * 4) - 2,
      y + Math.sin(back) * (r + k * 4) - 2,
      4,
      4,
    );
  }
  drawPoly(ctx, x, y, r, 3, ang, mixHp("#166534", hp, frozen, burning), "#86efac");
}

function drawAbyssRanged(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning, isAttacking } = i;
  drawCircle(ctx, x, y, r, mixHp("#052e16", hp, frozen, burning), "#22c55e", 2);
  const ang = idleFacing(x, y, now);
  const len = r + (isAttacking ? 10 : 6);
  ctx.strokeStyle = isAttacking ? "#bbf7d0" : "#4ade80";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  ctx.stroke();
}

function drawAbyssBoss(ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput): void {
  const { x, y, radius: r, now, hpPercent: hp, frozen, burning } = i;
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.018);
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 10 + pulse * 8;
  drawPoly(ctx, x, y, r, 6, now * 0.002, mixHp("#14532d", hp, frozen, burning), "#4ade80");
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#bbf7d0";
  ctx.font = `${Math.max(8, r * 0.5)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("01", x, y);
}

type Drawer = (ctx: CanvasRenderingContext2D, i: ThemedEnemyDrawInput) => void;

const DRAWERS: Record<
  DimensionId,
  Record<EnemyType, Drawer>
> = {
  0: {
    normal: drawStreetNormal,
    dasher: drawStreetDasher,
    ranged: drawStreetRanged,
    boss: drawStreetBoss,
  },
  1: {
    normal: drawIndustrialNormal,
    dasher: drawIndustrialDasher,
    ranged: drawIndustrialRanged,
    boss: drawIndustrialBoss,
  },
  2: {
    normal: drawCyberNormal,
    dasher: drawCyberDasher,
    ranged: drawCyberRanged,
    boss: drawCyberBoss,
  },
  3: {
    normal: drawInfernalNormal,
    dasher: drawInfernalDasher,
    ranged: drawInfernalRanged,
    boss: drawInfernalBoss,
  },
  4: {
    normal: drawGlacialNormal,
    dasher: drawGlacialDasher,
    ranged: drawGlacialRanged,
    boss: drawGlacialBoss,
  },
  5: {
    normal: drawVolcanicNormal,
    dasher: drawVolcanicDasher,
    ranged: drawVolcanicRanged,
    boss: drawVolcanicBoss,
  },
  6: {
    normal: drawAbyssNormal,
    dasher: drawAbyssDasher,
    ranged: drawAbyssRanged,
    boss: drawAbyssBoss,
  },
  7: {
    normal: drawCosmicNormal,
    dasher: drawCosmicDasher,
    ranged: drawCosmicRanged,
    boss: drawCosmicBoss,
  },
};

/**
 * Desenha o corpo temático do inimigo.
 * Nunca altera `radius` — só paths visuais centrados na hitbox.
 */
export function drawThemedEnemy(
  ctx: CanvasRenderingContext2D,
  input: ThemedEnemyDrawInput,
): void {
  const dimension = input.visualDimension;
  const drawer = DRAWERS[dimension][input.type] ?? DRAWERS[dimension].normal;
  ctx.save();
  drawer(ctx, input);
  ctx.restore();

  // Anel de ataque (feedback mecânico, comum a todos os temas)
  if (input.isAttacking && !input.frozen) {
    ctx.beginPath();
    ctx.arc(input.x, input.y, input.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle =
      input.type === "ranged"
        ? "rgba(45, 212, 191, 0.9)"
        : "rgba(248, 113, 113, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export type { DimensionId };
