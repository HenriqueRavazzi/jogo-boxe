import type { StatCardValues } from "@/db/schema";

export type StatCardTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type StatCardConfigSeed = {
  cardId: string;
  tier: StatCardTier;
  displayName: string;
  upgradeType: string;
  category: string;
  statValues: StatCardValues;
  weight: number;
  sortOrder: number;
};

const STANDARD_BONUS: Record<StatCardTier, number> = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 15,
  legendary: 25,
};

const MITIGATION_BONUS: Record<StatCardTier, number> = {
  common: 2,
  uncommon: 4,
  rare: 6,
  epic: 8,
  legendary: 10,
};

const TIERS: StatCardTier[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

function expandCard(def: {
  cardId: string;
  displayName: string;
  upgradeType: string;
  category: string;
  sortOrder: number;
  bonusByTier?: Record<StatCardTier, number>;
  weight?: number;
}): StatCardConfigSeed[] {
  const bonus = def.bonusByTier ?? STANDARD_BONUS;
  return TIERS.map((tier) => ({
    cardId: def.cardId,
    tier,
    displayName: def.displayName,
    upgradeType: def.upgradeType,
    category: def.category,
    statValues: { value: bonus[tier], isPercentage: true },
    weight: def.weight ?? 10,
    sortOrder: def.sortOrder,
  }));
}

export const STAT_CARDS_CONFIG_SEEDS: StatCardConfigSeed[] = [
  ...expandCard({
    cardId: "attack_speed",
    displayName: "Velocidade de Ataque",
    upgradeType: "attackSpeed",
    category: "speed",
    sortOrder: 0,
  }),
  ...expandCard({
    cardId: "damage",
    displayName: "Dano",
    upgradeType: "damageMultiplier",
    category: "damage",
    sortOrder: 1,
  }),
  ...expandCard({
    cardId: "guard",
    displayName: "Guard",
    upgradeType: "damageTakenMultiplier",
    category: "guard",
    sortOrder: 2,
    bonusByTier: MITIGATION_BONUS,
  }),
  ...expandCard({
    cardId: "thorns",
    displayName: "Espinhos",
    upgradeType: "thornsReflectRatio",
    category: "thorns",
    sortOrder: 3,
    bonusByTier: MITIGATION_BONUS,
  }),
  ...expandCard({
    cardId: "crit_damage",
    displayName: "Dano Crítico",
    upgradeType: "critDamageMultiplier",
    category: "critDamage",
    sortOrder: 4,
  }),
  ...expandCard({
    cardId: "crit_chance",
    displayName: "Chance Crítica",
    upgradeType: "critChanceBonus",
    category: "critChance",
    sortOrder: 5,
  }),
  ...expandCard({
    cardId: "skill_damage",
    displayName: "Dano das Skills",
    upgradeType: "skillDamageMultiplier",
    category: "skillDamage",
    sortOrder: 6,
  }),
  ...expandCard({
    cardId: "range",
    displayName: "Alcance",
    upgradeType: "attackRange",
    category: "range",
    sortOrder: 7,
  }),
  ...expandCard({
    cardId: "knockback",
    displayName: "Knockback",
    upgradeType: "knockbackMultiplier",
    category: "knockback",
    sortOrder: 8,
  }),
];
