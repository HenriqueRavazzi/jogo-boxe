/** Spawner com tipos vindos do Neon (`enemy_types`) e bosses escalonados. */

import {
  ENEMY_BASE_RADIUS,
  ENEMY_SPEED_UNIT,
  FALLBACK_ENEMY_TYPES,
  type EnemyTypeConfig,
} from "@/lib/gameConfig";
import {
  Enemy,
  type EnemyData,
  type EnemyType,
} from "@/src/game/entities/Enemy";

export const BASE_ENEMY_HP = 30;
/** Ciclo de escalonamento da horda (segundos). */
export const SCALING_CYCLE_SECONDS = 30;
/** +50% de HP/dano por degrau de poder (a cada 3 ciclos de densidade). */
export const ENEMY_POWER_STEP = 0.5;
/** @deprecated Mantido por compat; poder agora usa ciclos de 30s. */
export const ENEMY_HP_CYCLE_SECONDS = SCALING_CYCLE_SECONDS;
/** @deprecated */
export const ENEMY_HP_GROWTH_PER_CYCLE = 1.5;
/** @deprecated */
export const ENEMY_DAMAGE_GROWTH_PER_CYCLE = 1.5;
/** Teto de crescimento visual (+50%). */
export const ENEMY_VISUAL_SCALE_CAP = 0.5;
/** Boss a cada 4 minutos. */
export const BOSS_INTERVAL_SECONDS = 240;
/** Escala extra quando bossCount excede bosses cadastrados. */
export const BOSS_OVERFLOW_HP_GROWTH = 1.8;
export const BOSS_OVERFLOW_DAMAGE_GROWTH = 1.4;
/** Pesos de spawn para comuns (por kind). */
export const COMMON_SPAWN_WEIGHTS: Record<
  Exclude<EnemyType, "boss">,
  number
> = {
  normal: 0.6,
  dasher: 0.2,
  ranged: 0.2,
};

const BASE_INTERVAL = 2000; // 2s inicial
const MIN_INTERVAL = 400; // limite máximo de frenesi
const BASE_AMOUNT = 1; // inimigos por disparo de spawn
export const MAX_ENEMIES = 80;

/**
 * Ciclo de escalonamento: floor(timeAlive / 30).
 * Densidade sobe a cada ciclo; poder sobe a cada 3 ciclos.
 */
export function getScalingCycle(timeAliveSeconds: number): number {
  return Math.floor(Math.max(0, timeAliveSeconds) / SCALING_CYCLE_SECONDS);
}

/** Alias legado — mesmo que getScalingCycle. */
export function getHordeDifficultyFactor(timeAliveSeconds: number): number {
  return getScalingCycle(timeAliveSeconds);
}

/**
 * Degraus de poder: ciclos 1–2 = 0, ciclo 3–5 = 1, ciclo 6–8 = 2…
 * (ciclo 1-based = scalingCycle + 1; bump quando ciclo % 3 === 0).
 */
export function getEnemyPowerLevel(timeAliveSeconds: number): number {
  const scalingCycle = getScalingCycle(timeAliveSeconds);
  const cycleNumber = scalingCycle + 1; // 1, 2, 3, 4…
  return Math.floor(cycleNumber / 3);
}

/** Multiplicador de HP/dano: 1 → 1.5 → 2.0 → … (+50% do base por degrau). */
export function getEnemyPowerMultiplier(timeAliveSeconds: number): number {
  return 1 + getEnemyPowerLevel(timeAliveSeconds) * ENEMY_POWER_STEP;
}

export function getSpawnIntervalMs(timeAlive: number): number {
  const scalingCycle = getScalingCycle(timeAlive);
  return Math.max(
    MIN_INTERVAL,
    BASE_INTERVAL / (1 + scalingCycle * 0.2),
  );
}

/**
 * Quantidade de inimigos comuns por tick — sobe a cada ciclo de 30s.
 * Ciclo 0 → 1, ciclo 1 → 2, ciclo 2 → 3…
 */
export function getSpawnAmount(timeAlive: number): number {
  const scalingCycle = getScalingCycle(timeAlive);
  return BASE_AMOUNT + scalingCycle;
}

export type DifficultySpawnMultipliers = {
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
};

