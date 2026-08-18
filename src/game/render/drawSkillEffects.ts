/**
 * VFX canvas das skills especiais (gelo / raio / fogo / caminho do ricochete).
 */

import type { RicochetPathEffect } from "@/src/game/systems/CombatSystem";
import type { SkillVfxEffect } from "@/src/game/systems/ActiveSkillsSystem";
import type { LightningProjectile } from "@/src/game/systems/ActiveSkillsSystem";
import { RICOCHET_PATH_DURATION_MS } from "@/src/game/systems/CombatSystem";

/** Onda de gelo: azul claro + cristais + névoa. */
export function drawIceSkillVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "ice" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = Math.max(8, effect.maxRadius * Math.min(1, progress));

  ctx.save();
  ctx.globalAlpha = alpha;

  // Névoa gelada preenchida
  const fog = ctx.createRadialGradient(
    effect.x,
    effect.y,
    radius * 0.15,
    effect.x,
    effect.y,
    radius,
  );
  fog.addColorStop(0, "rgba(186, 230, 253, 0.35)");
  fog.addColorStop(0.55, "rgba(125, 211, 252, 0.18)");
  fog.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fog;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 22;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(224, 242, 254, 0.65)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.stroke();

  // Cristais no anel + flocos internos
  const crystals = 12;
  for (let i = 0; i < crystals; i++) {
    const ang = (i / crystals) * Math.PI * 2 + progress * 0.8;
    const cx = effect.x + Math.cos(ang) * radius;
    const cy = effect.y + Math.sin(ang) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fillStyle = "rgba(240, 249, 255, 0.9)";
    ctx.fill();
  }

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 - progress * 1.2;
    const d = radius * (0.25 + (i % 3) * 0.12);
    const px = effect.x + Math.cos(ang) * d;
    const py = effect.y + Math.sin(ang) * d;
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(224, 242, 254, 0.75)";
    ctx.fill();
  }

  ctx.restore();
}

/** Zigzag elétrico azul + brilho. */
export function drawLightningSkillVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "lightning" }>,
  now: number,
): void {
  if (effect.expiresAt <= now || effect.points.length < 2) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const pts = effect.points;
  const end = pts[pts.length - 1]!;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Glow externo azul elétrico
  ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
  ctx.lineWidth = 10;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i]!.x, pts[i]!.y);
  }
  ctx.stroke();

  // Núcleo ciano
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#0ea5e9";
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Filamento branco
  ctx.strokeStyle = "rgba(239, 246, 255, 0.95)";
  ctx.lineWidth = 1.6;
  ctx.shadowBlur = 4;
  ctx.stroke();

  // Impacto no alvo
  const burst = 10 + (1 - alpha) * 16;
  ctx.beginPath();
  ctx.arc(end.x, end.y, burst, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * alpha})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 20;
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + now * 0.02;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x + Math.cos(ang) * (burst + 6),
      end.y + Math.sin(ang) * (burst + 6),
    );
    ctx.strokeStyle = "rgba(191, 219, 254, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/** Explosão elétrica em área no impacto do raio. */
