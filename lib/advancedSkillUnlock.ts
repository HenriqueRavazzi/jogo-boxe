/** Requisitos e custos mistos para desbloquear skills avançadas. */

import type { SkillUpgradeType } from "@/db/schema";
import { getSkillConfigByKey } from "@/lib/balanceConfig";

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
 * Ordem de progressão (early → late):
 * fogo → gelo → raio → pedra → ricochete → vendaval → sombra → aura
 */
export const ADVANCED_SKILL_UNLOCK: Record<
  SkillUpgradeType,
  AdvancedSkillUnlockRequirements
> = {
  /** Tier 1 — DPS contínuo on-hit. */
  fire: {
    goldCost: 5_000,
    diamondCost: 15,
    requiredMobs: 250,
    requiredBosses: 1,
  },
  /** Tier 2 — controle + vulnerabilidade. */
  ice: {
    goldCost: 20_000,
    diamondCost: 60,
    requiredMobs: 1_500,
    requiredBosses: 3,
  },
  /** Tier 3 — burst single-target. */
  lightning: {
    goldCost: 80_000,
    diamondCost: 240,
    requiredMobs: 9_000,
    requiredBosses: 6,
  },
  /** Tier 4 — AoE + debuff global. */
  stone: {
    goldCost: 160_000,
    diamondCost: 480,
    requiredMobs: 20_000,
    requiredBosses: 8,
  },
  /** Tier 5 — cadeia de socos. */
  ricochet: {
    goldCost: 240_000,
    diamondCost: 720,
    requiredMobs: 35_000,
    requiredBosses: 9,
  },
  /** Tier 6 — CC de puxão (vácuo). */
  vendaval: {
    goldCost: 320_000,
    diamondCost: 960,
    requiredMobs: 54_000,
    requiredBosses: 10,
  },
  /** Tier 7 — clone ofensivo. */
  shadow: {
    goldCost: 480_000,
    diamondCost: 1_440,
    requiredMobs: 80_000,
    requiredBosses: 12,
  },
  /** Tier 8 — ápice: sinergia só com skills ativas na run. */
  aura: {
    goldCost: 720_000,
    diamondCost: 2_160,
    requiredMobs: 120_000,
    requiredBosses: 14,
  },
};

/** Ordem canônica de skills avançadas (UI / progressão). */
export const ADVANCED_SKILL_ORDER: readonly SkillUpgradeType[] = [
  "fire",
  "ice",
  "lightning",
  "stone",
  "ricochet",
  "vendaval",
  "shadow",
  "aura",
] as const;

export function getAdvancedSkillUnlockRequirements(
  skillType: SkillUpgradeType,
): AdvancedSkillUnlockRequirements {
  const fromConfig = getSkillConfigByKey(skillType);
  if (fromConfig) {
    return {
      goldCost: fromConfig.unlockGoldCost,
      diamondCost: fromConfig.unlockDiamondCost,
      requiredMobs: fromConfig.unlockMobsRequired,
      requiredBosses: fromConfig.unlockBossesRequired,
    };
  }
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
