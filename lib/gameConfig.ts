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

/**
 * Escala de HP/dano por dificuldade (Easy/Medium/Hard/Insane).
 * Aplicada no spawn: floor(hpBase × hp) e damage × dmg.
 */
export const DIFFICULTY_STAT_SCALE: Record<
  string,
  { hp: number; damage: number }
> = {
  Easy: { hp: 1.0, damage: 1.0 },
  Medium: { hp: 1.3, damage: 1.2 },
  Hard: { hp: 1.8, damage: 1.5 },
  Insane: { hp: 2.5, damage: 2.0 },
  Fácil: { hp: 1.0, damage: 1.0 },
  Médio: { hp: 1.3, damage: 1.2 },
  Difícil: { hp: 1.8, damage: 1.5 },
  Infernal: { hp: 2.5, damage: 2.0 },
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
    enemyHpMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    goldDropMultiplier: 1.0,
  },
  {
    id: 2,
    name: "Médio",
    enemyHpMultiplier: 1.3,
    enemyDamageMultiplier: 1.2,
    enemySpeedMultiplier: 1.1,
    goldDropMultiplier: 1.35,
  },
  {
    id: 3,
    name: "Difícil",
    enemyHpMultiplier: 1.8,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.25,
    goldDropMultiplier: 1.55,
  },
  {
    id: 4,
    name: "Infernal",
    enemyHpMultiplier: 2.5,
    enemyDamageMultiplier: 2.0,
    enemySpeedMultiplier: 1.4,
    goldDropMultiplier: 1.6,
  },
];

export const NEUTRAL_DIFFICULTY: DifficultyMultipliers = {
  enemyHpMultiplier: 1,
  enemyDamageMultiplier: 1,
  enemySpeedMultiplier: 1,
  goldDropMultiplier: 1,
};

