/** Shadow Clone: invocação temporária com fração dos stats do herói. */

import type {
  MatchSkillsData,
  SkillsData,
} from "@/db/schema";
import {
  DEFAULT_MATCH_SKILL_BONUS,
  type MatchSkillBonusState,
  type MatchSkillBonuses,
} from "@/lib/matchUpgrades";
import {
  MASTERY_SHADOW_CLONE_COUNT,
  MASTERY_SHADOW_STAT_RATIO,
} from "@/lib/skillMastery";
import type { ArmSide } from "@/src/game/entities/Player";
import type { Enemy } from "@/src/game/entities/Enemy";
import type { ActiveSkillPulseState } from "@/src/game/systems/ActiveSkillsSystem";
import type {
  ActiveAttack,
  HitSplat,
} from "@/src/game/systems/CombatSystem";
import {
  angleToward,
  getArmDistribution,
  getArmRestPosition,
  pickNextPunchSide,
} from "@/src/game/entities/Player";

/** Fração dos stats do herói no clone. */
export const SHADOW_CLONE_STAT_RATIO = 0.15;
/** Duração base do clone (ms). */
export const SHADOW_CLONE_BASE_TTL_MS = 60_000;
/** Cooldown base após morte/expiração até o próximo spawn (ms). */
export const SHADOW_CLONE_BASE_COOLDOWN_MS = 18_000;
/** Velocidade de movimento do clone (px/s). */
export const SHADOW_CLONE_MOVE_SPEED = 210;
/** Raio visual/hitbox do clone. */
export const SHADOW_CLONE_RADIUS = 14;
/** Duração do VFX de spawn/despawn. */
export const SHADOW_CLONE_VFX_MS = 320;
/** Duração do soco do clone. */
export const SHADOW_CLONE_PUNCH_MS = 140;
const PUNCH_STAGGER_MS = 40;

export type ShadowCloneState = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  rotation: number;
  damage: number;
  range: number;
  attackCooldownMs: number;
  lastAttackTime: number;
  lastPunchSide: ArmSide;
  arms: number;
  spawnedAt: number;
  expiresAt: number;
};

export function getShadowCloneTtlMs(
  metaDuration: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const extra =
    Math.max(0, metaDuration) * 2_500 * prestigeMul;
  return Math.max(
    20_000,
    (SHADOW_CLONE_BASE_TTL_MS + extra) * bonus.durationMul,
  );
}

export function getShadowCloneCooldownMs(
  metaCooldown: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const reduced =
    SHADOW_CLONE_BASE_COOLDOWN_MS -
    Math.max(0, metaCooldown) * 600 * prestigeMul;
  return Math.max(6_000, reduced * bonus.cooldownMul);
}

export function getShadowCloneStatRatio(
  matchLevel: number,
  metaDamage: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
  baseRatio = SHADOW_CLONE_STAT_RATIO,
): number {
  const levelBonus = Math.max(0, matchLevel) * 0.01;
  const metaBonus = Math.max(0, metaDamage) * 0.005 * prestigeMul;
  return (baseRatio + levelBonus + metaBonus) * bonus.damageMul;
}

