/**
 * Configurações de balanceamento carregadas do Neon (com fallback local).
 * Injeta dados no runtime da sessão via `setBalanceConfig`.
 */

import type {
  MatchSkillEffectDelta,
  SkillTierStatMultipliers,
  StatCardValues,
  TeamMemberBuffConfig,
} from "@/db/schema";
import { ENEMIES_CONFIG_SEEDS } from "@/db/seeds/enemiesConfig";
import {
  MATCH_GLOBALS_SEED,
  MATCH_RARITY_SEEDS,
  MATCH_SKILL_CARD_SEEDS,
  MATCH_SKILL_EFFECT_SEEDS,
  MATCH_STAT_CARD_SEEDS,
  type MatchGlobalsSeed,
} from "@/db/seeds/matchUpgradesConfig";
import { SKILL_TIER_SCALING_SEEDS } from "@/db/seeds/skillTierScaling";
import { STAT_CARDS_CONFIG_SEEDS } from "@/db/seeds/statCardsConfig";
import { SKILLS_CONFIG_SEEDS } from "@/db/seeds/skillsConfig";
import { STAGES_CONFIG_SEEDS, type StageConfigSeed } from "@/db/seeds/stagesConfig";
import {
  TEAM_MEMBER_BUFF_SEEDS,
  TEAM_TIER_POWER_SEEDS,
} from "@/db/seeds/teamMemberBuffs";
import { TEAM_MEMBERS_META_SEEDS } from "@/db/seeds/teamMembersMeta";
import { UPGRADES_CONFIG_SEEDS } from "@/db/seeds/upgradesConfig";
import {
  FALLBACK_ENEMY_TYPES,
  mapEnemyTypeRow,
  type EnemyTypeConfig,
} from "@/lib/gameConfig";

export type TeamMemberConfig = {
  id: string;
  name: string;
  tier: string;
  role: string;
  tagline: string;
  buffs: TeamMemberBuffConfig[];
  tierPower: number;
  sortOrder: number;
};