export function drawLightningBurstVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "lightning_burst" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = Math.max(12, effect.maxRadius * Math.min(1, 0.35 + progress * 1.1));

  ctx.save();
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(
    effect.x,
    effect.y,
    4,
    effect.x,
    effect.y,
    radius,
  );
  glow.addColorStop(0, "rgba(219, 234, 254, 0.7)");
  glow.addColorStop(0.35, "rgba(56, 189, 248, 0.35)");
  glow.addColorStop(0.7, "rgba(37, 99, 235, 0.2)");
  glow.addColorStop(1, "rgba(30, 64, 175, 0)");
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(125, 211, 252, 0.95)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 22;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(191, 219, 254, 0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const arcs = 8;
  for (let i = 0; i < arcs; i++) {
    const ang = (i / arcs) * Math.PI * 2 + progress * 2.5;
    const inner = radius * 0.25;
    const outer = radius * (0.75 + (i % 2) * 0.15);
    ctx.beginPath();
    ctx.moveTo(
      effect.x + Math.cos(ang) * inner,
      effect.y + Math.sin(ang) * inner,
    );
    ctx.lineTo(
      effect.x + Math.cos(ang + 0.35) * (inner + outer) * 0.5,
      effect.y + Math.sin(ang + 0.35) * (inner + outer) * 0.5,
    );
    ctx.lineTo(
      effect.x + Math.cos(ang) * outer,
      effect.y + Math.sin(ang) * outer,
    );
    ctx.strokeStyle = "rgba(224, 242, 254, 0.9)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  ctx.restore();
}

/** Explosão flamejante no on-hit de fogo. */
export function drawFireSkillVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "fire" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = 10 + progress * 22;

  ctx.save();
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(
    effect.x,
    effect.y,
    2,
    effect.x,
    effect.y,
    radius,
  );
  glow.addColorStop(0, "rgba(254, 240, 138, 0.85)");
  glow.addColorStop(0.35, "rgba(249, 115, 22, 0.55)");
  glow.addColorStop(0.7, "rgba(220, 38, 38, 0.35)");
  glow.addColorStop(1, "rgba(127, 29, 29, 0)");
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + progress * 2;
    const len = radius * (0.55 + (i % 3) * 0.15);
    const tipX = effect.x + Math.cos(ang) * len;
    const tipY = effect.y + Math.sin(ang) * len - progress * 6;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.quadraticCurveTo(
      effect.x + Math.cos(ang + 0.4) * len * 0.5,
      effect.y + Math.sin(ang + 0.4) * len * 0.5 - 4,
      tipX,
      tipY,
    );
    ctx.strokeStyle =
      i % 2 === 0 ? "rgba(251, 146, 60, 0.9)" : "rgba(239, 68, 68, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.restore();
}

/** Pulso de gelo da aura (anel + cristais). */
export function drawAuraIcePulseVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "aura_ice_pulse" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = Math.max(10, effect.maxRadius * Math.min(1, 0.55 + progress * 0.55));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.restore();
}

/**
 * Anel contínuo da Aura no herói (cores conforme elementos liberados).
 */
export function drawHeroAuraRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  elements: {
    fire: boolean;
    lightning: boolean;
    ice: boolean;
    shadow?: boolean;
    stone?: boolean;
    ricochet?: boolean;
  },
  _now?: number,
): void {
  if (radius <= 0) return;
  void _now;
  const r = radius;

  let stroke = "rgba(232, 121, 249, 0.55)";
  let glow = "#e879f9";
  const elementalCount = [
    elements.fire,
    elements.ice,
    elements.lightning,
    elements.shadow,
    elements.stone,
    elements.ricochet,
  ].filter(Boolean).length;
  if (elementalCount >= 3) {
    stroke = "rgba(251, 191, 36, 0.65)";
    glow = "#fbbf24";
  } else if (elements.ricochet) {
    stroke = "rgba(196, 181, 253, 0.7)";
    glow = "#c4b5fd";
  } else if (elements.stone) {
    stroke = "rgba(168, 162, 158, 0.7)";
    glow = "#a8a29e";
  } else if (elements.shadow) {
    stroke = "rgba(139, 92, 246, 0.65)";
    glow = "#8b5cf6";
  } else if (elements.fire) {
    stroke = "rgba(249, 115, 22, 0.6)";
    glow = "#f97316";
  } else if (elements.lightning) {
    stroke = "rgba(56, 189, 248, 0.6)";
    glow = "#38bdf8";
  } else if (elements.ice) {
    stroke = "rgba(186, 230, 253, 0.65)";
    glow = "#bae6fd";
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = stroke.replace(/[\d.]+\)$/, "0.08)");
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

/** Clone de sombra (silhueta translúcida + barra de vida). */
export function drawShadowClone(
  ctx: CanvasRenderingContext2D,
  clone: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    rotation: number;
  },
  now: number,
): void {
  const flicker = 0.55 + 0.2 * Math.sin(now * 0.012);
  ctx.save();
  ctx.translate(clone.x, clone.y);
  ctx.rotate(clone.rotation + Math.PI / 2);
  ctx.globalAlpha = flicker;

  ctx.beginPath();
  ctx.arc(0, 0, clone.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2e1065";
  ctx.shadowColor = "#8b5cf6";
  ctx.shadowBlur = 16;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -clone.radius * 0.85, clone.radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#6d28d9";
  ctx.fill();

  ctx.restore();

  // HP bar
  const barW = clone.radius * 2.2;
  const barH = 3;
  const ratio = Math.max(0, Math.min(1, clone.hp / Math.max(1, clone.maxHp)));
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
  ctx.fillRect(clone.x - barW / 2, clone.y - clone.radius - 10, barW, barH);
  ctx.fillStyle = "#a78bfa";
  ctx.fillRect(
    clone.x - barW / 2,
    clone.y - clone.radius - 10,
    barW * ratio,
    barH,
  );
  ctx.restore();
}

/** Explosão sombra da aura. */
export function drawAuraShadowBurstVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "aura_shadow_burst" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = Math.max(
    12,
    effect.maxRadius * Math.min(1, 0.35 + progress * 0.9),
  );

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(91, 33, 182, 0.22)";
  ctx.fill();
  ctx.strokeStyle = "rgba(167, 139, 250, 0.95)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#7c3aed";
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.restore();
}

