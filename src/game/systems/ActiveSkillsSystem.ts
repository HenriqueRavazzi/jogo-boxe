/** Skills ativas periódicas (Gelo / Fogo / Raio / Ricochete). */

import type { Enemy } from "@/src/game/entities/Enemy";
import type { SkillsData } from "@/db/schema";
import { SHOCK_SLOW_DURATION_MS } from "@/src/game/entities/Enemy";

export const ACTIVE_SKILL_CYCLE_MS = 20_000;
export const ACTIVE_SKILL_DURATION_MS = 3_000;
/** Ricochete: ciclo mais longo, janela curta de frenesi. */
export const RICOCHET_CYCLE_MS = 25_000;
export const RICOCHET_ACTIVE_MS = 2_000;
/** Intervalo entre cadeias de raio enquanto a janela está ativa. */
export const LIGHTNING_TICK_MS = 500;
/** Raio da onda de gelo (px) — cobre a arena típica. */
export const ICE_WAVE_RADIUS = 2400;
/** Alcance do 1º alvo do raio a partir do jogador. */
export const LIGHTNING_FIRST_RANGE = 520;
/** Alcance entre saltos da cadeia (horda densa). */
export const LIGHTNING_LINK_RADIUS = 280;

export type ActiveSkillPulseState = {
  /** Próximo disparo de gelo (game clock ms). 0 = ainda não inicializado. */
  iceNextPulseAt: number;
  iceActiveUntil: number;
  /** Timestamp do último pulso (para VFX). */
  icePulseAt: number;
  fireNextPulseAt: number;
  fireActiveUntil: number;
  firePulseAt: number;
  lightningNextPulseAt: number;
  lightningActiveUntil: number;
  lightningPulseAt: number;
  /** Último tick de cadeia durante a janela ativa. */
  lightningLastTickAt: number;
  ricochetNextPulseAt: number;
  ricochetActiveUntil: number;
  ricochetPulseAt: number;
};

export function createActiveSkillPulseState(): ActiveSkillPulseState {
  return {
    iceNextPulseAt: 0,
    iceActiveUntil: 0,
    icePulseAt: 0,
    fireNextPulseAt: 0,
    fireActiveUntil: 0,
    firePulseAt: 0,
    lightningNextPulseAt: 0,
    lightningActiveUntil: 0,
    lightningPulseAt: 0,
    lightningLastTickAt: 0,
    ricochetNextPulseAt: 0,
    ricochetActiveUntil: 0,
    ricochetPulseAt: 0,
  };
}

/** Janela de ricochete ativa (socos disparam cadeia). */
export function isRicochetActive(
  pulse: ActiveSkillPulseState,
  now: number,
): boolean {
  return pulse.ricochetActiveUntil > now;
}

export type LightningHitSplat = {
  x: number;
  y: number;
  damage: number;
};

export type RunActiveSkillsInput = {
  enemies: Enemy[];
  playerX: number;
  playerY: number;
  now: number;
  baseDamage: number;
  matchSkills: SkillsData;
  skillLevels: SkillsData;
  pulseState: ActiveSkillPulseState;
};

export type RunActiveSkillsResult = {
  pulseState: ActiveSkillPulseState;
  questFreeze: number;
  questShock: number;
  /** Splats de dano do raio neste frame. */
  lightningHits: LightningHitSplat[];
  /** Dano total de skills especiais neste frame (regen meta). */
  skillDamageDealt: number;
  /** Hits de skills especiais neste frame (regen meta). */
  skillHitsLanded: number;
};

/**
 * Congela inimigos no raio da onda (duração escala com skillLevels.ice).
 */
function applyIceWave(
  enemies: Enemy[],
  playerX: number,
  playerY: number,
  now: number,
  freezeDurationMs: number,
): number {
  let hit = 0;
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
    if (dist > ICE_WAVE_RADIUS) continue;
    enemy.applyStatus("freeze", now + freezeDurationMs);
    hit += 1;
  }
  return hit;
}

