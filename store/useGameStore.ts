"use client";

import { create } from "zustand";
import type { SaveData } from "@/db/schema";
import { createDefaultSaveData, normalizeSaveData, type SaveSlotId } from "@/lib/saveSlots";
import {
  DEFAULT_SKILL_TREE,
  canUnlockSkill,
  type SkillNodeId,
  type SkillTreeState,
} from "@/lib/skillTree";

export {
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
} from "@/src/game/entities/Player";
export type { ArmDistribution, ArmSide } from "@/src/game/entities/Player";

/** Estado persistente — espelha o JSONB `save_data` no banco (por slot). */
export type GameStoreState = {
  activeSlotId: SaveSlotId | null;
  gold: number;
  gems: number;
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
  skillTree: SkillTreeState;
  hydrateFromSave: (slotId: SaveSlotId, data: SaveData) => void;
  clearActiveSlot: () => void;
  getSaveSnapshot: () => SaveData;
  addGold: (baseAmount: number) => void;
  addGems: (amount: number) => void;
  unlockSkill: (nodeId: SkillNodeId, cost: number) => boolean;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  upgradeAttackSpeed: () => boolean;
  upgradeRange: () => boolean;
  upgradeIncome: () => boolean;
  upgradeArms: () => boolean;
  /** Upgrade de XP com diamantes. */
  upgradeXpBonus: () => boolean;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getAttackSpeedUpgradeCost: () => number;
  getRangeUpgradeCost: () => number;
  getIncomeUpgradeCost: () => number;
  getArmsUpgradeCost: () => number;
  getXpBonusUpgradeCost: () => number;
  getXpMultiplier: () => number;
  getMaxHp: () => number;
  getBaseDamage: () => number;
  getAttackRange: () => number;
  getAttackCooldown: () => number;
  /** Cooldown base só do upgrade (sem talents), em ms. */
  getUpgradeCooldownAt: (level: number) => number;
  /** Range base só do upgrade (sem talents), em px. */
  getUpgradeRangeAt: (level: number) => number;
};

const HP_BASE = 100;
const HP_PER_LEVEL = 25;
const DAMAGE_PER_LEVEL = 5;
const UPGRADE_COST_BASE = 50;
const INCOME_COST_BASE = 75;
const INCOME_STEP = 0.2;
const ARMS_COST_GROWTH = 1.4;
const ARMS_PRESTIGE_DAMAGE = 1.15;
const ARMS_MAX = 6;
const ARMS_MIN = 2;

const BASE_ATTACK_SPEED_MS = 1000;
const BASE_RANGE = 100;
/** Bônus máximo acumulado (12%) em MAX_STAT_LEVEL níveis → 2% por nível. */
const MAX_STAT_BONUS = 0.12;
const MAX_STAT_LEVEL = 6;
const BONUS_PER_LEVEL = MAX_STAT_BONUS / MAX_STAT_LEVEL; // 0.02
const ATTACK_SPEED_COST_BASE = 60;
const RANGE_COST_BASE = 60;
/** Custo base em diamantes do 1º nível de bônus de XP. */
const XP_BONUS_COST_BASE = 5;
const XP_BONUS_COST_GROWTH = 1.5;

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

/**
 * Cooldown absoluto (ms): base − (2% da base × nível), capped em MAX_STAT_LEVEL.
 * Nível 0 = 1000, nível 1 = 980, … nível 6 = 880.
 */
export function cooldownAtLevel(level: number): number {
  const lv = Math.min(Math.max(0, level), MAX_STAT_LEVEL);
  return Math.round(BASE_ATTACK_SPEED_MS * (1 - BONUS_PER_LEVEL * lv));
}

/**
 * Range absoluto (px): base + (2% da base × nível), capped em MAX_STAT_LEVEL.
 * Nível 0 = 100, nível 1 = 102, … nível 6 = 112.
 */
export function rangeAtLevel(level: number): number {
  const lv = Math.min(Math.max(0, level), MAX_STAT_LEVEL);
  return Math.round(BASE_RANGE * (1 + BONUS_PER_LEVEL * lv));
}

export { MAX_STAT_LEVEL, BASE_ATTACK_SPEED_MS, BASE_RANGE };

const defaults = createDefaultSaveData();

