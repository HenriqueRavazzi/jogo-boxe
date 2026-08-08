"use client";

import { create } from "zustand";
import type {
  MetaTreeUpgradeType,
  SaveData,
  SkillsData,
  SkillUpgradeType,
  UnlockedSkillsData,
} from "@/db/schema";
import {
  DEFAULT_META_TREE,
  DEFAULT_SKILLS_DATA,
  DEFAULT_UNLOCKED_SKILLS,
  MAX_PURPLE_SKILL_STAT_LEVEL,
  SKILL_STAT_KEYS,
  isSkillStatKey,
  isSkillUpgradeType,
} from "@/db/schema";
import {
  MAX_ASCENSION_PASSIVE_LEVEL,
  calcAscensionShardsGained,
  getAscensionPassiveCostAt,
  getDiamondLuckBonus as diamondLuckBonusAt,
  getMagnetRadiusMultiplier as magnetRadiusMulAt,
  getStartingGoldBonus as startingGoldBonusAt,
  normalizeAscensionPassives,
  type AscensionPassiveId,
  type AscensionPassivesData,
} from "@/lib/ascensionPassives";
import {
  getAdvancedSkillUnlockRequirements as advancedSkillUnlockRequirementsOf,
  type AdvancedSkillUnlockRequirements,
} from "@/lib/advancedSkillUnlock";
import {
  applyMilestoneProgress,
  canClaimMilestone,
  createDefaultMilestoneQuests,
  getMilestoneQuestDef,
  normalizeMilestoneQuests,
  type MilestoneProgressEvent,
  type MilestoneQuestId,
  type MilestoneQuestRewards,
  type MilestoneQuestsState,
} from "@/lib/milestoneQuests";
import {
  DIFFICULTY_STAT_SCALE,
  FALLBACK_DIFFICULTIES,
  FALLBACK_ENEMY_TYPES,
  FALLBACK_GAME_SETTINGS,
  NEUTRAL_DIFFICULTY,
  type DifficultyConfig,
  type DifficultyMultipliers,
  type EnemyTypeConfig,
  type GameBaseSettings,
} from "@/lib/gameConfig";
import {
  createDefaultSaveData,
  normalizeSaveData,
  normalizeSkills,
} from "@/lib/saveSlots";
import {
  DEFAULT_SKILL_TREE,
  getLifeStealLevel,
  getSkillNode,
  type SkillNodeId,
  type SkillTreeState,
} from "@/lib/skillTree";

export {
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
} from "@/src/game/entities/Player";
export type { ArmDistribution, ArmSide } from "@/src/game/entities/Player";

/** Stats finais = upgrades de ouro + bônus da árvore de skills. */
export type EffectiveStats = {
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  xpMultiplier: number;
  arms: number;
  /** Nível de life steal (cada nível = +1% do dano causado). */
  lifeStealLevel: number;
  /** Fração de cura sobre dano físico (árvore + meta diamantes). */
  lifeStealPercent: number;
  /** Nível meta de regeneração por skill. */
  metaSkillRegenLevel: number;
  /** Chance crítica efetiva (0–0.5). */
  critChance: number;
  /** Multiplicador de dano crítico. */
  critDamageMultiplier: number;
  /** Skill de ricochete (meta-progresso). */
  ricochetUnlocked: boolean;
  ricochetCooldown: number;
  maxBounces: number;
  bounceDamagePercent: number;
  /** Poder total de knockback dos socos. */
  knockbackPower: number;
  skillBonus: {
    hp: number;
    damage: number;
    range: number;
    cooldownReductionMs: number;
  };
};