export type SpawnerInput = {
  timeAlive: number;
  matchLevel: number;
  canvasWidth: number;
  canvasHeight: number;
  currentEnemyCount: number;
  bossesSpawned: number;
  hasBossAlive: boolean;
  spawnAccumulatorMs: number;
  dt: number;
  difficulty?: DifficultySpawnMultipliers;
  /** Catálogo do Neon / fallback. */
  enemyTypes?: EnemyTypeConfig[];
};

export type SpawnerResult = {
  spawned: EnemyData[];
  spawnAccumulatorMs: number;
  spawnIntervalMs: number;
  bossesSpawned: number;
};

export function getDifficultyScale(timeAlive: number, matchLevel: number): number {
  const timeScale = 1 + timeAlive / 60;
  const levelScale = 1 + (matchLevel - 1) * 0.08;
  return timeScale * levelScale;
}

export function getEnemyMaxHpAtTime(
  timeAliveInSeconds: number,
  baseHp = BASE_ENEMY_HP,
  difficultyMultiplier = 1,
): number {
  const powerMul = getEnemyPowerMultiplier(timeAliveInSeconds);
  const difficultyMul = difficultyMultiplier || 1;
  return Math.max(1, Math.floor(baseHp * powerMul * difficultyMul));
}

/** Escala visual: acompanha degraus de poder (até +50%). */
export function getEnemyVisualScale(
  typeScale: number,
  timeAliveInSeconds: number,
): number {
  const powerLevel = getEnemyPowerLevel(timeAliveInSeconds);
  const growth = Math.min(ENEMY_VISUAL_SCALE_CAP, powerLevel * 0.15);
  return typeScale * (1 + growth);
}

function catalog(input?: EnemyTypeConfig[]): EnemyTypeConfig[] {
  return input && input.length > 0 ? input : FALLBACK_ENEMY_TYPES;
}

function commonTypes(types: EnemyTypeConfig[]): EnemyTypeConfig[] {
  return types.filter((t) => !t.isBoss);
}

function bossTypes(types: EnemyTypeConfig[]): EnemyTypeConfig[] {
  return types.filter((t) => t.isBoss).sort((a, b) => a.id - b.id);
}

/** Sorteio ponderado entre tipos comuns (60/20/20 por kind). */
function rollCommonConfig(commons: EnemyTypeConfig[]): EnemyTypeConfig {
  if (commons.length === 0) return FALLBACK_ENEMY_TYPES[0]!;

  const weighted = commons.map((t) => ({
    config: t,
    weight: COMMON_SPAWN_WEIGHTS[t.kind === "boss" ? "normal" : t.kind] ?? 0.2,
  }));
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.config;
  }
  return weighted[weighted.length - 1]!.config;
}

/** Boss pelo índice; se acabar a lista, usa o último + overflow scale. */
function pickBossConfig(
  bosses: EnemyTypeConfig[],
  bossCount: number,
): { config: EnemyTypeConfig; overflow: number } {
  if (bosses.length === 0) {
    const fallback = FALLBACK_ENEMY_TYPES.find((t) => t.isBoss)!;
    return { config: fallback, overflow: Math.max(0, bossCount) };
  }
  if (bossCount < bosses.length) {
    return { config: bosses[bossCount]!, overflow: 0 };
  }
  return {
    config: bosses[bosses.length - 1]!,
    overflow: bossCount - (bosses.length - 1),
  };
}

