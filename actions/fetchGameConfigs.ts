"use server";

import { db } from "@/db";
import {
  difficulties,
  enemyTypes,
  gameEnemiesConfig,
  gameMatchGlobals,
  gameMatchRarities,
  gameMatchSkillCards,
  gameMatchSkillEffects,
  gameMatchStatCards,
  gameSettings,
  gameSkillTierScaling,
  gameSkillsConfig,
  gameStatCardsConfig,
  gameTeamMembersConfig,
  gameUpgradesConfig,
  stages,
} from "@/db/schema";
import {
  FALLBACK_BALANCE_CONFIG,
  normalizeStatMultipliers,
  type BalanceConfigBundle,
  type MatchUpgradesConfig,
  type SkillConfig,
  type SkillTierScalingConfig,
  type StageConfig,
  type StatCardTierConfig,
  type TeamMemberConfig,
  type UpgradeConfig,
} from "@/lib/balanceConfig";
import {
  FALLBACK_DIFFICULTIES,
  FALLBACK_ENEMY_TYPES,
  FALLBACK_GAME_SETTINGS,
  mapEnemyTypeRow,
  type DifficultyConfig,
  type EnemyTypeConfig,
  type GameBaseSettings,
} from "@/lib/gameConfig";

export type FetchGameConfigsResult = {
  ok: boolean;
  settings: GameBaseSettings;
  difficulties: DifficultyConfig[];
  enemyTypes: EnemyTypeConfig[];
  balance: BalanceConfigBundle;
  error?: string;
};

function mapTeamMemberRows(
  rows: (typeof gameTeamMembersConfig.$inferSelect)[],
): TeamMemberConfig[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    role: row.role,
    tagline: row.tagline,
    buffs: row.buffs ?? [],
    tierPower: row.tierPower,
    sortOrder: row.sortOrder,
  }));
}

function mapSkillRows(
  rows: (typeof gameSkillsConfig.$inferSelect)[],
): SkillConfig[] {
  return rows.map((row) => ({
    skillKey: row.skillKey,
    displayName: row.displayName,
    unlockGoldCost: row.unlockGoldCost,
    unlockDiamondCost: row.unlockDiamondCost,
    unlockMobsRequired: row.unlockMobsRequired,
    unlockBossesRequired: row.unlockBossesRequired,
    masteryPurpleCost: row.masteryPurpleCost,
    masteryShardCost: row.masteryShardCost,
    defaultStats: row.defaultStats ?? {},
    scalingPerLevel: row.scalingPerLevel ?? {},
    sortOrder: row.sortOrder,
  }));
}

