/** Sistema de loot magnético (ouro / diamante / diamante roxo). */

import type { EnemyRewards } from "@/lib/gameConfig";
import { DEFAULT_ENEMY_REWARDS } from "@/src/game/entities/Enemy";

export type DropType = "gold" | "diamond" | "purple_diamond" | "bundle";

export type Drop = {
  id: string;
  x: number;
  y: number;
  type: DropType;
  spawnTime: number;
  /**
   * Valores embutidos no modo compacto (`bundle`).
   * Em drops unitários, a coleta usa GOLD_DROP_VALUE / 1 diamante.
   */
  goldValue?: number;
  diamondValue?: number;
  purpleDiamondValue?: number;
};

/** Endless: após este tempo (s), loot vira 1 ícone por kill (anti-lag). */
export const COMPACT_LOOT_TIME_ALIVE_SEC = 5 * 60;
/** Se ainda houver muitos drops no chão no modo compacto, funde tudo num só. */
export const COMPACT_LOOT_MERGE_THRESHOLD = 28;

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
/**
 * @deprecated Loot sempre magnetiza após o idle (sem limite de distância).
 * Mantido só por compat / UI do Ímã Primordial (ainda escala raio de coleta).
 */
export const BASE_MAGNET_RANGE = Number.POSITIVE_INFINITY;
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
  /**
   * Endless tardio: 1 drop `bundle` por kill com valores somados
   * (evita dezenas de sprites de moeda/diamante).
   */
  compactLoot?: boolean;
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

function rollLootForSite(
  site: KillSite,
  incomeMultiplier: number,
  goldDropMultiplier: number,
  diamondLuckBonus: number,
  bossOrdinalIn: number,
): {
  coinCount: number;
  diamonds: number;
  purpleDiamonds: number;
  bossesKilled: number;
  bossOrdinal: number;
  xp: number;
} {
  const isBoss = site.enemyType === "boss";
  const rewards = resolveRewards(site);
  const xp = Math.max(0, rewards.xpReward);

  const incomeFactor = 1 + (incomeMultiplier - 1) * INCOME_DROP_WEIGHT;
  const coinCount = Math.max(
    1,
    Math.floor(rewards.goldReward * incomeFactor * goldDropMultiplier),
  );

  const diamondChance = Math.min(
    0.35,
    Math.max(rewards.normalDiamondChance, DIAMOND_CHANCE) + diamondLuckBonus,
  );
  const diamonds = Math.random() < diamondChance ? 1 : 0;

  let purpleDiamonds = 0;
  let bossesKilled = 0;
  let bossOrdinal = bossOrdinalIn;

  if (isBoss) {
    bossesKilled = 1;
    bossOrdinal += 1;
    purpleDiamonds = purpleDiamondsForBoss(bossOrdinal);
  } else if (Math.random() < PURPLE_DIAMOND_CHANCE) {
    purpleDiamonds = 1;
  }

  return {
    coinCount,
    diamonds,
    purpleDiamonds,
    bossesKilled,
    bossOrdinal,
    xp,
  };
}

/**
 * Soma valores de coleta de um drop (unitário ou bundle).
 */
export function getDropCollectValues(drop: Drop): {
  gold: number;
  diamonds: number;
  purpleDiamonds: number;
} {
  if (drop.type === "bundle") {
    return {
      gold: Math.max(0, drop.goldValue ?? 0),
      diamonds: Math.max(0, drop.diamondValue ?? 0),
      purpleDiamonds: Math.max(0, drop.purpleDiamondValue ?? 0),
    };
  }
  if (drop.type === "gold") {
    return { gold: GOLD_DROP_VALUE, diamonds: 0, purpleDiamonds: 0 };
  }
  if (drop.type === "purple_diamond") {
    return { gold: 0, diamonds: 0, purpleDiamonds: 1 };
  }
  return { gold: 0, diamonds: 1, purpleDiamonds: 0 };
}

/**
 * Funde drops espalhados num único `bundle` (anti-lag no endless tardio).
 * Mantém bundles existentes e junta o resto no centro de massa.
 */
