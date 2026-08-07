"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SKILL_TREE,
  canUnlockSkill,
  type SkillNodeId,
  type SkillTreeState,
} from "@/lib/skillTree";

/** Estado persistente — espelha o JSONB `save_data` no banco. */
export type GameStoreState = {
  gold: number;
  gems: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Cooldown base do auto-ataque em ms (menor = mais rápido). */
  baseAttackSpeed: number;
  /** Alcance base do auto-ataque em pixels. */
  baseRange: number;
  /** Quantidade de braços ativos (2–6). */
  arms: number;
  /** Tier/nível dos braços (sobe ao completar o ciclo de 6). */
  armTier: number;
  incomeMultiplier: number;
  skillTree: SkillTreeState;
  addGold: (baseAmount: number) => void;
  addGems: (amount: number) => void;
  unlockSkill: (nodeId: SkillNodeId, cost: number) => boolean;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  upgradeAttackSpeed: () => boolean;
  upgradeRange: () => boolean;
  upgradeIncome: () => boolean;
  upgradeArms: () => boolean;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getAttackSpeedUpgradeCost: () => number;
  getRangeUpgradeCost: () => number;
  getIncomeUpgradeCost: () => number;
  getArmsUpgradeCost: () => number;
  getMaxHp: () => number;
  getBaseDamage: () => number;
  /** Alcance base (sem buffs de partida). */
  getAttackRange: () => number;
  /** Cooldown base em ms (sem buffs de partida). */
  getAttackCooldown: () => number;
};

const HP_BASE = 100;
const HP_PER_LEVEL = 25;
const DAMAGE_BASE = 10;
const DAMAGE_PER_LEVEL = 5;
const UPGRADE_COST_BASE = 50;
const INCOME_COST_BASE = 75;
const INCOME_STEP = 0.2;
const ARMS_COST_BASE = 80;
const ARMS_MAX = 6;
const ARMS_MIN = 2;

const BASE_ATTACK_SPEED_MS = 1000;
const ATTACK_SPEED_STEP_MS = 50;
const ATTACK_SPEED_MIN_MS = 200;
const ATTACK_SPEED_COST_BASE = 60;

const BASE_RANGE = 100;
const RANGE_STEP = 15;
const RANGE_COST_BASE = 60;

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

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      gold: 200,
      gems: 0,
      maxHpLevel: 1,
      baseDamageLevel: 1,
      baseAttackSpeed: BASE_ATTACK_SPEED_MS,
      baseRange: BASE_RANGE,
      arms: ARMS_MIN,
      armTier: 1,
      incomeMultiplier: 1,
      skillTree: { ...DEFAULT_SKILL_TREE },

      addGold: (baseAmount) =>
        set((s) => ({
          gold: s.gold + Math.floor(baseAmount * s.incomeMultiplier),
        })),

      addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

      unlockSkill: (nodeId, cost) => {
        const { skillTree, gold } = get();
        if (!canUnlockSkill(skillTree, nodeId, gold)) return false;
        if (cost > gold) return false;

        set((s) => ({
          gold: s.gold - cost,
          skillTree: { ...s.skillTree, [nodeId]: true },
        }));
        return true;
      },

      getHpUpgradeCost: () => get().maxHpLevel * UPGRADE_COST_BASE,

      getDamageUpgradeCost: () => get().baseDamageLevel * UPGRADE_COST_BASE,

      getAttackSpeedUpgradeCost: () => {
        const upgrades =
          (BASE_ATTACK_SPEED_MS - get().baseAttackSpeed) / ATTACK_SPEED_STEP_MS;
        return (Math.max(0, upgrades) + 1) * ATTACK_SPEED_COST_BASE;
      },

      getRangeUpgradeCost: () => {
        const upgrades = (get().baseRange - BASE_RANGE) / RANGE_STEP;
        return (Math.max(0, upgrades) + 1) * RANGE_COST_BASE;
      },

      getIncomeUpgradeCost: () => {
        const incomeLevel =
          Math.round((get().incomeMultiplier - 1) / INCOME_STEP) + 1;
        return incomeLevel * INCOME_COST_BASE;
      },

      getArmsUpgradeCost: () => {
        const { arms, armTier } = get();
        const progressInCycle = arms === ARMS_MAX ? 4 : arms - ARMS_MIN;
        const purchasesDone = (armTier - 1) * 5 + progressInCycle;
        return (purchasesDone + 1) * ARMS_COST_BASE;
      },

      getMaxHp: () =>
        HP_BASE +
        (get().maxHpLevel - 1) * HP_PER_LEVEL +
        skillHpBonus(get().skillTree),

      getBaseDamage: () =>
        DAMAGE_BASE +
        (get().baseDamageLevel - 1) * DAMAGE_PER_LEVEL +
        skillDamageBonus(get().skillTree),

      getAttackRange: () => get().baseRange + skillRangeBonus(get().skillTree),

      getAttackCooldown: () =>
        Math.max(
          ATTACK_SPEED_MIN_MS,
          get().baseAttackSpeed - skillCooldownReduction(get().skillTree),
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
        }));
        return true;
      },

      upgradeAttackSpeed: () => {
        const { baseAttackSpeed } = get();
        if (baseAttackSpeed <= ATTACK_SPEED_MIN_MS) return false;
        const cost = get().getAttackSpeedUpgradeCost();
        if (get().gold < cost) return false;
        set((s) => ({
          gold: s.gold - cost,
          baseAttackSpeed: Math.max(
            ATTACK_SPEED_MIN_MS,
            s.baseAttackSpeed - ATTACK_SPEED_STEP_MS,
          ),
        }));
        return true;
      },

      upgradeRange: () => {
        const cost = get().getRangeUpgradeCost();
        if (get().gold < cost) return false;
        set((s) => ({
          gold: s.gold - cost,
          baseRange: s.baseRange + RANGE_STEP,
        }));
        return true;
      },

      upgradeIncome: () => {
        const cost = get().getIncomeUpgradeCost();
        if (get().gold < cost) return false;
        set((s) => ({
          gold: s.gold - cost,
          incomeMultiplier: Number(
            (s.incomeMultiplier + INCOME_STEP).toFixed(1),
          ),
        }));
        return true;
      },

      upgradeArms: () => {
        const cost = get().getArmsUpgradeCost();
        if (get().gold < cost) return false;

        set((s) => {
          if (s.arms < ARMS_MAX) {
            return { gold: s.gold - cost, arms: s.arms + 1 };
          }
          return {
            gold: s.gold - cost,
            arms: ARMS_MIN,
            armTier: s.armTier + 1,
          };
        });
        return true;
      },
    }),
    {
      name: "joguin-boxe-game-save",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameStoreState>;
        return {
          ...current,
          ...p,
          arms: typeof p.arms === "number" ? p.arms : ARMS_MIN,
          armTier: typeof p.armTier === "number" ? p.armTier : 1,
          incomeMultiplier:
            typeof p.incomeMultiplier === "number" ? p.incomeMultiplier : 1,
          baseAttackSpeed:
            typeof p.baseAttackSpeed === "number"
              ? p.baseAttackSpeed
              : BASE_ATTACK_SPEED_MS,
          baseRange: typeof p.baseRange === "number" ? p.baseRange : BASE_RANGE,
          skillTree: {
            ...DEFAULT_SKILL_TREE,
            ...(p.skillTree ?? {}),
          },
        };
      },
    },
  ),
);
