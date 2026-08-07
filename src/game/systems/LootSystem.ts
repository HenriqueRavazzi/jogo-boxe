/** Sistema de loot magnético (ouro / diamante). */

export type DropType = "gold" | "diamond";

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
};

const DROP_IDLE_MS = 800;
const MAGNET_SPEED = 520; // px/s
/** Valor de cada moeda física ao coletar. */
const GOLD_DROP_VALUE = 10;
/** Moedas base por kill (antes dos multiplicadores). */
const BASE_GOLD_DROP = 1;
const DIAMOND_CHANCE = 0.1;
/** Espalhamento aleatório das moedas em px. */
const COIN_SCATTER_PX = 40;

export type CreateDropsOptions = {
  /** Multiplicador de renda da loja. */
  incomeMultiplier?: number;
  /** Multiplicador de ouro da dificuldade. */
  goldDropMultiplier?: number;
};

/**
 * Gera várias moedas físicas espalhadas por kill + rolagem separada de diamante.
 * coinCount = max(1, floor(baseGoldDrop * income * goldDropMult))
 */
export function createDropsFromKills(
  sites: KillSite[],
  now = Date.now(),
  options: CreateDropsOptions = {},
): Drop[] {
  const incomeMultiplier = options.incomeMultiplier ?? 1;
  const goldDropMultiplier = options.goldDropMultiplier ?? 1;
  const drops: Drop[] = [];

  for (const site of sites) {
    const coinCount = Math.max(
      1,
      Math.floor(BASE_GOLD_DROP * incomeMultiplier * goldDropMultiplier),
    );

    for (let i = 0; i < coinCount; i++) {
      const dropX = site.x + (Math.random() - 0.5) * COIN_SCATTER_PX;
      const dropY = site.y + (Math.random() - 0.5) * COIN_SCATTER_PX;
      drops.push({
        id: crypto.randomUUID(),
        x: dropX,
        y: dropY,
        type: "gold",
        spawnTime: now,
      });
    }

    // Diamante: 10% independente, no centro da morte
    if (Math.random() < DIAMOND_CHANCE) {
      drops.push({
        id: crypto.randomUUID(),
        x: site.x,
        y: site.y,
        type: "diamond",
        spawnTime: now,
      });
    }
  }

  return drops;
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
  };
}

export { DROP_IDLE_MS, GOLD_DROP_VALUE, BASE_GOLD_DROP, COIN_SCATTER_PX };