/** Estado persistente — espelha o JSONB `save_data` no banco (por save autenticado). */
export type GameStoreState = {
  /** UUID do save autenticado no Neon. */
  activeSaveId: string | null;
  /** Nome do save autenticado. */
  activeSaveName: string | null;
  gold: number;
  gems: number;
  /** Moeda para skills avançadas (ricochet/ice/lightning/fire). */
  purpleDiamonds: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Dano base absoluto (inteiro). */
  baseDamage: number;
  /** Nível legado de attack speed (ouro); AS só via cartas in-run. */
  attackSpeedLevel: number;
  /** Nível do upgrade de range (0–6, +2% alcance por nível). */
  rangeLevel: number;
  arms: number;
  armTier: number;
  /** Próximo custo do upgrade de braços (×1.4 a cada compra). */
  armsNextCost: number;
  incomeMultiplier: number;
  /** Nível de bônus de XP (+10% por nível). */
  xpBonusLevel: number;
  /** Nível do upgrade de knockback (ouro) — só via cartas in-run. */
  knockbackLevel: number;
  /** Poder base de empurrão dos socos. */
  baseKnockbackPower: number;
  /** Nível de chance crítica (+2%/nível, teto 50%). */
  critChanceLevel: number;
  /** Nível de dano crítico (+15% no multiplicador/nível). */
  critDamageLevel: number;
  skillTree: SkillTreeState;
  /** Stats meta granulares (Diamantes Roxos). */
  skills: SkillsData;
  /** Desbloqueio permanente na base (Diamantes Normais). */
  unlockedSkills: UnlockedSkillsData;
  /** Árvore de atributos permanentes (Diamantes Normais). */
  metaDamageLevel: number;
  metaKnockbackLevel: number;
  metaHpLevel: number;
  metaLifeStealLevel: number;
  metaSkillRegenLevel: number;
  /**
   * Nível de Ascensão. Cada nível: +15% dano/ouro/XP passivos
   * e inimigos mais fortes (formas geométricas).
   */
  prestigeLevel: number;
  /** Ascension Shards (moeda da loja de passivas permanentes). */
  ascensionShards: number;
  /** Passivas permanentes — não resetam no prestígio. */
  ascensionPassives: AscensionPassivesData;
  /** Missões de marco / conquistas (persistidas no save). */
  milestoneQuests: MilestoneQuestsState;
  /** Abates cumulativos de mobs (não-boss). */
  totalMobsKilled: number;
  /** Abates cumulativos de bosses. */
  totalBossesKilled: number;
  /** Status iniciais vindos do Neon (`game_settings`). */
  baseConfig: GameBaseSettings;
  /** Lista de dificuldades do Neon. */
  difficulties: DifficultyConfig[];
  /** Catálogo de inimigos/bosses do Neon (`enemy_types`). */
  enemyTypes: EnemyTypeConfig[];
  /** Id da dificuldade selecionada no menu. */
  selectedDifficultyId: number | null;
  configsLoaded: boolean;
  /** Multiplicador de velocidade da simulação (1–5). */
  gameSpeedMultiplier: number;
  setGameSpeedMultiplier: (speed: number) => void;
  /** Cicla 1 → 2 → 3 → 4 → 5 → 1. */
  cycleGameSpeed: () => void;
  hydrateFromSave: (
    saveId: string,
    data: SaveData,
    saveName?: string,
  ) => void;
  clearActiveSlot: () => void;
  getSaveSnapshot: () => SaveData;
  setGameConfigs: (
    settings: GameBaseSettings,
    difficulties: DifficultyConfig[],
    enemyTypes?: EnemyTypeConfig[],
  ) => void;
  setSelectedDifficulty: (id: number) => void;
  getSelectedDifficulty: () => DifficultyConfig | null;
  getDifficultyMultipliers: () => DifficultyMultipliers;
  addGold: (baseAmount: number, options?: { applyIncome?: boolean }) => void;
  addGems: (amount: number) => void;
  addPurpleDiamonds: (amount: number) => void;
  /** Aplica eventos de progresso nas missões de marco. */
  progressMilestoneQuests: (events: MilestoneProgressEvent[]) => void;
  /** Resgata recompensa de missão concluída. */
  claimMilestoneQuest: (id: MilestoneQuestId) => MilestoneQuestRewards | null;
  unlockSkill: (nodeId: SkillNodeId, cost: number) => boolean;
  /** Desbloqueia skill avançada na base (Diamantes Normais / gems). */
  unlockAdvancedSkill: (skillType: SkillUpgradeType) => boolean;
  getAdvancedSkillUnlockRequirements: (
    skillType: SkillUpgradeType,
  ) => AdvancedSkillUnlockRequirements;
  canUnlockAdvancedSkill: (skillType: SkillUpgradeType) => boolean;
  /** Soma abates cumulativos (mobs / bosses) no save. */
  recordLifetimeKills: (mobs: number, bosses?: number) => void;
  getAdvancedSkillUnlockCost: (skillType: SkillUpgradeType) => number;
  /**
   * Upgrade de um atributo granular da skill (Diamantes Roxos + sync DB).
   * `skillId` / `statKey` são strings validadas em runtime.
   */
  upgradeSkillStat: (skillId: string, statKey: string) => boolean;
  getSkillStatUpgradeCost: (skillId: string, statKey: string) => number;
  /**
   * Respec: zera stats granulares da árvore roxa e devolve diamantes roxos gastos.
   * Retorna a quantidade reembolsada (0 se não havia investimento).
   */
  resetSkillTree: () => number;
  /** Total de diamantes roxos investidos nos sub-níveis atuais. */
  getPurpleSkillInvestment: () => number;
  /**
   * Corta atributos > MAX e devolve o excedente. Retorna o refund aplicado.
   */
  enforcePurpleSkillCap: () => number;
  /**
   * Ascensão: +1 prestige, reseta ouro/upgrades de base/skills granulares.
   * Mantém diamantes, roxos, desbloqueios, meta tree e skill tree verde.
   */
  triggerPrestige: () => boolean;
  canTriggerPrestige: () => boolean;
  getPrestigeMultiplier: () => number;
  /** Compra nível de passiva permanente com Ascension Shards. */
  upgradeAscensionPassive: (id: AscensionPassiveId) => boolean;
  getAscensionPassiveCost: (id: AscensionPassiveId) => number;
  /** Multiplicador de raio de coleta (Ímã Primordial). */
  getMagnetRadiusMultiplier: () => number;
  /** Ouro bônus ao iniciar run (Herança de Ouro). */
  getStartingGoldBonus: () => number;
  /** Bônus absoluto na chance de diamante (Sorte do Campeão). */
  getDiamondLuckBonus: () => number;
  /** Shards que seriam ganhos se ascender agora. */
  previewAscensionShards: () => number;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  upgradeAttackSpeed: () => boolean;
  upgradeRange: () => boolean;
  upgradeIncome: () => boolean;
  upgradeArms: () => boolean;
  /** Upgrade de knockback com ouro. */
  upgradeKnockback: () => boolean;
  /** Upgrade de chance crítica com ouro. */
  upgradeCritChance: () => boolean;
  /** Upgrade de dano crítico com ouro. */
  upgradeCritDamage: () => boolean;
  /** Upgrade de XP com diamantes. */
  upgradeXpBonus: () => boolean;
  /** Upgrade da árvore de atributos (Diamantes Normais). */
  upgradeMetaTree: (type: MetaTreeUpgradeType) => boolean;
  getMetaTreeUpgradeCost: (type: MetaTreeUpgradeType) => number;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getAttackSpeedUpgradeCost: () => number;
  getRangeUpgradeCost: () => number;
  getIncomeUpgradeCost: () => number;
  getArmsUpgradeCost: () => number;
  getKnockbackUpgradeCost: () => number;
  getCritChanceUpgradeCost: () => number;
  getCritDamageUpgradeCost: () => number;
  getXpBonusUpgradeCost: () => number;
  getXpMultiplier: () => number;
  /** Poder total de empurrão: base + nível × 2. */
  getKnockbackPower: () => number;
  /** Chance crítica (0–0.5). */
  getCritChance: () => number;
  /** Multiplicador de dano crítico (≥ 1.5). */
  getCritDamageMultiplier: () => number;
  /** Atributos finais (ouro + skills) usados na partida e na UI. */
  getEffectiveStats: () => EffectiveStats;
  getMaxHp: () => number;
  getBaseDamage: () => number;
  getAttackRange: () => number;
  getAttackCooldown: () => number;
  /** Cooldown base só do upgrade (sem talents / cards), em ms. */
  getUpgradeCooldownAt: (level: number) => number;
  /** Range base só do upgrade (sem talents / cards), em px. */
  getUpgradeRangeAt: (level: number) => number;
  /** Alias: CD meta atual (respeita teto 65%). */
  getBaseAttackSpeed: () => number;
  /** Alias: range meta atual (respeita teto 65%). */
  getBaseRange: () => number;
};

const HP_PER_LEVEL = 25;
const DAMAGE_PER_LEVEL = 5;
const UPGRADE_COST_BASE = 50;
const INCOME_COST_BASE = 75;
/** Passo de renda por upgrade — menor = ouro de partida sobe mais devagar. */
export const INCOME_STEP = 0.1;
const ARMS_COST_GROWTH = 1.4;
const ARMS_PRESTIGE_DAMAGE = 1.15;
const ARMS_MAX = 6;
const ARMS_MIN = 2;

/** Crescimento de custo meta (ouro/diamantes): base × 1.25^nível. */
export const UPGRADE_COST_GROWTH = 1.25;
/** Multiplicador extra por nível de prestígio: ×1.25^prestigeLevel. */
export const PRESTIGE_COST_GROWTH = 1.25;

/** ×1.25^n — encarece upgrades conforme a Ascensão. */
export function getPrestigeCostMultiplier(prestigeLevel: number): number {
  return Math.pow(
    PRESTIGE_COST_GROWTH,
    Math.max(0, Math.floor(prestigeLevel)),
  );
}

/**
 * Custo exponencial com prestígio:
 * floor(base × growth^nível × 1.25^prestigeLevel)
 */
export function getUpgradeCost(
  baseCost: number,
  currentLevel: number,
  prestigeLevel = 0,
  growthRate: number = UPGRADE_COST_GROWTH,
): number {
  return Math.max(
    1,
    Math.floor(
      baseCost *
        Math.pow(growthRate, Math.max(0, currentLevel)) *
        getPrestigeCostMultiplier(prestigeLevel),
    ),
  );
}

export function getMetaTreeCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(META_TREE_COST_BASE, level, prestigeLevel);
}

/**
 * Margem meta vs in-game: ouro cobre só parte do caminho até o hard cap;
 * o restante fica reservado aos cards de level-up na arena.
 */
export const META_PROGRESS_SHARE = 0.65;
/** Attack speed meta mais fraco — exige cartas in-run para chegar perto do teto. */
export const META_ATTACK_SPEED_SHARE = 0.4;

/** Níveis máximos de meta-progresso (ouro). `Infinity` = sem teto. */
export const MAX_UPGRADE_LEVELS = {
  hp: Number.POSITIVE_INFINITY,
  damage: Number.POSITIVE_INFINITY,
  income: Number.POSITIVE_INFINITY,
  knockback: 0,
  /** 5% + 35×2% = 75%. */
  critChance: 35,
  /** Só via cartas in-run (`matchBuffs.critDamageMultiplier`). */
  critDamage: 0,
  /** Só via cartas in-run (`matchBuffs.attackSpeed`). */
  attackSpeed: 0,
  range: 10,
  /** Bônus de XP com diamantes (+10%/nível). */
  xpBonus: 20,
} as const;

