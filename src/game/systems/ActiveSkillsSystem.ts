/** Skills ativas periódicas (Gelo / Raio / Ricochete). Fogo é on-hit no combate. */

import type { Enemy } from "@/src/game/entities/Enemy";
import type { MatchSkillsData, SkillsData } from "@/db/schema";
import {
  ICE_VULNERABILITY_MULTIPLIER,
} from "@/src/game/entities/Enemy";
import {
  DEFAULT_MATCH_SKILL_BONUS,
  type MatchSkillBonuses,
} from "@/lib/matchUpgrades";
import { useGameStore } from "@/store/useGameStore";

export const ACTIVE_SKILL_CYCLE_MS = 20_000;
export const ACTIVE_SKILL_DURATION_MS = 3_000;
/** @deprecated Preferir fórmula: max(2000, 7000 - cooldown×500). */
export const RICOCHET_CYCLE_MS = 7_000;
export const RICOCHET_ACTIVE_MS = 2_000;
/** Fração do alcance efetivo do herói usada pelo gelo. */
export const ICE_RANGE_RATIO = 0.4;
/** Duração do VFX da onda de gelo (ms). */
export const ICE_VFX_MS = 520;
/** Duração do VFX do raio single-target (ms). */
export const LIGHTNING_VFX_MS = 380;
/** Duração do flash da explosão em área (ms). */
export const LIGHTNING_BURST_VFX_MS = 320;
/** Duração do flash flamejante on-hit (ms). */
export const FIRE_HIT_VFX_MS = 280;
/** Velocidade do projétil elétrico (px/s). */
export const LIGHTNING_PROJECTILE_SPEED = 920;
export const LIGHTNING_PROJECTILE_RADIUS = 7;
/** Raio da explosão no impacto (dano + shock). */
export const LIGHTNING_AOE_RADIUS = 120;
/** Folga extra de colisão para garantir o acerto no alvo. */
export const LIGHTNING_HIT_SLOP_PX = 28;
/**
 * Multiplicador base de burst do Raio (single-target).
 * hits/damage granulares empilham em cima disso.
 */
export const LIGHTNING_BURST_BASE = 2.8;
/** @deprecated Cadeia removida — Raio é single-target. */
export const LIGHTNING_LINK_RADIUS = 280;
/** @deprecated Preferir iceRadius dinâmico (40% do range). */
export const ICE_WAVE_RADIUS = 2400;
/** @deprecated */
export const LIGHTNING_FIRST_RANGE = 520;
/** Duração do VFX do terremoto (ms). */
export const STONE_VFX_MS = 640;
/** Duração base do debuff de Pedra (ms). */
export const STONE_DEBUFF_BASE_MS = 10_000;
/** Fração de dano/AS dos inimigos sob terremoto. */
export const STONE_ENEMY_POWER_MUL = 0.5;
/** Multiplicador base de dano do terremoto vs dano do herói. */
export const STONE_QUAKE_DAMAGE_RATIO = 1.35;
/** Duração do VFX do vendaval (ms). */
export const VENDAVAL_VFX_MS = 560;
/** Duração do puxão suave após o pulso (ms). */
export const VENDAVAL_PULL_DURATION_MS = 500;
/** Raio base do vácuo (px). */
export const VENDAVAL_BASE_RADIUS = 350;
/** +px por nível in-run. */
export const VENDAVAL_RADIUS_PER_MATCH = 14;
/** +px por nível meta de radius. */
export const VENDAVAL_RADIUS_PER_META = 8;
/** Fração do skillDamage → impacto do vácuo. */
export const VENDAVAL_DAMAGE_RATIO = 1.15;

