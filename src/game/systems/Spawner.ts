/** Spawner com dificuldade progressiva baseada em timeAlive. */

import { Enemy, type EnemyData } from "@/src/game/entities/Enemy";

const BASE_HP = 30;
const BASE_SPEED = 55;
const BASE_CONTACT_DAMAGE = 20;

const BASE_SPAWN_INTERVAL_MS = 2000;
const MIN_SPAWN_INTERVAL_MS = 450;
/** Cap de segurança para não travar a UI. */
export const MAX_ENEMIES = 80;

export type SpawnerInput = {
  timeAlive: number; // segundos
  matchLevel: number;
  canvasWidth: number;
  canvasHeight: number;
  currentEnemyCount: number;
  spawnAccumulatorMs: number;
  dt: number;
};

export type SpawnerResult = {
  spawned: EnemyData[];
  spawnAccumulatorMs: number;
  /** Intervalo atual (ms) — útil para debug/UI. */
  spawnIntervalMs: number;
};

/** Multiplicador suave: +100% a cada 60s vivos (+ boost leve por matchLevel). */
export function getDifficultyScale(timeAlive: number, matchLevel: number): number {
  const timeScale = 1 + timeAlive / 60;
  const levelScale = 1 + (matchLevel - 1) * 0.08;
  return timeScale * levelScale;
}

export function getScaledEnemyStats(timeAlive: number, matchLevel: number) {
  const scale = getDifficultyScale(timeAlive, matchLevel);
  return {
    hp: Math.floor(BASE_HP * scale),
    speed: Math.min(140, BASE_SPEED * (1 + timeAlive / 90) * (1 + (matchLevel - 1) * 0.05)),
    contactDamage: Math.floor(BASE_CONTACT_DAMAGE * (1 + timeAlive / 75)),
  };
}

/**
 * Intervalo entre spawns: começa em 2s e cai até o mínimo,
 * acelerando com o tempo vivo.
 */
export function getSpawnIntervalMs(timeAlive: number): number {
  // A cada ~45s o intervalo cai ~50% em direção ao mínimo
  const t = timeAlive / 45;
  const interval =
    BASE_SPAWN_INTERVAL_MS -
    (BASE_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS) * (1 - Math.exp(-t));
  return Math.max(MIN_SPAWN_INTERVAL_MS, interval);
}

/**
 * Tenta gerar inimigos neste frame com base no acumulador e no cap.
 */
export function runSpawner(input: SpawnerInput): SpawnerResult {
  const {
    timeAlive,
    matchLevel,
    canvasWidth,
    canvasHeight,
    currentEnemyCount,
    dt,
  } = input;

  let spawnAccumulatorMs = input.spawnAccumulatorMs + dt * 1000;
  const spawnIntervalMs = getSpawnIntervalMs(timeAlive);
  const spawned: EnemyData[] = [];
  let count = currentEnemyCount;

  while (
    spawnAccumulatorMs >= spawnIntervalMs &&
    count < MAX_ENEMIES
  ) {
    spawnAccumulatorMs -= spawnIntervalMs;
    const stats = getScaledEnemyStats(timeAlive, matchLevel);
    const enemy = Enemy.spawnAtEdge(canvasWidth, canvasHeight, stats);
    spawned.push(enemy.toData());
    count += 1;
  }

  // Se já está no cap, não deixa o acumulador explodir
  if (count >= MAX_ENEMIES) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
  }

  return { spawned, spawnAccumulatorMs, spawnIntervalMs };
}