/** Árvore de atributos permanentes (Diamantes Normais). */
export const MAX_META_TREE_LEVEL = 20;
/** Por nó: dano/vida sem teto; demais mantêm limite. */
export const MAX_META_TREE_LEVELS: Record<
  MetaTreeUpgradeType,
  number
> = {
  metaDamageLevel: Number.POSITIVE_INFINITY,
  metaHpLevel: Number.POSITIVE_INFINITY,
  metaKnockbackLevel: MAX_META_TREE_LEVEL,
  metaLifeStealLevel: MAX_META_TREE_LEVEL,
  metaSkillRegenLevel: MAX_META_TREE_LEVEL,
};
export const META_TREE_COST_BASE = 5;
export const META_DAMAGE_PER_LEVEL = 3;
export const META_HP_PER_LEVEL = 15;
export const META_KNOCKBACK_PER_LEVEL = 1.5;
/** Pontos percentuais por nível (0.5 → 0.5%). */
export const META_LIFE_STEAL_PERCENT_PER_LEVEL = 0.5;
export const META_SKILL_REGEN_DAMAGE_RATIO = 0.01;
export const META_SKILL_REGEN_HIT_HEAL = 0.5;

export function isLevelCapped(level: number, maxLevel: number): boolean {
  return Number.isFinite(maxLevel) && level >= maxLevel;
}

export function formatLevelLabel(level: number, maxLevel: number): string {
  if (!Number.isFinite(maxLevel)) return `Nível ${level}`;
  return `Nível ${level}/${maxLevel}`;
}

export function getMetaTreeMaxLevel(type: MetaTreeUpgradeType): number {
  return MAX_META_TREE_LEVELS[type];
}

/** @deprecated Prefer MAX_UPGRADE_LEVELS.attackSpeed / .range */
const MAX_STAT_LEVEL = MAX_UPGRADE_LEVELS.attackSpeed;

const ATTACK_SPEED_COST_BASE = 60;
const RANGE_COST_BASE = 60;
const KNOCKBACK_COST_BASE = 55;
const KNOCKBACK_POWER_PER_LEVEL = 2;
const CRIT_CHANCE_BASE = 0.05;
const CRIT_CHANCE_PER_LEVEL = 0.02;
export const MAX_CRIT_CHANCE = 0.75;
const CRIT_DAMAGE_BASE = 1.5;
const CRIT_DAMAGE_PER_LEVEL = 0.15;
const CRIT_CHANCE_COST_BASE = 65;
const CRIT_DAMAGE_COST_BASE = 70;
/** Custo base por atributo de skill (Diamantes Roxos). */
const PURPLE_SKILL_STAT_COST_BASE = 3;
/** Custo base em diamantes do 1º nível de bônus de XP. */
const XP_BONUS_COST_BASE = 5;
const XP_BONUS_COST_GROWTH = 1.5;

export function getMetaLifeStealRatio(level: number): number {
  return (
    Math.max(0, level) * (META_LIFE_STEAL_PERCENT_PER_LEVEL / 100)
  );
}

/** Cura por dano/hits de skills especiais (Gelo/Fogo/Raio/Ricochete). */
export function getMetaSkillRegenHealing(
  level: number,
  skillDamageDealt: number,
  skillHitsLanded: number,
): number {
  if (level <= 0) return 0;
  return (
    Math.max(0, skillDamageDealt) *
      (META_SKILL_REGEN_DAMAGE_RATIO * level) +
    Math.max(0, skillHitsLanded) * (META_SKILL_REGEN_HIT_HEAL * level)
  );
}

function getMetaTreeLevel(
  state: {
    metaDamageLevel: number;
    metaKnockbackLevel: number;
    metaHpLevel: number;
    metaLifeStealLevel: number;
    metaSkillRegenLevel: number;
  },
  type: MetaTreeUpgradeType,
): number {
  return state[type];
}

/** Custo de um atributo: floor(base × 1.25^nível × prestígio). */
export function getPurpleSkillCostAt(
  level: number,
  prestigeLevel = 0,
): number {
  return getUpgradeCost(PURPLE_SKILL_STAT_COST_BASE, level, prestigeLevel);
}

/**
 * Soma dos custos pagos para chegar ao nível `level`
 * (níveis 0→1 + 1→2 + … + (level-1)→level).
 */
export function getPurpleSkillSpentForLevel(
  level: number,
  prestigeLevel = 0,
): number {
  const lv = Math.max(0, Math.floor(level));
  let total = 0;
  for (let i = 0; i < lv; i++) {
    total += getPurpleSkillCostAt(i, prestigeLevel);
  }
  return total;
}

/** Fração devolvida no respec da árvore roxa (1 = 100%). */
export const SKILL_TREE_RESPEC_REFUND_RATE = 1;

/** Total de diamantes roxos investidos em todos os atributos granulares. */
export function getTotalPurpleSkillInvestment(
  skills: SkillsData,
  prestigeLevel = 0,
): number {
  let total = 0;
  for (const skillId of Object.keys(SKILL_STAT_KEYS) as SkillUpgradeType[]) {
    for (const statKey of SKILL_STAT_KEYS[skillId]) {
      total += getPurpleSkillSpentForLevel(
        getSkillStatLevel(skills, skillId, statKey),
        prestigeLevel,
      );
    }
  }
  return total;
}

export function getSkillStatLevel(
  skills: SkillsData,
  skillId: SkillUpgradeType,
  statKey: string,
): number {
  const skill = skills[skillId] as Record<string, number>;
  return Math.min(
    MAX_PURPLE_SKILL_STAT_LEVEL,
    Math.max(0, Math.floor(Number(skill[statKey]) || 0)),
  );
}

/**
 * Corta atributos acima do teto e devolve diamantes roxos do excedente.
 */
export function clampSkillsToMaxLevel(
  skills: SkillsData,
  prestigeLevel = 0,
): {
  skills: SkillsData;
  refund: number;
} {
  let refund = 0;
  const next: SkillsData = {
    ricochet: { ...skills.ricochet },
    ice: { ...skills.ice },
    fire: { ...skills.fire },
    lightning: { ...skills.lightning },
  };

  for (const skillId of Object.keys(SKILL_STAT_KEYS) as SkillUpgradeType[]) {
    const row = next[skillId] as Record<string, number>;
    for (const statKey of SKILL_STAT_KEYS[skillId]) {
      const raw = Math.max(0, Math.floor(Number(row[statKey]) || 0));
      if (raw > MAX_PURPLE_SKILL_STAT_LEVEL) {
        refund +=
          getPurpleSkillSpentForLevel(raw, prestigeLevel) -
          getPurpleSkillSpentForLevel(
            MAX_PURPLE_SKILL_STAT_LEVEL,
            prestigeLevel,
          );
        row[statKey] = MAX_PURPLE_SKILL_STAT_LEVEL;
      }
    }
  }

  return { skills: next, refund: Math.max(0, refund) };
}

/** Poder de knockback: base + nível × 2. */
export function getKnockbackPowerAt(
  baseKnockbackPower: number,
  knockbackLevel: number,
): number {
  return (
    Math.max(0, baseKnockbackPower) +
    Math.max(0, knockbackLevel) * KNOCKBACK_POWER_PER_LEVEL
  );
}

export function getKnockbackCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(KNOCKBACK_COST_BASE, level, prestigeLevel);
}

/** Chance crítica: 5% + 2%/nível, teto 75%. */
export function getCritChanceAt(critChanceLevel: number): number {
  const capped = Number.isFinite(MAX_UPGRADE_LEVELS.critChance)
    ? Math.min(MAX_UPGRADE_LEVELS.critChance, Math.max(0, critChanceLevel))
    : Math.max(0, critChanceLevel);
  return Math.min(
    MAX_CRIT_CHANCE,
    CRIT_CHANCE_BASE + capped * CRIT_CHANCE_PER_LEVEL,
  );
}