export type ActiveSkillPulseState = {
  iceNextPulseAt: number;
  iceActiveUntil: number;
  icePulseAt: number;
  /** Raio da última onda de gelo (para VFX). */
  iceWaveRadius: number;
  fireNextPulseAt: number;
  fireActiveUntil: number;
  firePulseAt: number;
  lightningNextPulseAt: number;
  lightningActiveUntil: number;
  lightningPulseAt: number;
  lightningLastTickAt: number;
  ricochetNextPulseAt: number;
  ricochetActiveUntil: number;
  ricochetPulseAt: number;
  /** Próximo stun periódico da Aura (gelo liberado). */
  auraStunNextAt: number;
  /** Timestamp do último pulso de gelo da aura. */
  auraPulseAt: number;
  /** Próximo pulso de explosão sombra na aura. */
  auraShadowNextAt: number;
  /** Timestamp do último pulso sombra da aura. */
  auraShadowPulseAt: number;
  /** Quando o próximo Shadow Clone pode spawnar. */
  shadowNextSpawnAt: number;
  /** Timestamp do último spawn do clone. */
  shadowPulseAt: number;
  /** Até quando o clone atual permanece (TTL). */
  shadowActiveUntil: number;
  /** Próximo terremoto da Pedra. */
  stoneNextPulseAt: number;
  stoneActiveUntil: number;
  stonePulseAt: number;
  /** Próximo pulso do Vendaval. */
  vendavalNextPulseAt: number;
  vendavalActiveUntil: number;
  vendavalPulseAt: number;
  /** Raio do último vácuo (VFX). */
  vendavalWaveRadius: number;
};

export function createActiveSkillPulseState(): ActiveSkillPulseState {
  return {
    iceNextPulseAt: 0,
    iceActiveUntil: 0,
    icePulseAt: 0,
    iceWaveRadius: 0,
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
    auraStunNextAt: 0,
    auraPulseAt: 0,
    auraShadowNextAt: 0,
    auraShadowPulseAt: 0,
    shadowNextSpawnAt: 0,
    shadowPulseAt: 0,
    shadowActiveUntil: 0,
    stoneNextPulseAt: 0,
    stoneActiveUntil: 0,
    stonePulseAt: 0,
    vendavalNextPulseAt: 0,
    vendavalActiveUntil: 0,
    vendavalPulseAt: 0,
    vendavalWaveRadius: 0,
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

/** Projétil elétrico em voo (player → 1º alvo). */
export type LightningProjectile = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  /** Alvo preferencial no momento do disparo. */
  targetEnemyId: string | null;
};

export type SkillVfxEffect =
  | {
      kind: "ice";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "lightning";
      points: { x: number; y: number }[];
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "lightning_burst";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "fire";
      x: number;
      y: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "aura_ice_pulse";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "aura_shadow_burst";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "stone";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "vendaval";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    }
  | {
      kind: "parry";
      x: number;
      y: number;
      maxRadius: number;
      startedAt: number;
      expiresAt: number;
    };

export type RunActiveSkillsInput = {
  enemies: Enemy[];
  playerX: number;
  playerY: number;
  now: number;
  baseDamage: number;
  matchSkills: MatchSkillsData;
  skills: SkillsData;
  pulseState: ActiveSkillPulseState;
  /** Alcance efetivo do herói (base × buffs) — gelo usa 40%. */
  effectiveRange: number;
  /** Bônus in-run acumulados das cartas de raridade. */
  matchSkillBonuses?: MatchSkillBonuses;
};

export type RunActiveSkillsResult = {
  pulseState: ActiveSkillPulseState;
  questFreeze: number;
  questShock: number;
  lightningHits: LightningHitSplat[];
  skillDamageDealt: number;
  skillHitsLanded: number;
  /** Projéteis de raio disparados neste frame. */
  newLightningProjectiles: LightningProjectile[];
  /** VFX de onda de gelo / cadeias. */
  newSkillVfx: SkillVfxEffect[];
};

function applyIceWave(
  enemies: Enemy[],
  playerX: number,
  playerY: number,
  now: number,
  freezeDurationMs: number,
  iceRadius: number,
): number {
  let hit = 0;
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
    if (dist > iceRadius) continue;
    enemy.applyStatus("freeze", now + freezeDurationMs, {
      vulnerable: true,
      damageTakenMultiplier: ICE_VULNERABILITY_MULTIPLIER,
    });
    hit += 1;
  }
  return hit;
}

/**
 * @deprecated Raio é single-target; mantido só por compat de imports.
 */
