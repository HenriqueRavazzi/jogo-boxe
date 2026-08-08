/**
 * Catálogo seed de `enemy_types`: 8 comuns (unlock a cada 90s) + bosses.
 */

export type EnemyTypeSeedRow = {
  name: string;
  isBoss: boolean;
  hpBase: number;
  speed: number;
  damage: number;
  attackSpeed: number;
  color: string;
  scale: number;
  unlockTime: number;
  xpReward: number;
  goldReward: number;
  normalDiamondChance: number;
  purpleDiamondChance: number;
};

/** Nomes legados removidos ao reseedar (substituídos pelos 8 progressivos). */
export const OBSOLETE_ENEMY_TYPE_NAMES = ["Normal", "Dasher", "Ranged"] as const;

/** 8 inimigos comuns — progressão de dificuldade / recompensas a cada 90s. */
export const COMMON_ENEMY_TYPE_SEEDS: EnemyTypeSeedRow[] = [
  {
    name: "Zumbi Fraco",
    isBoss: false,
    hpBase: 25,
    speed: 1.8,
    damage: 1.0,
    attackSpeed: 1000,
    color: "#6b8f3a",
    scale: 1,
    unlockTime: 0,
    xpReward: 5,
    goldReward: 1,
    normalDiamondChance: 0.02,
    purpleDiamondChance: 0,
  },
  {
    name: "Rato Corredor",
    isBoss: false,
    hpBase: 15,
    speed: 3.2,
    damage: 0.8,
    attackSpeed: 800,
    color: "#8b7355",
    scale: 0.7,
    unlockTime: 0,
    xpReward: 8,
    goldReward: 1,
    normalDiamondChance: 0.03,
    purpleDiamondChance: 0,
  },
  {
    name: "Esqueleto Guerreiro",
    isBoss: false,
    hpBase: 60,
    speed: 2.0,
    damage: 1.5,
    attackSpeed: 1000,
    color: "#d4d4d8",
    scale: 1.1,
    unlockTime: 90,
    xpReward: 15,
    goldReward: 3,
    normalDiamondChance: 0.05,
    purpleDiamondChance: 0,
  },
  {
    name: "Arqueiro Sombrio (Ranged)",
    isBoss: false,
    hpBase: 40,
    speed: 1.5,
    damage: 1.8,
    attackSpeed: 2000,
    color: "#2dd4bf",
    scale: 0.92,
    unlockTime: 180,
    xpReward: 22,
    goldReward: 5,
    normalDiamondChance: 0.07,
    purpleDiamondChance: 0,
  },
  {
    name: "Brutamontes (Tank)",
    isBoss: false,
    hpBase: 180,
    speed: 1.1,
    damage: 2.5,
    attackSpeed: 1200,
    color: "#7c2d12",
    scale: 1.6,
    unlockTime: 270,
    xpReward: 35,
    goldReward: 8,
    normalDiamondChance: 0.1,
    purpleDiamondChance: 0.002,
  },
  {
    name: "Assassino Fantasma (Dasher)",
    isBoss: false,
    hpBase: 90,
    speed: 4.0,
    damage: 2.0,
    attackSpeed: 700,
    color: "#a855f7",
    scale: 0.8,
    unlockTime: 360,
    xpReward: 50,
    goldReward: 12,
    normalDiamondChance: 0.12,
    purpleDiamondChance: 0.004,
  },
  {
    name: "Cavaleiro Corrompido",
    isBoss: false,
    hpBase: 350,
    speed: 1.6,
    damage: 3.5,
    attackSpeed: 1100,
    color: "#44403c",
    scale: 1.8,
    unlockTime: 450,
    xpReward: 80,
    goldReward: 20,
    normalDiamondChance: 0.15,
    purpleDiamondChance: 0.008,
  },
  {
    name: "Senhor da Guerra (Elite)",
    isBoss: false,
    hpBase: 700,
    speed: 2.2,
    damage: 5.0,
    attackSpeed: 900,
    color: "#b91c1c",
    scale: 2.2,
    unlockTime: 540,
    xpReward: 150,
    goldReward: 35,
    normalDiamondChance: 0.2,
    purpleDiamondChance: 0.015,
  },
];

/** Bosses escalonados (a cada 240s no spawner). */
export const BOSS_ENEMY_TYPE_SEEDS: EnemyTypeSeedRow[] = [
  {
    name: "Boss 1 (O Titã)",
    isBoss: true,
    hpBase: 1000,
    speed: 0.8,
    damage: 3.0,
    attackSpeed: 1500,
    color: "#5b21b6",
    scale: 2.5,
    unlockTime: 0,
    xpReward: 200,
    goldReward: 50,
    normalDiamondChance: 0.5,
    purpleDiamondChance: 0,
  },
  {
    name: "Boss 2 (O Ceifador)",
    isBoss: true,
    hpBase: 3500,
    speed: 1.1,
    damage: 5.0,
    attackSpeed: 1000,
    color: "#a16207",
    scale: 3.0,
    unlockTime: 0,
    xpReward: 500,
    goldReward: 100,
    normalDiamondChance: 1,
    purpleDiamondChance: 0,
  },
];

export const ENEMY_TYPE_SEEDS: EnemyTypeSeedRow[] = [
  ...COMMON_ENEMY_TYPE_SEEDS,
  ...BOSS_ENEMY_TYPE_SEEDS,
];
