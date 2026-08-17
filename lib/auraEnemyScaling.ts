/** Escalamento global de inimigos quando a Aura está liberada / upada no meta. */

import type { SkillsData, UnlockedSkillsData } from "@/db/schema";

/**
 * Liberar Aura já deixa o mundo mais pesado — a skill é muito forte.
 * Cada ponto roxo investido (radius / damage / pulse / regen) aumenta um pouco mais.
 */
export const AURA_UNLOCK_ENEMY_HP_MUL = 1.18;
export const AURA_UNLOCK_ENEMY_DAMAGE_MUL = 1.15;
export const AURA_UNLOCK_ENEMY_SPEED_MUL = 1.08;

/** Por nível roxo total da Aura (soma de radius+damage+pulse+regen). */
export const AURA_STAT_ENEMY_HP_PER_LEVEL = 0.01;
export const AURA_STAT_ENEMY_DAMAGE_PER_LEVEL = 0.008;
export const AURA_STAT_ENEMY_SPEED_PER_LEVEL = 0.0035;

export type AuraEnemyPowerMultipliers = {
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  /** Níveis roxos investidos (0 se Aura não liberada). */
  investedLevels: number;
  /** True se o mul > 1. */
  active: boolean;
};

export function getAuraMetaInvestedLevels(skills: SkillsData): number {
  const aura = skills.aura;
  if (!aura) return 0;
  return (
    Math.max(0, Math.floor(aura.radius ?? 0)) +
    Math.max(0, Math.floor(aura.damage ?? 0)) +
    Math.max(0, Math.floor(aura.pulse ?? 0)) +
    Math.max(0, Math.floor(aura.regen ?? 0))
  );
}

/**
 * Multiplicadores extras de inimigos por meta de Aura.
 * Sem Aura desbloqueada → 1 / 1 / 1.
 */
export function getAuraEnemyPowerMultipliers(
  unlockedSkills: UnlockedSkillsData,
  skills: SkillsData,
): AuraEnemyPowerMultipliers {
  if (!unlockedSkills.aura) {
    return {
      enemyHpMultiplier: 1,
      enemyDamageMultiplier: 1,
      enemySpeedMultiplier: 1,
      investedLevels: 0,
      active: false,
    };
  }

  const invested = getAuraMetaInvestedLevels(skills);
  return {
    enemyHpMultiplier:
      AURA_UNLOCK_ENEMY_HP_MUL + invested * AURA_STAT_ENEMY_HP_PER_LEVEL,
    enemyDamageMultiplier:
      AURA_UNLOCK_ENEMY_DAMAGE_MUL +
      invested * AURA_STAT_ENEMY_DAMAGE_PER_LEVEL,
    enemySpeedMultiplier:
      AURA_UNLOCK_ENEMY_SPEED_MUL +
      invested * AURA_STAT_ENEMY_SPEED_PER_LEVEL,
    investedLevels: invested,
    active: true,
  };
}