export type SkillConfig = {
  skillKey: string;
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

export type UpgradeConfig = {
  upgradeKey: string;
  displayName: string;
  currency: string;
  costBase: number;
  growthRate: number;
  maxLevel: number | null;
  effectParams: Record<string, number>;
  sortOrder: number;
};

export type StageConfig = StageConfigSeed;

export type MatchGlobalsConfig = MatchGlobalsSeed;

export type MatchRarityConfig = {
  rarity: string;
  weight: number;
  bonusValue: number;
  sortOrder: number;
};

export type MatchStatCardConfig = {
  category: string;
  upgradeType: string;
  name: string;
  short: string;
  sortOrder: number;
};

export type StatCardTierConfig = {
  cardId: string;
  tier: string;
  displayName: string;
  upgradeType: string;
  category: string;
  statValues: StatCardValues;
  weight: number;
  sortOrder: number;
};

export type MatchSkillCardConfig = {
  skillKey: string;
  name: string;
  short: string;
  sortOrder: number;
};

export type MatchSkillEffectConfig = {
  skillKey: string;
  rarity: string;
  delta: MatchSkillEffectDelta;
  effectLines: string[];
};

export type SkillTierScalingConfig = {
  skillKey: string;
  tier: string;
  statMultipliers: SkillTierStatMultipliers;
  effectLines: string[];
  cardLabel?: string | null;
  cardTitle?: string | null;
  cardDescription?: string | null;
};

export type MatchUpgradesConfig = {
  globals: MatchGlobalsConfig;
  rarities: MatchRarityConfig[];
  statCards: MatchStatCardConfig[];
  skillCards: MatchSkillCardConfig[];
  skillEffects: MatchSkillEffectConfig[];
  skillTierScaling: SkillTierScalingConfig[];
  statCardsConfig: StatCardTierConfig[];
};

export type BalanceConfigBundle = {
  teamMembers: TeamMemberConfig[];
  skills: SkillConfig[];
  enemies: EnemyTypeConfig[];
  upgrades: UpgradeConfig[];
  stages: StageConfig[];
  matchUpgrades: MatchUpgradesConfig;
  source: "database" | "fallback";
};

function buildFallbackTeamMembers(): TeamMemberConfig[] {
  return TEAM_MEMBERS_META_SEEDS.map((meta, sortOrder) => ({
    id: meta.id,
    name: meta.name,
    tier: meta.tier,
    role: meta.role,
    tagline: meta.tagline,
    buffs: TEAM_MEMBER_BUFF_SEEDS[meta.id] ?? [],
    tierPower: TEAM_TIER_POWER_SEEDS[meta.tier] ?? 1,
    sortOrder,
  }));
}

function buildFallbackEnemies(): EnemyTypeConfig[] {
  return ENEMIES_CONFIG_SEEDS.map((row, index) =>
    mapEnemyTypeRow({
      id: index + 1,
      name: row.name,
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
}

const STAT_MULTIPLIER_ALIASES: Record<string, keyof SkillTierStatMultipliers> = {
  damage_multiplier: "damageMul",
  cooldown_multiplier: "cooldownMul",
  duration_multiplier: "durationMul",
  radius_multiplier: "radiusMul",
  extra_hits: "extraHits",
  extra_projectiles: "extraProjectiles",
  clone_count: "cloneCount",
  clone_stat_ratio: "cloneStatRatio",
  aura_secondary_power: "auraSecondaryPower",
  fire_share_ratio: "fireShareRatio",
  fire_share_radius: "fireShareRadius",
  ice_shatter_radius: "iceShatterRadius",
  ice_shatter_damage_ratio: "iceShatterDamageRatio",
  ice_shatter_freeze_ms: "iceShatterFreezeMs",
  tesla_duration_ms: "teslaDurationMs",
  tesla_radius: "teslaRadius",
  tesla_dps_ratio: "teslaDpsRatio",
  fissure_radius: "fissureRadius",
  fissure_slow: "fissureSlow",
  fissure_vuln: "fissureVuln",
  vendaval_implosion_radius: "vendavalImplosionRadius",
  vendaval_implosion_damage_ratio: "vendavalImplosionDamageRatio",
  vendaval_stun_ms: "vendavalStunMs",
  vendaval_knockback: "vendavalKnockback",
  ricochet_max_targets: "ricochetMaxTargets",
};

/** Aceita camelCase (código) ou snake_case (edição no Neon). */
export function normalizeStatMultipliers(
  raw?: Record<string, unknown> | SkillTierStatMultipliers | null,
): SkillTierStatMultipliers {
  if (!raw || typeof raw !== "object") return {};
  const out: SkillTierStatMultipliers = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const mapped =
      STAT_MULTIPLIER_ALIASES[key] ?? (key as keyof SkillTierStatMultipliers);
    (out as Record<string, number>)[mapped] = value;
  }
  return out;
}

function buildFallbackSkillTierScaling(): SkillTierScalingConfig[] {
  return SKILL_TIER_SCALING_SEEDS.map((row) => ({
    skillKey: row.skillKey,
    tier: row.tier,
    statMultipliers: { ...row.statMultipliers },
    effectLines: [...row.effectLines],
    cardLabel: row.cardLabel ?? null,
    cardTitle: row.cardTitle ?? null,
    cardDescription: row.cardDescription ?? null,
  }));
}

function buildFallbackMatchUpgrades(): MatchUpgradesConfig {
  const skillTierScaling = buildFallbackSkillTierScaling();
  return {
    globals: { ...MATCH_GLOBALS_SEED },
    rarities: MATCH_RARITY_SEEDS.map((row) => ({ ...row })),
    statCards: MATCH_STAT_CARD_SEEDS.map((row) => ({ ...row })),
    skillCards: MATCH_SKILL_CARD_SEEDS.map((row) => ({ ...row })),
    skillEffects: MATCH_SKILL_EFFECT_SEEDS.map((row) => ({
      ...row,
      delta: { ...row.delta },
      effectLines: [...row.effectLines],
    })),
    skillTierScaling,
    statCardsConfig: STAT_CARDS_CONFIG_SEEDS.map((row) => ({
      ...row,
      statValues: { ...row.statValues },
    })),
  };
}

export const FALLBACK_BALANCE_CONFIG: BalanceConfigBundle = {
  teamMembers: buildFallbackTeamMembers(),
  skills: SKILLS_CONFIG_SEEDS.map((row) => ({ ...row })),
  enemies:
    buildFallbackEnemies().length > 0
      ? buildFallbackEnemies()
      : [...FALLBACK_ENEMY_TYPES],
  upgrades: UPGRADES_CONFIG_SEEDS.map((row) => ({ ...row })),
  stages: STAGES_CONFIG_SEEDS.map((row) => ({ ...row })),
  matchUpgrades: buildFallbackMatchUpgrades(),
  source: "fallback",
};

let runtimeConfig: BalanceConfigBundle = {
  teamMembers: [...FALLBACK_BALANCE_CONFIG.teamMembers],
  skills: [...FALLBACK_BALANCE_CONFIG.skills],
  enemies: [...FALLBACK_BALANCE_CONFIG.enemies],
  upgrades: [...FALLBACK_BALANCE_CONFIG.upgrades],
  stages: [...FALLBACK_BALANCE_CONFIG.stages],
  matchUpgrades: buildFallbackMatchUpgrades(),
  source: "fallback",
};

export function setBalanceConfig(bundle: BalanceConfigBundle): void {
  runtimeConfig = {
    teamMembers:
      bundle.teamMembers.length > 0
        ? bundle.teamMembers
        : FALLBACK_BALANCE_CONFIG.teamMembers,
    skills:
      bundle.skills.length > 0 ? bundle.skills : FALLBACK_BALANCE_CONFIG.skills,
    enemies:
      bundle.enemies.length > 0
        ? bundle.enemies
        : FALLBACK_BALANCE_CONFIG.enemies,
    upgrades:
      bundle.upgrades.length > 0
        ? bundle.upgrades
        : FALLBACK_BALANCE_CONFIG.upgrades,
    stages:
      bundle.stages.length > 0
        ? bundle.stages
        : FALLBACK_BALANCE_CONFIG.stages,
    matchUpgrades:
      bundle.matchUpgrades?.statCards?.length > 0 ||
      bundle.matchUpgrades?.skillTierScaling?.length > 0 ||
      bundle.matchUpgrades?.statCardsConfig?.length > 0
        ? {
            ...FALLBACK_BALANCE_CONFIG.matchUpgrades,
            ...bundle.matchUpgrades,
            skillTierScaling:
              bundle.matchUpgrades.skillTierScaling?.length > 0
                ? bundle.matchUpgrades.skillTierScaling
                : FALLBACK_BALANCE_CONFIG.matchUpgrades.skillTierScaling,
            skillEffects:
              bundle.matchUpgrades.skillEffects?.length > 0
                ? bundle.matchUpgrades.skillEffects
                : FALLBACK_BALANCE_CONFIG.matchUpgrades.skillEffects,
            statCardsConfig:
              bundle.matchUpgrades.statCardsConfig?.length > 0
                ? bundle.matchUpgrades.statCardsConfig
                : FALLBACK_BALANCE_CONFIG.matchUpgrades.statCardsConfig,
          }
        : FALLBACK_BALANCE_CONFIG.matchUpgrades,
    source: bundle.source,
  };
}

export function getBalanceConfig(): BalanceConfigBundle {
  return runtimeConfig;
}

export function getTeamMembersConfig(): TeamMemberConfig[] {
  return runtimeConfig.teamMembers;
}

export function getTeamMemberConfigById(
  id: string,
): TeamMemberConfig | undefined {
  return runtimeConfig.teamMembers.find((m) => m.id === id);
}

export function getSkillsConfig(): SkillConfig[] {
  return runtimeConfig.skills;
}

export function getSkillConfigByKey(
  skillKey: string,
): SkillConfig | undefined {
  return runtimeConfig.skills.find((s) => s.skillKey === skillKey);
}

export function getUpgradesConfig(): UpgradeConfig[] {
  return runtimeConfig.upgrades;
}

export function getUpgradeConfigByKey(
  upgradeKey: string,
): UpgradeConfig | undefined {
  return runtimeConfig.upgrades.find((u) => u.upgradeKey === upgradeKey);
}

export function getStagesConfig(): StageConfig[] {
  return runtimeConfig.stages;
}

export function getStageConfigByNumber(
  stageNumber: number,
): StageConfig | undefined {
  return runtimeConfig.stages.find((s) => s.stageNumber === stageNumber);
}

export function getMatchUpgradesConfig(): MatchUpgradesConfig {
  return runtimeConfig.matchUpgrades;
}

export function getMatchGlobals(): MatchGlobalsConfig {
  return runtimeConfig.matchUpgrades.globals;
}

export function getMatchRarityBonus(rarity: string): number {
  return (
    runtimeConfig.matchUpgrades.rarities.find((r) => r.rarity === rarity)
      ?.bonusValue ?? 0.05
  );
}

export function getMatchRarityWeights(): MatchRarityConfig[] {
  return runtimeConfig.matchUpgrades.rarities;
}

export function getMatchStatCards(): MatchStatCardConfig[] {
  return runtimeConfig.matchUpgrades.statCards;
}

export function getStatCardsConfig(): StatCardTierConfig[] {
  return runtimeConfig.matchUpgrades.statCardsConfig;
}

export function getStatCardTierConfig(
  category: string,
  tier: string,
): StatCardTierConfig | undefined {
  return runtimeConfig.matchUpgrades.statCardsConfig.find(
    (row) => row.category === category && row.tier === tier,
  );
}

/** Converte `stat_values` do banco em fração usada pela run (15% → 0.15). */
export function resolveStatCardValue(
  values?: StatCardValues | null,
  fallback = 0.05,
): number {
  if (!values || typeof values.value !== "number" || !Number.isFinite(values.value)) {
    return fallback;
  }
  const isPct = values.isPercentage ?? values.is_percentage ?? true;
  return isPct ? values.value / 100 : values.value;
}

export function getMatchSkillCards(): MatchSkillCardConfig[] {
  return runtimeConfig.matchUpgrades.skillCards;
}

export function getMatchSkillEffect(
  skillKey: string,
  rarity: string,
): MatchSkillEffectConfig | undefined {
  const fromScaling = getSkillTierScaling(skillKey, rarity);
  if (fromScaling) {
    return {
      skillKey: fromScaling.skillKey,
      rarity: fromScaling.tier,
      delta: fromScaling.statMultipliers,
      effectLines: fromScaling.effectLines,
    };
  }
  return runtimeConfig.matchUpgrades.skillEffects.find(
    (e) => e.skillKey === skillKey && e.rarity === rarity,
  );
}

export function getSkillTierScaling(
  skillKey: string,
  tier: string,
): SkillTierScalingConfig | undefined {
  return runtimeConfig.matchUpgrades.skillTierScaling.find(
    (e) => e.skillKey === skillKey && e.tier === tier,
  );
}

export function getSkillTierStat(
  skillKey: string,
  tier: string,
  field: keyof SkillTierStatMultipliers,
  fallback: number,
): number {
  const value = getSkillTierScaling(skillKey, tier)?.statMultipliers[field];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getUpgradeCostParams(
  upgradeKey: string,
  fallbackBase: number,
  fallbackGrowth: number,
): { costBase: number; growthRate: number; maxLevel: number | null } {
  const row = getUpgradeConfigByKey(upgradeKey);
  return {
    costBase: row?.costBase ?? fallbackBase,
    growthRate: row?.growthRate ?? fallbackGrowth,
    maxLevel: row?.maxLevel ?? null,
  };
}

export function getUpgradeEffectParam(
  upgradeKey: string,
  param: string,
  fallback = 0,
): number {
  return getUpgradeConfigByKey(upgradeKey)?.effectParams[param] ?? fallback;
}

export type ArmsUpgradeConfig = {
  costBase: number;
  stepCostGrowth: number;
  maxGoldArms: number;
  minArms: number;
  maxTotalArms: number;
  resetCostMul: number;
  prestigeDamageMul: number;
};

/** Braços de ouro + teto total (inclui árvore e ascensão). */
export function getArmsUpgradeConfig(): ArmsUpgradeConfig {
  const row = getUpgradeConfigByKey("arms");
  return {
    costBase: row?.costBase ?? 80,
    stepCostGrowth: row?.growthRate ?? 1.2,
    maxGoldArms: row?.maxLevel ?? 4,
    minArms: getUpgradeEffectParam("arms", "min_arms", 2),
    maxTotalArms: getUpgradeEffectParam("arms", "max_total_arms", 8),
    resetCostMul: getUpgradeEffectParam("arms", "reset_cost_mul", 2),
    prestigeDamageMul: getUpgradeEffectParam("arms", "prestige_damage_mul", 1.15),
  };
}

/** Teto de alcance (px) — upgrade de ouro cobre até este valor. */
export function getMaxAttackRangePx(): number {
  return getUpgradeEffectParam("range", "max_attack_range_px", 450);
}
export function getTeamScaleConstants() {
  const gacha = getUpgradeConfigByKey("team_gacha");
  const params = gacha?.effectParams ?? {};
  return {
    damagePctScale: 0.01,
    maxHpPctScale: 0.001,
    regenMaxHpPctScale: 0.0001,
    knockbackPctScale: 0.01,
    maxHpRegenCap: params.max_hp_regen_cap ?? 0.03,
    maxDamageMul: params.max_damage_mul ?? 1.1,
    maxHpMul: params.max_hp_mul ?? 1.15,
    minDamageTakenMul: params.min_damage_taken_mul ?? 0.6,
    recruitGoldBase: gacha?.costBase ?? 220,
    recruitGoldGrowth: gacha?.growthRate ?? 1.022,
    recruitGemsBase: params.recruit_gems_base ?? 8,
    recruitGemsGrowth: params.recruit_gems_growth ?? 1.016,
  };
}

export function applyTeamMemberBuffs(
  acc: import("@/lib/teamMembers").EquippedTeamBuffs,
  buffs: TeamMemberBuffConfig[],
  tierPower: number,
  level: number,
): void {
  const lv = Math.max(1, level);
  const p = tierPower * (1 + (lv - 1) * 0.12);
  const scales = getTeamScaleConstants();

  for (const buff of buffs) {
    switch (buff.type) {
      case "hp_regen_pct_max":
        acc.hpRegenMaxHpRatioPerSecond +=
          buff.coefficient * p * scales.regenMaxHpPctScale;
        break;
      case "damage_mul_pct":
        acc.damageMultiplier *=
          1 + buff.coefficient * p * scales.damagePctScale;
        break;
      case "max_hp_mul_pct":
        acc.maxHpMultiplier *= 1 + buff.coefficient * p * scales.maxHpPctScale;
        break;
      case "damage_taken_reduce":
        acc.damageTakenMultiplier *=
          1 -
          Math.min(buff.cap ?? 1, buff.coefficient * p);
        break;
      case "attack_speed_mul":
        acc.attackSpeedMultiplier *= 1 + buff.coefficient * p;
        break;
      case "xp_bonus":
        acc.xpMultiplierBonus += buff.coefficient * p;
        break;
      case "crit_chance":
        acc.critChanceBonus += buff.coefficient * p;
        break;
      case "crit_damage":
        acc.critDamageBonus += buff.coefficient * p;
        break;
      case "knockback_mul_pct":
        acc.knockbackMultiplier *=
          1 + buff.coefficient * p * scales.knockbackPctScale;
        break;
      case "skill_damage_mul":
        acc.skillDamageMultiplier *= 1 + buff.coefficient * p;
        break;
      case "gold_income_mul":
        acc.goldIncomeMultiplier *= 1 + buff.coefficient * p;
        break;
      case "diamond_luck":
        acc.diamondLuckBonus += buff.coefficient * p;
        break;
      case "purple_diamond_luck":
        acc.purpleDiamondLuckBonus += buff.coefficient * p;
        break;
      default:
        break;
    }
  }
}

export function capEquippedTeamBuffs(
  acc: import("@/lib/teamMembers").EquippedTeamBuffs,
): void {
  const scales = getTeamScaleConstants();
  acc.hpRegenMaxHpRatioPerSecond = Math.min(
    scales.maxHpRegenCap,
    acc.hpRegenMaxHpRatioPerSecond,
  );
  acc.damageMultiplier = Math.min(scales.maxDamageMul, acc.damageMultiplier);
  acc.maxHpMultiplier = Math.min(scales.maxHpMul, acc.maxHpMultiplier);
  acc.damageTakenMultiplier = Math.max(
    scales.minDamageTakenMul,
    acc.damageTakenMultiplier,
  );
}
