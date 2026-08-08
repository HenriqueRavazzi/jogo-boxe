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
  isSkillStatKey,
  isSkillUpgradeType,
} from "@/db/schema";
import {
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
  canUnlockSkill,
  getLifeStealLevel,
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
  /** Nível do upgrade de attack speed (0–6, +2% redução de CD por nível). */
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
  /** Nível do upgrade de knockback (ouro). */
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
  unlockSkill: (nodeId: SkillNodeId, cost: number) => boolean;
  /** Desbloqueia skill avançada na base (Diamantes Normais / gems). */
  unlockAdvancedSkill: (skillType: SkillUpgradeType) => boolean;
  getAdvancedSkillUnlockCost: (skillType: SkillUpgradeType) => number;
  /**
   * Upgrade de um atributo granular da skill (Diamantes Roxos + sync DB).
   * `skillId` / `statKey` são strings validadas em runtime.
   */
  upgradeSkillStat: (skillId: string, statKey: string) => boolean;
  getSkillStatUpgradeCost: (skillId: string, statKey: string) => number;
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
const INCOME_STEP = 0.2;
const ARMS_COST_GROWTH = 1.4;
const ARMS_PRESTIGE_DAMAGE = 1.15;
const ARMS_MAX = 6;
const ARMS_MIN = 2;

/** Crescimento de custo meta (ouro/diamantes): base × 1.15^nível. */
export const UPGRADE_COST_GROWTH = 1.15;

/**
 * Margem meta vs in-game: ouro cobre 65% do caminho até o hard cap;
 * 35% fica reservado aos cards de level-up na arena.
 */
export const META_PROGRESS_SHARE = 0.65;

/** Níveis máximos de meta-progresso (ouro). `Infinity` = sem teto. */
export const MAX_UPGRADE_LEVELS = {
  hp: Number.POSITIVE_INFINITY,
  damage: Number.POSITIVE_INFINITY,
  income: Number.POSITIVE_INFINITY,
  knockback: 30,
  /** 5% + 35×2% = 75%. */
  critChance: 35,
  critDamage: Number.POSITIVE_INFINITY,
  attackSpeed: 10,
  range: 10,
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
/** Custo em diamantes normais para desbloquear skill avançada. */
const ADVANCED_SKILL_UNLOCK_COST: Record<SkillUpgradeType, number> = {
  ricochet: 20,
  ice: 15,
  fire: 15,
  lightning: 18,
};
/** Custo base em diamantes do 1º nível de bônus de XP. */
const XP_BONUS_COST_BASE = 5;
const XP_BONUS_COST_GROWTH = 1.5;

/** Custo exponencial controlado: floor(base × 1.15^currentLevel). */
export function getUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.max(
    1,
    Math.floor(
      baseCost * Math.pow(UPGRADE_COST_GROWTH, Math.max(0, currentLevel)),
    ),
  );
}

export function getMetaTreeCostAt(level: number): number {
  return getUpgradeCost(META_TREE_COST_BASE, level);
}

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

/** Custo de um atributo: floor(base × 1.15^nívelAtual). */
export function getPurpleSkillCostAt(level: number): number {
  return getUpgradeCost(PURPLE_SKILL_STAT_COST_BASE, level);
}

export function getSkillStatLevel(
  skills: SkillsData,
  skillId: SkillUpgradeType,
  statKey: string,
): number {
  const skill = skills[skillId] as Record<string, number>;
  return Math.max(0, Math.floor(Number(skill[statKey]) || 0));
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

export function getKnockbackCostAt(level: number): number {
  return getUpgradeCost(KNOCKBACK_COST_BASE, level);
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

export function getCritChanceCostAt(level: number): number {
  return getUpgradeCost(CRIT_CHANCE_COST_BASE, level);
}

export function getCritDamageCostAt(level: number): number {
  return getUpgradeCost(CRIT_DAMAGE_COST_BASE, level);
}

/** Multiplicador de XP: nível 0 = 1.0, nível 1 = 1.1, … (+10% por nível). */
export function getXpMultiplier(level: number): number {
  return 1 + Math.max(0, level) * 0.1;
}

export function getXpBonusCostAt(level: number): number {
  return Math.max(
    1,
    Math.floor(
      XP_BONUS_COST_BASE * Math.pow(XP_BONUS_COST_GROWTH, Math.max(0, level)),
    ),
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
 * Teto de meta-progresso (ouro) para CD: só 65% do caminho até 300ms.
 * Ex.: base 1500 → meta floor = 1500 − 1200×0.65 = 720ms.
 */
export function getMetaMaxCooldownMs(
  baseAttackSpeedMs = FALLBACK_GAME_SETTINGS.baseAttackSpeed,
): number {
  const span = Math.max(0, baseAttackSpeedMs - MIN_ATTACK_COOLDOWN_MS);
  return Math.round(baseAttackSpeedMs - span * META_PROGRESS_SHARE);
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
 * Interpola linearmente até o teto meta (65%); hard cap 300ms fica para a arena.
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
    set({
      activeSaveId: saveId,
      activeSaveName: saveName ?? null,
      gold: n.gold,
      gems: n.gems,
      purpleDiamonds: n.purpleDiamonds,
      maxHpLevel: n.maxHpLevel,
      baseDamageLevel: n.baseDamageLevel,
      baseDamage: n.baseDamage,
      attackSpeedLevel: n.attackSpeedLevel,
      rangeLevel: n.rangeLevel,
      arms: n.arms,
      armTier: n.armTier,
      armsNextCost: n.armsNextCost,
      incomeMultiplier: n.incomeMultiplier,
      xpBonusLevel: n.xpBonusLevel,
      knockbackLevel: n.knockbackLevel,
      baseKnockbackPower: n.baseKnockbackPower,
      critChanceLevel: n.critChanceLevel,
      critDamageLevel: n.critDamageLevel,
      skillTree: { ...DEFAULT_SKILL_TREE, ...n.skillTree },
      skills: normalizeSkills(n.skills),
      unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS, ...n.unlockedSkills },
      metaDamageLevel: n.metaDamageLevel,
      metaKnockbackLevel: n.metaKnockbackLevel,
      metaHpLevel: n.metaHpLevel,
      metaLifeStealLevel: n.metaLifeStealLevel,
      metaSkillRegenLevel: n.metaSkillRegenLevel,
    });
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
    return {
      gold: s.gold,
      gems: s.gems,
      purpleDiamonds: s.purpleDiamonds,
      maxHpLevel: s.maxHpLevel,
      baseDamageLevel: s.baseDamageLevel,
      baseDamage: s.baseDamage,
      attackSpeedLevel: s.attackSpeedLevel,
      rangeLevel: s.rangeLevel,
      arms: s.arms,
      armTier: s.armTier,
      armsNextCost: s.armsNextCost,
      incomeMultiplier: s.incomeMultiplier,
      xpBonusLevel: s.xpBonusLevel,
      knockbackLevel: s.knockbackLevel,
      baseKnockbackPower: s.baseKnockbackPower,
      critChanceLevel: s.critChanceLevel,
      critDamageLevel: s.critDamageLevel,
      skillTree: { ...s.skillTree },
      skills: normalizeSkills(s.skills),
      unlockedSkills: { ...s.unlockedSkills },
      metaDamageLevel: s.metaDamageLevel,
      metaKnockbackLevel: s.metaKnockbackLevel,
      metaHpLevel: s.metaHpLevel,
      metaLifeStealLevel: s.metaLifeStealLevel,
      metaSkillRegenLevel: s.metaSkillRegenLevel,
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
    return {
      enemyHpMultiplier: selected.enemyHpMultiplier,
      enemyDamageMultiplier: selected.enemyDamageMultiplier,
      enemySpeedMultiplier: selected.enemySpeedMultiplier,
      goldDropMultiplier: selected.goldDropMultiplier,
    };
  },

  addGold: (amount, options) => {
    const applyIncome = options?.applyIncome !== false;
    set((s) => ({
      gold:
        s.gold +
        Math.round(amount * (applyIncome ? s.incomeMultiplier : 1)),
    }));
  },

  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

  addPurpleDiamonds: (amount) =>
    set((s) => ({
      purpleDiamonds: Math.max(0, s.purpleDiamonds + amount),
    })),

  /** Skills custam diamantes (gems), não ouro. Só altera gems + skillTree. */
  unlockSkill: (nodeId, cost) => {
    const current = get();
    if (!canUnlockSkill(current.skillTree, nodeId, current.gems)) return false;
    if (cost > current.gems) return false;

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
    return getPurpleSkillCostAt(
      getSkillStatLevel(get().skills, skillId, statKey),
    );
  },

  getAdvancedSkillUnlockCost: (skillType) =>
    ADVANCED_SKILL_UNLOCK_COST[skillType],

  /**
   * Desbloqueia skill avançada na base com Diamantes Normais.
   * Necessário para a carta aparecer na roleta in-game.
   */
  unlockAdvancedSkill: (skillType) => {
    if (get().unlockedSkills[skillType]) return false;
    const cost = ADVANCED_SKILL_UNLOCK_COST[skillType];
    if (get().gems < cost) return false;

    set((s) => ({
      gems: s.gems - cost,
      unlockedSkills: { ...s.unlockedSkills, [skillType]: true },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  /**
   * Incrementa um atributo específico da skill com Diamantes Roxos.
   * Custo: base × 1.15^nívelAtual do atributo. Persiste via syncWithDB.
   */
  upgradeSkillStat: (skillId, statKey) => {
    if (!isSkillUpgradeType(skillId) || !isSkillStatKey(skillId, statKey)) {
      return false;
    }
    if (!get().unlockedSkills[skillId]) return false;

    const currentLevel = getSkillStatLevel(get().skills, skillId, statKey);
    const cost = getPurpleSkillCostAt(currentLevel);
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

  getHpUpgradeCost: () => getUpgradeCost(UPGRADE_COST_BASE, get().maxHpLevel),

  getDamageUpgradeCost: () =>
    getUpgradeCost(UPGRADE_COST_BASE, get().baseDamageLevel),

  getAttackSpeedUpgradeCost: () =>
    getUpgradeCost(ATTACK_SPEED_COST_BASE, get().attackSpeedLevel),

  getRangeUpgradeCost: () =>
    getUpgradeCost(RANGE_COST_BASE, get().rangeLevel),

  getIncomeUpgradeCost: () => {
    const incomeLevel = Math.max(
      0,
      Math.round((get().incomeMultiplier - 1) / INCOME_STEP),
    );
    return getUpgradeCost(INCOME_COST_BASE, incomeLevel);
  },

  getArmsUpgradeCost: () => get().armsNextCost,

  getKnockbackUpgradeCost: () => getKnockbackCostAt(get().knockbackLevel),

  getKnockbackPower: () => {
    const s = get();
    return (
      getKnockbackPowerAt(s.baseKnockbackPower, s.knockbackLevel) +
      Math.max(0, s.metaKnockbackLevel) * META_KNOCKBACK_PER_LEVEL
    );
  },

  getCritChanceUpgradeCost: () => getCritChanceCostAt(get().critChanceLevel),

  getCritDamageUpgradeCost: () => getCritDamageCostAt(get().critDamageLevel),

  getCritChance: () => getCritChanceAt(get().critChanceLevel),

  getCritDamageMultiplier: () =>
    getCritDamageMultiplierAt(get().critDamageLevel),

  getXpBonusUpgradeCost: () => xpBonusCostAt(get().xpBonusLevel),

  getXpMultiplier: () => xpMultiplierAt(get().xpBonusLevel),

  getMetaTreeUpgradeCost: (type) =>
    getMetaTreeCostAt(getMetaTreeLevel(get(), type)),

  upgradeMetaTree: (type) => {
    const current = getMetaTreeLevel(get(), type);
    const maxLevel = getMetaTreeMaxLevel(type);
    if (isLevelCapped(current, maxLevel)) return false;
    const cost = getMetaTreeCostAt(current);
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

    return {
      maxHp: Math.round(goldHp + skillHp + metaHp),
      damage: Math.round(s.baseDamage + skillDmg + metaDamage),
      attackRange: Math.min(
        MAX_ATTACK_RANGE,
        Math.round(goldRange + skillRange),
      ),
      attackCooldownMs: Math.max(
        MIN_ATTACK_COOLDOWN_MS,
        Math.round(goldCooldown - skillCd),
      ),
      xpMultiplier: xpMultiplierAt(s.xpBonusLevel),
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
      maxBounces: 2 + s.skills.ricochet.hits,
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
    const cost = get().getArmsUpgradeCost();
    if (get().gold < cost) return false;

    const nextCost = Math.floor(cost * ARMS_COST_GROWTH);

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
    if (get().knockbackLevel >= MAX_UPGRADE_LEVELS.knockback) return false;
    const cost = get().getKnockbackUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      knockbackLevel: s.knockbackLevel + 1,
    }));
    return true;
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
    const cost = get().getXpBonusUpgradeCost();
    if (get().gems < cost) return false;
    set((state) => ({
      gems: state.gems - cost,
      xpBonusLevel: state.xpBonusLevel + 1,
    }));
    return true;
  },
}));
