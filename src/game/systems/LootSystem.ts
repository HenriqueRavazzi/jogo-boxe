/** Sistema de loot magnético (ouro / diamante / diamante roxo). */

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
};

const DROP_IDLE_MS = 800;
const MAGNET_SPEED = 520; // px/s
/** Valor de cada moeda física ao coletar. */
const GOLD_DROP_VALUE = 10;
/** Moedas base por kill (antes dos multiplicadores). */
const BASE_GOLD_DROP = 1;
const DIAMOND_CHANCE = 0.1;
const PURPLE_DIAMOND_CHANCE = 0.005;
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
};

export type CreateDropsResult = {
  drops: Drop[];
  /** Bosses derrotados neste lote (para incrementar o contador da run). */
  bossesKilledThisBatch: number;
};

/** Diamantes roxos garantidos no n-ésimo boss da run (1-indexed). */
export function purpleDiamondsForBoss(bossCount: number): number {
  const n = Math.max(1, Math.floor(bossCount));
  return Math.max(1, Math.floor(2 * Math.pow(1.5, n - 1)));
}

/**
 * Gera moedas espalhadas por kill + diamantes (normal / roxo).
 * Bosses: sempre dropam diamantes roxos progressivos ao redor do corpo.
 */
export function createDropsFromKills(
  sites: KillSite[],
  now = Date.now(),
  options: CreateDropsOptions = {},
): CreateDropsResult {
  const incomeMultiplier = options.incomeMultiplier ?? 1;
  const goldDropMultiplier = options.goldDropMultiplier ?? 1;
  let bossOrdinal = options.bossesKilled ?? 0;
  const drops: Drop[] = [];
  let bossesKilledThisBatch = 0;

  for (const site of sites) {
    const isBoss = site.enemyType === "boss";

    // Quantidade variável de ouro (renda × dificuldade), mínimo 1
    const coinCount = Math.max(
      1,
      Math.floor(BASE_GOLD_DROP * incomeMultiplier * goldDropMultiplier),
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

    // Diamante normal: 10% em qualquer kill
    if (Math.random() < DIAMOND_CHANCE) {
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
      // Diamante roxo raro em inimigos normais (0.5%)
      drops.push({
        id: crypto.randomUUID(),
        x: site.x,
        y: site.y,
        type: "purple_diamond",
        spawnTime: now,
      });
    }
  }

  return { drops, bossesKilledThisBatch };
}

export type LootSystemInput = {
  drops: Drop[];
  playerX: number;
  playerY: number;
  playerRadius: number;
  dt: number;
  now?: number;
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
  } = input;

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
      const step = MAGNET_SPEED * dt;
      x += (dx / dist) * step;
      y += (dy / dist) * step;
    }

    const distToPlayer = Math.hypot(playerX - x, playerY - y);
    if (distToPlayer < playerRadius) {
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