/** Onda de terremoto (Pedra). */
export function drawStoneQuakeVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "stone" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;

  ctx.save();
  ctx.globalAlpha = alpha * 0.95;
  for (let i = 0; i < 3; i++) {
    const t = Math.min(1, progress + i * 0.12);
    const radius = Math.max(20, effect.maxRadius * t);
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(168, 162, 158, ${0.75 - i * 0.18})`;
    ctx.lineWidth = 5 - i;
    ctx.shadowColor = "#78716c";
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  // Rachaduras radiais
  ctx.strokeStyle = "rgba(120, 113, 108, 0.7)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  const cracks = 10;
  for (let i = 0; i < cracks; i++) {
    const ang = (Math.PI * 2 * i) / cracks + progress * 0.4;
    const len = effect.maxRadius * (0.35 + progress * 0.55);
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(
      effect.x + Math.cos(ang) * len,
      effect.y + Math.sin(ang) * len,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** Anel de vácuo do Vendaval (contração). */
export function drawVendavalVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "vendaval" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;

  ctx.save();
  ctx.globalAlpha = alpha * 0.95;

  // Anéis que contraem em direção ao centro
  for (let i = 0; i < 4; i++) {
    const expand = Math.min(1, progress + i * 0.08);
    const radius = Math.max(
      16,
      effect.maxRadius * (1 - expand * 0.72),
    );
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(125, 211, 252, ${0.85 - i * 0.15})`;
    ctx.lineWidth = 4.5 - i * 0.6;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 16;
    ctx.stroke();
  }

  // Traços radiais sugerindo sucção
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
  ctx.lineWidth = 1.6;
  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const ang = (Math.PI * 2 * i) / spokes + progress * 1.2;
    const outer = effect.maxRadius * (0.85 - progress * 0.35);
    const inner = effect.maxRadius * (0.2 + progress * 0.15);
    ctx.beginPath();
    ctx.moveTo(
      effect.x + Math.cos(ang) * outer,
      effect.y + Math.sin(ang) * outer,
    );
    ctx.lineTo(
      effect.x + Math.cos(ang) * inner,
      effect.y + Math.sin(ang) * inner,
    );
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(effect.x, effect.y, 10 + progress * 8, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(14, 165, 233, ${0.35 * alpha})`;
  ctx.fill();
  ctx.restore();
}

export function drawParrySkillVfx(
  ctx: CanvasRenderingContext2D,
  effect: Extract<SkillVfxEffect, { kind: "parry" }>,
  now: number,
): void {
  if (effect.expiresAt <= now) return;
  const life = effect.expiresAt - effect.startedAt;
  const alpha = Math.max(
    0,
    Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
  );
  const progress = 1 - alpha;
  const radius = Math.max(
    18,
    effect.maxRadius * Math.min(1, 0.35 + progress * 1.1),
  );

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(254, 240, 138, 0.95)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "#fef08a";
  ctx.shadowBlur = 28;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, radius * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * alpha})`;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Projétil de raio com rastro elétrico. */
export function drawLightningProjectile(
  ctx: CanvasRenderingContext2D,
  bolt: LightningProjectile,
  now: number,
): void {
  const speed = Math.hypot(bolt.vx, bolt.vy) || 1;
  const ux = bolt.vx / speed;
  const uy = bolt.vy / speed;
  const px = -uy;
  const py = ux;

  ctx.save();
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 16;

  // Rastro em zigue-zague atrás do projétil
  ctx.beginPath();
  ctx.moveTo(bolt.x, bolt.y);
  for (let i = 1; i <= 4; i++) {
    const back = i * 10;
    const wobble = Math.sin(now * 0.04 + i * 2.1) * (4 + i);
    ctx.lineTo(
      bolt.x - ux * back + px * wobble,
      bolt.y - uy * back + py * wobble,
    );
  }
  ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, bolt.radius + 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#dbeafe";
  ctx.fill();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, bolt.radius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

/**
 * Caminho do braço ricocheteando: ombro → alvos, estilo luva/braço
 * (não um laser ciano separado).
 */
export function drawRicochetArmPath(
  ctx: CanvasRenderingContext2D,
  effect: RicochetPathEffect,
  playerX: number,
  playerY: number,
  now: number,
): void {
  if (effect.expiresAt <= now || effect.points.length === 0) return;

  const remaining = effect.expiresAt - now;
  const alpha = Math.max(
    0,
    Math.min(1, remaining / Math.max(1, RICOCHET_PATH_DURATION_MS)),
  );

  const path = [{ x: playerX, y: playerY }, ...effect.points];

  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Contorno do braço (manguito)
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i]!.x, path[i]!.y);
  }
  ctx.strokeStyle = "rgba(30, 58, 95, 0.85)";
  ctx.lineWidth = 7;
  ctx.shadowColor = "rgba(248, 113, 113, 0.55)";
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Miolo pele / braço
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i]!.x, path[i]!.y);
  }
  ctx.strokeStyle = "rgba(240, 196, 160, 0.95)";
  ctx.lineWidth = 3.5;
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Traço de movimento (impacto)
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i]!.x, path[i]!.y);
  }
  ctx.strokeStyle = `rgba(254, 202, 202, ${0.55 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // Luvas nos pontos de impacto
  for (let i = 1; i < path.length; i++) {
    const p = path[i]!;
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.02 + i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#dc2626";
    ctx.fill();
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(248, 113, 113, ${0.45 * alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/** Despacha todos os VFX de skill do frame. */
export function drawAllSkillVfx(
  ctx: CanvasRenderingContext2D,
  effects: SkillVfxEffect[] | undefined,
  now: number,
): void {
  for (const effect of effects ?? []) {
    if (effect.kind === "ice") drawIceSkillVfx(ctx, effect, now);
    else if (effect.kind === "lightning") drawLightningSkillVfx(ctx, effect, now);
    else if (effect.kind === "lightning_burst")
      drawLightningBurstVfx(ctx, effect, now);
    else if (effect.kind === "fire") drawFireSkillVfx(ctx, effect, now);
    else if (effect.kind === "aura_ice_pulse")
      drawAuraIcePulseVfx(ctx, effect, now);
    else if (effect.kind === "aura_shadow_burst")
      drawAuraShadowBurstVfx(ctx, effect, now);
    else if (effect.kind === "stone") drawStoneQuakeVfx(ctx, effect, now);
    else if (effect.kind === "vendaval") drawVendavalVfx(ctx, effect, now);
    else if (effect.kind === "parry") drawParrySkillVfx(ctx, effect, now);
  }
}
