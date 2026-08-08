/** Campanha de 50 fases + desbloqueio do Endless (após fase 15). */

export const TOTAL_STAGES = 50;
/** Endless libera ao limpar esta fase (inclusive). */
export const ENDLESS_UNLOCK_STAGE = 15;

export type StageDef = {
  stageNumber: number;
  name: string;
  /** Tempo de sobrevivência para limpar a fase. */
  durationSeconds: number;
  /**
   * Quantos inimigos comuns (ordenados por unlockTime) podem spawnar.
   * Cresce ao longo da campanha.
   */
  enemyTierCap: number;
  /** Segundo em que o chefe da fase aparece; null = sem chefe obrigatório. */
  bossSpawnTime: number | null;
  /** Multiplicador leve de HP/dano dos inimigos nesta fase. */
  difficultyMul: number;
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
  const durationSeconds = 50 + n * 7;
  const enemyTierCap = Math.min(23, 2 + Math.floor((n - 1) * 0.42));
  const hasBoss = n >= 3;
  const bossSpawnTime = hasBoss
    ? Math.max(20, Math.floor(durationSeconds * 0.62))
    : null;
  const difficultyMul = 1 + (n - 1) * 0.045;

  return {
    stageNumber: n,
    name: STAGE_NAMES[n - 1] ?? `Fase ${n}`,
    durationSeconds,
    enemyTierCap,
    bossSpawnTime,
    difficultyMul,
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
