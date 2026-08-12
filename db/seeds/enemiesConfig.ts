import { ENEMY_TYPE_SEEDS } from "@/db/seeds/enemyTypes";
import { resolveEnemyBehaviorKind } from "@/lib/gameConfig";

export type EnemyConfigSeed = {
  name: string;
  behaviorKind: string;
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

export const ENEMIES_CONFIG_SEEDS: EnemyConfigSeed[] = ENEMY_TYPE_SEEDS.map(
  (row) => ({
    name: row.name,
    behaviorKind: resolveEnemyBehaviorKind(row.name, row.isBoss),
    isBoss: row.isBoss,
    hpBase: row.hpBase,
    speed: row.speed,
    damage: row.damage,
    attackSpeed: row.attackSpeed,
    color: row.color,
    scale: row.scale,
    unlockTime: row.unlockTime,
    xpReward: row.xpReward,
    goldReward: row.goldReward,
    normalDiamondChance: row.normalDiamondChance,
    purpleDiamondChance: row.purpleDiamondChance,
  }),
);