export const useGameStore = create<GameStoreState>((set, get) => ({
  activeSlotId: null,
  gold: defaults.gold,
  gems: defaults.gems,
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
  skillTree: { ...DEFAULT_SKILL_TREE },

  hydrateFromSave: (slotId, data) => {
    const n = normalizeSaveData(data);
    set({
      activeSlotId: slotId,
      gold: n.gold,
      gems: n.gems,
      maxHpLevel: n.maxHpLevel,
      baseDamageLevel: n.baseDamageLevel,
      baseDamage: n.baseDamage,
      attackSpeedLevel: n.attackSpeedLevel ?? 0,
      rangeLevel: n.rangeLevel ?? 0,
      arms: n.arms,
      armTier: n.armTier,
      armsNextCost: n.armsNextCost,
      incomeMultiplier: n.incomeMultiplier,
      xpBonusLevel: n.xpBonusLevel ?? 0,
      skillTree: { ...DEFAULT_SKILL_TREE, ...n.skillTree },
    });
  },

  clearActiveSlot: () =>
    set({
      activeSlotId: null,
      ...createDefaultSaveData(),
      skillTree: { ...DEFAULT_SKILL_TREE },
    }),

  getSaveSnapshot: () => {
    const s = get();
    return {
      gold: s.gold,
      gems: s.gems,
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
      skillTree: { ...s.skillTree },
    };
  },

  addGold: (baseAmount) =>
    set((s) => ({
      gold: s.gold + Math.floor(baseAmount * s.incomeMultiplier),
    })),

  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

  /** Skills custam diamantes (gems), não ouro. */
  unlockSkill: (nodeId, cost) => {
    const { skillTree, gems } = get();
    if (!canUnlockSkill(skillTree, nodeId, gems)) return false;
    if (cost > gems) return false;

    set((s) => ({
      gems: s.gems - cost,
      skillTree: { ...s.skillTree, [nodeId]: true },
    }));
    return true;
  },

  getHpUpgradeCost: () => get().maxHpLevel * UPGRADE_COST_BASE,

  getDamageUpgradeCost: () => get().baseDamageLevel * UPGRADE_COST_BASE,

  getAttackSpeedUpgradeCost: () =>
    (get().attackSpeedLevel + 1) * ATTACK_SPEED_COST_BASE,

  getRangeUpgradeCost: () => (get().rangeLevel + 1) * RANGE_COST_BASE,

  getIncomeUpgradeCost: () => {
    const incomeLevel =
      Math.round((get().incomeMultiplier - 1) / INCOME_STEP) + 1;
    return incomeLevel * INCOME_COST_BASE;
  },

  getArmsUpgradeCost: () => get().armsNextCost,

  getXpBonusUpgradeCost: () => xpBonusCostAt(get().xpBonusLevel),

  getXpMultiplier: () => xpMultiplierAt(get().xpBonusLevel),

  getMaxHp: () =>
    HP_BASE +
    (get().maxHpLevel - 1) * HP_PER_LEVEL +
    skillHpBonus(get().skillTree),

  /** Dano absoluto: baseDamage persistido + bônus da skill tree. */
  getBaseDamage: () =>
    Math.round(get().baseDamage + skillDamageBonus(get().skillTree)),

  getUpgradeCooldownAt: (level) => cooldownAtLevel(level),

  getUpgradeRangeAt: (level) => rangeAtLevel(level),

  /** Range absoluto já arredondado — combate consome direto, sem % no frame. */
  getAttackRange: () =>
    Math.round(
      rangeAtLevel(get().rangeLevel) + skillRangeBonus(get().skillTree),
    ),

  /** Cooldown absoluto (ms) já arredondado — combate consome direto. */
  getAttackCooldown: () =>
    Math.max(
      50,
      Math.round(
        cooldownAtLevel(get().attackSpeedLevel) -
          skillCooldownReduction(get().skillTree),
      ),
    ),

  upgradeHP: () => {
    const cost = get().getHpUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({ gold: s.gold - cost, maxHpLevel: s.maxHpLevel + 1 }));
    return true;
  },

  upgradeDamage: () => {
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
    if (get().attackSpeedLevel >= MAX_STAT_LEVEL) return false;
    const cost = get().getAttackSpeedUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      attackSpeedLevel: Math.min(MAX_STAT_LEVEL, s.attackSpeedLevel + 1),
    }));
    return true;
  },

  upgradeRange: () => {
    if (get().rangeLevel >= MAX_STAT_LEVEL) return false;
    const cost = get().getRangeUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      rangeLevel: Math.min(MAX_STAT_LEVEL, s.rangeLevel + 1),
    }));
    return true;
  },

  upgradeIncome: () => {
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

  /** Compra nível de bônus de XP com diamantes. */
  upgradeXpBonus: () => {
    const cost = get().getXpBonusUpgradeCost();
    if (get().gems < cost) return false;
    set((s) => ({
      gems: s.gems - cost,
      xpBonusLevel: s.xpBonusLevel + 1,
    }));
    return true;
  },
}));
