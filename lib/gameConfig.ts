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

/** Comportamento de IA / combate derivado do nome + isBoss. */
export type EnemyBehaviorKind = "normal" | "dasher" | "ranged" | "boss";

/** Recompensas por kill (espelham colunas de `enemy_types`). */
export type EnemyRewards = {
  xpReward: number;
  goldReward: number;
  normalDiamondChance: number;
  purpleDiamondChance: number;
};

/** Tipo de inimigo carregado de `enemy_types`. */
export type EnemyTypeConfig = {
  id: number;
  name: string;
  isBoss: boolean;
  hpBase: number;
  /** Unidade de design; spawner × ENEMY_SPEED_UNIT → px/s. */
  speed: number;
  damage: number;
  attackSpeed: number;
  color: string;
  scale: number;
  /** Segundos de partida para entrar na pool de spawn. */
  unlockTime: number;
  xpReward: number;
  goldReward: number;
  normalDiamondChance: number;
  purpleDiamondChance: number;
  kind: EnemyBehaviorKind;
};

/** Converte speed do DB para px/s (Normal 2 → 55). */
export const ENEMY_SPEED_UNIT = 27.5;
/** Raio base × scale do tipo. */
export const ENEMY_BASE_RADIUS = 12;

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

export function resolveEnemyBehaviorKind(
  name: string,
  isBoss: boolean,
): EnemyBehaviorKind {
  if (isBoss) return "boss";
  const n = name.toLowerCase();
  if (n.includes("dasher")) return "dasher";
  if (n.includes("ranged")) return "ranged";
  return "normal";
}

export const FALLBACK_ENEMY_TYPES: EnemyTypeConfig[] = [
  {
    id: 1,
    name: "Zumbi Fraco",
    isBoss: false,
    hpBase: 25,
    speed: 1.8,
    damage: 1,
    attackSpeed: 1000,
    color: "#6b8f3a",
    scale: 1,
    unlockTime: 0,
    xpReward: 5,
    goldReward: 1,
    normalDiamondChance: 0.02,
    purpleDiamondChance: 0,
    kind: "normal",
  },
  {
    id: 2,
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
    kind: "normal",
  },
  {
    id: 3,
    name: "Esqueleto Guerreiro",
    isBoss: false,
    hpBase: 60,
    speed: 2,
    damage: 1.5,
    attackSpeed: 1000,
    color: "#d4d4d8",
    scale: 1.1,
    unlockTime: 90,
    xpReward: 15,
    goldReward: 3,
    normalDiamondChance: 0.05,
    purpleDiamondChance: 0,
    kind: "normal",
  },
  {
    id: 4,
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
    kind: "ranged",
  },
  {
    id: 5,
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
    kind: "normal",
  },
  {
    id: 6,
    name: "Assassino Fantasma (Dasher)",
    isBoss: false,
    hpBase: 90,
    speed: 4,
    damage: 2,
    attackSpeed: 700,
    color: "#a855f7",
    scale: 0.8,
    unlockTime: 360,
    xpReward: 50,
    goldReward: 12,
    normalDiamondChance: 0.12,
    purpleDiamondChance: 0.004,
    kind: "dasher",
  },
  {
    id: 7,
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
    kind: "normal",
  },
  {
    id: 8,
    name: "Senhor da Guerra (Elite)",
    isBoss: false,
    hpBase: 700,
    speed: 2.2,
    damage: 5,
    attackSpeed: 900,
    color: "#b91c1c",
    scale: 2.2,
    unlockTime: 540,
    xpReward: 150,
    goldReward: 35,
    normalDiamondChance: 0.2,
    purpleDiamondChance: 0.015,
    kind: "normal",
  },
  {
    id: 9,
    name: "Boss 1 (O Titã)",
    isBoss: true,
    hpBase: 1000,
    speed: 0.8,
    damage: 3,
    attackSpeed: 1500,
    color: "#5b21b6",
    scale: 2.5,
    unlockTime: 0,
    xpReward: 200,
    goldReward: 50,
    normalDiamondChance: 0.5,
    purpleDiamondChance: 0,
    kind: "boss",
  },
  {
    id: 10,
    name: "Boss 2 (O Ceifador)",
    isBoss: true,
    hpBase: 3500,
    speed: 1.1,
    damage: 5,
    attackSpeed: 1000,
    color: "#a16207",
    scale: 3,
    unlockTime: 0,
    xpReward: 500,
    goldReward: 100,
    normalDiamondChance: 1,
    purpleDiamondChance: 0,
    kind: "boss",
  },
];

export function mapEnemyTypeRow(row: {
  id: number;
  name: string;
  isBoss: boolean;
  hpBase: number;
  speed: number;
  damage: number;
  attackSpeed: number;
  color: string;
  scale: number;
  unlockTime?: number | null;
  xpReward?: number | null;
  goldReward?: number | null;
  normalDiamondChance?: number | null;
  purpleDiamondChance?: number | null;
}): EnemyTypeConfig {
  return {
    id: row.id,
    name: row.name,
    isBoss: row.isBoss,
    hpBase: row.hpBase,
    speed: row.speed,
    damage: row.damage,
    attackSpeed: row.attackSpeed,
    color: row.color,
    scale: row.scale,
    unlockTime: row.unlockTime ?? 0,
    xpReward: row.xpReward ?? 5,
    goldReward: row.goldReward ?? 1,
    normalDiamondChance: row.normalDiamondChance ?? 0.02,
    purpleDiamondChance: row.purpleDiamondChance ?? 0,
    kind: resolveEnemyBehaviorKind(row.name, row.isBoss),
  };
}

export function rewardsFromConfig(config: EnemyTypeConfig): EnemyRewards {
  return {
    xpReward: config.xpReward,
    goldReward: config.goldReward,
    normalDiamondChance: config.normalDiamondChance,
    purpleDiamondChance: config.purpleDiamondChance,
  };
}