/** Multiplicador de crítico: 1.5 + 0.15 × nível (sem teto). */
export function getCritDamageMultiplierAt(critDamageLevel: number): number {
  const level = Number.isFinite(MAX_UPGRADE_LEVELS.critDamage)
    ? Math.min(MAX_UPGRADE_LEVELS.critDamage, Math.max(0, critDamageLevel))
    : Math.max(0, critDamageLevel);
  return CRIT_DAMAGE_BASE + level * CRIT_DAMAGE_PER_LEVEL;
}

export function getCritChanceCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(CRIT_CHANCE_COST_BASE, level, prestigeLevel);
}

export function getCritDamageCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(CRIT_DAMAGE_COST_BASE, level, prestigeLevel);
}

/** Multiplicador de XP: nível 0 = 1.0, nível 1 = 1.1, … (+10% por nível). */
export function getXpMultiplier(level: number): number {
  const capped = Math.min(
    MAX_UPGRADE_LEVELS.xpBonus,
    Math.max(0, Math.floor(level)),
  );
  return 1 + capped * 0.1;
}

export function getXpBonusCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(
    XP_BONUS_COST_BASE,
    level,
    prestigeLevel,
    XP_BONUS_COST_GROWTH,
  );
}

/** Referência estável para o getter da store (evita shadowing). */
const xpMultiplierAt = getXpMultiplier;
const xpBonusCostAt = getXpBonusCostAt;

function skillHpBonus(tree: SkillTreeState): number {
  let bonus = 0;
  if (tree.node_hp_1) bonus += 25;
  if (tree.node_hp_2) bonus += 50;
  if (tree.node_iron_guard) bonus += 40;
  return bonus;
}

function skillDamageBonus(tree: SkillTreeState): number {
  let bonus = 0;
  if (tree.node_dmg_1) bonus += 5;
  if (tree.node_dmg_2) bonus += 10;
  return bonus;
}

function skillRangeBonus(tree: SkillTreeState): number {
  return tree.node_range_focus ? 25 : 0;
}

function skillCooldownReduction(tree: SkillTreeState): number {
  let reduction = 0;
  if (tree.node_spark_ignition) reduction += 50;
  if (tree.node_spark_burst) reduction += 75;
  if (tree.node_spark_fury) reduction += 100;
  return reduction;
}

/** Floor duro de cooldown de ataque (ms) — hard cap absoluto / cartas in-run. */
export const MIN_ATTACK_COOLDOWN_MS = 300;
/** Teto duro de alcance (px) — hard cap absoluto / cartas in-run. */
export const MAX_ATTACK_RANGE = 650;

/**
 * Teto de meta-progresso (ouro) para CD: só 40% do caminho até 300ms.
 * Ex.: base 1500 → meta floor = 1500 − 1200×0.4 = 1020ms.
 */
export function getMetaMaxCooldownMs(
  baseAttackSpeedMs = FALLBACK_GAME_SETTINGS.baseAttackSpeed,
): number {
  const span = Math.max(0, baseAttackSpeedMs - MIN_ATTACK_COOLDOWN_MS);
  return Math.round(baseAttackSpeedMs - span * META_ATTACK_SPEED_SHARE);
}

/**
 * Teto de meta-progresso (ouro) para range: só 65% do caminho até 650px.
 * Ex.: base 200 → meta ceil = 200 + 400×0.65 = 460px.
 */
export function getMetaMaxRangePx(
  baseRange = FALLBACK_GAME_SETTINGS.baseRange,
): number {
  const span = Math.max(0, MAX_ATTACK_RANGE - baseRange);
  return Math.round(baseRange + span * META_PROGRESS_SHARE);
}

/**
 * Cooldown só com upgrades de ouro (sem cards in-game).
 * Interpola linearmente até o teto meta (40%); hard cap 300ms fica para a arena.
 */
export function cooldownAtLevel(
  level: number,
  baseAttackSpeedMs = FALLBACK_GAME_SETTINGS.baseAttackSpeed,
): number {
  const maxLv = MAX_UPGRADE_LEVELS.attackSpeed;
  const lv = Math.min(Math.max(0, level), maxLv);
  const metaFloor = getMetaMaxCooldownMs(baseAttackSpeedMs);
  if (maxLv <= 0) return Math.round(baseAttackSpeedMs);
  const t = lv / maxLv;
  return Math.round(baseAttackSpeedMs + (metaFloor - baseAttackSpeedMs) * t);
}

/**
 * Range só com upgrades de ouro (sem cards in-game).
 * Interpola linearmente até o teto meta (65%); hard cap 600px fica para a arena.
 */
export function rangeAtLevel(
  level: number,
  baseRange = FALLBACK_GAME_SETTINGS.baseRange,
): number {
  const maxLv = MAX_UPGRADE_LEVELS.range;
  const lv = Math.min(Math.max(0, level), maxLv);
  const metaCeil = getMetaMaxRangePx(baseRange);
  if (maxLv <= 0) return Math.round(baseRange);
  const t = lv / maxLv;
  return Math.round(baseRange + (metaCeil - baseRange) * t);
}

export {
  MAX_STAT_LEVEL,
  FALLBACK_GAME_SETTINGS as DEFAULT_BASE_CONFIG,
};

/** Velocidades de simulação disponíveis. */
export const GAME_SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;
export type GameSpeedOption = (typeof GAME_SPEED_OPTIONS)[number];

export function clampGameSpeed(speed: number): GameSpeedOption {
  const rounded = Math.round(speed);
  if ((GAME_SPEED_OPTIONS as readonly number[]).includes(rounded)) {
    return rounded as GameSpeedOption;
  }
  return 1;
}

/** @deprecated Use baseConfig.baseAttackSpeed da store. */
export const BASE_ATTACK_SPEED_MS = FALLBACK_GAME_SETTINGS.baseAttackSpeed;
/** @deprecated Use baseConfig.baseRange da store. */
export const BASE_RANGE = FALLBACK_GAME_SETTINGS.baseRange;

const defaults = createDefaultSaveData();