export function chainLightningTargets(
  enemies: Enemy[],
  originX: number,
  originY: number,
  targetCount: number,
  excludeIds: Set<string> = new Set(),
): Enemy[] {
  void enemies;
  void originX;
  void originY;
  void targetCount;
  void excludeIds;
  return [];
}

/** Dano de estouro single-target do Raio. */
export function getLightningBurstDamage(
  baseDamage: number,
  lightningDamageLevel: number,
  lightningHitsLevel: number,
): number {
  return (
    baseDamage *
    (LIGHTNING_BURST_BASE +
      lightningDamageLevel * 0.55 +
      lightningHitsLevel * 0.35)
  );
}

/** Pontos em zigue-zague entre A e B (VFX). */
export function buildZigzagPoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  segments = 5,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: ax, y: ay }];
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const wobble = (Math.random() * 2 - 1) * Math.min(28, len * 0.12);
    points.push({
      x: ax + dx * t + nx * wobble,
      y: ay + dy * t + ny * wobble,
    });
  }
  points.push({ x: bx, y: by });
  return points;
}

/**
 * Atualiza timers: gelo (AoE 40% range), raio (projétil), ricochete.
 * Fogo é tratado no CombatSystem (on-hit).
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
    skills,
    pulseState,
    effectiveRange,
    matchSkillBonuses,
  } = input;

  const next: ActiveSkillPulseState = { ...pulseState };
  let questFreeze = 0;
  const questShock = 0;
  const lightningHits: LightningHitSplat[] = [];
  let skillDamageDealt = 0;
  let skillHitsLanded = 0;
  const newLightningProjectiles: LightningProjectile[] = [];
  const newSkillVfx: SkillVfxEffect[] = [];

  const iceBonus = matchSkillBonuses?.ice ?? DEFAULT_MATCH_SKILL_BONUS;
  const lightningBonus =
    matchSkillBonuses?.lightning ?? DEFAULT_MATCH_SKILL_BONUS;
  const ricochetBonus =
    matchSkillBonuses?.ricochet ?? DEFAULT_MATCH_SKILL_BONUS;

  const prestigeMul = useGameStore.getState().getPrestigeMultiplier();
  const iceCooldownMs = Math.max(
    5_000,
    (20_000 - skills.ice.cooldown * 1_000 * prestigeMul) *
      iceBonus.cooldownMul,
  );
  const lightningCooldownMs = Math.max(
    5_000,
    (20_000 - skills.lightning.cooldown * 1_000 * prestigeMul) *
      lightningBonus.cooldownMul,
  );
  const ricochetCooldownMs = Math.max(
    2_000,
    (7_000 - skills.ricochet.cooldown * 500 * prestigeMul) *
      ricochetBonus.cooldownMul,
  );

  // ——— Gelo (onda periódica a 40% do range) ———
  if (matchSkills.ice > 0) {
    if (next.iceNextPulseAt <= 0) {
      next.iceNextPulseAt = now;
    }

    if (now >= next.iceNextPulseAt) {
      const iceRadius = Math.max(40, effectiveRange * ICE_RANGE_RATIO);
      next.iceActiveUntil = now + ACTIVE_SKILL_DURATION_MS;
      next.icePulseAt = now;
      next.iceWaveRadius = iceRadius;
      next.iceNextPulseAt = now + iceCooldownMs;

      const freezeDurationMs = Math.round(
        (1000 + Math.round(skills.ice.duration * 500 * prestigeMul)) *
          iceBonus.durationMul,
      );
      questFreeze = applyIceWave(
        enemies,
        playerX,
        playerY,
        now,
        freezeDurationMs,
        iceRadius,
      );
      skillHitsLanded += questFreeze;
      newSkillVfx.push({
        kind: "ice",
        x: playerX,
        y: playerY,
        maxRadius: iceRadius,
        startedAt: now,
        expiresAt: now + ICE_VFX_MS,
      });
    }
  } else {
    next.iceNextPulseAt = 0;
    next.iceActiveUntil = 0;
    next.iceWaveRadius = 0;
  }

  // ——— Fogo: removido do periódico (on-hit no combate) ———
  next.fireNextPulseAt = 0;
  next.fireActiveUntil = 0;

  // ——— Raio: só dispara se houver inimigo (nunca “no vazio”) ———
  if (matchSkills.lightning > 0) {
    if (next.lightningNextPulseAt <= 0) {
      next.lightningNextPulseAt = now;
    }

    if (now >= next.lightningNextPulseAt) {
      const boltCount = 1 + Math.max(0, lightningBonus.extraProjectiles);
      const livingSorted = enemies
        .filter((e) => !e.isDead)
        .map((e) => ({
          enemy: e,
          dist: Math.hypot(e.x - playerX, e.y - playerY),
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, boltCount);

      // Sem alvo vivo: mantém pronto (não gasta CD / não lança pro nada)
      if (livingSorted.length > 0) {
        next.lightningPulseAt = now;
        next.lightningNextPulseAt = now + lightningCooldownMs;
        next.lightningActiveUntil = now + ACTIVE_SKILL_DURATION_MS;

        const lightningDamage =
          getLightningBurstDamage(
            baseDamage,
            skills.lightning.damage,
            skills.lightning.hits + Math.max(0, lightningBonus.extraHits),
          ) *
          prestigeMul *
          lightningBonus.damageMul;

        for (const { enemy: target } of livingSorted) {
          const dx = target.x - playerX;
          const dy = target.y - playerY;
          const len = Math.hypot(dx, dy) || 1;
          newLightningProjectiles.push({
            id: crypto.randomUUID(),
            x: playerX,
            y: playerY,
            vx: (dx / len) * LIGHTNING_PROJECTILE_SPEED,
            vy: (dy / len) * LIGHTNING_PROJECTILE_SPEED,
            damage: lightningDamage,
            radius: LIGHTNING_PROJECTILE_RADIUS,
            targetEnemyId: target.id,
          });
        }
      }
    }
  } else {
    next.lightningNextPulseAt = 0;
    next.lightningActiveUntil = 0;
    next.lightningLastTickAt = 0;
  }

  // ——— Ricochete ———
  if (matchSkills.ricochet > 0) {
    if (next.ricochetNextPulseAt <= 0) {
      next.ricochetNextPulseAt = now;
    }

    if (now >= next.ricochetNextPulseAt) {
      next.ricochetActiveUntil = now + RICOCHET_ACTIVE_MS;
      next.ricochetPulseAt = now;
      next.ricochetNextPulseAt = now + ricochetCooldownMs;
    }
  } else {
    next.ricochetNextPulseAt = 0;
    next.ricochetActiveUntil = 0;
  }

  // ——— Pedra: terremoto em todos os inimigos ———
  const stoneBonus = matchSkillBonuses?.stone ?? DEFAULT_MATCH_SKILL_BONUS;
  const stoneCooldownMs = Math.max(
    6_000,
    (18_000 - skills.stone.cooldown * 700 * prestigeMul) *
      stoneBonus.cooldownMul,
  );

  if (matchSkills.stone > 0) {
    if (next.stoneNextPulseAt <= 0) {
      next.stoneNextPulseAt = now;
    }

    if (now >= next.stoneNextPulseAt) {
      const living = enemies.filter((e) => !e.isDead);
      if (living.length > 0) {
        next.stonePulseAt = now;
        next.stoneActiveUntil = now + ACTIVE_SKILL_DURATION_MS;
        next.stoneNextPulseAt = now + stoneCooldownMs;

        const matchLevel = matchSkills.stone;
        const quakeDamage =
          baseDamage *
          STONE_QUAKE_DAMAGE_RATIO *
          (1 + matchLevel * 0.12) *
          (1 + skills.stone.damage * 0.08 * prestigeMul) *
          stoneBonus.damageMul;

        const debuffMs = Math.round(
          (STONE_DEBUFF_BASE_MS +
            skills.stone.duration * 800 * prestigeMul) *
            stoneBonus.durationMul,
        );

        for (const enemy of living) {
          enemy.takeDamage(quakeDamage, now);
          enemy.applyQuake(
            now,
            debuffMs,
            STONE_ENEMY_POWER_MUL,
            STONE_ENEMY_POWER_MUL,
          );
          skillDamageDealt +=
            quakeDamage * enemy.getDamageTakenMultiplier(now);
          skillHitsLanded += 1;
        }

        const maxDist = living.reduce((m, e) => {
          const d = Math.hypot(e.x - playerX, e.y - playerY);
          return Math.max(m, d + e.radius);
        }, 180);

        newSkillVfx.push({
          kind: "stone",
          x: playerX,
          y: playerY,
          maxRadius: Math.min(900, maxDist + 80),
          startedAt: now,
          expiresAt: now + STONE_VFX_MS,
        });
      }
    }
  } else {
    next.stoneNextPulseAt = 0;
    next.stoneActiveUntil = 0;
  }

  // ——— Vendaval: anel de vácuo + puxão + dano de impacto ———
  const vendavalBonus =
    matchSkillBonuses?.vendaval ?? DEFAULT_MATCH_SKILL_BONUS;
  const vendavalCooldownMs = Math.max(
    5_000,
    (7_500 - skills.vendaval.cooldown * 200 * prestigeMul) *
      vendavalBonus.cooldownMul,
  );

  if (matchSkills.vendaval > 0) {
    if (next.vendavalNextPulseAt <= 0) {
      next.vendavalNextPulseAt = now;
    }

    if (now >= next.vendavalNextPulseAt) {
      const matchLevel = matchSkills.vendaval;
      const vacuumRadius =
        Math.max(
          120,
          (VENDAVAL_BASE_RADIUS +
            matchLevel * VENDAVAL_RADIUS_PER_MATCH +
            skills.vendaval.radius * VENDAVAL_RADIUS_PER_META * prestigeMul) *
            vendavalBonus.durationMul,
        );

      const inRange = enemies.filter((e) => {
        if (e.isDead) return false;
        const dist = Math.hypot(e.x - playerX, e.y - playerY);
        return dist <= vacuumRadius + e.radius;
      });

      if (inRange.length > 0) {
        next.vendavalPulseAt = now;
        next.vendavalActiveUntil = now + VENDAVAL_PULL_DURATION_MS;
        next.vendavalNextPulseAt = now + vendavalCooldownMs;
        next.vendavalWaveRadius = vacuumRadius;

        const impactDamage =
          baseDamage *
          VENDAVAL_DAMAGE_RATIO *
          (1 + matchLevel * 0.1) *
          (1 + skills.vendaval.damage * 0.08 * prestigeMul) *
          vendavalBonus.damageMul;

        for (const enemy of inRange) {
          enemy.applyVacuumPull(
            playerX,
            playerY,
            now,
            VENDAVAL_PULL_DURATION_MS,
            1,
          );
          enemy.takeDamage(impactDamage, now);
          skillDamageDealt +=
            impactDamage * enemy.getDamageTakenMultiplier(now);
          skillHitsLanded += 1;
        }

        newSkillVfx.push({
          kind: "vendaval",
          x: playerX,
          y: playerY,
          maxRadius: vacuumRadius,
          startedAt: now,
          expiresAt: now + VENDAVAL_VFX_MS,
        });
      }
    }
  } else {
    next.vendavalNextPulseAt = 0;
    next.vendavalActiveUntil = 0;
    next.vendavalWaveRadius = 0;
  }

  return {
    pulseState: next,
    questFreeze,
    questShock,
    lightningHits,
    skillDamageDealt,
    skillHitsLanded,
    newLightningProjectiles,
    newSkillVfx,
  };
}

/** Progresso 0–1 da onda visual desde o pulso. */
export function pulseVisualProgress(
  pulseAt: number,
  now: number,
  durationMs = ACTIVE_SKILL_DURATION_MS,
): number {
  if (pulseAt <= 0) return 0;
  return Math.max(0, Math.min(1, (now - pulseAt) / durationMs));
}

