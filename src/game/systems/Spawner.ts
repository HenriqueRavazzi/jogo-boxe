/** Spawner com tipos vindos do Neon (`enemy_types`) e bosses escalonados. */

import {
  ENEMY_BASE_RADIUS,
  ENEMY_SPEED_UNIT,
  FALLBACK_ENEMY_TYPES,
  rewardsFromConfig,
  type EnemyTypeConfig,
} from "@/lib/gameConfig";
import { getStageBossIndex } from "@/lib/stages";
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
/** Intervalo inicial entre bosses agendados no Endless (segundos). */
export const BOSS_INTERVAL_SECONDS = 240;
/** Intervalo mínimo entre bosses agendados no Endless (segundos). */
export const BOSS_INTERVAL_MIN_SECONDS = 10;
/**
 * Em quanto tempo de partida o intervalo agendado chega ao piso.
 * A cada spawn o próximo intervalo é recalculado com o tempo atual.
 */
export const BOSS_INTERVAL_RAMP_SECONDS = 20 * 60;
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

const BASE_INTERVAL = 1000; // ritmo padrão após o ramp dos primeiros 60s
/** Intervalo no instante t=0 — dá respiração no início. */
const EARLY_SPAWN_INTERVAL_MS = 3000;
/** Segundos para interpolar EARLY → BASE_INTERVAL. */
const EARLY_INTERVAL_RAMP_SECONDS = 60;
/** Lote fixo em 1 durante este período (segundos). */
const EARLY_BATCH_LOCK_SECONDS = 45;
/** Após o ramp inicial: +1 no lote a cada N segundos. */
const BATCH_GROWTH_SECONDS = 90;
/** Teto do lote por tick (densidade sobe mais pelo intervalo). */
const MAX_SPAWN_BATCH = 6;
/** Intervalo mínimo — evita frenesi injogável. */
const MIN_INTERVAL = 220;
/**
 * Máximo de “ticks” de spawn processados por chamada do spawner.
 * Evita inundar a tela após catch-up de aba em background.
 */
const MAX_SPAWN_EVENTS_PER_TICK = 4;
/** Acima desta fração de MAX_ENEMIES, reduz lote / alonga ritmo. */
const CROWD_SOFT_CAP_RATIO = 0.4;
export const MAX_ENEMIES = 140;

/** Nomes dos inimigos fracos liberados no início da partida. */
const EARLY_GAME_ENEMY_NAMES = new Set(["Zumbi Fraco", "Rato Corredor"]);

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

/**
 * Bônus de XP no Endless por ciclo de densidade (30s), após o grace.
 * Ex.: 0.1 → +10% XP a cada 30s vivos.
 */
export const ENDLESS_XP_BONUS_PER_CYCLE = 0.1;
/** Teto do multiplicador de XP por ciclo (antes do marco de tempo). */
export const ENDLESS_XP_MULTIPLIER_CAP = 4;
/** Ciclos de 30s ignorados no bônus de XP (2 min de ramp sem extra). */
const ENDLESS_XP_GRACE_CYCLES = 4;

/**
 * Marco extra de XP no Endless:
 * 15 min → +100% (×2), 20 min → +200% (×3), +100% a cada 5 min.
 * Empilha multiplicando com o bônus por ciclo.
 */
export const ENDLESS_XP_BONUS_START_SECONDS = 15 * 60;
export const ENDLESS_XP_BONUS_INTERVAL_SECONDS = 5 * 60;

/** Multiplicador só do ramp por ciclo de 30s (1…cap). */
export function getEndlessXpCycleMultiplier(timeAliveSeconds: number): number {
  const cycles = getScalingCycle(timeAliveSeconds);
  const xpCycles = Math.max(0, cycles - ENDLESS_XP_GRACE_CYCLES);
  return Math.min(
    ENDLESS_XP_MULTIPLIER_CAP,
    1 + xpCycles * ENDLESS_XP_BONUS_PER_CYCLE,
  );
}

/** Degraus do marco de tempo (0 antes dos 15 min). */
export function getEndlessXpBonusTier(timeAliveSeconds: number): number {
  const t = Math.max(0, timeAliveSeconds);
  if (t < ENDLESS_XP_BONUS_START_SECONDS) return 0;
  return (
    Math.floor(
      (t - ENDLESS_XP_BONUS_START_SECONDS) / ENDLESS_XP_BONUS_INTERVAL_SECONDS,
    ) + 1
  );
}

/** ×(1 + tier) do marco — empilha com o ciclo. */
export function getEndlessXpMilestoneMultiplier(
  timeAliveSeconds: number,
): number {
  return 1 + getEndlessXpBonusTier(timeAliveSeconds);
}