function pickDefaultDifficultyId(list: DifficultyConfig[]): number | null {
  const medium = list.find((d) => d.name === "Médio");
  return medium?.id ?? list[0]?.id ?? null;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  activeSaveId: null,
  activeSaveName: null,
  gold: defaults.gold,
  gems: defaults.gems,
  purpleDiamonds: defaults.purpleDiamonds,
  maxHpLevel: defaults.maxHpLevel,
  baseDamageLevel: defaults.baseDamageLevel,
  baseDamage: defaults.baseDamage,
  attackSpeedLevel: defaults.attackSpeedLevel,
  rangeLevel: defaults.rangeLevel,
  arms: defaults.arms,
  armTier: defaults.armTier,
  armsNextCost: defaults.armsNextCost,
  incomeMultiplier: defaults.incomeMultiplier,
  xpBonusLevel: defaults.xpBonusLevel,
  knockbackLevel: defaults.knockbackLevel,
  baseKnockbackPower: defaults.baseKnockbackPower,
  critChanceLevel: defaults.critChanceLevel,
  critDamageLevel: defaults.critDamageLevel,
  skillTree: { ...DEFAULT_SKILL_TREE },
  skills: normalizeSkills(DEFAULT_SKILLS_DATA),
  unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
  metaDamageLevel: defaults.metaDamageLevel,
  metaKnockbackLevel: defaults.metaKnockbackLevel,
  metaHpLevel: defaults.metaHpLevel,
  metaLifeStealLevel: defaults.metaLifeStealLevel,
  metaSkillRegenLevel: defaults.metaSkillRegenLevel,
  prestigeLevel: defaults.prestigeLevel ?? 0,
  ascensionShards: defaults.ascensionShards ?? 0,
  ascensionPassives: normalizeAscensionPassives(defaults.ascensionPassives),
  milestoneQuests: createDefaultMilestoneQuests(),
  totalMobsKilled: defaults.totalMobsKilled ?? 0,
  totalBossesKilled: defaults.totalBossesKilled ?? 0,
  baseConfig: { ...FALLBACK_GAME_SETTINGS },
  difficulties: [...FALLBACK_DIFFICULTIES],
  enemyTypes: [...FALLBACK_ENEMY_TYPES],
  selectedDifficultyId: pickDefaultDifficultyId(FALLBACK_DIFFICULTIES),
  configsLoaded: false,
  gameSpeedMultiplier: 1,

  setGameSpeedMultiplier: (speed) =>
    set({ gameSpeedMultiplier: clampGameSpeed(speed) }),

  cycleGameSpeed: () =>
    set((s) => {
      const current = clampGameSpeed(s.gameSpeedMultiplier);
      const idx = GAME_SPEED_OPTIONS.indexOf(current);
      const next =
        GAME_SPEED_OPTIONS[(idx + 1) % GAME_SPEED_OPTIONS.length] ?? 1;
      return { gameSpeedMultiplier: next };
    }),

  hydrateFromSave: (saveId, data, saveName) => {
    const n = normalizeSaveData(data);
    const prestige = Math.max(0, Math.floor(n.prestigeLevel ?? 0));
    const { skills, refund } = clampSkillsToMaxLevel(
      normalizeSkills(n.skills),
      prestige,
    );
    set({
      activeSaveId: saveId,
      activeSaveName: saveName ?? null,
      gold: n.gold,
      gems: n.gems,
      purpleDiamonds: n.purpleDiamonds + refund,
      maxHpLevel: n.maxHpLevel,
      baseDamageLevel: n.baseDamageLevel,
      baseDamage: n.baseDamage,
      attackSpeedLevel: 0,
      rangeLevel: n.rangeLevel,
      arms: n.arms,
      armTier: n.armTier,
      armsNextCost: n.armsNextCost,
      incomeMultiplier: n.incomeMultiplier,
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        Math.max(0, Math.floor(n.xpBonusLevel)),
      ),
      knockbackLevel: 0,
      baseKnockbackPower: n.baseKnockbackPower,
      critChanceLevel: n.critChanceLevel,
      critDamageLevel: 0,
      skillTree: { ...DEFAULT_SKILL_TREE, ...n.skillTree },
      skills,
      unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS, ...n.unlockedSkills },
      metaDamageLevel: n.metaDamageLevel,
      metaKnockbackLevel: n.metaKnockbackLevel,
      metaHpLevel: n.metaHpLevel,
      metaLifeStealLevel: n.metaLifeStealLevel,
      metaSkillRegenLevel: n.metaSkillRegenLevel,
      prestigeLevel: Math.max(0, Math.floor(n.prestigeLevel ?? 0)),
      ascensionShards: Math.max(0, Math.floor(n.ascensionShards ?? 0)),
      ascensionPassives: normalizeAscensionPassives(n.ascensionPassives),
      milestoneQuests: applyMilestoneProgress(
        normalizeMilestoneQuests(n.milestoneQuests),
        [
          {
            type: "prestige_level",
            amount: Math.max(0, Math.floor(n.prestigeLevel ?? 0)),
          },
        ],
      ),
      totalMobsKilled: Math.max(0, Math.floor(n.totalMobsKilled ?? 0)),
      totalBossesKilled: Math.max(0, Math.floor(n.totalBossesKilled ?? 0)),
    });
    if (refund > 0) {
      void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
        void syncWithDB();
      });
    }
  },

  clearActiveSlot: () =>
    set({
      activeSaveId: null,
      activeSaveName: null,
      ...createDefaultSaveData(),
      skillTree: { ...DEFAULT_SKILL_TREE },
      skills: normalizeSkills(DEFAULT_SKILLS_DATA),
      unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
      ...DEFAULT_META_TREE,
    }),

  getSaveSnapshot: () => {
    const s = get();
    const { skills } = clampSkillsToMaxLevel(
      normalizeSkills(s.skills),
      s.prestigeLevel,
    );
    return {
      gold: s.gold,
      gems: s.gems,
      purpleDiamonds: s.purpleDiamonds,
      maxHpLevel: s.maxHpLevel,
      baseDamageLevel: s.baseDamageLevel,
      baseDamage: s.baseDamage,
      attackSpeedLevel: 0,
      rangeLevel: s.rangeLevel,
      arms: s.arms,
      armTier: s.armTier,
      armsNextCost: s.armsNextCost,
      incomeMultiplier: s.incomeMultiplier,
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        Math.max(0, Math.floor(s.xpBonusLevel)),
      ),
      knockbackLevel: 0,
      baseKnockbackPower: s.baseKnockbackPower,
      critChanceLevel: s.critChanceLevel,
      critDamageLevel: 0,
      skillTree: { ...s.skillTree },
      skills,
      unlockedSkills: { ...s.unlockedSkills },
      metaDamageLevel: s.metaDamageLevel,
      metaKnockbackLevel: s.metaKnockbackLevel,
      metaHpLevel: s.metaHpLevel,
      metaLifeStealLevel: s.metaLifeStealLevel,
      metaSkillRegenLevel: s.metaSkillRegenLevel,
      prestigeLevel: s.prestigeLevel,
      ascensionShards: s.ascensionShards,
      ascensionPassives: normalizeAscensionPassives(s.ascensionPassives),
      milestoneQuests: normalizeMilestoneQuests(s.milestoneQuests),
      totalMobsKilled: Math.max(0, Math.floor(s.totalMobsKilled)),
      totalBossesKilled: Math.max(0, Math.floor(s.totalBossesKilled)),
    };
  },

  setGameConfigs: (settings, difficultiesList, enemyTypesList) => {
    const list =
      difficultiesList.length > 0
        ? difficultiesList
        : [...FALLBACK_DIFFICULTIES];
    const types =
      enemyTypesList && enemyTypesList.length > 0
        ? enemyTypesList
        : [...FALLBACK_ENEMY_TYPES];
    const currentId = get().selectedDifficultyId;
    const stillValid = list.some((d) => d.id === currentId);
    set({
      baseConfig: { ...settings },
      difficulties: list,
      enemyTypes: types,
      selectedDifficultyId: stillValid
        ? currentId
        : pickDefaultDifficultyId(list),
      configsLoaded: true,
    });
  },

  setSelectedDifficulty: (id) => {
    const exists = get().difficulties.some((d) => d.id === id);
    if (!exists) return;
    set({ selectedDifficultyId: id });
  },

  getSelectedDifficulty: () => {
    const { difficulties: list, selectedDifficultyId } = get();
    return list.find((d) => d.id === selectedDifficultyId) ?? null;
  },

  getDifficultyMultipliers: () => {
    const selected = get().getSelectedDifficulty();
    if (!selected) return { ...NEUTRAL_DIFFICULTY };
    const scale = DIFFICULTY_STAT_SCALE[selected.name];
    return {
      // HP/dano: tabela canônica (Easy→Insane); speed/gold do DB/config
      enemyHpMultiplier: scale?.hp ?? selected.enemyHpMultiplier,
      enemyDamageMultiplier: scale?.damage ?? selected.enemyDamageMultiplier,
      enemySpeedMultiplier: selected.enemySpeedMultiplier,
      goldDropMultiplier: selected.goldDropMultiplier,
    };
  },

  addGold: (amount, options) => {
    const applyIncome = options?.applyIncome !== false;
    const prestigeMul = get().getPrestigeMultiplier();
    set((s) => ({
      gold:
        s.gold +
        Math.round(
          amount * (applyIncome ? s.incomeMultiplier : 1) * prestigeMul,
        ),
    }));
  },

  getPrestigeMultiplier: () => 1 + Math.max(0, get().prestigeLevel) * 0.15,

  /**
   * Liberado após progresso alto de base (fim de jogo / build madura).
   */
  canTriggerPrestige: () => {
    const s = get();
    if (!s.activeSaveId) return false;
    return (
      s.maxHpLevel >= 10 ||
      s.baseDamageLevel >= 8 ||
      s.armTier >= 2 ||
      s.rangeLevel >= MAX_UPGRADE_LEVELS.range
    );
  },

  previewAscensionShards: () => {
    const s = get();
    return calcAscensionShardsGained({
      maxHpLevel: s.maxHpLevel,
      baseDamageLevel: s.baseDamageLevel,
      armTier: s.armTier,
      xpBonusLevel: s.xpBonusLevel,
      gold: s.gold,
      prestigeLevel: s.prestigeLevel,
    });
  },

  getMagnetRadiusMultiplier: () =>
    magnetRadiusMulAt(get().ascensionPassives.magnetRadius),

  getStartingGoldBonus: () =>
    startingGoldBonusAt(get().ascensionPassives.startingGold),

  getDiamondLuckBonus: () =>
    diamondLuckBonusAt(get().ascensionPassives.diamondLuck),

  getAscensionPassiveCost: (id) => {
    const level = get().ascensionPassives[id] ?? 0;
    if (level >= MAX_ASCENSION_PASSIVE_LEVEL) return Number.POSITIVE_INFINITY;
    return getAscensionPassiveCostAt(level);
  },

  upgradeAscensionPassive: (id) => {
    const current = get().ascensionPassives[id] ?? 0;
    if (current >= MAX_ASCENSION_PASSIVE_LEVEL) return false;
    const cost = getAscensionPassiveCostAt(current);
    if (get().ascensionShards < cost) return false;

    set((s) => ({
      ascensionShards: s.ascensionShards - cost,
      ascensionPassives: {
        ...s.ascensionPassives,
        [id]: current + 1,
      },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  /**
   * Ascensão: +1 prestige + Ascension Shards; reseta ouro/upgrades/skills granulares.
   * Mantém diamantes, meta, passivas de Ascensão e shards acumulados.
   */
  triggerPrestige: () => {
    if (!get().canTriggerPrestige()) return false;

    const invested = getTotalPurpleSkillInvestment(
      get().skills,
      get().prestigeLevel,
    );
    const refund = Math.floor(invested * SKILL_TREE_RESPEC_REFUND_RATE);
    const fresh = createDefaultSaveData();
    const current = get();
    const shardsGained = calcAscensionShardsGained({
      maxHpLevel: current.maxHpLevel,
      baseDamageLevel: current.baseDamageLevel,
      armTier: current.armTier,
      xpBonusLevel: current.xpBonusLevel,
      gold: current.gold,
      prestigeLevel: current.prestigeLevel,
    });

    set((s) => ({
      prestigeLevel: s.prestigeLevel + 1,
      ascensionShards: s.ascensionShards + shardsGained,
      gold: fresh.gold,
      purpleDiamonds: s.purpleDiamonds + refund,
      maxHpLevel: fresh.maxHpLevel,
      baseDamageLevel: fresh.baseDamageLevel,
      baseDamage: fresh.baseDamage,
      attackSpeedLevel: fresh.attackSpeedLevel,
      rangeLevel: fresh.rangeLevel,
      arms: fresh.arms,
      armTier: fresh.armTier,
      armsNextCost: fresh.armsNextCost,
      incomeMultiplier: fresh.incomeMultiplier,
      xpBonusLevel: fresh.xpBonusLevel,
      knockbackLevel: fresh.knockbackLevel,
      baseKnockbackPower: fresh.baseKnockbackPower,
      critChanceLevel: fresh.critChanceLevel,
      critDamageLevel: fresh.critDamageLevel,
      skills: {
        ricochet: { ...DEFAULT_SKILLS_DATA.ricochet },
        ice: { ...DEFAULT_SKILLS_DATA.ice },
        fire: { ...DEFAULT_SKILLS_DATA.fire },
        lightning: { ...DEFAULT_SKILLS_DATA.lightning },
      },
      milestoneQuests: applyMilestoneProgress(s.milestoneQuests, [
        { type: "prestige_level", amount: s.prestigeLevel + 1 },
      ]),
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

  addPurpleDiamonds: (amount) =>
    set((s) => ({
      purpleDiamonds: Math.max(0, s.purpleDiamonds + amount),
    })),

  progressMilestoneQuests: (events) => {
    if (events.length === 0) return;
    set((s) => ({
      milestoneQuests: applyMilestoneProgress(s.milestoneQuests, events),
    }));
  },

  claimMilestoneQuest: (id) => {
    const state = get().milestoneQuests;
    if (!canClaimMilestone(state, id)) return null;
    const def = getMilestoneQuestDef(id);
    if (!def) return null;
    const rewards = def.rewards;

    set((s) => ({
      milestoneQuests: {
        ...s.milestoneQuests,
        [id]: {
          ...(s.milestoneQuests[id] ?? { current: def.target, claimed: false }),
          current: Math.max(
            s.milestoneQuests[id]?.current ?? 0,
            def.target,
          ),
          claimed: true,
        },
      },
      gold: s.gold + rewards.gold,
      gems: s.gems + rewards.gems,
      purpleDiamonds: s.purpleDiamonds + rewards.purpleDiamonds,
      ascensionShards: s.ascensionShards + rewards.ascensionShards,
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return rewards;
  },

  /** Skills custam diamantes (gems), não ouro. Só altera gems + skillTree. */
  unlockSkill: (nodeId, _cost) => {
    const current = get();
    const node = getSkillNode(nodeId);
    const cost = Math.max(
      1,
      Math.floor(
        node.cost * getPrestigeCostMultiplier(current.prestigeLevel),
      ),
    );
    if (current.skillTree[nodeId]) return false;
    if (node.requires && !current.skillTree[node.requires]) return false;
    if (current.gems < cost) return false;

    set((state) => ({
      gems: state.gems - cost,
      skillTree: { ...state.skillTree, [nodeId]: true },
    }));
    return true;
  },

  getSkillStatUpgradeCost: (skillId, statKey) => {
    if (!isSkillUpgradeType(skillId) || !isSkillStatKey(skillId, statKey)) {
      return Number.POSITIVE_INFINITY;
    }
    const level = getSkillStatLevel(get().skills, skillId, statKey);
    if (level >= MAX_PURPLE_SKILL_STAT_LEVEL) return Number.POSITIVE_INFINITY;
    return getPurpleSkillCostAt(level, get().prestigeLevel);
  },

  getAdvancedSkillUnlockRequirements: (skillType) => {
    const base = advancedSkillUnlockRequirementsOf(skillType);
    const mul = getPrestigeCostMultiplier(get().prestigeLevel);
    return {
      ...base,
      goldCost: Math.max(1, Math.floor(base.goldCost * mul)),
      diamondCost: Math.max(1, Math.floor(base.diamondCost * mul)),
    };
  },

  /** @deprecated Preferir getAdvancedSkillUnlockRequirements — retorna só diamantes. */
  getAdvancedSkillUnlockCost: (skillType) =>
    get().getAdvancedSkillUnlockRequirements(skillType).diamondCost,

  canUnlockAdvancedSkill: (skillType) => {
    if (get().unlockedSkills[skillType]) return false;
    const s = get();
    const req = get().getAdvancedSkillUnlockRequirements(skillType);
    return (
      s.gold >= req.goldCost &&
      s.gems >= req.diamondCost &&
      s.totalMobsKilled >= req.requiredMobs &&
      s.totalBossesKilled >= req.requiredBosses
    );
  },

  recordLifetimeKills: (mobs, bosses = 0) => {
    const addMobs = Math.max(0, Math.floor(mobs));
    const addBosses = Math.max(0, Math.floor(bosses));
    if (addMobs <= 0 && addBosses <= 0) return;
    set((s) => ({
      totalMobsKilled: s.totalMobsKilled + addMobs,
      totalBossesKilled: s.totalBossesKilled + addBosses,
    }));
  },

  /**
   * Desbloqueia skill avançada: ouro + diamantes + marcos de abates.
   * Necessário para a carta aparecer na roleta in-game.
   */
  unlockAdvancedSkill: (skillType) => {
    if (get().unlockedSkills[skillType]) return false;
    const req = get().getAdvancedSkillUnlockRequirements(skillType);
    const s = get();
    if (
      s.gold < req.goldCost ||
      s.gems < req.diamondCost ||
      s.totalMobsKilled < req.requiredMobs ||
      s.totalBossesKilled < req.requiredBosses
    ) {
      return false;
    }

    set((state) => ({
      gold: state.gold - req.goldCost,
      gems: state.gems - req.diamondCost,
      unlockedSkills: { ...state.unlockedSkills, [skillType]: true },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  /**
   * Incrementa um atributo específico da skill com Diamantes Roxos.
   * Custo: base × 1.25^nívelAtual do atributo. Teto: MAX_PURPLE_SKILL_STAT_LEVEL.
   */
  upgradeSkillStat: (skillId, statKey) => {
    if (!isSkillUpgradeType(skillId) || !isSkillStatKey(skillId, statKey)) {
      return false;
    }
    if (!get().unlockedSkills[skillId]) return false;

    const currentLevel = getSkillStatLevel(get().skills, skillId, statKey);
    if (currentLevel >= MAX_PURPLE_SKILL_STAT_LEVEL) return false;

    const cost = getPurpleSkillCostAt(currentLevel, get().prestigeLevel);
    if (get().purpleDiamonds < cost) return false;

    set((s) => {
      const prevSkill = s.skills[skillId] as Record<string, number>;
      return {
        purpleDiamonds: s.purpleDiamonds - cost,
        skills: {
          ...s.skills,
          [skillId]: {
            ...prevSkill,
            [statKey]: currentLevel + 1,
          },
        },
      };
    });

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  getPurpleSkillInvestment: () =>
    getTotalPurpleSkillInvestment(get().skills, get().prestigeLevel),

  enforcePurpleSkillCap: () => {
    const { skills, refund } = clampSkillsToMaxLevel(
      get().skills,
      get().prestigeLevel,
    );
    if (refund <= 0) return 0;
    set((s) => ({
      skills,
      purpleDiamonds: s.purpleDiamonds + refund,
    }));
    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return refund;
  },

  /**
   * Respec da árvore roxa: zera atributos granulares e devolve diamantes roxos.
   * Desbloqueios (diamantes normais) e a skill tree verde não são afetados.
   */
  resetSkillTree: () => {
    const invested = getTotalPurpleSkillInvestment(
      get().skills,
      get().prestigeLevel,
    );
    if (invested <= 0) return 0;

    const refund = Math.floor(invested * SKILL_TREE_RESPEC_REFUND_RATE);
    set((s) => ({
      purpleDiamonds: s.purpleDiamonds + refund,
      skills: {
        ricochet: { ...DEFAULT_SKILLS_DATA.ricochet },
        ice: { ...DEFAULT_SKILLS_DATA.ice },
        fire: { ...DEFAULT_SKILLS_DATA.fire },
        lightning: { ...DEFAULT_SKILLS_DATA.lightning },
      },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return refund;
  },

  getHpUpgradeCost: () =>
    getUpgradeCost(UPGRADE_COST_BASE, get().maxHpLevel, get().prestigeLevel),

  getDamageUpgradeCost: () =>
    getUpgradeCost(
      UPGRADE_COST_BASE,
      get().baseDamageLevel,
      get().prestigeLevel,
    ),

  getAttackSpeedUpgradeCost: () =>
    getUpgradeCost(
      ATTACK_SPEED_COST_BASE,
      get().attackSpeedLevel,
      get().prestigeLevel,
    ),

  getRangeUpgradeCost: () =>
    getUpgradeCost(RANGE_COST_BASE, get().rangeLevel, get().prestigeLevel),

  getIncomeUpgradeCost: () => {
    const incomeLevel = Math.max(
      0,
      Math.round((get().incomeMultiplier - 1) / INCOME_STEP),
    );
    return getUpgradeCost(INCOME_COST_BASE, incomeLevel, get().prestigeLevel);
  },

  getArmsUpgradeCost: () =>
    Math.max(
      1,
      Math.floor(
        get().armsNextCost * getPrestigeCostMultiplier(get().prestigeLevel),
      ),
    ),

  getKnockbackUpgradeCost: () =>
    getKnockbackCostAt(get().knockbackLevel, get().prestigeLevel),

  getKnockbackPower: () => {
    const s = get();
    return (
      getKnockbackPowerAt(s.baseKnockbackPower, s.knockbackLevel) +
      Math.max(0, s.metaKnockbackLevel) * META_KNOCKBACK_PER_LEVEL
    );
  },

  getCritChanceUpgradeCost: () =>
    getCritChanceCostAt(get().critChanceLevel, get().prestigeLevel),

  getCritDamageUpgradeCost: () =>
    getCritDamageCostAt(get().critDamageLevel, get().prestigeLevel),

  getCritChance: () => getCritChanceAt(get().critChanceLevel),

  getCritDamageMultiplier: () =>
    getCritDamageMultiplierAt(get().critDamageLevel),

  getXpBonusUpgradeCost: () => {
    const level = get().xpBonusLevel;
    if (isLevelCapped(level, MAX_UPGRADE_LEVELS.xpBonus)) {
      return Number.POSITIVE_INFINITY;
    }
    return xpBonusCostAt(level, get().prestigeLevel);
  },

  getXpMultiplier: () =>
    xpMultiplierAt(get().xpBonusLevel) * get().getPrestigeMultiplier(),

  getMetaTreeUpgradeCost: (type) =>
    getMetaTreeCostAt(getMetaTreeLevel(get(), type), get().prestigeLevel),

  upgradeMetaTree: (type) => {
    const current = getMetaTreeLevel(get(), type);
    const maxLevel = getMetaTreeMaxLevel(type);
    if (isLevelCapped(current, maxLevel)) return false;
    const cost = getMetaTreeCostAt(current, get().prestigeLevel);
    if (get().gems < cost) return false;
    set((s) => ({
      gems: s.gems - cost,
      [type]: current + 1,
    }));
    return true;
  },

  /**
   * Derived state: upgrades de ouro + bônus da skill tree + árvore de diamantes.
   * Bases de CD/range/HP vêm de `baseConfig` (Neon).
   */
  getEffectiveStats: () => {
    const s = get();
    const tree = s.skillTree;
    const cfg = s.baseConfig;
    const skillHp = skillHpBonus(tree);
    const skillDmg = skillDamageBonus(tree);
    const skillRange = skillRangeBonus(tree);
    const skillCd = skillCooldownReduction(tree);
    const lifeStealLevel = getLifeStealLevel(tree);
    const metaLifeSteal = getMetaLifeStealRatio(s.metaLifeStealLevel);

    const goldHp = cfg.baseHp + (s.maxHpLevel - 1) * HP_PER_LEVEL;
    const metaHp = Math.max(0, s.metaHpLevel) * META_HP_PER_LEVEL;
    const metaDamage = Math.max(0, s.metaDamageLevel) * META_DAMAGE_PER_LEVEL;
    const goldRange = rangeAtLevel(s.rangeLevel, cfg.baseRange);
    const goldCooldown = cooldownAtLevel(
      s.attackSpeedLevel,
      cfg.baseAttackSpeed,
    );
    const prestigeMul = 1 + Math.max(0, s.prestigeLevel) * 0.15;

    return {
      maxHp: Math.round(goldHp + skillHp + metaHp),
      damage: Math.round((s.baseDamage + skillDmg + metaDamage) * prestigeMul),
      attackRange: Math.min(
        MAX_ATTACK_RANGE,
        Math.round(goldRange + skillRange),
      ),
      attackCooldownMs: Math.max(
        MIN_ATTACK_COOLDOWN_MS,
        Math.round(goldCooldown - skillCd),
      ),
      xpMultiplier: xpMultiplierAt(s.xpBonusLevel) * prestigeMul,
      arms: s.arms,
      lifeStealLevel,
      lifeStealPercent: lifeStealLevel * 0.01 + metaLifeSteal,
      metaSkillRegenLevel: s.metaSkillRegenLevel,
      critChance: getCritChanceAt(s.critChanceLevel),
      critDamageMultiplier: getCritDamageMultiplierAt(s.critDamageLevel),
      ricochetUnlocked: s.unlockedSkills.ricochet,
      ricochetCooldown: Math.max(
        2_000,
        7_000 - s.skills.ricochet.cooldown * 500,
      ),
      maxBounces: Math.min(5, 2 + s.skills.ricochet.hits),
      bounceDamagePercent: 0.6 + s.skills.ricochet.damage * 0.15,
      knockbackPower:
        getKnockbackPowerAt(s.baseKnockbackPower, s.knockbackLevel) +
        Math.max(0, s.metaKnockbackLevel) * META_KNOCKBACK_PER_LEVEL,
      skillBonus: {
        hp: skillHp,
        damage: skillDmg,
        range: skillRange,
        cooldownReductionMs: skillCd,
      },
    };
  },

  getMaxHp: () => get().getEffectiveStats().maxHp,

  getBaseDamage: () => get().getEffectiveStats().damage,

  getUpgradeCooldownAt: (level) =>
    cooldownAtLevel(level, get().baseConfig.baseAttackSpeed),

  getUpgradeRangeAt: (level) =>
    rangeAtLevel(level, get().baseConfig.baseRange),

  getBaseAttackSpeed: () =>
    cooldownAtLevel(
      get().attackSpeedLevel,
      get().baseConfig.baseAttackSpeed,
    ),

  getBaseRange: () =>
    rangeAtLevel(get().rangeLevel, get().baseConfig.baseRange),

  getAttackRange: () => get().getEffectiveStats().attackRange,

  getAttackCooldown: () => get().getEffectiveStats().attackCooldownMs,

  upgradeHP: () => {
    if (isLevelCapped(get().maxHpLevel, MAX_UPGRADE_LEVELS.hp)) return false;
    const cost = get().getHpUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({ gold: s.gold - cost, maxHpLevel: s.maxHpLevel + 1 }));
    return true;
  },

  upgradeDamage: () => {
    if (isLevelCapped(get().baseDamageLevel, MAX_UPGRADE_LEVELS.damage))
      return false;
    const cost = get().getDamageUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      baseDamageLevel: s.baseDamageLevel + 1,
      baseDamage: Math.round(s.baseDamage + DAMAGE_PER_LEVEL),
    }));
    return true;
  },

  upgradeAttackSpeed: () => {
    if (get().attackSpeedLevel >= MAX_UPGRADE_LEVELS.attackSpeed) return false;
    const metaFloor = getMetaMaxCooldownMs(get().baseConfig.baseAttackSpeed);
    const currentCd = get().getUpgradeCooldownAt(get().attackSpeedLevel);
    if (currentCd <= metaFloor) return false;
    const nextCd = get().getUpgradeCooldownAt(get().attackSpeedLevel + 1);
    if (nextCd >= currentCd) return false;
    const cost = get().getAttackSpeedUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      attackSpeedLevel: Math.min(
        MAX_UPGRADE_LEVELS.attackSpeed,
        s.attackSpeedLevel + 1,
      ),
    }));
    return true;
  },

  upgradeRange: () => {
    if (get().rangeLevel >= MAX_UPGRADE_LEVELS.range) return false;
    const metaCeil = getMetaMaxRangePx(get().baseConfig.baseRange);
    const currentRange = get().getUpgradeRangeAt(get().rangeLevel);
    if (currentRange >= metaCeil) return false;
    const nextRange = get().getUpgradeRangeAt(get().rangeLevel + 1);
    if (nextRange <= currentRange) return false;
    const cost = get().getRangeUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      rangeLevel: Math.min(MAX_UPGRADE_LEVELS.range, s.rangeLevel + 1),
    }));
    return true;
  },

  upgradeIncome: () => {
    const incomeLevel = Math.max(
      0,
      Math.round((get().incomeMultiplier - 1) / INCOME_STEP),
    );
    if (isLevelCapped(incomeLevel, MAX_UPGRADE_LEVELS.income)) return false;
    const cost = get().getIncomeUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      incomeMultiplier: Number((s.incomeMultiplier + INCOME_STEP).toFixed(1)),
    }));
    return true;
  },

  /**
   * Ciclo de braços (prestige):
   * - arms < 6 → +1 braço
   * - arms === 6 → volta a 2 e baseDamage × 1.15 (arredondado)
   * Em ambos: próximo custo × 1.4
   */
  upgradeArms: () => {
    const baseStored = get().armsNextCost;
    const cost = get().getArmsUpgradeCost();
    if (get().gold < cost) return false;

    const nextCost = Math.floor(baseStored * ARMS_COST_GROWTH);

    set((s) => {
      if (s.arms < ARMS_MAX) {
        return {
          gold: s.gold - cost,
          arms: s.arms + 1,
          armsNextCost: nextCost,
        };
      }
      return {
        gold: s.gold - cost,
        arms: ARMS_MIN,
        armTier: s.armTier + 1,
        baseDamage: Math.round(s.baseDamage * ARMS_PRESTIGE_DAMAGE),
        armsNextCost: nextCost,
      };
    });
    return true;
  },

  upgradeKnockback: () => {
    // Knockback só via cartas in-run (`matchBuffs.knockbackMultiplier`).
    return false;
  },

  upgradeCritChance: () => {
    if (isLevelCapped(get().critChanceLevel, MAX_UPGRADE_LEVELS.critChance))
      return false;
    if (get().getCritChance() >= MAX_CRIT_CHANCE) return false;
    const cost = get().getCritChanceUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      critChanceLevel: s.critChanceLevel + 1,
    }));
    return true;
  },

  upgradeCritDamage: () => {
    if (isLevelCapped(get().critDamageLevel, MAX_UPGRADE_LEVELS.critDamage))
      return false;
    const cost = get().getCritDamageUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      critDamageLevel: s.critDamageLevel + 1,
    }));
    return true;
  },

  /** Compra nível de bônus de XP com diamantes (só gems + xpBonusLevel). */
  upgradeXpBonus: () => {
    if (isLevelCapped(get().xpBonusLevel, MAX_UPGRADE_LEVELS.xpBonus)) {
      return false;
    }
    const cost = get().getXpBonusUpgradeCost();
    if (!Number.isFinite(cost) || get().gems < cost) return false;
    set((state) => ({
      gems: state.gems - cost,
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        state.xpBonusLevel + 1,
      ),
    }));
    return true;
  },
}));