export type SkillCooldownMode = "passive" | "ready" | "cooldown" | "active";

export type SkillCooldownInfo = {
  mode: SkillCooldownMode;
  /** 0 = esgotado / acabou de usar; 1 = pronto ou ativo cheio. */
  progress: number;
  cycleMs: number;
};

export function getSkillCycleMs(
  key:
    | "ricochet"
    | "ice"
    | "fire"
    | "lightning"
    | "aura"
    | "shadow"
    | "stone"
    | "vendaval",
  skills: SkillsData,
  cooldownMul = 1,
): number {
  switch (key) {
    case "ice":
      return Math.max(
        5_000,
        (20_000 - skills.ice.cooldown * 1_000) * cooldownMul,
      );
    case "lightning":
      return Math.max(
        5_000,
        (20_000 - skills.lightning.cooldown * 1_000) * cooldownMul,
      );
    case "ricochet":
      return Math.max(
        2_000,
        (7_000 - skills.ricochet.cooldown * 500) * cooldownMul,
      );
    case "shadow":
      return Math.max(
        6_000,
        (18_000 - skills.shadow.cooldown * 600) * cooldownMul,
      );
    case "stone":
      return Math.max(
        6_000,
        (18_000 - skills.stone.cooldown * 700) * cooldownMul,
      );
    case "vendaval":
      return Math.max(
        5_000,
        (7_500 - skills.vendaval.cooldown * 200) * cooldownMul,
      );
    case "fire":
    case "aura":
      return 0;
  }
}

