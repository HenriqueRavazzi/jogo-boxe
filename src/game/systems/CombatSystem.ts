import type { Player } from "@/src/game/entities/Player";
import type { Enemy } from "@/src/game/entities/Enemy";

export type MatchBuffsInput = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
};

export type ActiveAttack = {
  targetX: number;
  targetY: number;
  timestamp: number;
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
  now: number;
  contactDamage: number;
  knockbackImpulse?: number;
};

export type CombatSystemResult = {
  player: Player;
  /** Inimigos ainda vivos (mortos já filtrados). */
  enemies: Enemy[];
  lastAttackTime: number;
  newAttacks: ActiveAttack[];
  hitSplats: HitSplat[];
  kills: number;
  /** Coordenadas dos inimigos mortos neste frame (para loot). */
  killSites: { x: number; y: number }[];
  contactHits: number;
};

const DEFAULT_KNOCKBACK = 14;

/**
 * Sistema de combate: colisão de contato + auto-ataque multi-alvo + knockback.
 */
export function runCombatSystem(input: CombatSystemInput): CombatSystemResult {
  const {
    player,
    enemies,
    arms,
    armTier,
    baseDamage,
    baseRange,
    baseAttackSpeed,
    matchBuffs,
    lastAttackTime,
    now,
    contactDamage,
    knockbackImpulse = DEFAULT_KNOCKBACK,
  } = input;

  let contactHits = 0;
  const afterContact: Enemy[] = [];
  const killSites: { x: number; y: number }[] = [];

  // Colisão: inimigo encosta no jogador → explode e causa dano escalado
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
  const newAttacks: ActiveAttack[] = [];
  const hitSplats: HitSplat[] = [];
  let kills = 0;
  let living = afterContact;

  const effectiveCooldown = baseAttackSpeed / matchBuffs.attackSpeed;
  const canAttack = now >= lastAttackTime + effectiveCooldown;

  if (canAttack && living.length > 0 && !player.isDead) {
    const effectiveRange = baseRange * matchBuffs.attackRange;
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
      const damage = baseDamage * armTier * matchBuffs.damageMultiplier;
      const displayDamage = Math.round(damage);
      const isCrit = armTier >= 2 || matchBuffs.damageMultiplier >= 1.4;
      const hitIds = new Set(inRange.map(({ enemy }) => enemy.id));

      for (const { enemy } of inRange) {
        // Direção do soco: jogador → inimigo
        enemy.applyKnockback(
          enemy.x - player.x,
          enemy.y - player.y,
          knockbackImpulse,
        );

        newAttacks.push({
          targetX: enemy.x,
          targetY: enemy.y,
          timestamp: now,
        });

        hitSplats.push({
          id: crypto.randomUUID(),
          x: enemy.x,
          y: enemy.y,
          text: String(displayDamage),
          age: 0,
          color: isCrit ? "#fde047" : "#ffffff",
        });
      }

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

  // GC: remove mortos (garantia final)
  living = living.filter((e) => !e.isDead);

  return {
    player,
    enemies: living,
    lastAttackTime: nextAttackTime,
    newAttacks,
    hitSplats,
    kills,
    killSites,
    contactHits,
  };
}
