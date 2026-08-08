/** Campanha de 50 fases + desbloqueio do Endless (após fase 15). */

export const TOTAL_STAGES = 50;
/** Endless libera ao limpar esta fase (inclusive). */
export const ENDLESS_UNLOCK_STAGE = 15;

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

const STAGE_NAMES: string[] = [
  "Bairro Industrial",
  "Becos do Porto",
  "Arena Subterrânea",
  "Ginásio Abandonado",
  "Mercado Noturno",
  "Doca dos Mercenários",
  "Túneis do Metrô",
  "Favela dos Anéis",
  "Estádio Ruído",
  "Pátio da Sucata",
  "Templo Queimado",
  "Laboratório Ciborgue",
  "Cemitério Úmido",
  "Arena de Ferro",
  "Catedral Rachada",
  "Deserto dos Ossos",
  "Mina de Magma",
  "Palácio Congelado",
  "Coliseu Digital",
  "Pântano Tóxico",
  "Torre dos Ventos",
  "Cripta Neon",
  "Fortaleza de Aço",
  "Vale dos Espectros",
  "Ringue Flutuante",
  "Usina Abandonada",
  "Jardim Corrompido",
  "Catacumbas Vivas",
  "Hangar Orbital",
  "Pico do Titã",
  "Bairro Fantasma",
  "Arena de Cristal",
  "Fenda Temporal",
  "Covil do Xamã",
  "Estaleiro Fantasma",
  "Basílica de Sangue",
  "Núcleo Cibernético",
  "Campo de Cinzas",
  "Salão dos Guardiões",
  "Abismo de Magma",
  "Cidade Submersa",
  "Trono de Ossos",
  "Observatório Caído",
  "Labirinto de Espelhos",
  "Front de Guerra",
  "Santuário Proibido",
  "Cúpula do Vácuo",
  "Coração da Forja",
  "Portal do Caos",
  "Ascensão Final",
];

function buildStage(n: number): StageDef {
  // Cota cresce de forma clara: fase 1 ≈ 14, fase 15 ≈ 70, fase 50 ≈ 210
  const enemyCount = 10 + n * 4;
  const enemyTierCap = Math.min(23, 2 + Math.floor((n - 1) * 0.45));
  // Todas as fases têm chefe (surge após ~65% da cota)
  const bossSpawnProgress = 0.65;
  // Dificuldade sobe ~9% por fase (fase 15 ≈ 2.26×, fase 50 ≈ 5.4×)
  const difficultyMul = 1 + (n - 1) * 0.09;
  // Chefe early bem mais fraco: fase 1 ≈ 0.38×, fase 10 ≈ 0.83×, fase 15+ ≈ 1×
  const bossStatMul = Math.min(1, 0.38 + (n - 1) * 0.05);
  // Estimativa de tempo só para UI (não define vitória)
  const durationSeconds = Math.max(
    40,
    Math.round(enemyCount * (1.8 - Math.min(0.6, n * 0.008))),
  );

  return {
    stageNumber: n,
    name: STAGE_NAMES[n - 1] ?? `Fase ${n}`,
    durationSeconds,
    enemyCount,
    enemyTierCap,
    bossSpawnProgress,
    difficultyMul,
    bossStatMul,
  };
}

export const STAGE_DEFS: StageDef[] = Array.from({ length: TOTAL_STAGES }, (_, i) =>
  buildStage(i + 1),
);

export function getStageDef(stageNumber: number): StageDef {
  const n = Math.max(1, Math.min(TOTAL_STAGES, Math.floor(stageNumber)));
  return STAGE_DEFS[n - 1] ?? buildStage(n);
}

export function isEndlessUnlocked(maxStageCleared: number): boolean {
  return maxStageCleared >= ENDLESS_UNLOCK_STAGE;
}

/** Fases jogáveis: 1 .. min(50, maxCleared+1). */
export function getMaxSelectableStage(maxStageCleared: number): number {
  return Math.min(TOTAL_STAGES, Math.max(1, Math.floor(maxStageCleared) + 1));
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