export function mergeDropsIntoBundle(drops: Drop[], now: number): Drop[] {
  if (drops.length <= 1) return drops;

  let gold = 0;
  let diamonds = 0;
  let purple = 0;
  let sx = 0;
  let sy = 0;
  let oldest = now;

  for (const drop of drops) {
    const v = getDropCollectValues(drop);
    gold += v.gold;
    diamonds += v.diamonds;
    purple += v.purpleDiamonds;
    sx += drop.x;
    sy += drop.y;
    oldest = Math.min(oldest, drop.spawnTime);
  }

  if (gold <= 0 && diamonds <= 0 && purple <= 0) return [];

  const n = drops.length;
  return [
    {
      id: crypto.randomUUID(),
      x: sx / n,
      y: sy / n,
      type: "bundle",
      spawnTime: oldest,
      goldValue: gold,
      diamondValue: diamonds,
      purpleDiamondValue: purple,
    },
  ];
}

/**
 * Gera moedas espalhadas por kill + diamantes (normal / roxo).
 * Bosses: sempre dropam diamantes roxos progressivos ao redor do corpo.
 * Ouro / chances de diamante vêm de `enemy_types` via `site.rewards`.
 *
 * Com `compactLoot`: 1 ícone `bundle` por kill (mesmos valores totais).
 */
export function createDropsFromKills(
  sites: KillSite[],
  now = Date.now(),
  options: CreateDropsOptions = {},
): CreateDropsResult {
  const incomeMultiplier = options.incomeMultiplier ?? 1;
  const goldDropMultiplier = options.goldDropMultiplier ?? 1;
  const diamondLuckBonus = Math.max(0, options.diamondLuckBonus ?? 0);
  const compactLoot = options.compactLoot === true;
  let bossOrdinal = options.bossesKilled ?? 0;
  const drops: Drop[] = [];
  let bossesKilledThisBatch = 0;
  let totalXp = 0;

  for (const site of sites) {
    const rolled = rollLootForSite(
      site,
      incomeMultiplier,
      goldDropMultiplier,
      diamondLuckBonus,
      bossOrdinal,
    );
    bossOrdinal = rolled.bossOrdinal;
    bossesKilledThisBatch += rolled.bossesKilled;
    totalXp += rolled.xp;

    if (compactLoot) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x + (Math.random() - 0.5) * 10,
        y: site.y + (Math.random() - 0.5) * 10,
        type: "bundle",
        spawnTime: now,
        goldValue: rolled.coinCount * GOLD_DROP_VALUE,
        diamondValue: rolled.diamonds,
        purpleDiamondValue: rolled.purpleDiamonds,
      });
      continue;
    }

    for (let i = 0; i < rolled.coinCount; i++) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x + (Math.random() - 0.5) * COIN_SCATTER_PX,
        y: site.y + (Math.random() - 0.5) * COIN_SCATTER_PX,
        type: "gold",
        spawnTime: now,
      });
    }

    if (rolled.diamonds > 0) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x + (Math.random() - 0.5) * 12,
        y: site.y + (Math.random() - 0.5) * 12,
        type: "diamond",
        spawnTime: now,
      });
    }

    if (rolled.purpleDiamonds > 0) {
      if (site.enemyType === "boss" && rolled.purpleDiamonds > 1) {
        for (let i = 0; i < rolled.purpleDiamonds; i++) {
          const angle =
            (Math.PI * 2 * i) / rolled.purpleDiamonds + Math.random() * 0.4;
          const radius = 18 + Math.random() * PURPLE_SCATTER_PX;
          drops.push({
            id: crypto.randomUUID(),
            x: site.x + Math.cos(angle) * radius,
            y: site.y + Math.sin(angle) * radius,
            type: "purple_diamond",
            spawnTime: now,
          });
        }
      } else {
        drops.push({
          id: crypto.randomUUID(),
          x: site.x,
          y: site.y,
          type: "purple_diamond",
          spawnTime: now,
        });
      }
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
 * Idle 800ms → magnetismo ilimitado em direção ao player → coleta por proximidade.
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
  // Ímã Primordial ainda amplia a área de coleta ao tocar o player
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
      // Sempre puxa para o hero, independente da distância
      const step = MAGNET_SPEED * dt;
      x += (dx / dist) * step;
      y += (dy / dist) * step;
    }

    const distToPlayer = Math.hypot(playerX - x, playerY - y);
    if (distToPlayer < collectRadius) {
      const values = getDropCollectValues(drop);
      collectedGold += values.gold;
      collectedDiamonds += values.diamonds;
      collectedPurpleDiamonds += values.purpleDiamonds;
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
