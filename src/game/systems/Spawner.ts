/** Spawner com tipos vindos do Neon (`enemy_types`) e bosses escalonados. */

import {
  ENEMY_BASE_RADIUS,
  ENEMY_SPEED_UNIT,
  FALLBACK_ENEMY_TYPES,
  rewardsFromConfig,
  type EnemyTypeConfig,
} from "@/lib/gameConfig";
import {
  Enemy,
  type EnemyData,
  type EnemyType,
} from "@/src/game/entities/Enemy";
import { useGameStore } from "@/store/useGameStore";

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

const BASE_INTERVAL = 1000; // 1s inicial (horda densa desde o começo)
const MIN_INTERVAL = 180; // frenesi máximo
const BASE_AMOUNT = 2; // lote inicial por tick
/** Crescimento do lote por ciclo de 30s. */
const AMOUNT_PER_CYCLE = 2;
export const MAX_ENEMIES = 140;

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
  // Intervalo cai mais rápido (×0.45 por ciclo) → pressão cedo
  return Math.max(
    MIN_INTERVAL,
    BASE_INTERVAL / (1 + scalingCycle * 0.45),
  );
}

/**
 * Quantidade de inimigos comuns por tick — sobe a cada ciclo de 30s.
 * Ciclo 0 → 2, ciclo 1 → 4, ciclo 2 → 6…
 */
export function getSpawnAmount(timeAlive: number): number {
  const scalingCycle = getScalingCycle(timeAlive);
  return BASE_AMOUNT + scalingCycle * AMOUNT_PER_CYCLE;
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
  /** Quantos bosses vivos agora (limite de invasões simultâneas). */
  aliveBossCount?: number;
  /** Cooldown restante (ms) até a próxima invasão de boss na horda. */
  invasionBossCooldownMs?: number;
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
  invasionBossCooldownMs: number;
};

/** Intervalo mínimo entre invasões de boss na horda (ms). */
export const HORDE_BOSS_INVASION_COOLDOWN_MS = 45_000;
/** Máximo de bosses vivos via invasão + agenda. */
export const MAX_ALIVE_BOSSES = 2;
/** Tempo mínimo de partida antes de invasões (s). */
export const HORDE_BOSS_INVASION_UNLOCK_SECONDS = 90;

/**
 * Chance por lote de spawn de injetar um boss na horda.
 * Sobe com o tempo (após 90s), até ~22%.
 */
export function getHordeBossInvasionChance(timeAliveSeconds: number): number {
  if (timeAliveSeconds < HORDE_BOSS_INVASION_UNLOCK_SECONDS) return 0;
  const t = timeAliveSeconds - HORDE_BOSS_INVASION_UNLOCK_SECONDS;
  return Math.min(0.22, 0.03 + t / 1600);
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

/** Comuns já liberados pelo tempo de partida (`unlock_time`). */
export function availableCommonTypes(
  types: EnemyTypeConfig[],
  timeAliveSeconds: number,
): EnemyTypeConfig[] {
  return commonTypes(types).filter(
    (e) => timeAliveSeconds >= e.unlockTime,
  );
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
  // Preferência: multiplicadores injetados; senão, dificuldade selecionada na store
  const fromStore = useGameStore.getState().getDifficultyMultipliers();
  const hpMul =
    difficulty?.enemyHpMultiplier ?? fromStore.enemyHpMultiplier ?? 1;
  const dmgMul =
    difficulty?.enemyDamageMultiplier ?? fromStore.enemyDamageMultiplier ?? 1;
  const spdMul =
    difficulty?.enemySpeedMultiplier ?? fromStore.enemySpeedMultiplier ?? 1;

  const powerMul = getEnemyPowerMultiplier(timeAlive);
  const overflowHp = Math.pow(BOSS_OVERFLOW_HP_GROWTH, overflow);
  const overflowDmg = Math.pow(BOSS_OVERFLOW_DAMAGE_GROWTH, overflow);

  // HP: floor(hp_base × difficulty.hp × powerMul) — Infernal: 25 × 2.5 = 62
  const scaledHp = Math.floor(config.hpBase * hpMul * powerMul);

  // Dano: damage × difficulty.damage × powerMul
  const scaledDamage =
    config.damage * dmgMul * powerMul * overflowDmg;

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
  const rewards = rewardsFromConfig(config);
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
    rewards,
  });
  enemy.maxHp = enemy.hp;
  enemy.rewards = rewards;
  return enemy.toData();
}

/**
 * Spawner: comuns por unlock_time; bosses agendados (240s) + invasões na horda.
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
  const bosses = bossTypes(types);

  const timeAliveInSeconds =
    timeAlive > 10_000 ? timeAlive / 1000 : timeAlive;

  const availableTypes = availableCommonTypes(types, timeAliveInSeconds);
  const aliveBossCount =
    input.aliveBossCount ?? (hasBossAlive ? 1 : 0);

  let bossesSpawned = input.bossesSpawned;
  let invasionBossCooldownMs = Math.max(
    0,
    (input.invasionBossCooldownMs ?? 0) - dt * 1000,
  );
  let spawnAccumulatorMs = input.spawnAccumulatorMs + dt * 1000;
  const spawnIntervalMs = getSpawnIntervalMs(timeAliveInSeconds);
  const spawned: EnemyData[] = [];
  let count = currentEnemyCount;
  let bossesAlive = aliveBossCount;

  const expectedBosses = Math.floor(
    timeAliveInSeconds / BOSS_INTERVAL_SECONDS,
  );

  // Boss agendado (a cada 240s) — não pausa a horda
  if (expectedBosses > bossesSpawned && count < MAX_ENEMIES) {
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
    bossesAlive += 1;
    count += 1;
    invasionBossCooldownMs = HORDE_BOSS_INVASION_COOLDOWN_MS;
  }

  while (spawnAccumulatorMs >= spawnIntervalMs && count < MAX_ENEMIES) {
    spawnAccumulatorMs -= spawnIntervalMs;
    const batchAmount = getSpawnAmount(timeAliveInSeconds);

    // Invasão: chance progressiva de boss no meio do lote
    const canInvade =
      invasionBossCooldownMs <= 0 &&
      bossesAlive < MAX_ALIVE_BOSSES &&
      bosses.length > 0 &&
      count < MAX_ENEMIES;
    if (
      canInvade &&
      Math.random() < getHordeBossInvasionChance(timeAliveInSeconds)
    ) {
      const { config, overflow } = pickBossConfig(bosses, bossesSpawned);
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
      count += 1;
      bossesAlive += 1;
      invasionBossCooldownMs = HORDE_BOSS_INVASION_COOLDOWN_MS;
    }

    for (let i = 0; i < batchAmount && count < MAX_ENEMIES; i++) {
      const config = rollCommonConfig(availableTypes);
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

  return {
    spawned,
    spawnAccumulatorMs,
    spawnIntervalMs,
    bossesSpawned,
    invasionBossCooldownMs,
  };
}