/**
 * Aplica burn em todos os inimigos vivos (DPS escala com skillLevels.fire).
 */
function applyArenaBurn(
  enemies: Enemy[],
  now: number,
  burnDps: number,
  durationMs: number,
): number {
  if (burnDps <= 0) return 0;
  let hit = 0;
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    enemy.applyBurn(burnDps, now, durationMs);
    hit += 1;
  }
  return hit;
}

/**
 * Cadeia de raio: 1º mais perto do player, depois saltos para o mais próximo.
 */
function chainLightningTargets(
  enemies: Enemy[],
  originX: number,
  originY: number,
  targetCount: number,
): Enemy[] {
  const chain: Enemy[] = [];
  const used = new Set<string>();
  let cx = originX;
  let cy = originY;

  for (let i = 0; i < targetCount; i++) {
    const maxDist = i === 0 ? LIGHTNING_FIRST_RANGE : LIGHTNING_LINK_RADIUS;
    let best: Enemy | null = null;
    let bestDist = Infinity;

    for (const enemy of enemies) {
      if (used.has(enemy.id) || enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - cx, enemy.y - cy);
      if (dist <= maxDist && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    if (!best) break;
    chain.push(best);
    used.add(best.id);
    cx = best.x;
    cy = best.y;
  }

  return chain;
}

/**
 * Dispara uma cadeia: dano + slow. Retorna hits para VFX/quests.
 */
function fireLightningChain(
  enemies: Enemy[],
  playerX: number,
  playerY: number,
  now: number,
  targetCount: number,
  damage: number,
  slowAmount: number,
): { hits: LightningHitSplat[]; shocked: number } {
  const chain = chainLightningTargets(
    enemies,
    playerX,
    playerY,
    targetCount,
  );
  const hits: LightningHitSplat[] = [];
  let shocked = 0;

  for (const enemy of chain) {
    enemy.applyShockSlow(slowAmount, now, SHOCK_SLOW_DURATION_MS);
    enemy.hp -= damage;
    shocked += 1;
    hits.push({
      x: enemy.x,
      y: enemy.y,
      damage: Math.max(1, Math.round(damage)),
    });
  }

  return { hits, shocked };
}

/**
 * Atualiza timers e aplica pulsos de Gelo/Fogo/Raio quando ativos na run.
 */
export function runActiveSkills(
  input: RunActiveSkillsInput,
): RunActiveSkillsResult {
  const {
    enemies,
    playerX,
    playerY,
    now,
    baseDamage,
    matchSkills,
    skillLevels,
    pulseState,
  } = input;

  const next: ActiveSkillPulseState = { ...pulseState };
  let questFreeze = 0;
  let questShock = 0;
  const lightningHits: LightningHitSplat[] = [];
  let skillDamageDealt = 0;
  let skillHitsLanded = 0;

  // ——— Gelo ———
  if (matchSkills.ice > 0) {
    if (next.iceNextPulseAt <= 0) {
      next.iceNextPulseAt = now;
    }

    if (now >= next.iceNextPulseAt) {
      next.iceActiveUntil = now + ACTIVE_SKILL_DURATION_MS;
      next.icePulseAt = now;
      next.iceNextPulseAt = now + ACTIVE_SKILL_CYCLE_MS;

      const freezeDurationMs = 1000 + skillLevels.ice * 500;
      questFreeze = applyIceWave(
        enemies,
        playerX,
        playerY,
        now,
        freezeDurationMs,
      );
      skillHitsLanded += questFreeze;
    }

    if (now < next.iceActiveUntil) {
      const freezeDurationMs = 1000 + skillLevels.ice * 500;
      const remaining = Math.max(0, next.iceActiveUntil - now);
      const applyMs = Math.max(remaining, Math.min(freezeDurationMs, 500));
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        if (enemy.hasStatus("freeze", now)) continue;
        const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
        if (dist > ICE_WAVE_RADIUS) continue;
        enemy.applyStatus("freeze", now + applyMs);
      }
    }
  } else {
    next.iceNextPulseAt = 0;
    next.iceActiveUntil = 0;
  }

  // ——— Fogo ———
  if (matchSkills.fire > 0) {
    if (next.fireNextPulseAt <= 0) {
      next.fireNextPulseAt = now;
    }

    const burnTickDamage =
      baseDamage * 0.2 * (1 + skillLevels.fire * 0.5);

    if (now >= next.fireNextPulseAt) {
      next.fireActiveUntil = now + ACTIVE_SKILL_DURATION_MS;
      next.firePulseAt = now;
      next.fireNextPulseAt = now + ACTIVE_SKILL_CYCLE_MS;
      const burned = applyArenaBurn(
        enemies,
        now,
        burnTickDamage,
        ACTIVE_SKILL_DURATION_MS,
      );
      skillHitsLanded += burned;
      // Estimativa de dano do primeiro tick de burn para regen meta
      skillDamageDealt += burned * burnTickDamage;
    }

    if (now < next.fireActiveUntil) {
      const remaining = Math.max(100, next.fireActiveUntil - now);
      applyArenaBurn(enemies, now, burnTickDamage, remaining);
    }
  } else {
    next.fireNextPulseAt = 0;
    next.fireActiveUntil = 0;
  }

  // ——— Raio ———
  if (matchSkills.lightning > 0) {
    if (next.lightningNextPulseAt <= 0) {
      next.lightningNextPulseAt = now;
    }

    const targetCount = 2 + skillLevels.lightning;
    const lightningDamage =
      baseDamage * (0.35 + skillLevels.lightning * 0.15);
    const slowAmount = Math.min(
      0.85,
      0.2 + skillLevels.lightning * 0.1,
    );

    if (now >= next.lightningNextPulseAt) {
      next.lightningActiveUntil = now + ACTIVE_SKILL_DURATION_MS;
      next.lightningPulseAt = now;
      next.lightningNextPulseAt = now + ACTIVE_SKILL_CYCLE_MS;
      next.lightningLastTickAt = 0; // força tick imediato na janela
    }

    if (now < next.lightningActiveUntil) {
      const dueTick =
        next.lightningLastTickAt <= 0 ||
        now >= next.lightningLastTickAt + LIGHTNING_TICK_MS;

      if (dueTick) {
        next.lightningLastTickAt = now;
        const burst = fireLightningChain(
          enemies,
          playerX,
          playerY,
          now,
          targetCount,
          lightningDamage,
          slowAmount,
        );
        questShock += burst.shocked;
        lightningHits.push(...burst.hits);
        for (const hit of burst.hits) {
          skillDamageDealt += hit.damage;
          skillHitsLanded += 1;
        }
      }
    }
  } else {
    next.lightningNextPulseAt = 0;
    next.lightningActiveUntil = 0;
    next.lightningLastTickAt = 0;
  }

  // ——— Ricochete (janela 2s a cada 25s — socos disparam cadeia) ———
  if (matchSkills.ricochet > 0) {
    if (next.ricochetNextPulseAt <= 0) {
      next.ricochetNextPulseAt = now;
    }

    if (now >= next.ricochetNextPulseAt) {
      next.ricochetActiveUntil = now + RICOCHET_ACTIVE_MS;
      next.ricochetPulseAt = now;
      next.ricochetNextPulseAt = now + RICOCHET_CYCLE_MS;
    }
  } else {
    next.ricochetNextPulseAt = 0;
    next.ricochetActiveUntil = 0;
  }

  return {
    pulseState: next,
    questFreeze,
    questShock,
    lightningHits,
    skillDamageDealt,
    skillHitsLanded,
  };
}

/** Progresso 0–1 da onda visual desde o pulso. */
export function pulseVisualProgress(
  pulseAt: number,
  now: number,
  durationMs = ACTIVE_SKILL_DURATION_MS,
): number {
  if (pulseAt <= 0 || now < pulseAt) return 0;
  const t = (now - pulseAt) / durationMs;
  if (t >= 1) return 0;
  return t;
}