export function createShadowClone(input: {
  playerX: number;
  playerY: number;
  now: number;
  playerMaxHp: number;
  playerDamage: number;
  playerRange: number;
  playerAttackCooldownMs: number;
  playerArms: number;
  matchLevel: number;
  skills: SkillsData;
  matchSkillBonuses?: MatchSkillBonuses;
  prestigeMul: number;
  /** Fração base dos stats (0.15 normal / 0.30 Maestria). */
  baseStatRatio?: number;
  /** Offset angular para multi-spawn. */
  angleOffset?: number;
}): ShadowCloneState {
  const baseRatio = input.baseStatRatio ?? SHADOW_CLONE_STAT_RATIO;
  const bonus =
    input.matchSkillBonuses?.shadow ?? DEFAULT_MATCH_SKILL_BONUS;
  const ratio = getShadowCloneStatRatio(
    input.matchLevel,
    input.skills.shadow.damage,
    bonus,
    input.prestigeMul,
    baseRatio,
  );
  const ttl = getShadowCloneTtlMs(
    input.skills.shadow.duration,
    bonus,
    input.prestigeMul,
  );
  const maxHp = Math.max(1, input.playerMaxHp * baseRatio);
  const offsetAngle =
    input.angleOffset ?? Math.random() * Math.PI * 2;
  const spawnDist = 36;
  return {
    id: crypto.randomUUID(),
    x: input.playerX + Math.cos(offsetAngle) * spawnDist,
    y: input.playerY + Math.sin(offsetAngle) * spawnDist,
    hp: maxHp,
    maxHp,
    radius: SHADOW_CLONE_RADIUS,
    rotation: -Math.PI / 2,
    damage: Math.max(0.5, input.playerDamage * ratio),
    range: Math.max(40, input.playerRange * baseRatio),
    attackCooldownMs: input.playerAttackCooldownMs,
    lastAttackTime: 0,
    lastPunchSide: "right",
    arms: Math.max(1, Math.round(input.playerArms * baseRatio)),
    spawnedAt: input.now,
    expiresAt: input.now + ttl,
  };
}

export type RunShadowCloneInput = {
  clones: ShadowCloneState[];
  enemies: Enemy[];
  /** IDs que o herói está atacando neste frame (exceto boss, clone evita). */
  playerTargetIds: Set<string>;
  playerX: number;
  playerY: number;
  now: number;
  dt: number;
  playerMaxHp: number;
  playerDamage: number;
  playerRange: number;
  playerAttackCooldownMs: number;
  playerArms: number;
  matchSkills: MatchSkillsData;
  skills: SkillsData;
  matchSkillBonuses?: MatchSkillBonuses;
  pulseState: ActiveSkillPulseState;
  prestigeMul: number;
  knockbackPower: number;
  punchDurationMs?: number;
  /** Maestria Sombra: 2 clones a 30%. */
  masteryMirroredArmy?: boolean;
};

export type RunShadowCloneResult = {
  clones: ShadowCloneState[];
  pulseState: ActiveSkillPulseState;
  newAttacks: ActiveAttack[];
  hitSplats: HitSplat[];
  /** Dano aplicado aos inimigos (sem regen/lifesteal no herói). */
  damagedEnemyIds: Map<string, number>;
};

/**
 * Escolhe alvos do clone: evita os do herói, exceto bosses.
 */
export function pickShadowCloneTargets(
  enemies: Enemy[],
  clone: ShadowCloneState,
  playerTargetIds: Set<string>,
  maxTargets: number,
): Enemy[] {
  const scored = enemies
    .filter((e) => !e.isDead)
    .map((enemy) => {
      const dist = Math.hypot(enemy.x - clone.x, enemy.y - clone.y);
      const isBoss = enemy.type === "boss";
      const takenByPlayer = playerTargetIds.has(enemy.id);
      const preferred = isBoss || !takenByPlayer;
      return { enemy, dist, preferred };
    })
    .filter(({ dist }) => dist <= clone.range + 8);

  const preferred = scored
    .filter((s) => s.preferred)
    .sort((a, b) => a.dist - b.dist);
  const fallback = scored
    .filter((s) => !s.preferred)
    .sort((a, b) => a.dist - b.dist);

  const ranked = [...preferred, ...fallback].map((s) => s.enemy);
  if (ranked.length === 0) return [];

  // Mesma regra do herói: alvos únicos; só bosses recebem braços extras
  const count = Math.max(1, Math.floor(maxTargets));
  const out: Enemy[] = [];
  for (const enemy of ranked) {
    if (out.length >= count) break;
    out.push(enemy);
  }
  if (out.length < count) {
    const bosses = ranked.filter((e) => e.isBoss);
    if (bosses.length === 0) return out;
    let i = 0;
    while (out.length < count) {
      out.push(bosses[i % bosses.length]!);
      i += 1;
    }
  }
  return out;
}