function mapEnemyConfigRows(
  rows: (typeof gameEnemiesConfig.$inferSelect)[],
): EnemyTypeConfig[] {
  return rows.map((row) =>
    mapEnemyTypeRow({
      id: row.id,
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

function mapUpgradeRows(
  rows: (typeof gameUpgradesConfig.$inferSelect)[],
): UpgradeConfig[] {
  return rows.map((row) => ({
    upgradeKey: row.upgradeKey,
    displayName: row.displayName,
    currency: row.currency,
    costBase: row.costBase,
    growthRate: row.growthRate,
    maxLevel: row.maxLevel,
    effectParams: row.effectParams ?? {},
    sortOrder: row.sortOrder,
  }));
}

function mapStageRows(
  rows: (typeof stages.$inferSelect)[],
): StageConfig[] {
  return rows.map((row) => ({
    stageNumber: row.stageNumber,
    name: row.name,
    durationSeconds: row.durationSeconds,
    enemyCount: row.enemyCount,
    enemyTierCap: row.enemyTierCap,
    bossSpawnProgress: row.bossSpawnProgress,
    difficultyMul: row.difficultyMul,
    bossStatMul: row.bossStatMul ?? 1,
  }));
}

function mapSkillTierScalingRows(
  rows: (typeof gameSkillTierScaling.$inferSelect)[],
  effectRows: (typeof gameMatchSkillEffects.$inferSelect)[],
): SkillTierScalingConfig[] {
  if (rows.length > 0) {
    return rows.map((row) => ({
      skillKey: row.skillKey,
      tier: row.tier,
      statMultipliers: normalizeStatMultipliers(row.statMultipliers),
      effectLines: row.effectLines ?? [],
      cardLabel: row.cardLabel,
      cardTitle: row.cardTitle,
      cardDescription: row.cardDescription,
    }));
  }
  if (effectRows.length > 0) {
    return effectRows.map((row) => ({
      skillKey: row.skillKey,
      tier: row.rarity,
      statMultipliers: normalizeStatMultipliers(row.delta),
      effectLines: row.effectLines ?? [],
      cardLabel: null,
      cardTitle: null,
      cardDescription: null,
    }));
  }
  return FALLBACK_BALANCE_CONFIG.matchUpgrades.skillTierScaling;
}

function mapStatCardsConfigRows(
  rows: (typeof gameStatCardsConfig.$inferSelect)[],
): StatCardTierConfig[] {
  if (rows.length === 0) {
    return FALLBACK_BALANCE_CONFIG.matchUpgrades.statCardsConfig;
  }
  return rows.map((row) => ({
    cardId: row.cardId,
    tier: row.tier,
    displayName: row.displayName,
    upgradeType: row.upgradeType,
    category: row.category,
    statValues: {
      value: row.statValues?.value ?? 5,
      isPercentage:
        row.statValues?.isPercentage ?? row.statValues?.is_percentage ?? true,
    },
    weight: row.weight,
    sortOrder: row.sortOrder,
  }));
}

function mapMatchUpgrades(
  globalsRows: (typeof gameMatchGlobals.$inferSelect)[],
  rarityRows: (typeof gameMatchRarities.$inferSelect)[],
  statRows: (typeof gameMatchStatCards.$inferSelect)[],
  skillCardRows: (typeof gameMatchSkillCards.$inferSelect)[],
  effectRows: (typeof gameMatchSkillEffects.$inferSelect)[],
  tierRows: (typeof gameSkillTierScaling.$inferSelect)[],
  statConfigRows: (typeof gameStatCardsConfig.$inferSelect)[],
): MatchUpgradesConfig {
  const fallback = FALLBACK_BALANCE_CONFIG.matchUpgrades;
  const g = globalsRows[0];
  const skillTierScaling = mapSkillTierScalingRows(tierRows, effectRows);
  const statCardsConfig = mapStatCardsConfigRows(statConfigRows);
  const skillEffects =
    effectRows.length > 0
      ? effectRows.map((row) => ({
          skillKey: row.skillKey,
          rarity: row.rarity,
          delta: normalizeStatMultipliers(row.delta),
          effectLines: row.effectLines ?? [],
        }))
      : skillTierScaling
          .filter((row) => row.tier !== "master")
          .map((row) => ({
            skillKey: row.skillKey,
            rarity: row.tier,
            delta: { ...row.statMultipliers },
            effectLines: [...row.effectLines],
          }));
  return {
    globals: g
      ? {
          cooldownUpgradeFloor: g.cooldownUpgradeFloor,
          critChanceCap: g.critChanceCap,
          damageTakenReductionCap: g.damageTakenReductionCap,
          thornsUnlockTimeSec: g.thornsUnlockTimeSec,
          thornsMaxLevel: g.thornsMaxLevel,
          thornsReflectCap: g.thornsReflectCap,
          guardMaxLevel: g.guardMaxLevel ?? 3,
          mitigationBonusPerTier: g.mitigationBonusPerTier ?? 0.02,
          skillLevelCap: g.skillLevelCap,
          baseActiveRunSkills: g.baseActiveRunSkills,
          specialSkillCardChance: g.specialSkillCardChance ?? 0.25,
          maxLuckBonus: g.maxLuckBonus,
          luckPerMinute: g.luckPerMinute,
          luckPerFiveLevels: g.luckPerFiveLevels,
        }
      : fallback.globals,
    rarities:
      rarityRows.length > 0
        ? rarityRows.map((row) => ({
            rarity: row.rarity,
            weight: row.weight,
            bonusValue: row.bonusValue,
            sortOrder: row.sortOrder,
          }))
        : fallback.rarities,
    statCards:
      statRows.length > 0
        ? statRows.map((row) => ({
            category: row.category,
            upgradeType: row.upgradeType,
            name: row.name,
            short: row.short,
            sortOrder: row.sortOrder,
          }))
        : fallback.statCards,
    skillCards:
      skillCardRows.length > 0
        ? skillCardRows.map((row) => ({
            skillKey: row.skillKey,
            name: row.name,
            short: row.short,
            sortOrder: row.sortOrder,
          }))
        : fallback.skillCards,
    skillEffects:
      skillEffects.length > 0 ? skillEffects : fallback.skillEffects,
    skillTierScaling,
    statCardsConfig,
  };
}

/**
 * Carrega configurações globais do Neon (settings, dificuldades, balanceamento).
 */
export async function fetchGameConfigs(): Promise<FetchGameConfigsResult> {
  try {
    const [
      settingsRows,
      difficultyRows,
      enemyTypeRows,
      teamMemberRows,
      skillRows,
      enemiesConfigRows,
      upgradeRows,
      stageRows,
      matchGlobalsRows,
      matchRarityRows,
      matchStatRows,
      matchSkillCardRows,
      matchEffectRows,
    ] = await Promise.all([
      db.select().from(gameSettings).limit(1),
      db.select().from(difficulties).orderBy(difficulties.id),
      db.select().from(enemyTypes).orderBy(enemyTypes.id),
      db.select().from(gameTeamMembersConfig).orderBy(gameTeamMembersConfig.sortOrder),
      db.select().from(gameSkillsConfig).orderBy(gameSkillsConfig.sortOrder),
      db.select().from(gameEnemiesConfig).orderBy(gameEnemiesConfig.id),
      db.select().from(gameUpgradesConfig).orderBy(gameUpgradesConfig.sortOrder),
      db.select().from(stages).orderBy(stages.stageNumber),
      db.select().from(gameMatchGlobals).limit(1),
      db.select().from(gameMatchRarities).orderBy(gameMatchRarities.sortOrder),
      db.select().from(gameMatchStatCards).orderBy(gameMatchStatCards.sortOrder),
      db.select().from(gameMatchSkillCards).orderBy(gameMatchSkillCards.sortOrder),
      db.select().from(gameMatchSkillEffects),
    ]);

    let skillTierRows: (typeof gameSkillTierScaling.$inferSelect)[] = [];
    try {
      skillTierRows = await db.select().from(gameSkillTierScaling);
    } catch {
      skillTierRows = [];
    }

    let statConfigRows: (typeof gameStatCardsConfig.$inferSelect)[] = [];
    try {
      statConfigRows = await db.select().from(gameStatCardsConfig);
    } catch {
      statConfigRows = [];
    }

    const row = settingsRows[0];
    const settings: GameBaseSettings = row
      ? {
          baseAttackSpeed: row.baseAttackSpeed,
          baseDamage: row.baseDamage,
          baseHp: row.baseHp,
          baseRange: row.baseRange,
        }
      : { ...FALLBACK_GAME_SETTINGS };

    const list: DifficultyConfig[] =
      difficultyRows.length > 0
        ? difficultyRows.map((d) => ({
            id: d.id,
            name: d.name,
            enemyHpMultiplier: d.enemyHpMultiplier,
            enemyDamageMultiplier: d.enemyDamageMultiplier,
            enemySpeedMultiplier: d.enemySpeedMultiplier,
            goldDropMultiplier: d.goldDropMultiplier,
          }))
        : [...FALLBACK_DIFFICULTIES];

    const enemiesFromConfig =
      enemiesConfigRows.length > 0
        ? mapEnemyConfigRows(enemiesConfigRows)
        : enemyTypeRows.length > 0
          ? enemyTypeRows.map(mapEnemyTypeRow)
          : [...FALLBACK_ENEMY_TYPES];

    const balance: BalanceConfigBundle = {
      teamMembers:
        teamMemberRows.length > 0
          ? mapTeamMemberRows(teamMemberRows)
          : FALLBACK_BALANCE_CONFIG.teamMembers,
      skills:
        skillRows.length > 0
          ? mapSkillRows(skillRows)
          : FALLBACK_BALANCE_CONFIG.skills,
      enemies: enemiesFromConfig,
      upgrades:
        upgradeRows.length > 0
          ? mapUpgradeRows(upgradeRows)
          : FALLBACK_BALANCE_CONFIG.upgrades,
      stages:
        stageRows.length > 0
          ? mapStageRows(stageRows)
          : FALLBACK_BALANCE_CONFIG.stages,
      matchUpgrades: mapMatchUpgrades(
        matchGlobalsRows,
        matchRarityRows,
        matchStatRows,
        matchSkillCardRows,
        matchEffectRows,
        skillTierRows,
        statConfigRows,
      ),
      source: "database",
    };

    return {
      ok: true,
      settings,
      difficulties: list,
      enemyTypes: enemiesFromConfig,
      balance,
    };
  } catch (error) {
    console.error("[fetchGameConfigs]", error);
    return {
      ok: false,
      settings: { ...FALLBACK_GAME_SETTINGS },
      difficulties: [...FALLBACK_DIFFICULTIES],
      enemyTypes: [...FALLBACK_ENEMY_TYPES],
      balance: { ...FALLBACK_BALANCE_CONFIG, source: "fallback" },
      error: "Falha ao carregar configurações; usando defaults locais",
    };
  }
}