/**
 * Multiplicador total de XP no Endless (ciclo × marco).
 * Campanha deve usar 1 (não chamar / ignorar).
 */
export function getEndlessXpMultiplier(timeAliveSeconds: number): number {
  return (
    getEndlessXpCycleMultiplier(timeAliveSeconds) *
    getEndlessXpMilestoneMultiplier(timeAliveSeconds)
  );
}

export function getSpawnIntervalMs(timeAlive: number): number {
  const t = Math.max(0, timeAlive);

  // 0→60s: 3000ms → 1000ms (linear)
  if (t < EARLY_INTERVAL_RAMP_SECONDS) {
    const u = t / EARLY_INTERVAL_RAMP_SECONDS;
    return (
      EARLY_SPAWN_INTERVAL_MS +
      (BASE_INTERVAL - EARLY_SPAWN_INTERVAL_MS) * u
    );
  }

  // Após 60s: pressão contínua (sem cliff). Cresce ~linear + leve aceleração.
  const minutesPastRamp = (t - EARLY_INTERVAL_RAMP_SECONDS) / 60;
  const cyclePressure =
    minutesPastRamp * 0.32 + minutesPastRamp * minutesPastRamp * 0.04;

  return Math.max(MIN_INTERVAL, BASE_INTERVAL / (1 + cyclePressure));
}

/**
 * Quantidade de inimigos comuns por tick.
 * 0–45s: sempre 1 · depois: +1 a cada ~90s (curva contínua, sem salto).
 */
export function getSpawnAmount(timeAlive: number): number {
  const t = Math.max(0, timeAlive);
  if (t < EARLY_BATCH_LOCK_SECONDS) return 1;

  const extra = Math.floor((t - EARLY_BATCH_LOCK_SECONDS) / BATCH_GROWTH_SECONDS);
  return Math.min(MAX_SPAWN_BATCH, 1 + extra);
}

/** Reduz lote quando o campo já está lotado (alívio para o jogador). */
export function getCrowdedBatchAmount(
  baseAmount: number,
  currentEnemyCount: number,
): number {
  const density = currentEnemyCount / MAX_ENEMIES;
  if (density <= CROWD_SOFT_CAP_RATIO) {
    return Math.max(1, baseAmount);
  }
  const over = (density - CROWD_SOFT_CAP_RATIO) / (1 - CROWD_SOFT_CAP_RATIO);
  const mul = Math.max(0.25, 1 - over * 0.85);
  return Math.max(1, Math.round(baseAmount * mul));
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
  /**
   * Cooldown restante (ms) até o próximo boss agendado no Endless.
   * Reinicia a cada spawn com getEndlessBossIntervalSeconds(timeAlive).
   */
  endlessBossCooldownMs?: number;
  /**
   * Fila de chefes agendados no Endless quando já há MAX_ALIVE_BOSSES vivos.
   * Drena assim que um chefe morre (aliveBossCount cai).
   */
  endlessBossQueue?: QueuedEndlessBoss[];
  spawnAccumulatorMs: number;
  dt: number;
  difficulty?: DifficultySpawnMultipliers;
  /** Catálogo do Neon / fallback. */
  enemyTypes?: EnemyTypeConfig[];
  /** Campanha: cota finita + chefe por progresso da cota. */
  stageCampaign?: {
    enemyTierCap: number;
    enemyCount: number;
    commonsSpawned: number;
    /** 0–1: progresso da cota para spawn do chefe. */
    bossSpawnProgress: number;
    difficultyMul: number;
    /** Multiplicador só do chefe (early nerf). */
    bossStatMul: number;
    stageNumber: number;
    /** Escala de ritmo de spawn (maior = mais rápido). */
    spawnPaceMul?: number;
  } | null;
};

export type SpawnerResult = {
  spawned: EnemyData[];
  spawnAccumulatorMs: number;
  spawnIntervalMs: number;
  bossesSpawned: number;
  invasionBossCooldownMs: number;
  endlessBossCooldownMs: number;
  /** Fila restante de chefes agendados (Endless). */
  endlessBossQueue: QueuedEndlessBoss[];
  /** True se um boss surgiu via invasão na horda (não o agendado). */
  hordeBossInvaded: boolean;
  /** Comuns spawnados neste tick (campanha). */
  commonsSpawnedDelta: number;
};

/** Intervalo mínimo entre invasões de boss na horda (ms). */
export const HORDE_BOSS_INVASION_COOLDOWN_MS = 45_000;
/** Máximo de bosses vivos no Endless (agenda + invasão + fila). */
export const MAX_ALIVE_BOSSES = 3;