/**
 * Estado de cooldown/ativo para o anel da HUD.
 * Fogo e Aura são passivos — sempre "passive" com progress 1.
 */
export function getSkillCooldownInfo(
  key:
    | "ricochet"
    | "ice"
    | "fire"
    | "lightning"
    | "aura"
    | "shadow"
    | "stone"
    | "vendaval",
  pulse: ActiveSkillPulseState,
  skills: SkillsData,
  now: number,
  cooldownMul = 1,
): SkillCooldownInfo {
  if (key === "fire" || key === "aura") {
    return { mode: "passive", progress: 1, cycleMs: 0 };
  }

  const cycleMs = getSkillCycleMs(key, skills, cooldownMul);

  if (key === "shadow") {
    if (pulse.shadowActiveUntil > now) {
      const life = Math.max(
        1,
        pulse.shadowActiveUntil - pulse.shadowPulseAt,
      );
      const remaining = pulse.shadowActiveUntil - now;
      return {
        mode: "active",
        progress: Math.max(0, Math.min(1, remaining / life)),
        cycleMs,
      };
    }
    const nextAt = pulse.shadowNextSpawnAt;
    if (nextAt <= 0 || now >= nextAt) {
      return { mode: "ready", progress: 1, cycleMs };
    }
    const remaining = nextAt - now;
    const elapsed = cycleMs - remaining;
    return {
      mode: "cooldown",
      progress: Math.max(0, Math.min(1, elapsed / cycleMs)),
      cycleMs,
    };
  }

  const nextAt =
    key === "ice"
      ? pulse.iceNextPulseAt
      : key === "lightning"
        ? pulse.lightningNextPulseAt
        : key === "stone"
          ? pulse.stoneNextPulseAt
          : key === "vendaval"
            ? pulse.vendavalNextPulseAt
            : pulse.ricochetNextPulseAt;
  const activeUntil =
    key === "ice"
      ? pulse.iceActiveUntil
      : key === "lightning"
        ? pulse.lightningActiveUntil
        : key === "stone"
          ? pulse.stoneActiveUntil
          : key === "vendaval"
            ? pulse.vendavalActiveUntil
            : pulse.ricochetActiveUntil;

  if (activeUntil > now) {
    const activeMs =
      key === "ricochet"
        ? RICOCHET_ACTIVE_MS
        : key === "vendaval"
          ? VENDAVAL_PULL_DURATION_MS
          : ACTIVE_SKILL_DURATION_MS;
    const remaining = activeUntil - now;
    return {
      mode: "active",
      progress: Math.max(0, Math.min(1, remaining / activeMs)),
      cycleMs,
    };
  }

  if (nextAt <= 0 || now >= nextAt) {
    return { mode: "ready", progress: 1, cycleMs };
  }

  const remaining = nextAt - now;
  const elapsed = cycleMs - remaining;
  return {
    mode: "cooldown",
    progress: Math.max(0, Math.min(1, elapsed / cycleMs)),
    cycleMs,
  };
}
