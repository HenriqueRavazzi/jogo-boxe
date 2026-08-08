/** Requisitos e custos mistos para desbloquear skills avançadas. */

import type { SkillUpgradeType } from "@/db/schema";

export type AdvancedSkillUnlockRequirements = {
  /** Ouro necessário. */
  goldCost: number;
  /** Diamantes normais (gems) necessários. */
  diamondCost: number;
  /** Abates de mobs (não-boss) cumulativos. */
  requiredMobs: number;
  /** Abates de bosses cumulativos. */
  requiredBosses: number;
};

export const ADVANCED_SKILL_UNLOCK: Record<
  SkillUpgradeType,
  AdvancedSkillUnlockRequirements
> = {
  ricochet: {
    goldCost: 5_000,
    diamondCost: 15,
    requiredMobs: 250,
    requiredBosses: 1,
  },
  ice: {
    goldCost: 12_000,
    diamondCost: 25,
    requiredMobs: 600,
    requiredBosses: 3,
  },
  fire: {
    goldCost: 25_000,
    diamondCost: 40,
    requiredMobs: 1_200,
    requiredBosses: 6,
  },
  lightning: {
    goldCost: 50_000,
    diamondCost: 60,
    requiredMobs: 2_000,
    requiredBosses: 10,
  },
};

export function getAdvancedSkillUnlockRequirements(
  skillType: SkillUpgradeType,
): AdvancedSkillUnlockRequirements {
  return ADVANCED_SKILL_UNLOCK[skillType];
}

export function canMeetAdvancedSkillUnlock(
  skillType: SkillUpgradeType,
  stats: {
    gold: number;
    gems: number;
    totalMobsKilled: number;
    totalBossesKilled: number;
  },
): boolean {
  const req = ADVANCED_SKILL_UNLOCK[skillType];
  return (
    stats.gold >= req.goldCost &&
    stats.gems >= req.diamondCost &&
    stats.totalMobsKilled >= req.requiredMobs &&
    stats.totalBossesKilled >= req.requiredBosses
  );
}
