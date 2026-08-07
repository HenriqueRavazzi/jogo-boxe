import type { Player } from "@/src/game/entities/Player";
import type { Enemy } from "@/src/game/entities/Enemy";
import {
  angleToward,
  getArmDistribution,
  getArmRestPosition,
  pickNextPunchSide,
  type ArmSide,
} from "@/src/game/entities/Player";
import type { QuestProgressEvent } from "@/lib/quests";
import { useGameStore } from "@/store/useGameStore";

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
  /** Facing atual (atan2) — mantido se não houver ataque. */
  playerRotation?: number;
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
  /** Eventos para progresso de quests in-game. */
  questEvents: QuestProgressEvent[];
  /** Facing atual do jogador (atan2); inalterado se não atacou neste frame. */
  playerRotation: number;
};

const DEFAULT_KNOCKBACK = 14;
export const PUNCH_DURATION_MS = 150;
/** Atraso leve entre socos no mesmo tick (ms de game clock). */
const PUNCH_STAGGER_MS = 40;

export const ELEMENTAL_PROC_CHANCE = 0.15;
export const FREEZE_DURATION_MS = 2000;
export const SHOCK_VISUAL_MS = 450;
export const CHAIN_LIGHTNING_RADIUS = 130;
export const CHAIN_LIGHTNING_TARGETS = 3;
export const CHAIN_DAMAGE_MULT = 0.5;

/**
 * Sistema de combate: colisão de contato + auto-ataque multi-alvo + knockback
 * + procs elementais (gelo / raio) da skill tree.
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
    playerRotation: inputRotation = -Math.PI / 2,
  } = input;

  let playerRotation = inputRotation;

  const skillTree = useGameStore.getState().skillTree;
  const hasFreeze = Boolean(skillTree.node_frost_chance);
  const hasShock = Boolean(skillTree.node_shock_chance);
  const difficulty = useGameStore.getState().getDifficultyMultipliers();
  void contactDamage; // legado: dano melee vem de enemy.attackDamage

  let contactHits = 0;
  const killSites: { x: number; y: number }[] = [];
  const questEvents: QuestProgressEvent[] = [];

  const pushKillQuests = (enemyType: Enemy["type"]) => {
    questEvents.push({ type: "kill_enemies", amount: 1 });
    if (enemyType === "boss") {
      questEvents.push({ type: "kill_boss", amount: 1 });
    } else if (enemyType === "dasher") {
      questEvents.push({ type: "kill_dashers", amount: 1 });
    }
  };

  // Melee: inimigos encostados formam horda e batem periodicamente (não morrem no contato)
  let meleeDamageDealt = 0;
  for (const enemy of enemies) {
    if (enemy.hasStatus("freeze", now)) {
      enemy.isAttacking = false;
      continue;
    }

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const touchDist = player.radius + enemy.radius;

    if (dist <= touchDist) {
      enemy.isAttacking = true;
      enemy.vx = 0;
      enemy.vy = 0;

      const cooldown = enemy.attackCooldown || 1000;
      const damage =
        enemy.attackDamage > 0
          ? enemy.attackDamage
          : Math.max(0.5, 1.2 * difficulty.enemyDamageMultiplier);

      if (now - enemy.lastAttackTime >= cooldown) {
        meleeDamageDealt += damage;
        enemy.lastAttackTime = now;
        contactHits += 1;
      }
    } else {
      enemy.isAttacking = false;
    }
  }

  if (meleeDamageDealt > 0) {
    player.takeDamage(meleeDamageDealt);
  }

  let nextAttackTime = lastAttackTime;
  let nextPunchSide = lastPunchSide;
  const newAttacks: ActiveAttack[] = [];
  const hitSplats: HitSplat[] = [];
  let kills = 0;
  let living = enemies.filter((e) => !e.isDead);

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
      const damage = baseDamage * matchBuffs.damageMultiplier;
      const displayDamage = Math.round(damage);
      const isCrit = matchBuffs.damageMultiplier >= 1.4;
      /** Dano acumulado por id (primário + chain). */
      const damageById = new Map<string, number>();

      const addDamage = (id: string, amount: number) => {
        damageById.set(id, (damageById.get(id) ?? 0) + amount);
      };

      // Olha para o último alvo do lote neste tick
      const lastTarget = inRange[inRange.length - 1]!.enemy;
      playerRotation = angleToward(
        player.x,
        player.y,
        lastTarget.x,
        lastTarget.y,
      );
      player.rotation = playerRotation;

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
          playerRotation,
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

        addDamage(enemy.id, damage);

        // Gelo: 15% se skill desbloqueada
        if (hasFreeze && Math.random() < ELEMENTAL_PROC_CHANCE) {
          enemy.applyStatus("freeze", now + FREEZE_DURATION_MS);
          questEvents.push({ type: "inflict_freeze", amount: 1 });
          hitSplats.push({
            id: crypto.randomUUID(),
            x: enemy.x + 8,
            y: enemy.y - 14,
            text: "ICE",
            age: 0,
            color: "#7dd3fc",
          });
        }

        // Raio: 15% — dano em cadeia nos 3 mais próximos
        if (hasShock && Math.random() < ELEMENTAL_PROC_CHANCE) {
          enemy.applyStatus("shock", now + SHOCK_VISUAL_MS);
          questEvents.push({ type: "inflict_shock", amount: 1 });
          hitSplats.push({
            id: crypto.randomUUID(),
            x: enemy.x - 8,
            y: enemy.y - 18,
            text: "ZAP",
            age: 0,
            color: "#facc15",
          });

          const chainDamage = damage * CHAIN_DAMAGE_MULT;
          const chainTargets = living
            .filter((e) => e.id !== enemy.id)
            .map((e) => ({
              enemy: e,
              dist: Math.hypot(e.x - enemy.x, e.y - enemy.y),
            }))
            .filter(({ dist }) => dist <= CHAIN_LIGHTNING_RADIUS)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, CHAIN_LIGHTNING_TARGETS);

          for (const { enemy: chained } of chainTargets) {
            chained.applyStatus("shock", now + SHOCK_VISUAL_MS);
            questEvents.push({ type: "inflict_shock", amount: 1 });
            addDamage(chained.id, chainDamage);
            hitSplats.push({
              id: crypto.randomUUID(),
              x: chained.x,
              y: chained.y,
              text: String(Math.round(chainDamage)),
              age: 0,
              color: "#fde047",
            });
          }
        }
      });

      nextPunchSide = punchSide;

      const nextLiving: Enemy[] = [];
      for (const enemy of living) {
        const dealt = damageById.get(enemy.id);
        if (dealt == null || dealt <= 0) {
          nextLiving.push(enemy);
          continue;
        }
        if (enemy.takeDamage(dealt)) {
          kills += 1;
          killSites.push({ x: enemy.x, y: enemy.y });
          pushKillQuests(enemy.type);
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
    questEvents,
    playerRotation,
  };
}