function findMoveTarget(
  enemies: Enemy[],
  clone: ShadowCloneState,
  playerTargetIds: Set<string>,
): Enemy | null {
  let best: Enemy | null = null;
  let bestScore = Infinity;
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const dist = Math.hypot(enemy.x - clone.x, enemy.y - clone.y);
    const isBoss = enemy.type === "boss";
    const takenByPlayer = playerTargetIds.has(enemy.id);
    // Penaliza alvos do herói (não-boss) para o clone ir atrás de outros
    const penalty = !isBoss && takenByPlayer ? 400 : 0;
    const score = dist + penalty;
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}

/**
 * Tick do Shadow Clone: spawn/TTL, movimento, socos sem skills e sem heal.
 */
export function runShadowCloneSystem(
  input: RunShadowCloneInput,
): RunShadowCloneResult {
  const {
    enemies,
    playerTargetIds,
    playerX,
    playerY,
    now,
    dt,
    matchSkills,
    skills,
    matchSkillBonuses,
    pulseState,
    prestigeMul,
    knockbackPower,
  } = input;

  const nextPulse: ActiveSkillPulseState = { ...pulseState };
  const newAttacks: ActiveAttack[] = [];
  const hitSplats: HitSplat[] = [];
  const damagedEnemyIds = new Map<string, number>();
  const punchDurationMs = input.punchDurationMs ?? SHADOW_CLONE_PUNCH_MS;

  const shadowLevel = matchSkills.shadow ?? 0;
  if (shadowLevel <= 0) {
    nextPulse.shadowNextSpawnAt = 0;
    return {
      clones: [],
      pulseState: nextPulse,
      newAttacks,
      hitSplats,
      damagedEnemyIds,
    };
  }

  const bonus = matchSkillBonuses?.shadow ?? DEFAULT_MATCH_SKILL_BONUS;
  const cooldownMs = getShadowCloneCooldownMs(
    skills.shadow.cooldown,
    bonus,
    prestigeMul,
  );

  let clones = input.clones
    .map((c) => ({ ...c }))
    .filter((c) => c.hp > 0 && c.expiresAt > now);

  const lostClone = input.clones.length > 0 && clones.length === 0;
  if (lostClone) {
    nextPulse.shadowNextSpawnAt = now + cooldownMs;
    nextPulse.shadowActiveUntil = 0;
  }

  // Spawn se não há clone vivo e CD pronto
  if (clones.length === 0) {
    if (nextPulse.shadowNextSpawnAt <= 0) {
      nextPulse.shadowNextSpawnAt = now;
    }
    if (now >= nextPulse.shadowNextSpawnAt) {
      const count = input.masteryMirroredArmy
        ? MASTERY_SHADOW_CLONE_COUNT
        : 1;
      const baseRatio = input.masteryMirroredArmy
        ? MASTERY_SHADOW_STAT_RATIO
        : SHADOW_CLONE_STAT_RATIO;
      const spawned: ShadowCloneState[] = [];
      for (let i = 0; i < count; i++) {
        spawned.push(
          createShadowClone({
            playerX,
            playerY,
            now,
            playerMaxHp: input.playerMaxHp,
            playerDamage: input.playerDamage,
            playerRange: input.playerRange,
            playerAttackCooldownMs: input.playerAttackCooldownMs,
            playerArms: input.playerArms,
            matchLevel: shadowLevel,
            skills,
            matchSkillBonuses,
            prestigeMul,
            baseStatRatio: baseRatio,
            angleOffset: (Math.PI * 2 * i) / count + Math.random() * 0.4,
          }),
        );
      }
      clones = spawned;
      nextPulse.shadowPulseAt = now;
      nextPulse.shadowActiveUntil = Math.max(
        ...spawned.map((c) => c.expiresAt),
      );
      // Próximo spawn só após este clone sumir (+ CD)
      nextPulse.shadowNextSpawnAt =
        nextPulse.shadowActiveUntil + cooldownMs;
    }
  }

  const livingClones: ShadowCloneState[] = [];
  for (const clone of clones) {
    // Movimento em direção a um alvo preferencial
    const moveTarget = findMoveTarget(enemies, clone, playerTargetIds);
    if (moveTarget) {
      const dx = moveTarget.x - clone.x;
      const dy = moveTarget.y - clone.y;
      const dist = Math.hypot(dx, dy);
      const stopAt = clone.range * 0.55 + moveTarget.radius;
      if (dist > stopAt && dt > 0) {
        const step = Math.min(dist - stopAt, SHADOW_CLONE_MOVE_SPEED * dt);
        clone.x += (dx / dist) * step;
        clone.y += (dy / dist) * step;
      }
      clone.rotation = angleToward(clone.x, clone.y, moveTarget.x, moveTarget.y);
    } else {
      // Sem inimigos: paira perto do herói
      const dx = playerX - clone.x;
      const dy = playerY - clone.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 50 && dt > 0) {
        const step = Math.min(dist - 50, SHADOW_CLONE_MOVE_SPEED * dt);
        clone.x += (dx / dist) * step;
        clone.y += (dy / dist) * step;
      }
    }

    // Ataque (sem skills, sem crit/lifesteal/regen)
    const canAttack = now >= clone.lastAttackTime + clone.attackCooldownMs;
    if (canAttack) {
      const targets = pickShadowCloneTargets(
        enemies,
        clone,
        playerTargetIds,
        clone.arms,
      );
      if (targets.length > 0) {
        clone.lastAttackTime = now;
        const last = targets[targets.length - 1]!;
        clone.rotation = angleToward(clone.x, clone.y, last.x, last.y);

        const { leftArms, rightArms } = getArmDistribution(clone.arms);
        const sideUseCount: Record<ArmSide, number> = { left: 0, right: 0 };
        let punchSide = clone.lastPunchSide;

        targets.forEach((enemy, i) => {
          const dx = enemy.x - clone.x;
          const dy = enemy.y - clone.y;
          enemy.applyKnockback(dx, dy, knockbackPower * 0.5);

          punchSide = pickNextPunchSide(punchSide, leftArms, rightArms);
          const armsOnSide = punchSide === "left" ? leftArms : rightArms;
          const armIndex =
            armsOnSide > 0 ? sideUseCount[punchSide] % armsOnSide : 0;
          sideUseCount[punchSide] += 1;

          const rest = getArmRestPosition(
            clone.x,
            clone.y,
            punchSide,
            armIndex,
            Math.max(1, armsOnSide),
            clone.rotation,
          );

          newAttacks.push({
            id: crypto.randomUUID(),
            targetX: enemy.x,
            targetY: enemy.y,
            startX: rest.x,
            startY: rest.y,
            startTime: now + i * PUNCH_STAGGER_MS,
            duration: punchDurationMs,
            isRetracting: false,
            side: punchSide,
            armIndex,
            kind: "punch",
            // Origem nas luvas do clone (não no ombro do herói)
            fromShoulder: false,
          });

          const displayDamage = Math.round(clone.damage);
          hitSplats.push({
            id: crypto.randomUUID(),
            x: enemy.x,
            y: enemy.y,
            text: String(displayDamage),
            age: 0,
            color: "#a78bfa",
            scale: 0.9,
          });

          damagedEnemyIds.set(
            enemy.id,
            (damagedEnemyIds.get(enemy.id) ?? 0) + clone.damage,
          );
        });

        clone.lastPunchSide = punchSide;
      }
    }

    livingClones.push(clone);
  }

  // Clone morreu no meio do tick (dano externo aplicado antes) — já coberto por lostClone
  if (livingClones.length === 0 && clones.length > 0) {
    nextPulse.shadowNextSpawnAt = now + cooldownMs;
  }

  return {
    clones: livingClones,
    pulseState: nextPulse,
    newAttacks,
    hitSplats,
    damagedEnemyIds,
  };
}
