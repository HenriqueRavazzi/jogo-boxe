/** Tipos e defaults de configuração / dificuldade (espelham o Neon). */

export type GameBaseSettings = {
  baseAttackSpeed: number;
  baseDamage: number;
  baseHp: number;
  baseRange: number;
};

export type DifficultyConfig = {
  id: number;
  name: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  goldDropMultiplier: number;
};

export type DifficultyMultipliers = {
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  goldDropMultiplier: number;
};

/** Fallback local se o Neon estiver offline. */
export const FALLBACK_GAME_SETTINGS: GameBaseSettings = {
  baseAttackSpeed: 1500,
  baseDamage: 10,
  baseHp: 100,
  baseRange: 100,
};

export const FALLBACK_DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 1,
    name: "Fácil",
    enemyHpMultiplier: 0.8,
    enemyDamageMultiplier: 0.8,
    enemySpeedMultiplier: 0.8,
    goldDropMultiplier: 0.8,
  },
  {
    id: 2,
    name: "Médio",
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemySpeedMultiplier: 1,
    goldDropMultiplier: 1,
  },
  {
    id: 3,
    name: "Difícil",
    enemyHpMultiplier: 1.5,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.5,
    goldDropMultiplier: 1.5,
  },
  {
    id: 4,
    name: "Infernal",
    enemyHpMultiplier: 3,
    enemyDamageMultiplier: 3,
    enemySpeedMultiplier: 3,
    goldDropMultiplier: 3,
  },
];

export const NEUTRAL_DIFFICULTY: DifficultyMultipliers = {
  enemyHpMultiplier: 1,
  enemyDamageMultiplier: 1,
  enemySpeedMultiplier: 1,
  goldDropMultiplier: 1,
};
