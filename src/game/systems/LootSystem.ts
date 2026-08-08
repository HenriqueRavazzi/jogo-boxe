/** Sistema de loot magnético (ouro / diamante / diamante roxo). */

import type { EnemyRewards } from "@/lib/gameConfig";
import { DEFAULT_ENEMY_REWARDS } from "@/src/game/entities/Enemy";

export type DropType = "gold" | "diamond" | "purple_diamond";

export type Drop = {
  id: string;
  x: number;
  y: number;
  type: DropType;
  spawnTime: number;
};

export type KillSite = {
  x: number;
  y: number;
  /** Tipo do inimigo morto — bosses usam scaling de diamante roxo. */
  enemyType?: "normal" | "dasher" | "ranged" | "boss";
  /** Recompensas do tipo (Neon / fallback). */
  rewards?: EnemyRewards;
};

const DROP_IDLE_MS = 800;
const MAGNET_SPEED = 520; // px/s
/** Alcance base do magnetismo (px). Escala com Ímã Primordial. */
export const BASE_MAGNET_RANGE = 280;
/** Valor de cada moeda física ao coletar (nerf econômico). */
const GOLD_DROP_VALUE = 5;
/** Moedas base por kill se `rewards` ausente. */
const BASE_GOLD_DROP = 1;
/** Chance global de diamante normal por kill. */
const DIAMOND_CHANCE = 0.03;
/** Chance global de diamante roxo em inimigos não-boss. */
const PURPLE_DIAMOND_CHANCE = 0.001;
/** Peso do upgrade de renda no drop (1.0 = full; 0.5 = metade do bônus). */
const INCOME_DROP_WEIGHT = 0.5;
/** Espalhamento aleatório das moedas em px. */
const COIN_SCATTER_PX = 40;
/** Espalhamento dos diamantes roxos de boss. */
const PURPLE_SCATTER_PX = 64;

export type CreateDropsOptions = {
  /** Multiplicador de renda da loja. */
  incomeMultiplier?: number;
  /** Multiplicador de ouro da dificuldade. */
  goldDropMultiplier?: number;
  /** Bosses já derrotados nesta run (antes deste lote). */
  bossesKilled?: number;
  /** Bônus absoluto na chance de diamante (Sorte do Campeão). */
  diamondLuckBonus?: number;
};

export type CreateDropsResult = {
  drops: Drop[];
  /** Bosses derrotados neste lote (para incrementar o contador da run). */
  bossesKilledThisBatch: number;
  /** XP total deste lote (soma de xp_reward). */
  totalXp: number;
};

/** Diamantes roxos garantidos no n-ésimo boss da run (1-indexed). */
export function purpleDiamondsForBoss(bossCount: number): number {
  const n = Math.max(1, Math.floor(bossCount));
  return Math.max(1, Math.floor(2 * Math.pow(1.5, n - 1)));
}

function resolveRewards(site: KillSite): EnemyRewards {
  return site.rewards ?? DEFAULT_ENEMY_REWARDS;
}

/**
 * Gera moedas espalhadas por kill + diamantes (normal / roxo).
 * Bosses: sempre dropam diamantes roxos progressivos ao redor do corpo.
 * Ouro / chances de diamante vêm de `enemy_types` via `site.rewards`.
 */
