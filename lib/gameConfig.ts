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
    name: "Normal",
    isBoss: false,
    hpBase: 30,
    speed: 2,
    damage: 1,
    attackSpeed: 1000,
    color: "#ff0000",
    scale: 1,
    kind: "normal",
  },
  {
    id: 2,
    name: "Dasher",
    isBoss: false,
    hpBase: 15,
    speed: 4,
    damage: 0.8,
    attackSpeed: 800,
    color: "#f97316",
    scale: 0.75,
    kind: "dasher",
  },
  {
    id: 3,
    name: "Ranged",
    isBoss: false,
    hpBase: 25,
    speed: 1.5,
    damage: 1.5,
    attackSpeed: 2000,
    color: "#2dd4bf",
    scale: 0.92,
    kind: "ranged",
  },
  {
    id: 4,
    name: "Boss 1 (O Titã)",
    isBoss: true,
    hpBase: 1000,
    speed: 0.8,
    damage: 3,
    attackSpeed: 1500,
    color: "#5b21b6",
    scale: 2.5,
    kind: "boss",
  },
  {
    id: 5,
    name: "Boss 2 (O Ceifador)",
    isBoss: true,
    hpBase: 3500,
    speed: 1.1,
    damage: 5,
    attackSpeed: 1000,
    color: "#a16207",
    scale: 3,
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
    kind: resolveEnemyBehaviorKind(row.name, row.isBoss),
  };
}
