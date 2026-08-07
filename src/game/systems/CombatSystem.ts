import type { Player } from "@/src/game/entities/Player";
import type { Enemy } from "@/src/game/entities/Enemy";
import {
  getArmDistribution,
  getArmRestPosition,
  pickNextPunchSide,
  type ArmSide,
} from "@/src/game/entities/Player";

export type MatchBuffsInput = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
};

export type ActiveAttack = {
  id: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
  isRetracting: boolean;
  side: ArmSide;
  armIndex: number;
};

export type HitSplat = {
  id: string;
  x: number;
  y: number;
  text: string;
  age: number;
  color: string;
};

export type CombatSystemInput = {
  player: Player;
  enemies: Enemy[];
  arms: number;
  armTier: number;
  baseDamage: number;
  baseRange: number;
  baseAttackSpeed: number;
  matchBuffs: MatchBuffsInput;
  lastAttackTime: number;
  /** Último lado que socou — próximo tick alterna a partir daqui. */
  lastPunchSide: ArmSide;
  now: number;
  contactDamage: number;
  knockbackImpulse?: number;
  punchDurationMs?: number;
};

export type CombatSystemResult = {
  player: Player;
  /** Inimigos ainda vivos (mortos já filtrados). */
  enemies: Enemy[];
  lastAttackTime: number;
  lastPunchSide: ArmSide;
  newAttacks: ActiveAttack[];
  hitSplats: HitSplat[];
  kills: number;
  /** Coordenadas dos inimigos mortos neste frame (para loot). */
  killSites: { x: number; y: number }[];
  contactHits: number;
};

const DEFAULT_KNOCKBACK = 14;
export const PUNCH_DURATION_MS = 150;
/** Atraso leve entre socos no mesmo tick (ms de game clock). */
const PUNCH_STAGGER_MS = 40;

/**
 * Sistema de combate: colisão de contato + auto-ataque multi-alvo + knockback.
 * Socos alternam L/R via lastPunchSide; 1 alvo = 1 braço (não dispara todos).
 */
export function runCombatSystem(input: CombatSystemInput): CombatSystemResult {
  const {
    player,
    enemies,
    arms,
    armTier: _armTier,
    baseDamage,
    baseRange,
    baseAttackSpeed,
    matchBuffs,
    lastAttackTime,
    lastPunchSide,
    now,
    contactDamage,
    knockbackImpulse = DEFAULT_KNOCKBACK,
    punchDurationMs = PUNCH_DURATION_MS,
  } = input;

  let contactHits = 0;
  const afterContact: Enemy[] = [];
  const killSites: { x: number; y: number }[] = [];

  let contactDamageDealt = 0;
  for (const enemy of enemies) {
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < player.radius + enemy.radius) {
      contactHits += 1;
      contactDamageDealt += enemy.contactDamage || contactDamage;
      killSites.push({ x: enemy.x, y: enemy.y });
      continue;
    }
    afterContact.push(enemy);
  }

  if (contactHits > 0) {
    player.takeDamage(contactDamageDealt);
  }

  let nextAttackTime = lastAttackTime;
  let nextPunchSide = lastPunchSide;
  const newAttacks: ActiveAttack[] = [];
  const hitSplats: HitSplat[] = [];
  let kills = 0;
  let living = afterContact;

  const effectiveCooldown = baseAttackSpeed / matchBuffs.attackSpeed;
  const canAttack = now >= lastAttackTime + effectiveCooldown;

  if (canAttack && living.length > 0 && !player.isDead) {
    const effectiveRange = baseRange * matchBuffs.attackRange;
    // Até `arms` alvos distintos — 1 inimigo consome só 1 braço neste tick
    const inRange = living
      .map((enemy) => ({
        enemy,
        dist: Math.hypot(enemy.x - player.x, enemy.y - player.y),
      }))
      .filter(({ dist }) => dist <= effectiveRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, arms);

    if (inRange.length > 0) {
      nextAttackTime = now;
      const damage = baseDamage * matchBuffs.damageMultiplier;
      const displayDamage = Math.round(damage);
      const isCrit = matchBuffs.damageMultiplier >= 1.4;
      const hitIds = new Set(inRange.map(({ enemy }) => enemy.id));

      const { leftArms, rightArms } = getArmDistribution(arms);
      const sideUseCount: Record<ArmSide, number> = { left: 0, right: 0 };
      let punchSide = lastPunchSide;

      inRange.forEach(({ enemy }, i) => {
        enemy.applyKnockback(
          enemy.x - player.x,
          enemy.y - player.y,
          knockbackImpulse,
        );

        punchSide = pickNextPunchSide(punchSide, leftArms, rightArms);
        const armsOnSide = punchSide === "left" ? leftArms : rightArms;
        const armIndex =
          armsOnSide > 0 ? sideUseCount[punchSide] % armsOnSide : 0;
        sideUseCount[punchSide] += 1;

        const rest = getArmRestPosition(
          player.x,
          player.y,
          punchSide,
          armIndex,
          Math.max(1, armsOnSide),
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
        });

        hitSplats.push({
          id: crypto.randomUUID(),
          x: enemy.x,
          y: enemy.y,
          text: String(displayDamage),
          age: 0,
          color: isCrit ? "#fde047" : "#ffffff",
        });
      });

      nextPunchSide = punchSide;

      const nextLiving: Enemy[] = [];
      for (const enemy of living) {
        if (!hitIds.has(enemy.id)) {
          nextLiving.push(enemy);
          continue;
        }
        if (enemy.takeDamage(damage)) {
          kills += 1;
          killSites.push({ x: enemy.x, y: enemy.y });
        } else {
          nextLiving.push(enemy);
        }
      }
      living = nextLiving;
    }
  }

  living = living.filter((e) => !e.isDead);

  return {
    player,
    enemies: living,
    lastAttackTime: nextAttackTime,
    lastPunchSide: nextPunchSide,
    newAttacks,
    hitSplats,
    kills,
    killSites,
    contactHits,
  };
}
