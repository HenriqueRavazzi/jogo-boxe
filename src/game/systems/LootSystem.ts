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
const GOLD_DROP_VALUE = 10;
const DIAMOND_CHANCE = 0.1;

/** Cria drops nas posições de morte (90% gold / 10% diamond). */
export function createDropsFromKills(sites: KillSite[], now = Date.now()): Drop[] {
  return sites.map((site) => ({
    id: crypto.randomUUID(),
    x: site.x,
    y: site.y,
    type: Math.random() < DIAMOND_CHANCE ? "diamond" : "gold",
    spawnTime: now,
  }));
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

export { DROP_IDLE_MS, GOLD_DROP_VALUE };