export function createDropsFromKills(
  sites: KillSite[],
  now = Date.now(),
  options: CreateDropsOptions = {},
): CreateDropsResult {
  const incomeMultiplier = options.incomeMultiplier ?? 1;
  const goldDropMultiplier = options.goldDropMultiplier ?? 1;
  const diamondLuckBonus = Math.max(0, options.diamondLuckBonus ?? 0);
  let bossOrdinal = options.bossesKilled ?? 0;
  const drops: Drop[] = [];
  let bossesKilledThisBatch = 0;
  let totalXp = 0;

  for (const site of sites) {
    const isBoss = site.enemyType === "boss";
    const rewards = resolveRewards(site);
    totalXp += Math.max(0, rewards.xpReward);

    // Renda da loja com peso reduzido (nerf econômico)
    const incomeFactor =
      1 + (incomeMultiplier - 1) * INCOME_DROP_WEIGHT;
    const coinCount = Math.max(
      1,
      Math.floor(
        rewards.goldReward * incomeFactor * goldDropMultiplier,
      ),
    );

    for (let i = 0; i < coinCount; i++) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x + (Math.random() - 0.5) * COIN_SCATTER_PX,
        y: site.y + (Math.random() - 0.5) * COIN_SCATTER_PX,
        type: "gold",
        spawnTime: now,
      });
    }

    const diamondChance = Math.min(
      0.35,
      Math.max(rewards.normalDiamondChance, DIAMOND_CHANCE) + diamondLuckBonus,
    );
    if (Math.random() < diamondChance) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x + (Math.random() - 0.5) * 12,
        y: site.y + (Math.random() - 0.5) * 12,
        type: "diamond",
        spawnTime: now,
      });
    }

    if (isBoss) {
      bossesKilledThisBatch += 1;
      bossOrdinal += 1;
      const purpleDropCount = purpleDiamondsForBoss(bossOrdinal);
      for (let i = 0; i < purpleDropCount; i++) {
        const angle = (Math.PI * 2 * i) / purpleDropCount + Math.random() * 0.4;
        const radius = 18 + Math.random() * PURPLE_SCATTER_PX;
        drops.push({
          id: crypto.randomUUID(),
          x: site.x + Math.cos(angle) * radius,
          y: site.y + Math.sin(angle) * radius,
          type: "purple_diamond",
          spawnTime: now,
        });
      }
    } else if (Math.random() < PURPLE_DIAMOND_CHANCE) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x,
        y: site.y,
        type: "purple_diamond",
        spawnTime: now,
      });
    }
  }

  return { drops, bossesKilledThisBatch, totalXp };
}

export type LootSystemInput = {
  drops: Drop[];
  playerX: number;
  playerY: number;
  playerRadius: number;
  dt: number;
  now?: number;
  /** Multiplicador do raio de coleta / magnetismo (Ímã Primordial). */
  magnetRadiusMultiplier?: number;
};

export type LootSystemResult = {
  drops: Drop[];
  collectedGold: number;
  collectedDiamonds: number;
  collectedPurpleDiamonds: number;
};

/**
 * Idle 800ms → magnetismo em direção ao player → coleta por proximidade.
 * Cada moeda física vale GOLD_DROP_VALUE (multiplicadores já vieram no spawn).
 */
export function runLootSystem(input: LootSystemInput): LootSystemResult {
  const {
    drops,
    playerX,
    playerY,
    playerRadius,
    dt,
    now = Date.now(),
    magnetRadiusMultiplier = 1,
  } = input;

  const magnetMul = Math.max(1, magnetRadiusMultiplier);
  const magnetRange = BASE_MAGNET_RANGE * magnetMul;
  const collectRadius = playerRadius * magnetMul;

  let collectedGold = 0;
  let collectedDiamonds = 0;
  let collectedPurpleDiamonds = 0;
  const remaining: Drop[] = [];

  for (const drop of drops) {
    const age = now - drop.spawnTime;
    let { x, y } = drop;

    if (age >= DROP_IDLE_MS) {
      const dx = playerX - x;
      const dy = playerY - y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist <= magnetRange) {
        const step = MAGNET_SPEED * dt;
        x += (dx / dist) * step;
        y += (dy / dist) * step;
      }
    }

    const distToPlayer = Math.hypot(playerX - x, playerY - y);
    if (distToPlayer < collectRadius) {
      if (drop.type === "gold") {
        collectedGold += GOLD_DROP_VALUE;
      } else if (drop.type === "purple_diamond") {
        collectedPurpleDiamonds += 1;
      } else {
        collectedDiamonds += 1;
      }
      continue;
    }

    remaining.push({ ...drop, x, y });
  }

  return {
    drops: remaining,
    collectedGold,
    collectedDiamonds,
    collectedPurpleDiamonds,
  };
}

export {
  DROP_IDLE_MS,
  GOLD_DROP_VALUE,
  BASE_GOLD_DROP,
  COIN_SCATTER_PX,
  DIAMOND_CHANCE,
  PURPLE_DIAMOND_CHANCE,
  PURPLE_SCATTER_PX,
};
