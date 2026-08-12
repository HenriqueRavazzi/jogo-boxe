import type { SkillUpgradeType } from "@/db/schema";

const SKILL_DISPLAY_NAMES: Record<SkillUpgradeType, string> = {
  ricochet: "Ricochete",
  ice: "Gelo",
  fire: "Fogo",
  lightning: "Raio",
  aura: "Aura",
  shadow: "Sombra",
  stone: "Pedra",
  vendaval: "Vendaval",
};

const SKILL_UNLOCK_SEEDS: Record<
  SkillUpgradeType,
  {
    unlockGoldCost: number;
    unlockDiamondCost: number;
    unlockMobsRequired: number;
    unlockBossesRequired: number;
  }
> = {
  fire: { unlockGoldCost: 5_000, unlockDiamondCost: 15, unlockMobsRequired: 250, unlockBossesRequired: 1 },
  ice: { unlockGoldCost: 20_000, unlockDiamondCost: 60, unlockMobsRequired: 1_500, unlockBossesRequired: 3 },
  lightning: { unlockGoldCost: 80_000, unlockDiamondCost: 240, unlockMobsRequired: 9_000, unlockBossesRequired: 6 },
  stone: { unlockGoldCost: 160_000, unlockDiamondCost: 480, unlockMobsRequired: 20_000, unlockBossesRequired: 8 },
  ricochet: { unlockGoldCost: 240_000, unlockDiamondCost: 720, unlockMobsRequired: 35_000, unlockBossesRequired: 9 },
  vendaval: { unlockGoldCost: 320_000, unlockDiamondCost: 960, unlockMobsRequired: 54_000, unlockBossesRequired: 10 },
  shadow: { unlockGoldCost: 480_000, unlockDiamondCost: 1_440, unlockMobsRequired: 80_000, unlockBossesRequired: 12 },
  aura: { unlockGoldCost: 720_000, unlockDiamondCost: 2_160, unlockMobsRequired: 120_000, unlockBossesRequired: 14 },
};

export const ADVANCED_SKILL_ORDER: SkillUpgradeType[] = [
  "fire",
  "ice",
  "lightning",
  "stone",
  "ricochet",
  "vendaval",
  "shadow",
  "aura",
];

export type SkillConfigSeed = {
  skillKey: SkillUpgradeType;
  displayName: string;
  unlockGoldCost: number;
  unlockDiamondCost: number;
  unlockMobsRequired: number;
  unlockBossesRequired: number;
  masteryPurpleCost: number;
  masteryShardCost: number;
  defaultStats: Record<string, number>;
  scalingPerLevel: Record<string, number>;
  sortOrder: number;
};

export const SKILLS_CONFIG_SEEDS: SkillConfigSeed[] = ADVANCED_SKILL_ORDER.map(
  (skillKey, sortOrder) => {
    const unlock = SKILL_UNLOCK_SEEDS[skillKey];
    return {
      skillKey,
      displayName: SKILL_DISPLAY_NAMES[skillKey],
      unlockGoldCost: unlock.unlockGoldCost,
      unlockDiamondCost: unlock.unlockDiamondCost,
      unlockMobsRequired: unlock.unlockMobsRequired,
      unlockBossesRequired: unlock.unlockBossesRequired,
      masteryPurpleCost: 500,
      masteryShardCost: 25,
      defaultStats: {},
      scalingPerLevel: {},
      sortOrder,
    };
  },
);
