/** Spawner com dificuldade progressiva, tipos e bosses. */

import { Enemy, type EnemyData, type EnemyType } from "@/src/game/entities/Enemy";
import { DEFAULT_ATTACK_DAMAGE, DEFAULT_ATTACK_COOLDOWN_MS } from "@/src/game/entities/Enemy";

export const BASE_ENEMY_HP = 30;
const BASE_SPEED = 55;
/** A cada N segundos, novos inimigos ganham HP composto. */
export const ENEMY_HP_CYCLE_SECONDS = 15;
/** +10% composto por ciclo de 15s. */
export const ENEMY_HP_GROWTH_PER_CYCLE = 1.1;
/** Boss a cada 3 minutos. */
export const BOSS_INTERVAL_SECONDS = 180;
/** 20% das spawns normais são dashers. */
export const DASHER_CHANCE = 0.2;

const BASE_SPAWN_INTERVAL_MS = 2000;
const MIN_SPAWN_INTERVAL_MS = 450;
/** Cap de segurança para não travar a UI. */
export const MAX_ENEMIES = 80;

export type DifficultySpawnMultipliers = {
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
};

export type SpawnerInput = {
  /** Segundos vivos na partida (não milissegundos). */
  timeAlive: number;
  matchLevel: number;
  canvasWidth: number;
  canvasHeight: number;
  currentEnemyCount: number;
  /** Quantos bosses já foram invocados nesta run. */
  bossesSpawned: number;
  /** Se já existe um boss vivo, pausa spawn normal. */
  hasBossAlive: boolean;
  spawnAccumulatorMs: number;
  dt: number;
  /** Multiplicadores da dificuldade selecionada no menu. */
  difficulty?: DifficultySpawnMultipliers;
};

export type SpawnerResult = {
  spawned: EnemyData[];
  spawnAccumulatorMs: number;
  spawnIntervalMs: number;
  bossesSpawned: number;
};

/** Multiplicador suave para speed/contact (+100% a cada 60s + boost por matchLevel). */
export function getDifficultyScale(timeAlive: number, matchLevel: number): number {
  const timeScale = 1 + timeAlive / 60;
  const levelScale = 1 + (matchLevel - 1) * 0.08;
  return timeScale * levelScale;
}

/**
 * Snapshot de HP no spawn (segundos):
 * floor(baseHp * 1.10^floor(timeAlive/15) * difficultyMultiplier)
 */
export function getEnemyMaxHpAtTime(
  timeAliveInSeconds: number,
  baseHp = BASE_ENEMY_HP,
  difficultyMultiplier = 1,
): number {
  const cycles = Math.floor(timeAliveInSeconds / ENEMY_HP_CYCLE_SECONDS);
  const difficultyMul = difficultyMultiplier || 1;
  return Math.max(
    1,
    Math.floor(
      baseHp * Math.pow(ENEMY_HP_GROWTH_PER_CYCLE, cycles) * difficultyMul,
    ),
  );
}

export function getScaledEnemyStats(
  timeAlive: number,
  matchLevel: number,
  difficulty?: DifficultySpawnMultipliers,
) {
  const hpMul = difficulty?.enemyHpMultiplier || 1;
  const dmgMul = difficulty?.enemyDamageMultiplier || 1;
  const spdMul = difficulty?.enemySpeedMultiplier || 1;

  const finalHp = getEnemyMaxHpAtTime(timeAlive, BASE_ENEMY_HP, hpMul);

  return {
    hp: finalHp,
    maxHp: finalHp,
    speed: Math.min(
      140 * Math.max(1, spdMul),
      BASE_SPEED *
        (1 + timeAlive / 90) *
        (1 + (matchLevel - 1) * 0.05) *
        spdMul,
    ),
    /** Melee baixo e periódico; escala leve com tempo + dificuldade. */
    attackDamage: Number(
      Math.max(
        0.5,
        DEFAULT_ATTACK_DAMAGE * (1 + timeAlive / 120) * dmgMul,
      ).toFixed(2),
    ),
    attackCooldown: DEFAULT_ATTACK_COOLDOWN_MS,
  };
}

export function getSpawnIntervalMs(timeAlive: number): number {
  const t = timeAlive / 45;
  const interval =
    BASE_SPAWN_INTERVAL_MS -
    (BASE_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS) * (1 - Math.exp(-t));
  return Math.max(MIN_SPAWN_INTERVAL_MS, interval);
}

function rollRegularType(): EnemyType {
  return Math.random() < DASHER_CHANCE ? "dasher" : "normal";
}

/**
 * Cria inimigo com snapshot absoluto de HP (após modificadores de tipo).
 * Garante hp === maxHp === valor calculado no instante do spawn.
 */
function spawnEnemySnapshot(
  canvasWidth: number,
  canvasHeight: number,
  timeAlive: number,
  matchLevel: number,
  type: EnemyType,
  difficulty?: DifficultySpawnMultipliers,
): EnemyData {
  const stats = getScaledEnemyStats(timeAlive, matchLevel, difficulty);
  const enemy = Enemy.spawnAtEdge(canvasWidth, canvasHeight, {
    hp: stats.hp,
    speed: stats.speed,
    attackDamage: stats.attackDamage,
    attackCooldown: stats.attackCooldown,
    type,
  });
  // Snapshot absoluto pós-tipo (dasher/boss já aplicados em spawnAtEdge)
  enemy.maxHp = enemy.hp;
  return enemy.toData();
}

/**
 * Spawner: 80% normal / 20% dasher.
 * A cada 180s invoca 1 boss e pausa spawns até ele morrer.
 * HP usa timeAlive em segundos no momento exato da instanciação.
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

  // Segurança: se vierem ms por engano (> ~3h em segundos), converte
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

  // Momento de boss: pausa normal e spawna 1 boss por ciclo
  if (expectedBosses > bossesSpawned && !hasBossAlive && count < MAX_ENEMIES) {
    spawned.push(
      spawnEnemySnapshot(
        canvasWidth,
        canvasHeight,
        timeAliveInSeconds,
        matchLevel,
        "boss",
        difficulty,
      ),
    );
    bossesSpawned = expectedBosses;
    spawnAccumulatorMs = 0;
    return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
  }

  // Enquanto o boss estiver vivo, não spawna grunts
  if (hasBossAlive || expectedBosses > bossesSpawned) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
    return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
  }

  while (spawnAccumulatorMs >= spawnIntervalMs && count < MAX_ENEMIES) {
    spawnAccumulatorMs -= spawnIntervalMs;
    const type = rollRegularType();
    spawned.push(
      spawnEnemySnapshot(
        canvasWidth,
        canvasHeight,
        timeAliveInSeconds,
        matchLevel,
        type,
        difficulty,
      ),
    );
    count += 1;
  }

  if (count >= MAX_ENEMIES) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
  }

  return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
}