/** Resolve multiplicadores a partir do nome da dificuldade selecionada. */
export function resolveDifficultyStatScale(
  name: string | null | undefined,
): { hp: number; damage: number } {
  if (!name) return { hp: 1, damage: 1 };
  return DIFFICULTY_STAT_SCALE[name] ?? { hp: 1, damage: 1 };
}

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
    hpBase: 40,
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
    hpBase: 25,
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
    hpBase: 90,
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
    hpBase: 60,
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
    hpBase: 250,
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
    id: 11,
    name: "Cão Raivoso",
    isBoss: false,
    hpBase: 35,
    speed: 4.6,
    damage: 1.2,
    attackSpeed: 650,
    color: "#a16207",
    scale: 0.75,
    unlockTime: 30,
    xpReward: 10,
    goldReward: 2,
    normalDiamondChance: 0.04,
    purpleDiamondChance: 0,
    kind: "normal",
  },
  {
    id: 12,
    name: "Lutador de Rua",
    isBoss: false,
    hpBase: 110,
    speed: 2.3,
    damage: 1.8,
    attackSpeed: 950,
    color: "#c2410c",
    scale: 1.15,
    unlockTime: 70,
    xpReward: 18,
    goldReward: 4,
    normalDiamondChance: 0.06,
    purpleDiamondChance: 0,
    kind: "normal",
  },
  {
    id: 13,
    name: "Mercenário Ágil (Dasher)",
    isBoss: false,
    hpBase: 95,
    speed: 4.2,
    damage: 2.2,
    attackSpeed: 720,
    color: "#0d9488",
    scale: 0.95,
    unlockTime: 130,
    xpReward: 28,
    goldReward: 6,
    normalDiamondChance: 0.08,
    purpleDiamondChance: 0.001,
    kind: "dasher",
  },
  {
    id: 14,
    name: "Gladiador Blindado",
    isBoss: false,
    hpBase: 320,
    speed: 1.2,
    damage: 2.8,
    attackSpeed: 1300,
    color: "#57534e",
    scale: 1.7,
    unlockTime: 210,
    xpReward: 40,
    goldReward: 9,
    normalDiamondChance: 0.1,
    purpleDiamondChance: 0.002,
    kind: "normal",
  },
  {
    id: 15,
    name: "Xamã Sombrio (Ranged)",
    isBoss: false,
    hpBase: 85,
    speed: 1.4,
    damage: 2.4,
    attackSpeed: 2200,
    color: "#6d28d9",
    scale: 1.0,
    unlockTime: 250,
    xpReward: 32,
    goldReward: 7,
    normalDiamondChance: 0.09,
    purpleDiamondChance: 0.002,
    kind: "ranged",
  },
  {
    id: 16,
    name: "Berserker Enlouquecido",
    isBoss: false,
    hpBase: 180,
    speed: 2.8,
    damage: 3.2,
    attackSpeed: 800,
    color: "#dc2626",
    scale: 1.25,
    unlockTime: 320,
    xpReward: 45,
    goldReward: 11,
    normalDiamondChance: 0.11,
    purpleDiamondChance: 0.003,
    kind: "normal",
  },
  {
    id: 17,
    name: "Assassino de Aluguel (Dasher)",
    isBoss: false,
    hpBase: 100,
    speed: 4.5,
    damage: 3.5,
    attackSpeed: 600,
    color: "#1e1b4b",
    scale: 0.85,
    unlockTime: 400,
    xpReward: 55,
    goldReward: 14,
    normalDiamondChance: 0.13,
    purpleDiamondChance: 0.005,
    kind: "dasher",
  },
  {
    id: 18,
    name: "Golias de Aço",
    isBoss: false,
    hpBase: 550,
    speed: 0.95,
    damage: 4.0,
    attackSpeed: 1400,
    color: "#71717a",
    scale: 2.1,
    unlockTime: 480,
    xpReward: 70,
    goldReward: 18,
    normalDiamondChance: 0.14,
    purpleDiamondChance: 0.006,
    kind: "normal",
  },
  {
    id: 19,
    name: "Monge Corrompido",
    isBoss: false,
    hpBase: 220,
    speed: 2.0,
    damage: 2.6,
    attackSpeed: 1000,
    color: "#86198f",
    scale: 1.2,
    unlockTime: 600,
    xpReward: 65,
    goldReward: 16,
    normalDiamondChance: 0.14,
    purpleDiamondChance: 0.007,
    kind: "normal",
  },
  {
    id: 20,
    name: "Necromancer (Ranged)",
    isBoss: false,
    hpBase: 160,
    speed: 1.3,
    damage: 2.9,
    attackSpeed: 2400,
    color: "#365314",
    scale: 1.1,
    unlockTime: 660,
    xpReward: 75,
    goldReward: 20,
    normalDiamondChance: 0.15,
    purpleDiamondChance: 0.008,
    kind: "ranged",
  },
  {
    id: 21,
    name: "Gigante de Pedra",
    isBoss: false,
    hpBase: 800,
    speed: 0.85,
    damage: 5.5,
    attackSpeed: 1600,
    color: "#78716c",
    scale: 2.4,
    unlockTime: 720,
    xpReward: 100,
    goldReward: 28,
    normalDiamondChance: 0.17,
    purpleDiamondChance: 0.01,
    kind: "normal",
  },
  {
    id: 22,
    name: "Espectro Etéreo (Dasher)",
    isBoss: false,
    hpBase: 140,
    speed: 3.8,
    damage: 3.0,
    attackSpeed: 750,
    color: "#67e8f9",
    scale: 0.9,
    unlockTime: 780,
    xpReward: 90,
    goldReward: 24,
    normalDiamondChance: 0.16,
    purpleDiamondChance: 0.009,
    kind: "dasher",
  },
  {
    id: 23,
    name: "Ciborgue de Combate",
    isBoss: false,
    hpBase: 280,
    speed: 2.6,
    damage: 4.2,
    attackSpeed: 550,
    color: "#0369a1",
    scale: 1.35,
    unlockTime: 840,
    xpReward: 110,
    goldReward: 30,
    normalDiamondChance: 0.18,
    purpleDiamondChance: 0.012,
    kind: "normal",
  },
  {
    id: 24,
    name: "Guardião do Templo",
    isBoss: false,
    hpBase: 450,
    speed: 1.7,
    damage: 6.0,
    attackSpeed: 1100,
    color: "#ca8a04",
    scale: 1.9,
    unlockTime: 900,
    xpReward: 130,
    goldReward: 36,
    normalDiamondChance: 0.2,
    purpleDiamondChance: 0.014,
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
  {
    id: 25,
    name: "Titã de Magma",
    isBoss: true,
    hpBase: 8000,
    speed: 1.0,
    damage: 7.5,
    attackSpeed: 900,
    color: "#ea580c",
    scale: 3.4,
    unlockTime: 0,
    xpReward: 900,
    goldReward: 180,
    normalDiamondChance: 1,
    purpleDiamondChance: 0.05,
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
