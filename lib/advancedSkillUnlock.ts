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

/**
 * Ordem de progressão:
 * gelo → raio → fogo → pedra → shadow clone → ricochete → aura
 */
export const ADVANCED_SKILL_UNLOCK: Record<
  SkillUpgradeType,
  AdvancedSkillUnlockRequirements
> = {
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
  stone: {
    goldCost: 160_000,
    diamondCost: 480,
    requiredMobs: 20_000,
    requiredBosses: 8,
  },
  shadow: {
    goldCost: 240_000,
    diamondCost: 720,
    requiredMobs: 35_000,
    requiredBosses: 9,
  },
  ricochet: {
    goldCost: 320_000,
    diamondCost: 960,
    requiredMobs: 54_000,
    requiredBosses: 10,
  },
  /** Mais difícil — sinergia de todas as skills liberadas. */
  aura: {
    goldCost: 480_000,
    diamondCost: 1_440,
    requiredMobs: 80_000,
    requiredBosses: 12,
  },
};

/** Ordem canônica de skills avançadas (UI / progressão). */
export const ADVANCED_SKILL_ORDER: readonly SkillUpgradeType[] = [
  "ice",
  "lightning",
  "fire",
  "stone",
  "shadow",
  "ricochet",
  "aura",
] as const;

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
