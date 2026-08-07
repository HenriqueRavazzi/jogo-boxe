/** Spawner com dificuldade progressiva baseada em timeAlive. */

import { Enemy, type EnemyData } from "@/src/game/entities/Enemy";

export const BASE_ENEMY_HP = 30;
const BASE_SPEED = 55;
const BASE_CONTACT_DAMAGE = 20;
/** A cada N segundos, novos inimigos ganham +5% HP (juros compostos). */
export const ENEMY_HP_CYCLE_SECONDS = 15;
export const ENEMY_HP_GROWTH_PER_CYCLE = 1.05;

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
  spawnAccumulatorMs: number;
  dt: number;
};

export type SpawnerResult = {
  spawned: EnemyData[];
  spawnAccumulatorMs: number;
  /** Intervalo atual (ms) — útil para debug/UI. */
  spawnIntervalMs: number;
};

/** Multiplicador suave para speed/contact (+100% a cada 60s + boost por matchLevel). */
export function getDifficultyScale(timeAlive: number, matchLevel: number): number {
  const timeScale = 1 + timeAlive / 60;
  const levelScale = 1 + (matchLevel - 1) * 0.08;
  return timeScale * levelScale;
}

/**
 * Snapshot de HP no spawn: +5% composto a cada 15s de timeAlive.
 * cycles = floor(timeAlive / 15) → round(base * 1.05^cycles).
 * Inimigos já vivos NÃO são atualizados.
 */
export function getEnemyMaxHpAtTime(
  timeAlive: number,
  baseEnemyHp = BASE_ENEMY_HP,
): number {
  const cycles = Math.floor(timeAlive / ENEMY_HP_CYCLE_SECONDS);
  return Math.round(baseEnemyHp * Math.pow(ENEMY_HP_GROWTH_PER_CYCLE, cycles));
}

/**
 * Stats no momento do spawn (HP é snapshot; speed/contact escalam suaves).
 */
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

/**
 * Intervalo entre spawns: começa em 2s e cai até o mínimo,
 * acelerando com o tempo vivo.
 */
export function getSpawnIntervalMs(timeAlive: number): number {
  const t = timeAlive / 45;
  const interval =
    BASE_SPAWN_INTERVAL_MS -
    (BASE_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS) * (1 - Math.exp(-t));
  return Math.max(MIN_SPAWN_INTERVAL_MS, interval);
}

/**
 * Tenta gerar inimigos neste frame com base no acumulador e no cap.
 * Cada inimigo recebe o HP do ciclo atual no instante da criação (snapshot).
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

  while (spawnAccumulatorMs >= spawnIntervalMs && count < MAX_ENEMIES) {
    spawnAccumulatorMs -= spawnIntervalMs;
    const stats = getScaledEnemyStats(timeAlive, matchLevel);
    const enemy = Enemy.spawnAtEdge(canvasWidth, canvasHeight, {
      hp: stats.hp,
      speed: stats.speed,
      contactDamage: stats.contactDamage,
    });
    spawned.push(enemy.toData());
    count += 1;
  }

  if (count >= MAX_ENEMIES) {
    spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
  }

  return { spawned, spawnAccumulatorMs, spawnIntervalMs };
}