function scaleFromType(
  config: EnemyTypeConfig,
  timeAlive: number,
  matchLevel: number,
  difficulty?: DifficultySpawnMultipliers,
  overflow = 0,
) {
  const hpMul = difficulty?.enemyHpMultiplier || 1;
  const dmgMul = difficulty?.enemyDamageMultiplier || 1;
  const spdMul = difficulty?.enemySpeedMultiplier || 1;

  const powerMul = getEnemyPowerMultiplier(timeAlive);
  const overflowHp = Math.pow(BOSS_OVERFLOW_HP_GROWTH, overflow);
  const overflowDmg = Math.pow(BOSS_OVERFLOW_DAMAGE_GROWTH, overflow);

  // HP: base × (1 + 0.5 × powerLevel) — sobe a cada 3 ciclos de densidade
  const scaledHp = Math.floor(config.hpBase * powerMul * hpMul);

  // Dano: mesma curva escalonada de poder
  const scaledDamage =
    config.damage * powerMul * dmgMul * overflowDmg;

  const speedPx = Math.min(
    160 * Math.max(1, spdMul),
    config.speed *
      ENEMY_SPEED_UNIT *
      (1 + timeAlive / 90) *
      (1 + (matchLevel - 1) * 0.05) *
      spdMul,
  );

  const damage = Number(Math.max(0.4, scaledDamage).toFixed(2));

  // Escala visual acompanha degraus de poder
  const visualScale = getEnemyVisualScale(config.scale, timeAlive);

  return {
    hp: Math.max(1, Math.floor(scaledHp * overflowHp)),
    speed: speedPx,
    damage,
    attackCooldown: config.attackSpeed,
    radius: Math.max(6, Math.round(ENEMY_BASE_RADIUS * visualScale)),
    color: config.color,
    type: (config.kind === "boss" ? "boss" : config.kind) as EnemyType,
    projectileDamage:
      config.kind === "ranged" ? Number(damage.toFixed(2)) : 0,
  };
}

function spawnFromConfig(
  canvasWidth: number,
  canvasHeight: number,
  config: EnemyTypeConfig,
  timeAlive: number,
  matchLevel: number,
  difficulty?: DifficultySpawnMultipliers,
  overflow = 0,
): EnemyData {
  const scaled = scaleFromType(
    config,
    timeAlive,
    matchLevel,
    difficulty,
    overflow,
  );
  const enemy = Enemy.spawnAtEdge(canvasWidth, canvasHeight, {
    hp: scaled.hp,
    speed: scaled.speed,
    attackDamage: scaled.damage,
    attackCooldown: scaled.attackCooldown,
    projectileDamage: scaled.projectileDamage,
    type: scaled.type,
    radius: scaled.radius,
    color: scaled.color,
    skipTypeModifiers: true,
  });
  enemy.maxHp = enemy.hp;
  return enemy.toData();
}

/**
 * Spawner: comuns por peso do catálogo; bosses a cada 240s na ordem do DB.
 */
export function runSpawner(input: SpawnerInput): SpawnerResult {
  const {
    timeAlive,
    matchLevel,
    canvasWidth,
    canvasHeight,
    currentEnemyCount,
    hasBossAlive,
    dt,
    difficulty,
  } = input;

  const types = catalog(input.enemyTypes);
  const commons = commonTypes(types);
  const bosses = bossTypes(types);

  const timeAliveInSeconds =
    timeAlive > 10_000 ? timeAlive / 1000 : timeAlive;

  let bossesSpawned = input.bossesSpawned;
  let spawnAccumulatorMs = input.spawnAccumulatorMs + dt * 1000;
  const spawnIntervalMs = getSpawnIntervalMs(timeAliveInSeconds);
  const spawned: EnemyData[] = [];
  let count = currentEnemyCount;

  const expectedBosses = Math.floor(
    timeAliveInSeconds / BOSS_INTERVAL_SECONDS,
  );

  if (expectedBosses > bossesSpawned && !hasBossAlive && count < MAX_ENEMIES) {
    const bossCount = bossesSpawned;
    const { config, overflow } = pickBossConfig(bosses, bossCount);
    spawned.push(
      spawnFromConfig(
        canvasWidth,
        canvasHeight,
        config,
        timeAliveInSeconds,
        matchLevel,
        difficulty,
        overflow,
      ),
    );
    bossesSpawned = expectedBosses;
    spawnAccumulatorMs = 0;
    return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
  }

  if (hasBossAlive || expectedBosses > bossesSpawned) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
    return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
  }

  while (spawnAccumulatorMs >= spawnIntervalMs && count < MAX_ENEMIES) {
    spawnAccumulatorMs -= spawnIntervalMs;
    const batchAmount = getSpawnAmount(timeAliveInSeconds);
    for (let i = 0; i < batchAmount && count < MAX_ENEMIES; i++) {
      const config = rollCommonConfig(commons);
      spawned.push(
        spawnFromConfig(
          canvasWidth,
          canvasHeight,
          config,
          timeAliveInSeconds,
          matchLevel,
          difficulty,
        ),
      );
      count += 1;
    }
  }

  if (count >= MAX_ENEMIES) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
  }

  return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
}
