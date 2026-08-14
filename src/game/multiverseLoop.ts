/** Rotação cíclica de dimensões (Multiverse Loop / Dimensional Rift). */

import type { RunMode } from "@/lib/stages";
import {
  getDefaultDimensionForPrestige,
  MULTIVERSE_DIMENSION_CYCLE,
  type DimensionId,
} from "@/src/game/prestigeVisual";

/** Endless: nova dimensão a cada 5 minutos. */
export const MULTIVERSE_ENDLESS_CYCLE_MS = 5 * 60 * 1000;

/** Campanha avançada: nova dimensão a cada N fases. */
export const MULTIVERSE_STAGE_CYCLE_INTERVAL = 5;

/** Fase mínima da campanha para ativar o loop por progresso de fase. */
export const MULTIVERSE_STAGE_ANCHOR = 30;

/** Prestígio mínimo para ativar o loop independente da fase. */
export const MULTIVERSE_PRESTIGE_ANCHOR = 3;

/** Duração do flash de Fenda Dimensional (ms). */
export const MULTIVERSE_RIFT_FLASH_MS = 900;

export type MultiverseRunContext = {
  runMode: RunMode;
  timeAliveMs: number;
  runStageNumber: number;
  prestigeLevel: number;
};

/** Endless ou campanha avançada (Prestígio 3+ ou Fase 30+). */
export function isMultiverseLoopActive(ctx: MultiverseRunContext): boolean {
  if (ctx.runMode === "endless") return true;
  return (
    ctx.prestigeLevel >= MULTIVERSE_PRESTIGE_ANCHOR ||
    ctx.runStageNumber >= MULTIVERSE_STAGE_ANCHOR
  );
}

/** Índice do slot no ciclo (0, 1, 2…). */
export function getMultiverseCycleSlot(ctx: MultiverseRunContext): number {
  if (ctx.runMode === "endless") {
    return Math.floor(
      Math.max(0, ctx.timeAliveMs) / MULTIVERSE_ENDLESS_CYCLE_MS,
    );
  }

  const stage = Math.max(1, Math.floor(ctx.runStageNumber));
  if (stage >= MULTIVERSE_STAGE_ANCHOR) {
    return Math.floor((stage - MULTIVERSE_STAGE_ANCHOR) / MULTIVERSE_STAGE_CYCLE_INTERVAL);
  }

  // Prestígio 3+ antes da fase 30: ciclo a cada 5 fases desde o início da run
  return Math.floor((stage - 1) / MULTIVERSE_STAGE_CYCLE_INTERVAL);
}

/** Dimensão visual ativa nesta run. */
export function resolveVisualDimension(ctx: MultiverseRunContext): DimensionId {
  if (!isMultiverseLoopActive(ctx)) {
    return getDefaultDimensionForPrestige(ctx.prestigeLevel);
  }
  const slot = getMultiverseCycleSlot(ctx);
  const len = MULTIVERSE_DIMENSION_CYCLE.length;
  return MULTIVERSE_DIMENSION_CYCLE[((slot % len) + len) % len]!;
}

export function getDimensionDisplayName(id: DimensionId): string {
  const names: Record<DimensionId, string> = {
    0: "Rua",
    1: "Industrial",
    2: "Cibernético",
    3: "Infernal",
    4: "Glacial",
    5: "Vulcânico",
    6: "Ciber-Abissal",
    7: "Cósmico",
    8: "Rua Neon",
    9: "Fundição",
    10: "Synthwave",
    11: "Inferno Ácido",
    12: "Aurora",
    13: "Magma Cobalto",
    14: "Matrix Rubra",
    15: "Nebulosa Solar",
  };
  return names[id];
}

/** Progresso 0–1 dentro do slot atual (para HUD). */
export function getMultiverseCycleProgress(ctx: MultiverseRunContext): number {
  if (!isMultiverseLoopActive(ctx)) return 0;
  if (ctx.runMode === "endless") {
    const elapsed = Math.max(0, ctx.timeAliveMs) % MULTIVERSE_ENDLESS_CYCLE_MS;
    return elapsed / MULTIVERSE_ENDLESS_CYCLE_MS;
  }
  const stage = Math.max(1, Math.floor(ctx.runStageNumber));
  const anchor =
    stage >= MULTIVERSE_STAGE_ANCHOR ? MULTIVERSE_STAGE_ANCHOR : 1;
  const offset = stage - anchor;
  const within = ((offset % MULTIVERSE_STAGE_CYCLE_INTERVAL) + MULTIVERSE_STAGE_CYCLE_INTERVAL) %
    MULTIVERSE_STAGE_CYCLE_INTERVAL;
  return within / MULTIVERSE_STAGE_CYCLE_INTERVAL;
}
