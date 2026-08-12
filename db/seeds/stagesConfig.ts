/** 50 fases da campanha — valores atuais de `lib/stages.ts`. */

export type StageConfigSeed = {
  stageNumber: number;
  name: string;
  durationSeconds: number;
  enemyCount: number;
  enemyTierCap: number;
  bossSpawnProgress: number;
  difficultyMul: number;
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

export const TOTAL_STAGES_SEED = 50;
export const ENDLESS_UNLOCK_STAGE_SEED = 15;

function buildStageSeed(n: number): StageConfigSeed {
  const enemyCount = 10 + n * 4;
  const enemyTierCap = Math.min(23, 2 + Math.floor((n - 1) * 0.45));
  const bossSpawnProgress = 0.65;
  const difficultyMul = 1 + (n - 1) * 0.09;
  const bossStatMul = Math.min(1, 0.38 + (n - 1) * 0.05);
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

export const STAGES_CONFIG_SEEDS: StageConfigSeed[] = Array.from(
  { length: TOTAL_STAGES_SEED },
  (_, i) => buildStageSeed(i + 1),
);