/** Chefe agendado aguardando slot livre (máx. 3 ativos). */
export type QueuedEndlessBoss = {
  /** Índice em `pickBossConfig` / contagem de bossesSpawned no enqueue. */
  bossIndex: number;
};
/** Tempo mínimo de partida antes de invasões (s). */
export const HORDE_BOSS_INVASION_UNLOCK_SECONDS = 90;

/**
 * Intervalo até o próximo boss agendado no Endless.
 * Começa em BOSS_INTERVAL_SECONDS e cai linearmente com o tempo vivo
 * até BOSS_INTERVAL_MIN_SECONDS (aplicado a cada novo spawn).
 */
export function getEndlessBossIntervalSeconds(
  timeAliveSeconds: number,
): number {
  const t = Math.max(0, timeAliveSeconds);
  const ramp = Math.max(1, BOSS_INTERVAL_RAMP_SECONDS);
  const progress = Math.min(1, t / ramp);
  const interval =
    BOSS_INTERVAL_SECONDS +
    (BOSS_INTERVAL_MIN_SECONDS - BOSS_INTERVAL_SECONDS) * progress;
  return Math.max(BOSS_INTERVAL_MIN_SECONDS, interval);
}

/** Cooldown inicial do primeiro boss agendado (ms). */
export function getInitialEndlessBossCooldownMs(): number {
  return BOSS_INTERVAL_SECONDS * 1000;
}

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
  enemyTierCap?: number,
): EnemyTypeConfig[] {
  const sorted = [...commonTypes(types)].sort(
    (a, b) => a.unlockTime - b.unlockTime || a.id - b.id,
  );
  const tierPool =
    enemyTierCap != null && enemyTierCap > 0
      ? sorted.slice(0, Math.max(1, Math.floor(enemyTierCap)))
      : sorted;

  const unlocked = tierPool.filter((e) => timeAliveSeconds >= e.unlockTime);

  // Primeiros 45s: só Zumbi Fraco e Rato Corredor (respiração inicial)
  if (timeAliveSeconds < EARLY_BATCH_LOCK_SECONDS) {
    const early = unlocked.filter((e) => EARLY_GAME_ENEMY_NAMES.has(e.name));
    if (early.length > 0) return early;
    // Fallback: unlockTime 0 e não-ranged
    const soft = unlocked.filter(
      (e) => e.unlockTime <= 0 && e.kind !== "ranged",
    );
    if (soft.length > 0) return soft;
  }

  return unlocked.length > 0 ? unlocked : tierPool.slice(0, 1);
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

  // HP: floor(hp_base × difficulty.hp × powerMul)
  // Ex. Infernal: 40 × 2.5 × 1 = 100 (antes do prestige/overflow)
  const scaledHp = Math.floor(config.hpBase * hpMul * powerMul);

  // Dano: damage × difficulty.damage × powerMul (proporcional ao HP)
  const scaledDamage = config.damage * dmgMul * powerMul * overflowDmg;

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

  const prestigeLevel = Math.max(
    0,
    useGameStore.getState().prestigeLevel ?? 0,
  );
  const prestigeHpMul = Math.pow(1.4, prestigeLevel);
  const prestigeDmgMul = Math.pow(1.25, prestigeLevel);
  const prestigeSpdMul = Math.pow(1.15, prestigeLevel);
  // Hexágonos+ (prestige ≥ 3): blindagem extra
  const armorMul = prestigeLevel >= 3 ? 1.12 : 1;
  // Triângulos (prestige ≥ 2): mais agressivos / rápidos
  const aggressionMul = prestigeLevel >= 2 ? 1.1 : 1;

  return {
    hp: Math.max(1, Math.floor(scaledHp * overflowHp * prestigeHpMul * armorMul)),
    speed: speedPx * prestigeSpdMul * aggressionMul,
    damage: Number(
      Math.max(0.4, damage * prestigeDmgMul).toFixed(2),
    ),
    attackCooldown: config.attackSpeed,
    radius: Math.max(6, Math.round(ENEMY_BASE_RADIUS * visualScale)),
    color: config.color,
    type: (config.kind === "boss" ? "boss" : config.kind) as EnemyType,
    projectileDamage:
      config.kind === "ranged"
        ? Number(Math.max(0.4, damage * prestigeDmgMul).toFixed(2))
        : 0,
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
  const baseRewards = rewardsFromConfig(config);
  const prestigeLevel = Math.max(
    0,
    useGameStore.getState().prestigeLevel ?? 0,
  );
  const goldScale = Math.pow(1.3, prestigeLevel);
  const rewards = {
    ...baseRewards,
    // XP in-run não escala com prestígio — senão cada kill vira um level.
    xpReward: Math.max(1, Math.round(baseRewards.xpReward)),
    goldReward: Number((baseRewards.goldReward * goldScale).toFixed(2)),
  };
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
 * Spawner: comuns por unlock_time; bosses agendados (intervalo decrescente) + invasões.
 * Em campanha: cota finita de comuns + 1 chefe; para quando a cota acaba.
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

  const stage = input.stageCampaign ?? null;
  const types = catalog(input.enemyTypes);
  const bosses = bossTypes(types);

  const timeAliveInSeconds =
    timeAlive > 10_000 ? timeAlive / 1000 : timeAlive;

  // Em fase: libera o pool do tier inteiro (sem trava dos primeiros 45s).
  const unlockTimeForPool = stage ? 1e9 : timeAliveInSeconds;
  const availableTypes = availableCommonTypes(
    types,
    unlockTimeForPool,
    stage?.enemyTierCap,
  );
  const aliveBossCount =
    input.aliveBossCount ?? (hasBossAlive ? 1 : 0);

  let bossesSpawned = input.bossesSpawned;
  let invasionBossCooldownMs = Math.max(
    0,
    (input.invasionBossCooldownMs ?? 0) - dt * 1000,
  );
  let endlessBossCooldownMs = Math.max(
    0,
    (input.endlessBossCooldownMs ?? getInitialEndlessBossCooldownMs()) -
      dt * 1000,
  );
  let endlessBossQueue: QueuedEndlessBoss[] = [
    ...(input.endlessBossQueue ?? []),
  ];
  let spawnAccumulatorMs = input.spawnAccumulatorMs + dt * 1000;
  const paceMul = Math.max(1, stage?.spawnPaceMul ?? 1);
  const spawned: EnemyData[] = [];
  let count = currentEnemyCount;
  let bossesAlive = aliveBossCount;
  let hordeBossInvaded = false;
  let commonsSpawnedDelta = 0;
  let commonsSpawned = stage?.commonsSpawned ?? 0;

  const crowdDensity = count / MAX_ENEMIES;
  const crowdIntervalMul =
    crowdDensity > CROWD_SOFT_CAP_RATIO
      ? 1 + (crowdDensity - CROWD_SOFT_CAP_RATIO) * 1.5
      : 1;
  const spawnIntervalMs = Math.max(
    280,
    Math.floor(
      (getSpawnIntervalMs(timeAliveInSeconds) * crowdIntervalMul) / paceMul,
    ),
  );

  const stageDiffMul = stage?.difficultyMul ?? 1;
  const mergedDifficulty: DifficultySpawnMultipliers | undefined = difficulty
    ? {
        enemyHpMultiplier:
          (difficulty.enemyHpMultiplier ?? 1) * stageDiffMul,
        enemyDamageMultiplier:
          (difficulty.enemyDamageMultiplier ?? 1) * stageDiffMul,
        enemySpeedMultiplier:
          (difficulty.enemySpeedMultiplier ?? 1) *
          Math.sqrt(Math.max(1, stageDiffMul)),
      }
    : stage
      ? {
          enemyHpMultiplier: stageDiffMul,
          enemyDamageMultiplier: stageDiffMul,
          enemySpeedMultiplier: Math.sqrt(Math.max(1, stageDiffMul)),
        }
      : undefined;

  if (stage) {
    const quota = Math.max(1, Math.floor(stage.enemyCount));
    const progress =
      quota > 0 ? Math.min(1, commonsSpawned / quota) : 1;
    const bossThreshold = Math.min(
      1,
      Math.max(0.05, stage.bossSpawnProgress),
    );

    // Chefe: após atingir a fração da cota (toda fase tem chefe)
    if (
      bossesSpawned < 1 &&
      progress >= bossThreshold &&
      count < MAX_ENEMIES &&
      bosses.length > 0
    ) {
      const stageBossIndex = getStageBossIndex(
        stage.stageNumber,
        bosses.length,
      );
      const { config, overflow } = pickBossConfig(bosses, stageBossIndex);
      const bossMul = Math.max(0.2, stage.bossStatMul ?? 1);
      const bossDifficulty: DifficultySpawnMultipliers = {
        enemyHpMultiplier:
          (mergedDifficulty?.enemyHpMultiplier ?? 1) * bossMul,
        enemyDamageMultiplier:
          (mergedDifficulty?.enemyDamageMultiplier ?? 1) * bossMul,
        enemySpeedMultiplier:
          (mergedDifficulty?.enemySpeedMultiplier ?? 1) *
          Math.sqrt(bossMul),
      };
      spawned.push(
        spawnFromConfig(
          canvasWidth,
          canvasHeight,
          config,
          timeAliveInSeconds,
          matchLevel,
          bossDifficulty,
          overflow,
        ),
      );
      bossesSpawned = 1;
      bossesAlive += 1;
      count += 1;
    }

    // Comuns até a cota; ritmo sobe com a fase
    const remainingQuota = Math.max(0, quota - commonsSpawned);
    let spawnEvents = 0;
    while (
      remainingQuota - commonsSpawnedDelta > 0 &&
      spawnAccumulatorMs >= spawnIntervalMs &&
      count < MAX_ENEMIES &&
      spawnEvents < MAX_SPAWN_EVENTS_PER_TICK
    ) {
      spawnEvents += 1;
      spawnAccumulatorMs -= spawnIntervalMs;
      const batchCap = Math.min(
        remainingQuota - commonsSpawnedDelta,
        Math.max(
          1,
          Math.ceil(
            getCrowdedBatchAmount(
              getSpawnAmount(timeAliveInSeconds),
              count,
            ) * paceMul,
          ),
        ),
      );
      for (let i = 0; i < batchCap && count < MAX_ENEMIES; i++) {
        const config = rollCommonConfig(availableTypes);
        spawned.push(
          spawnFromConfig(
            canvasWidth,
            canvasHeight,
            config,
            timeAliveInSeconds,
            matchLevel,
            mergedDifficulty,
          ),
        );
        count += 1;
        commonsSpawnedDelta += 1;
      }
    }

    if (commonsSpawned + commonsSpawnedDelta >= quota) {
      spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
    }
  } else {
    const spawnEndlessBoss = (bossIndex: number) => {
      const { config, overflow } = pickBossConfig(bosses, bossIndex);
      spawned.push(
        spawnFromConfig(
          canvasWidth,
          canvasHeight,
          config,
          timeAliveInSeconds,
          matchLevel,
          mergedDifficulty,
          overflow,
        ),
      );
      bossesAlive += 1;
      count += 1;
    };

    // Libera slots da fila quando um chefe morre (aliveBossCount cai).
    while (
      endlessBossQueue.length > 0 &&
      bossesAlive < MAX_ALIVE_BOSSES &&
      count < MAX_ENEMIES &&
      bosses.length > 0
    ) {
      const next = endlessBossQueue.shift()!;
      spawnEndlessBoss(next.bossIndex);
      invasionBossCooldownMs = HORDE_BOSS_INVASION_COOLDOWN_MS;
    }

    // Boss agendado: timer próprio; se já há 3 vivos, entra na fila.
    if (endlessBossCooldownMs <= 0 && bosses.length > 0) {
      const bossIndex = bossesSpawned;
      bossesSpawned += 1;
      endlessBossCooldownMs =
        getEndlessBossIntervalSeconds(timeAliveInSeconds) * 1000;
      invasionBossCooldownMs = HORDE_BOSS_INVASION_COOLDOWN_MS;

      if (bossesAlive < MAX_ALIVE_BOSSES && count < MAX_ENEMIES) {
        spawnEndlessBoss(bossIndex);
      } else {
        endlessBossQueue.push({ bossIndex });
      }
    }

    let spawnEvents = 0;
    while (
      spawnAccumulatorMs >= spawnIntervalMs &&
      count < MAX_ENEMIES &&
      spawnEvents < MAX_SPAWN_EVENTS_PER_TICK
    ) {
      spawnEvents += 1;
      spawnAccumulatorMs -= spawnIntervalMs;
      const batchAmount = getCrowdedBatchAmount(
        getSpawnAmount(timeAliveInSeconds),
        count,
      );

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
            mergedDifficulty,
            overflow,
          ),
        );
        count += 1;
        bossesAlive += 1;
        invasionBossCooldownMs = HORDE_BOSS_INVASION_COOLDOWN_MS;
        hordeBossInvaded = true;
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
            mergedDifficulty,
          ),
        );
        count += 1;
      }
    }

    if (count >= MAX_ENEMIES) {
      spawnAccumulatorMs = Math.min(spawnAccumulatorMs, spawnIntervalMs);
    }
  }

  return {
    spawned,
    spawnAccumulatorMs,
    spawnIntervalMs,
    bossesSpawned,
    invasionBossCooldownMs,
    endlessBossCooldownMs,
    endlessBossQueue,
    hordeBossInvaded,
    commonsSpawnedDelta,
  };
}
