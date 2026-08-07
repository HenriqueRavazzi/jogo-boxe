/** Spawner com dificuldade progressiva, tipos e bosses. */

import { Enemy, type EnemyData, type EnemyType } from "@/src/game/entities/Enemy";

export const BASE_ENEMY_HP = 30;
const BASE_SPEED = 55;
const BASE_CONTACT_DAMAGE = 20;
/** A cada N segundos, novos inimigos ganham +5% HP (juros compostos). */
export const ENEMY_HP_CYCLE_SECONDS = 15;
export const ENEMY_HP_GROWTH_PER_CYCLE = 1.05;
/** Boss a cada 3 minutos. */
export const BOSS_INTERVAL_SECONDS = 180;
/** 20% das spawns normais são dashers. */
export const DASHER_CHANCE = 0.2;

const BASE_SPAWN_INTERVAL_MS = 2000;
const MIN_SPAWN_INTERVAL_MS = 450;
/** Cap de segurança para não travar a UI. */
export const MAX_ENEMIES = 80;

export type SpawnerInput = {
  timeAlive: number; // segundos desde o início da partida
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
 * Snapshot de HP no spawn: +5% composto a cada 15s de timeAlive.
 */
export function getEnemyMaxHpAtTime(
  timeAlive: number,
  baseEnemyHp = BASE_ENEMY_HP,
): number {
  const cycles = Math.floor(timeAlive / ENEMY_HP_CYCLE_SECONDS);
  return Math.round(baseEnemyHp * Math.pow(ENEMY_HP_GROWTH_PER_CYCLE, cycles));
}

export function getScaledEnemyStats(timeAlive: number, matchLevel: number) {
  const currentEnemyMaxHp = getEnemyMaxHpAtTime(timeAlive);
  return {
    hp: currentEnemyMaxHp,
    maxHp: currentEnemyMaxHp,
    speed: Math.min(
      140,
      BASE_SPEED * (1 + timeAlive / 90) * (1 + (matchLevel - 1) * 0.05),
    ),
    contactDamage: Math.floor(BASE_CONTACT_DAMAGE * (1 + timeAlive / 75)),
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
 * Spawner: 80% normal / 20% dasher.
 * A cada 180s invoca 1 boss e pausa spawns até ele morrer.
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
  } = input;

  let bossesSpawned = input.bossesSpawned;
  let spawnAccumulatorMs = input.spawnAccumulatorMs + dt * 1000;
  const spawnIntervalMs = getSpawnIntervalMs(timeAlive);
  const spawned: EnemyData[] = [];
  let count = currentEnemyCount;

  const expectedBosses = Math.floor(timeAlive / BOSS_INTERVAL_SECONDS);

  // Momento de boss: pausa normal e spawna 1 boss por ciclo
  if (expectedBosses > bossesSpawned && !hasBossAlive && count < MAX_ENEMIES) {
    const stats = getScaledEnemyStats(timeAlive, matchLevel);
    const boss = Enemy.spawnAtEdge(canvasWidth, canvasHeight, {
      hp: stats.hp,
      speed: stats.speed,
      contactDamage: stats.contactDamage,
      type: "boss",
    });
    spawned.push(boss.toData());
    bossesSpawned = expectedBosses;
    // Zera acumulador para não floodar ao retomar
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
    const stats = getScaledEnemyStats(timeAlive, matchLevel);
    const type = rollRegularType();
    const enemy = Enemy.spawnAtEdge(canvasWidth, canvasHeight, {
      hp: stats.hp,
      speed: stats.speed,
      contactDamage: stats.contactDamage,
      type,
    });
    spawned.push(enemy.toData());
    count += 1;
  }

  if (count >= MAX_ENEMIES) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
  }

  return { spawned, spawnAccumulatorMs, spawnIntervalMs, bossesSpawned };
}
