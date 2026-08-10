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
  /** Mais fácil — base da progressão ×4 ouro/diamantes e ×6 mobs por tier. */
  ice: {
    goldCost: 5_000,
    diamondCost: 15,
    requiredMobs: 250,
    requiredBosses: 1,
  },
  lightning: {
    goldCost: 20_000,
    diamondCost: 60,
    requiredMobs: 1_500,
    requiredBosses: 3,
  },
  fire: {
    goldCost: 80_000,
    diamondCost: 240,
    requiredMobs: 9_000,
    requiredBosses: 6,
  },
  /** Sinergia elemental — exige progressão intermediária. */
  aura: {
    goldCost: 160_000,
    diamondCost: 480,
    requiredMobs: 20_000,
    requiredBosses: 8,
  },
  /** Clone de sombra — entre aura e ricochete. */
  shadow: {
    goldCost: 240_000,
    diamondCost: 720,
    requiredMobs: 35_000,
    requiredBosses: 9,
  },
  /** Terremoto — entre shadow e ricochete. */
  stone: {
    goldCost: 280_000,
    diamondCost: 840,
    requiredMobs: 44_000,
    requiredBosses: 9,
  },
  /** Mais difícil */
  ricochet: {
    goldCost: 320_000,
    diamondCost: 960,
    requiredMobs: 54_000,
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
