/** Campanha de 50 fases + desbloqueio do Endless (após fase 15). */

import { getStageConfigByNumber, getStagesConfig } from "@/lib/balanceConfig";
import {
  ENDLESS_UNLOCK_STAGE_SEED,
  STAGES_CONFIG_SEEDS,
  TOTAL_STAGES_SEED,
} from "@/db/seeds/stagesConfig";

export const TOTAL_STAGES = TOTAL_STAGES_SEED;
/** Endless libera ao limpar esta fase (inclusive). */
export const ENDLESS_UNLOCK_STAGE = ENDLESS_UNLOCK_STAGE_SEED;

export type StageDef = {
  stageNumber: number;
  name: string;
  /**
   * Estimativa de duração (s) só para UI / pacing do spawner.
   * A fase só termina ao eliminar todos os inimigos da cota.
   */
  durationSeconds: number;
  /** Quantidade de inimigos comuns a spawnar (cresce por fase). */
  enemyCount: number;
  /**
   * Quantos tipos comuns (ordenados por unlockTime) podem spawnar.
   * Cresce ao longo da campanha.
   */
  enemyTierCap: number;
  /**
   * Fração da cota de comuns (0–1) a partir da qual o chefe nasce.
   * Sempre definido — toda fase tem chefe.
   */
  bossSpawnProgress: number;
  /** Multiplicador de HP/dano/velocidade dos inimigos nesta fase. */
  difficultyMul: number;
  /**
   * Multiplicador extra só no chefe (early game mais fraco).
   * Comuns usam só `difficultyMul`.
   */
  bossStatMul: number;
};

export const STAGE_DEFS: StageDef[] = STAGES_CONFIG_SEEDS.map((row) => ({
  ...row,
}));

export function getStageDef(stageNumber: number): StageDef {
  const total = Math.max(1, getStagesConfig().length || TOTAL_STAGES);
  const n = Math.max(1, Math.min(total, Math.floor(stageNumber)));
  const fromConfig = getStageConfigByNumber(n);
  if (fromConfig) return fromConfig;
  return STAGE_DEFS[n - 1] ?? STAGE_DEFS[0]!;
}

export function isEndlessUnlocked(maxStageCleared: number): boolean {
  return maxStageCleared >= ENDLESS_UNLOCK_STAGE;
}

/** Fases jogáveis: 1 .. min(50, maxCleared+1). */
export function getMaxSelectableStage(maxStageCleared: number): number {
  const total = getStagesConfig().length || TOTAL_STAGES;
  return Math.min(total, Math.max(1, Math.floor(maxStageCleared) + 1));
}

export type RunMode = "stage" | "endless";

/** Recompensa bônus ao limpar uma fase pela 1ª vez. */
export function getStageClearRewards(stageNumber: number): {
  gold: number;
  gems: number;
} {
  const n = Math.max(1, Math.floor(stageNumber));
  return {
    gold: 80 + n * 35,
    gems: 2 + Math.floor(n / 3),
  };
}

/** Total de inimigos da fase (comuns + chefe). */
export function getStageTotalEnemies(stage: StageDef): number {
  return stage.enemyCount + 1;
}

/**
 * Índice do chefe da fase (0 = mais fraco).
 * Fases 1–12: Boss 1 · 13–28: Boss 2 · 29+: Titã de Magma.
 */
export function getStageBossIndex(
  stageNumber: number,
  bossCatalogSize: number,
): number {
  if (bossCatalogSize <= 1) return 0;
  const n = Math.max(1, Math.floor(stageNumber));
  if (n >= 29) return Math.min(2, bossCatalogSize - 1);
  if (n >= 13) return Math.min(1, bossCatalogSize - 1);
  return 0;
}
