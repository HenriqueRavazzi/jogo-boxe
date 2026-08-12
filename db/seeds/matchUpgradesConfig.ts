import type { MatchSkillEffectDelta } from "@/db/schema";
import { SKILL_TIER_SCALING_SEEDS } from "@/db/seeds/skillTierScaling";

export type MatchGlobalsSeed = {
  cooldownUpgradeFloor: number;
  critChanceCap: number;
  damageTakenReductionCap: number;
  thornsUnlockTimeSec: number;
  thornsMaxLevel: number;
  thornsReflectCap: number;
  guardMaxLevel: number;
  mitigationBonusPerTier: number;
  skillLevelCap: number;
  baseActiveRunSkills: number;
  specialSkillCardChance: number;
  maxLuckBonus: number;
  luckPerMinute: number;
  luckPerFiveLevels: number;
  /** XP in-run */
  matchXpGainMul: number;
  matchBaseXpToLevel: number;
  matchXpToNextGrowth: number;
  matchXpOverflowLevels: number;
  /** Endless */
  endlessXpBonusPerCycle: number;
  endlessXpMultiplierCap: number;
  endlessXpGraceCycles: number;
};

export const MATCH_GLOBALS_SEED: MatchGlobalsSeed = {
  cooldownUpgradeFloor: 300,
  critChanceCap: 1,
  damageTakenReductionCap: 0.3,
  thornsUnlockTimeSec: 15 * 60,
  thornsMaxLevel: 3,
  thornsReflectCap: 0.3,
  guardMaxLevel: 3,
  mitigationBonusPerTier: 0.02,
  skillLevelCap: 8,
  baseActiveRunSkills: 2,
  specialSkillCardChance: 0.25,
  maxLuckBonus: 0.15,
  luckPerMinute: 0.03,
  luckPerFiveLevels: 0.025,
  matchXpGainMul: 0.65,
  matchBaseXpToLevel: 110,
  matchXpToNextGrowth: 1.32,
  matchXpOverflowLevels: 1,
  endlessXpBonusPerCycle: 0.08,
  endlessXpMultiplierCap: 3,
  endlessXpGraceCycles: 4,
};

export const MATCH_RARITY_SEEDS = [
  { rarity: "common", weight: 50, bonusValue: 0.05, sortOrder: 0 },
  { rarity: "uncommon", weight: 25, bonusValue: 0.08, sortOrder: 1 },
  { rarity: "rare", weight: 15, bonusValue: 0.12, sortOrder: 2 },
  { rarity: "epic", weight: 8, bonusValue: 0.15, sortOrder: 3 },
  { rarity: "legendary", weight: 2.5, bonusValue: 0.25, sortOrder: 4 },
] as const;

export const MATCH_STAT_CARD_SEEDS = [
  {
    category: "speed",
    upgradeType: "attackSpeed",
    name: "Attack Speed",
    short: "Velocidade de Ataque",
    sortOrder: 0,
  },
  {
    category: "damage",
    upgradeType: "damageMultiplier",
    name: "Damage",
    short: "Dano",
    sortOrder: 1,
  },
  {
    category: "guard",
    upgradeType: "damageTakenMultiplier",
    name: "Guard",
    short: "Dano Recebido",
    sortOrder: 2,
  },
  {
    category: "thorns",
    upgradeType: "thornsReflectRatio",
    name: "Espinhos",
    short: "Dano Refletido",
    sortOrder: 3,
  },
  {
    category: "critDamage",
    upgradeType: "critDamageMultiplier",
    name: "Crit Damage",
    short: "Dano Crítico",
    sortOrder: 4,
  },
  {
    category: "critChance",
    upgradeType: "critChanceBonus",
    name: "Crit Chance",
    short: "Chance Crítica",
    sortOrder: 5,
  },
  {
    category: "skillDamage",
    upgradeType: "skillDamageMultiplier",
    name: "Skill Damage",
    short: "Dano das Skills",
    sortOrder: 6,
  },
] as const;

export const MATCH_SKILL_CARD_SEEDS = [
  {
    skillKey: "fire",
    name: "Fogo",
    short: "Aplica queimadura nos socos",
    sortOrder: 0,
  },
  {
    skillKey: "ice",
    name: "Gelo",
    short: "Congela a área e deixa vulnerável (+30% dano)",
    sortOrder: 1,
  },
  {
    skillKey: "lightning",
    name: "Raio",
    short: "Homing elétrico; explode em área com shock",
    sortOrder: 2,
  },
  {
    skillKey: "stone",
    name: "Pedra",
    short: "Terremoto: dano em todos + −50% AS/dano inimigo por 10s",
    sortOrder: 3,
  },
  {
    skillKey: "ricochet",
    name: "Ricochete",
    short: "Soco ricocheteia entre inimigos",
    sortOrder: 4,
  },
  {
    skillKey: "vendaval",
    name: "Vendaval",
    short: "Cria um vácuo periódico que puxa os inimigos para o centro",
    sortOrder: 5,
  },
  {
    skillKey: "shadow",
    name: "Shadow Clone",
    short: "Clone com 15% dos stats; bate em alvos diferentes (exceto boss)",
    sortOrder: 6,
  },
  {
    skillKey: "aura",
    name: "Aura",
    short: "Área no herói: sinergia com skills ativas na run (ou neutra)",
    sortOrder: 7,
  },
] as const;

export type MatchSkillEffectSeed = {
  skillKey: string;
  rarity: string;
  delta: MatchSkillEffectDelta;
  effectLines: string[];
};

/** Legado: cartas comum–lendária derivadas de `SKILL_TIER_SCALING_SEEDS`. */
export const MATCH_SKILL_EFFECT_SEEDS: MatchSkillEffectSeed[] =
  SKILL_TIER_SCALING_SEEDS.filter((row) => row.tier !== "master").map((row) => ({
    skillKey: row.skillKey,
    rarity: row.tier,
    delta: { ...row.statMultipliers },
    effectLines: [...row.effectLines],
  }));
