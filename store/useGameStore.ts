"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Estado persistente — espelha o JSONB `save_data` no banco. */
export type GameStoreState = {
  gold: number;
  gems: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Quantidade de braços ativos (2–6). */
  arms: number;
  /** Tier/nível dos braços (sobe ao completar o ciclo de 6). */
  armTier: number;
  incomeMultiplier: number;
  addGold: (baseAmount: number) => void;
  addGems: (amount: number) => void;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  upgradeIncome: () => boolean;
  upgradeArms: () => boolean;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getIncomeUpgradeCost: () => number;
  getArmsUpgradeCost: () => number;
  getMaxHp: () => number;
  getBaseDamage: () => number;
  /** Alcance do auto-ataque em pixels. */
  getAttackRange: () => number;
  /** Cooldown entre golpes em milissegundos. */
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
const ATTACK_RANGE = 110;
const ATTACK_COOLDOWN_MS = 400;

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      gold: 200,
      gems: 0,
      maxHpLevel: 1,
      baseDamageLevel: 1,
      arms: ARMS_MIN,
      armTier: 1,
      incomeMultiplier: 1,

      addGold: (baseAmount) =>
        set((s) => ({
          gold: s.gold + Math.floor(baseAmount * s.incomeMultiplier),
        })),

      addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

      getHpUpgradeCost: () => get().maxHpLevel * UPGRADE_COST_BASE,

      getDamageUpgradeCost: () => get().baseDamageLevel * UPGRADE_COST_BASE,

      getIncomeUpgradeCost: () => {
        // Nível 1 em 1.0x, 2 em 1.2x, etc.
        const incomeLevel =
          Math.round((get().incomeMultiplier - 1) / INCOME_STEP) + 1;
        return incomeLevel * INCOME_COST_BASE;
      },

      getArmsUpgradeCost: () => {
        // 5 compras por ciclo de tier (2→3→4→5→6→ascensão)
        const { arms, armTier } = get();
        const progressInCycle = arms === ARMS_MAX ? 4 : arms - ARMS_MIN;
        const purchasesDone = (armTier - 1) * 5 + progressInCycle;
        return (purchasesDone + 1) * ARMS_COST_BASE;
      },

      getMaxHp: () => HP_BASE + (get().maxHpLevel - 1) * HP_PER_LEVEL,

      getBaseDamage: () =>
        DAMAGE_BASE + (get().baseDamageLevel - 1) * DAMAGE_PER_LEVEL,

      getAttackRange: () => ATTACK_RANGE,

      getAttackCooldown: () => ATTACK_COOLDOWN_MS,

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
          // Ciclo completo: volta para 2 braços e sobe o tier
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
        };
      },
    },
  ),
);
